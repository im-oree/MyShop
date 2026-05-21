import { Router, Request, Response } from 'express'
import { sendSuccess, sendError, sendPaginated } from '../utils/response.js'
import { productService, userService, orderService } from '../services/index.js'
import { authenticate, optionalAuth } from '../middlewares/index.js'
import { OrderStatus, PaymentStatus } from '../types/index.js'
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

async function requireProductManager(req: Request, res: Response, required: 'read' | 'write' = 'write'): Promise<{ id: string; role: string; name: string; scopeSellerId: string } | null> {
  if (!req.userId) {
    sendError(res, 'Unauthorized', 401)
    return null
  }

  const user = await userService.getById(req.userId)
  if (!user || !['seller', 'admin', 'employee'].includes(user.role)) {
    sendError(res, 'Only sellers and admins can manage products', 403)
    return null
  }

  const permissions = getEffectivePermissions(user)
  if (!hasAccess(permissions.products, required)) {
    sendError(res, 'Insufficient product permissions', 403)
    return null
  }

  const scopeSellerId = user.role === 'employee' ? (user.employeeOfSellerId || '') : user.id
  if (!scopeSellerId) {
    sendError(res, 'Seller scope not found for employee', 403)
    return null
  }

  return { id: user.id, role: user.role, name: user.name, scopeSellerId }
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
    const sellerId = req.query.sellerId as string
    
    const { products, total } = await productService.getAll(page, limit, {
      category,
      featured: featured || undefined,
      search,
      sellerId,
    })
    
    sendPaginated(res, products, total, page, limit)
  } catch (error) {
    console.error('Get products error:', error)
    sendError(res, String(error), 500, 'Failed to fetch products')
  }
})

/**
 * GET /api/products/mine
 * Get products for the current seller/admin.
 */
router.get('/mine', authenticate, async (req: Request, res: Response) => {
  try {
    const manager = await requireProductManager(req, res, 'read')
    if (!manager) return

    const products = await productService.getBySellerId(manager.scopeSellerId)
    sendSuccess(res, products, 'My products fetched')
  } catch (error) {
    console.error('Get my products error:', error)
    sendError(res, String(error), 500, 'Failed to fetch products')
  }
})

/**
 * GET /api/products/mine/analytics
 * Seller analytics derived from real products and orders.
 */
router.get('/mine/analytics', authenticate, async (req: Request, res: Response) => {
  try {
    const manager = await requireProductManager(req, res, 'read')
    if (!manager) return

    const range = (req.query.range as '7day' | '30day' | '90day') || '30day'
    const rangeDays = getRangeDays(range)
    const products = await productService.getBySellerId(manager.scopeSellerId)
    const allOrders = await orderService.getAllRecords()
    const sellerProductIds = new Set(products.map(product => product.id))
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
    let totalOrdersWithSellerItems = 0

    completedOrders.forEach(order => {
      const orderDate = toDateValue(order.createdAt)
      if (orderDate < startDate) return

      const sellerItems = order.items.filter(item => sellerProductIds.has(item.productId))
      if (sellerItems.length === 0) return

      totalOrdersWithSellerItems += 1
      const dayKey = orderDate.toISOString().slice(0, 10)
      const currentDay = salesByDay.get(dayKey) || { salesCount: 0, revenue: 0 }

      sellerItems.forEach(item => {
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
    const avgOrderValue = totalOrdersWithSellerItems > 0 ? totalRevenue / totalOrdersWithSellerItems : 0
    const avgPrice = products.length > 0 ? products.reduce((sum, product) => sum + (product.salePrice ?? product.price), 0) / products.length : 0
    const sellerProfile = (await userService.getById(manager.scopeSellerId))?.sellerProfile

    sendSuccess(res, {
      range,
      summary: {
        totalProducts: products.length,
        totalOrders: totalOrdersWithSellerItems,
        totalSalesCount,
        totalRevenue,
        avgOrderValue,
        inventoryValue,
        avgPrice,
        totalReviews: sellerProfile?.totalReviews ?? 0,
        rating: sellerProfile?.rating ?? 0,
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
    }, 'Seller analytics fetched')
  } catch (error) {
    console.error('Get seller analytics error:', error)
    sendError(res, String(error), 500, 'Failed to fetch seller analytics')
  }
})

/**
 * POST /api/products
 * Create a new product for the authenticated seller/admin.
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
      sellerName,
      tags,
      images,
      features,
      specs,
      currency,
    } = req.body

    if (!name || !description || price == null || !category || stock == null) {
      sendError(res, 'Missing required fields', 400)
      return
    }

    const imageList = Array.isArray(images) ? images.filter(Boolean) : []
    if (imageList.length === 0) {
      sendError(res, 'At least one product image is required', 400)
      return
    }

    const created = await productService.create({
      name: String(name).trim(),
      sellerName: sellerName ? String(sellerName).trim() : manager.name,
      sellerId: manager.scopeSellerId,
      description: String(description).trim(),
      price: Number(price),
      currency: currency || 'NGN',
      images: imageList,
      category: String(category).trim(),
      tags: toStringList(tags),
      stock: Number(stock),
      discount: discount != null && discount !== '' ? Number(discount) : undefined,
      salePrice: salePrice != null && salePrice !== '' ? Number(salePrice) : undefined,
      featured: Boolean(featured),
      features: toStringList(features),
      specs: toSpecMap(specs),
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

    if (manager.role !== 'admin' && product.sellerId !== manager.scopeSellerId) {
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
    if (req.body.sellerName != null) updates.sellerName = String(req.body.sellerName).trim()
    if (req.body.images != null) updates.images = Array.isArray(req.body.images) ? req.body.images.filter(Boolean) : []
    if (req.body.tags != null) updates.tags = toStringList(req.body.tags)
    if (req.body.features != null) updates.features = toStringList(req.body.features)
    if (req.body.specs != null) updates.specs = toSpecMap(req.body.specs)

    await productService.update(req.params.id, updates as Partial<import('../types/index.js').Product>)
    const updated = await productService.getById(req.params.id)
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

    if (manager.role !== 'admin' && product.sellerId !== manager.scopeSellerId) {
      sendError(res, 'Unauthorized', 403)
      return
    }

    await productService.delete(req.params.id)
    sendSuccess(res, { id: req.params.id }, 'Product deleted')
  } catch (error) {
    console.error('Delete product error:', error)
    sendError(res, String(error), 500, 'Failed to delete product')
  }
})

export default router
