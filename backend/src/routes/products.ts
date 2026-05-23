import { Router, Request, Response } from 'express'
import { sendSuccess, sendError, sendPaginated } from '../utils/response.js'
import { productService, userService, orderService, auditLogService } from '../services/index.js'
import { authenticate, optionalAuth } from '../middlewares/index.js'
import { OrderStatus, PaymentStatus, ProductType } from '../types/index.js'
import { getEffectivePermissions, hasAccess } from '../utils/rbac.js'

const router = Router()

function toStringList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map(item => String(item).trim()).filter(Boolean)
  }

  if (typeof value === 'string') {
    return value.split(',').map(item => item.trim()).filter(Boolean)
  }

  return []
}

function toSpecMap(value: unknown): Record<string, string> {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return Object.entries(value as Record<string, unknown>).reduce<Record<string, string>>((acc, [key, item]) => {
      const trimmedKey = key.trim()
      const trimmedValue = String(item ?? '').trim()
      if (trimmedKey && trimmedValue) {
        acc[trimmedKey] = trimmedValue
      }
      return acc
    }, {})
  }

  return {}
}

function toProductType(value: unknown): ProductType {
  if (value === 'service' || value === 'downloadable') return value
  return 'physical'
}

function toServiceDetails(value: unknown): Record<string, unknown> | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined

  const source = value as Record<string, unknown>
  const details = removeEmptyValues({
    deliveryMode: source.deliveryMode,
    duration: source.duration != null ? String(source.duration).trim() : undefined,
    turnaround: source.turnaround != null ? String(source.turnaround).trim() : undefined,
    bookingNotes: source.bookingNotes != null ? String(source.bookingNotes).trim() : undefined,
  })

  return Object.keys(details).length ? details : undefined
}

function toDownloadableDetails(value: unknown): Record<string, unknown> | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined

  const source = value as Record<string, unknown>
  const details = removeEmptyValues({
    downloadUrl: source.downloadUrl != null ? String(source.downloadUrl).trim() : undefined,
    fileFormat: source.fileFormat != null ? String(source.fileFormat).trim() : undefined,
    fileSizeMb: source.fileSizeMb != null && source.fileSizeMb !== '' ? Number(source.fileSizeMb) : undefined,
    licenseInfo: source.licenseInfo != null ? String(source.licenseInfo).trim() : undefined,
  })

  return Object.keys(details).length ? details : undefined
}

function removeEmptyValues(value: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(value).filter(([, item]) => item != null && item !== '')
  )
}

async function requireProductManager(req: Request, res: Response, required: 'read' | 'write' = 'write'): Promise<{ id: string; role: string; name: string; scopeOwnerId: string } | null> {
  if (!req.userId) {
    sendError(res, 'Unauthorized', 401)
    return null
  }

  const user = await userService.getById(req.userId)
  if (!user || !['admin', 'manager', 'employee'].includes(user.role)) {
    sendError(res, 'Only admins, managers, and employees can manage products', 403)
    return null
  }

  const permissions = getEffectivePermissions(user)
  if (!hasAccess(permissions.products, required)) {
    sendError(res, 'Insufficient product permissions', 403)
    return null
  }

  const scopeOwnerId = user.role === 'employee' ? (user.managedByUserId || '') : user.id
  if (!scopeOwnerId) {
    sendError(res, 'Owner scope not found for employee', 403)
    return null
  }

  return { id: user.id, role: user.role, name: user.name, scopeOwnerId }
}

function toDateValue(value: unknown): Date {
  if (value instanceof Date) return value
  if (value && typeof value === 'object' && 'toDate' in value && typeof (value as { toDate?: () => Date }).toDate === 'function') {
    return (value as { toDate: () => Date }).toDate()
  }
  return new Date(value as string | number | Date)
}

function getRangeDays(range: '7day' | '30day' | '90day'): number {
  if (range === '7day') return 7
  if (range === '30day') return 30
  return 90
}

/**
 * GET /api/products
 * Get all products with pagination
 */
router.get('/', optionalAuth, async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1
    const limit = parseInt(req.query.limit as string) || 20
    const category = req.query.category as string
    const featured = req.query.featured === 'true'
    const search = req.query.search as string
    const productType = req.query.productType as ProductType | undefined
    
    const { products, total } = await productService.getAll(page, limit, {
      category,
      featured: featured || undefined,
      search,
      productType,
    })
    
    sendPaginated(res, products, total, page, limit)
  } catch (error) {
    console.error('Get products error:', error)
    sendError(res, String(error), 500, 'Failed to fetch products')
  }
})

/**
 * GET /api/products/mine
 * Get products for the current owner/admin.
 */
router.get('/mine', authenticate, async (req: Request, res: Response) => {
  try {
    const manager = await requireProductManager(req, res, 'read')
    if (!manager) return

    const { products } = await productService.getAll(1, 1000, { search: '' })
    sendSuccess(res, products, 'My products fetched')
  } catch (error) {
    console.error('Get my products error:', error)
    sendError(res, String(error), 500, 'Failed to fetch products')
  }
})

/**
 * GET /api/products/mine/analytics
 * Owner analytics derived from real products and orders.
 */
router.get('/mine/analytics', authenticate, async (req: Request, res: Response) => {
  try {
    const manager = await requireProductManager(req, res, 'read')
    if (!manager) return

    const range = (req.query.range as '7day' | '30day' | '90day') || '30day'
    const rangeDays = getRangeDays(range)
    const { products } = await productService.getAll(1, 1000, { search: '' })
    const allOrders = await orderService.getAllRecords()
    const ownerProductIds = new Set(products.map(product => product.id))
    const now = new Date()
    const startDate = new Date(now)
    startDate.setDate(startDate.getDate() - (rangeDays - 1))
    startDate.setHours(0, 0, 0, 0)

    const completedOrders = allOrders.filter(order =>
      order.paymentStatus === PaymentStatus.COMPLETED || [
        OrderStatus.NOTED,
        OrderStatus.PROCESSING,
        OrderStatus.IN_TRANSIT,
        OrderStatus.COMPLETED,
      ].includes(order.status)
    )

    const salesByDay = new Map<string, { salesCount: number; revenue: number }>()
    const productSales = new Map<string, { salesCount: number; revenue: number }>()
    let totalSalesCount = 0
    let totalRevenue = 0
    let totalOrdersWithOwnerItems = 0

    completedOrders.forEach(order => {
      const orderDate = toDateValue(order.createdAt)
      if (orderDate < startDate) return

      const ownerItems = order.items.filter(item => ownerProductIds.has(item.productId))
      if (ownerItems.length === 0) return

      totalOrdersWithOwnerItems += 1
      const dayKey = orderDate.toISOString().slice(0, 10)
      const currentDay = salesByDay.get(dayKey) || { salesCount: 0, revenue: 0 }

      ownerItems.forEach(item => {
        const itemRevenue = item.price * item.quantity
        totalSalesCount += item.quantity
        totalRevenue += itemRevenue

        currentDay.salesCount += item.quantity
        currentDay.revenue += itemRevenue

        const currentProduct = productSales.get(item.productId) || { salesCount: 0, revenue: 0 }
        currentProduct.salesCount += item.quantity
        currentProduct.revenue += itemRevenue
        productSales.set(item.productId, currentProduct)
      })

      salesByDay.set(dayKey, currentDay)
    })

    const salesSeries = Array.from({ length: rangeDays }, (_, index) => {
      const day = new Date(now)
      day.setDate(day.getDate() - (rangeDays - 1 - index))
      day.setHours(0, 0, 0, 0)
      const key = day.toISOString().slice(0, 10)
      const value = salesByDay.get(key) || { salesCount: 0, revenue: 0 }

      return {
        date: day.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        salesCount: value.salesCount,
        revenue: value.revenue,
      }
    })

    const categoryMap = new Map<string, number>()
    products.forEach(product => {
      const key = product.category || 'Uncategorized'
      categoryMap.set(key, (categoryMap.get(key) || 0) + 1)
    })

    const inventoryStatus = {
      inStock: products.filter(product => product.stock > 5).length,
      lowStock: products.filter(product => product.stock > 0 && product.stock <= 5).length,
      outOfStock: products.filter(product => product.stock === 0).length,
    }

    const topProducts = products
      .map(product => {
        const sales = productSales.get(product.id) || { salesCount: 0, revenue: 0 }
        return {
          id: product.id,
          name: product.name,
          price: product.salePrice ?? product.price,
          salesCount: sales.salesCount,
          revenue: sales.revenue,
        }
      })
      .sort((a, b) => b.revenue - a.revenue || b.salesCount - a.salesCount)
      .slice(0, 5)

    const inventoryValue = products.reduce((sum, product) => sum + (product.salePrice ?? product.price) * product.stock, 0)
    const avgOrderValue = totalOrdersWithOwnerItems > 0 ? totalRevenue / totalOrdersWithOwnerItems : 0
    const avgPrice = products.length > 0 ? products.reduce((sum, product) => sum + (product.salePrice ?? product.price), 0) / products.length : 0
    sendSuccess(res, {
      range,
      summary: {
        totalProducts: products.length,
        totalOrders: totalOrdersWithOwnerItems,
        totalSalesCount,
        totalRevenue,
        avgOrderValue,
        inventoryValue,
        avgPrice,
        totalReviews: 0,
        rating: 0,
      },
      charts: {
        salesSeries,
        categorySeries: Array.from(categoryMap.entries()).map(([name, value]) => ({ name, value })),
        inventoryStatus,
      },
      topProducts,
      lowStockProducts: products
        .filter(product => product.stock > 0 && product.stock <= 5)
        .sort((a, b) => a.stock - b.stock)
        .map(product => ({
          id: product.id,
          name: product.name,
          stock: product.stock,
        })),
    }, 'Owner analytics fetched')
  } catch (error) {
    console.error('Get owner analytics error:', error)
    sendError(res, String(error), 500, 'Failed to fetch seller analytics')
  }
})

/**
 * POST /api/products
 * Create a new product for the authenticated owner/admin.
 */
router.post('/', authenticate, async (req: Request, res: Response) => {
  try {
    const manager = await requireProductManager(req, res, 'write')
    if (!manager) return

    const {
      name,
      description,
      price,
      salePrice,
      discount,
      category,
      stock,
      featured,
      tags,
      images,
      features,
      specs,
      currency,
      productType: incomingProductType,
      serviceDetails,
      downloadableDetails,
    } = req.body

    const productType = toProductType(incomingProductType)

    if (!name || !description || price == null || !category) {
      sendError(res, 'Missing required fields', 400)
      return
    }

    if (productType === 'physical' && stock == null) {
      sendError(res, 'Stock is required for physical products', 400)
      return
    }

    const imageList = Array.isArray(images) ? images.filter(Boolean) : []
    if (productType === 'physical' && imageList.length === 0) {
      sendError(res, 'At least one product image is required', 400)
      return
    }

    const created = await productService.create({
      name: String(name).trim(),
      ownerId: manager.scopeOwnerId,
      description: String(description).trim(),
      productType,
      price: Number(price),
      currency: currency || 'NGN',
      images: imageList.length > 0 ? imageList : ['https://placehold.co/1000x750?text=Product'],
      category: String(category).trim(),
      tags: toStringList(tags),
      stock: productType === 'physical' ? Number(stock) : Number(stock ?? 999999),
      discount: discount != null && discount !== '' ? Number(discount) : undefined,
      salePrice: salePrice != null && salePrice !== '' ? Number(salePrice) : undefined,
      featured: Boolean(featured),
      features: toStringList(features),
      specs: toSpecMap(specs),
      serviceDetails: productType === 'service' ? toServiceDetails(serviceDetails) : undefined,
      downloadableDetails: productType === 'downloadable' ? toDownloadableDetails(downloadableDetails) : undefined,
    })

    // Audit log
    void auditLogService.log({
      actorId: manager.id,
      actorName: manager.name,
      actorRole: manager.role,
      action: 'product.create',
      resourceType: 'product',
      resourceId: created.id,
      meta: { name: created.name, ownerId: created.ownerId },
      ip: req.ip,
      userAgent: req.headers['user-agent'] as string | undefined,
    })

    sendSuccess(res, created, 'Product created', 201)
  } catch (error) {
    console.error('Create product error:', error)
    sendError(res, String(error), 500, 'Failed to create product')
  }
})

/**
 * GET /api/products/featured
 * Get featured products
 */
router.get('/featured', optionalAuth, async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 10
    const products = await productService.getFeatured(limit)
    sendSuccess(res, products, 'Featured products fetched')
  } catch (error) {
    console.error('Get featured error:', error)
    sendError(res, String(error), 500, 'Failed to fetch featured products')
  }
})

/**
 * GET /api/products/search
 * Search products
 */
router.get('/search', optionalAuth, async (req: Request, res: Response) => {
  try {
    const query = req.query.q as string
    
    if (!query) {
      sendError(res, 'Search query required', 400)
      return
    }
    
    const products = await productService.search(query)
    sendSuccess(res, products, 'Search results')
  } catch (error) {
    console.error('Search error:', error)
    sendError(res, String(error), 500, 'Search failed')
  }
})

/**
 * GET /api/products/:id
 * Get product by ID
 */
router.get('/:id', optionalAuth, async (req: Request, res: Response) => {
  try {
    const product = await productService.getById(req.params.id)
    
    if (!product) {
      sendError(res, 'Product not found', 404)
      return
    }
    
    sendSuccess(res, product, 'Product fetched')
  } catch (error) {
    console.error('Get product error:', error)
    sendError(res, String(error), 500, 'Failed to fetch product')
  }
})

/**
 * PUT /api/products/:id
 * Update a product owned by the authenticated seller/admin.
 */
router.put('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const manager = await requireProductManager(req, res, 'write')
    if (!manager) return

    const product = await productService.getById(req.params.id)
    if (!product) {
      sendError(res, 'Product not found', 404)
      return
    }

    if (manager.role !== 'admin' && product.ownerId !== manager.scopeOwnerId) {
      sendError(res, 'Unauthorized', 403)
      return
    }

    const updates: Record<string, unknown> = {}

    if (req.body.name != null) updates.name = String(req.body.name).trim()
    if (req.body.description != null) updates.description = String(req.body.description).trim()
    if (req.body.price != null) updates.price = Number(req.body.price)
    if (req.body.salePrice != null) updates.salePrice = Number(req.body.salePrice)
    if (req.body.discount != null) updates.discount = Number(req.body.discount)
    if (req.body.category != null) updates.category = String(req.body.category).trim()
    if (req.body.stock != null) updates.stock = Number(req.body.stock)
    if (req.body.featured != null) updates.featured = Boolean(req.body.featured)
    if (req.body.images != null) updates.images = Array.isArray(req.body.images) ? req.body.images.filter(Boolean) : []
    if (req.body.tags != null) updates.tags = toStringList(req.body.tags)
    if (req.body.features != null) updates.features = toStringList(req.body.features)
    if (req.body.specs != null) updates.specs = toSpecMap(req.body.specs)
    if (req.body.productType != null) updates.productType = toProductType(req.body.productType)
    if (req.body.serviceDetails != null) updates.serviceDetails = toServiceDetails(req.body.serviceDetails)
    if (req.body.downloadableDetails != null) updates.downloadableDetails = toDownloadableDetails(req.body.downloadableDetails)

    await productService.update(req.params.id, updates as Partial<import('../types/index.js').Product>)
    const updated = await productService.getById(req.params.id)
    void auditLogService.log({
      actorId: manager.id,
      actorName: manager.name,
      actorRole: manager.role,
      action: 'product.update',
      resourceType: 'product',
      resourceId: req.params.id,
      meta: { updates },
      ip: req.ip,
      userAgent: req.headers['user-agent'] as string | undefined,
    })

    sendSuccess(res, updated, 'Product updated')
  } catch (error) {
    console.error('Update product error:', error)
    sendError(res, String(error), 500, 'Failed to update product')
  }
})

/**
 * DELETE /api/products/:id
 * Delete a product owned by the authenticated seller/admin.
 */
router.delete('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const manager = await requireProductManager(req, res, 'write')
    if (!manager) return

    const product = await productService.getById(req.params.id)
    if (!product) {
      sendError(res, 'Product not found', 404)
      return
    }

    if (manager.role !== 'admin' && product.ownerId !== manager.scopeOwnerId) {
      sendError(res, 'Unauthorized', 403)
      return
    }

    await productService.delete(req.params.id)
    void auditLogService.log({
      actorId: manager.id,
      actorName: manager.name,
      actorRole: manager.role,
      action: 'product.delete',
      resourceType: 'product',
      resourceId: req.params.id,
      meta: {},
      ip: req.ip,
      userAgent: req.headers['user-agent'] as string | undefined,
    })

    sendSuccess(res, { id: req.params.id }, 'Product deleted')
  } catch (error) {
    console.error('Delete product error:', error)
    sendError(res, String(error), 500, 'Failed to delete product')
  }
})

export default router
