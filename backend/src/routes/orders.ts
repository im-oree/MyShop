import { Router, Request, Response } from 'express'
import { sendSuccess, sendError, sendPaginated } from '../utils/response.js'
import { orderService, productService, notificationService, userService } from '../services/index.js'
import { getFirestore } from '../config/firebase.js'
import { authenticate } from '../middlewares/index.js'
import { OrderStatus, PaymentStatus } from '../types/index.js'
import { getEffectivePermissions, hasAccess } from '../utils/rbac.js'

const router = Router()

async function getSellerContext(req: Request, required: 'read' | 'write' = 'read') {
  if (!req.userId) return null
  const actor = await userService.getById(req.userId)
  if (!actor) return null

  if (actor.role === 'admin' || actor.role === 'seller') {
    return { actor, sellerId: actor.id }
  }

  if (actor.role === 'employee') {
    const permissions = getEffectivePermissions(actor)
    if (!hasAccess(permissions.orders, required)) {
      return null
    }
    if (!actor.employeeOfSellerId) return null
    return { actor, sellerId: actor.employeeOfSellerId }
  }

  return null
}

const ORDER_STAGE_SEQUENCE = [
  OrderStatus.NOTED,
  OrderStatus.PROCESSING,
  OrderStatus.IN_TRANSIT,
  OrderStatus.COMPLETED,
] as const

function normalizeOrderStage(status?: string | null): string {
  const normalized = String(status || '').toLowerCase()
  if (normalized === 'pending' || normalized === 'paid') return OrderStatus.NOTED
  if (normalized === 'shipped') return OrderStatus.IN_TRANSIT
  if (normalized === 'delivered') return OrderStatus.COMPLETED
  if (ORDER_STAGE_SEQUENCE.includes(normalized as (typeof ORDER_STAGE_SEQUENCE)[number])) return normalized
  if (normalized === OrderStatus.CANCELLED || normalized === OrderStatus.REFUNDED) return normalized
  return OrderStatus.NOTED
}

function getNextStage(currentStage: string): string | null {
  const currentIndex = ORDER_STAGE_SEQUENCE.indexOf(normalizeOrderStage(currentStage) as (typeof ORDER_STAGE_SEQUENCE)[number])
  if (currentIndex === -1 || currentIndex >= ORDER_STAGE_SEQUENCE.length - 1) return null
  return ORDER_STAGE_SEQUENCE[currentIndex + 1]
}

/**
 * POST /api/orders
 * Create a new order
 */
router.post('/', authenticate, async (req: Request, res: Response) => {
  try {
    const { items, totalAmount, currency, shippingAddress, paymentMethod } = req.body
    
    if (!items || items.length === 0 || !shippingAddress) {
      sendError(res, 'Missing required fields', 400)
      return
    }
    
    const order = await orderService.create({
      userId: req.userId!,
      items,
      totalAmount,
      currency,
      shippingAddress,
      paymentMethod,
      status: OrderStatus.NOTED,
      paymentStatus: PaymentStatus.PENDING,
    })

    void notificationService.createForUser(
      req.userId!,
      'order_created',
      'Order created',
      `Your order #${order.id} has been created and is awaiting payment confirmation.`,
      `/orders/${order.id}`,
      'normal',
      { orderId: order.id }
    )
    
    sendSuccess(res, order, 'Order created', 201)
  } catch (error) {
    console.error('Create order error:', error)
    sendError(res, String(error), 500, 'Failed to create order')
  }
})

/**
 * GET /api/orders
 * Get user orders
 */
router.get('/', authenticate, async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1
    const limit = parseInt(req.query.limit as string) || 10
    
    const { orders, total } = await orderService.getByUserId(req.userId!, page, limit)
    
    sendPaginated(res, orders, total, page, limit)
  } catch (error) {
    console.error('Get orders error:', error)
    sendError(res, String(error), 500, 'Failed to fetch orders')
  }
})

/**
 * GET /api/orders/:id
 * Get order by ID
 */
router.get('/seller', authenticate, async (req: Request, res: Response) => {
  try {
    const context = await getSellerContext(req, 'read')
    if (!context) {
      sendError(res, 'Unauthorized', 403)
      return
    }

    const page = parseInt(req.query.page as string) || 1
    const limit = parseInt(req.query.limit as string) || 20
    const q = (req.query.q as string) || ''

    // Get products for this seller
    const products = await productService.getBySellerId(context.sellerId)
    const sellerProductIds = new Set((products || []).map(p => p.id))

    // Fetch all orders and filter server-side
    const allOrders = await orderService.getAllRecords()
    const sellerOrders = allOrders.filter(order => {
      if (q) {
        const matchesQuery = order.id.includes(q) || String(order.totalAmount).includes(q)
        if (!matchesQuery) return false
      }
      return order.items.some((it: any) => sellerProductIds.has(it.productId))
    })

    // simple pagination
    let total = sellerOrders.length
    let start = (page - 1) * limit
    let paged = sellerOrders.slice(start, start + limit)

    // Fallback: if no orders found via main orders collection (possible in some flows),
    // look at the `sellerOrders` collection which is populated on payment verification.
    if (total === 0) {
      try {
        const db = getFirestore()
        const snapshot = await db.collection('sellerOrders').where('sellerId', '==', context.sellerId).get()
        const sellerDocs = snapshot.docs.map(d => d.data() as any)
        const orderIds = sellerDocs.map((d: any) => d.orderId).filter(Boolean)

        if (orderIds.length > 0) {
          // Load orders by these ids
          const ordersFetched: any[] = []
          for (const oid of orderIds) {
            const o = await orderService.getById(oid)
            if (o) ordersFetched.push(o)
          }

          // apply query filter if present
          const filtered = ordersFetched.filter(order => {
            if (q) {
              const matchesQuery = order.id.includes(q) || String(order.totalAmount).includes(q)
              if (!matchesQuery) return false
            }
            return true
          })

          total = filtered.length
          start = (page - 1) * limit
          paged = filtered.slice(start, start + limit)
        }
      } catch (fallbackErr) {
        console.error('Fallback sellerOrders lookup failed:', fallbackErr)
      }
    }

    sendPaginated(res, paged, total, page, limit)
  } catch (error) {
    console.error('Get seller orders error:', error)
    sendError(res, String(error), 500, 'Failed to fetch seller orders')
  }
})


/**
 * GET /api/orders/seller/:id
 * Get seller-specific order detail (only if it contains seller items)
 */
router.get('/seller/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const context = await getSellerContext(req, 'read')
    if (!context) {
      sendError(res, 'Unauthorized', 403)
      return
    }

    let order = await orderService.getById(req.params.id)
    let resolvedOrder = order
    if (!resolvedOrder) {
      // If main order not found, check sellerOrders collection for this seller
      const db = getFirestore()
      const doc = await db.collection('sellerOrders').where('orderId', '==', req.params.id).where('sellerId', '==', context.sellerId).limit(1).get()
      if (doc.empty) {
        sendError(res, 'Order not found', 404)
        return
      }
      // Load order from orders collection by id
      const orderDoc = await orderService.getById(req.params.id)
      if (!orderDoc) {
        sendError(res, 'Order not found', 404)
        return
      }
      resolvedOrder = orderDoc
    }

    const products = await productService.getBySellerId(context.sellerId)
    const sellerProductIds = new Set((products || []).map(p => p.id))
    const contains = resolvedOrder.items.some((it: any) => sellerProductIds.has(it.productId))
    if (!contains) {
      // If items don't match (maybe older records), check sellerOrders linking table
      const db = getFirestore()
      const linkDoc = await db.collection('sellerOrders').where('orderId', '==', req.params.id).where('sellerId', '==', context.sellerId).limit(1).get()
      if (linkDoc.empty) {
        sendError(res, 'Unauthorized', 403)
        return
      }
    }
    sendSuccess(res, { order: resolvedOrder }, 'Seller order fetched')
  } catch (error) {
    console.error('Get seller order detail error:', error)
    sendError(res, String(error), 500, 'Failed to fetch seller order')
  }
})

router.get('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const order = await orderService.getById(req.params.id)
    
    if (!order) {
      sendError(res, 'Order not found', 404)
      return
    }
    
    if (order.userId !== req.userId) {
      sendError(res, 'Unauthorized', 403)
      return
    }
    
    sendSuccess(res, order, 'Order fetched')
  } catch (error) {
    console.error('Get order error:', error)
    sendError(res, String(error), 500, 'Failed to fetch order')
  }
})

/**
 * PATCH /api/orders/:id/status
 * Update order status (admin only)
 */
router.patch('/:id/status', authenticate, async (req: Request, res: Response) => {
  try {
    const context = await getSellerContext(req, 'write')
    if (!context) {
      sendError(res, 'Unauthorized', 403)
      return
    }

    const { status } = req.body
    const rawStatus = String(status || '').toLowerCase()
    const requestedStatus = normalizeOrderStage(rawStatus)
    const isRecognizedStatus = [
      ...ORDER_STAGE_SEQUENCE,
      OrderStatus.CANCELLED,
      OrderStatus.REFUNDED,
      'pending',
      'paid',
      'shipped',
      'delivered',
    ].includes(rawStatus)

    if (!status || !isRecognizedStatus) {
      sendError(res, 'Invalid status', 400)
      return
    }
    
    const order = await orderService.getById(req.params.id)
    if (!order) {
      sendError(res, 'Order not found', 404)
      return
    }
    
    const currentStatus = normalizeOrderStage(order.status)
    if (currentStatus === requestedStatus) {
      sendSuccess(res, { success: true }, 'Order status unchanged')
      return
    }

    const nextStage = getNextStage(currentStatus)
    if (!nextStage || nextStage !== requestedStatus) {
      sendError(res, 'Order stages must advance one step at a time', 400)
      return
    }

    if (context.actor.role !== 'admin') {
      const products = await productService.getBySellerId(context.sellerId)
      const sellerProductIds = new Set((products || []).map(p => p.id))
      const contains = order.items.some((it: any) => sellerProductIds.has(it.productId))
      if (!contains) {
        sendError(res, 'Unauthorized', 403)
        return
      }
    }
    
    await orderService.updateStatus(req.params.id, requestedStatus as OrderStatus)

    void (async () => {
      try {
        const sellerOrdersSnapshot = await getFirestore().collection('sellerOrders').where('orderId', '==', req.params.id).get()
        const sellerIds = Array.from(new Set(sellerOrdersSnapshot.docs.map(doc => String(doc.data().sellerId || '')).filter(Boolean)))
        const buyerPriority: 'normal' | 'important' = requestedStatus === OrderStatus.COMPLETED ? 'important' : 'normal'

        await notificationService.createForUser(
          order.userId,
          'order_status_updated',
          `Order ${requestedStatus}`,
          `Your order #${order.id} is now ${requestedStatus.replace('_', ' ')}.`,
          `/orders/${order.id}`,
          buyerPriority,
          { orderId: order.id, status: requestedStatus }
        )

        if (sellerIds.length > 0) {
          await notificationService.createForMany(
            sellerIds,
            'order_status_updated',
            `Order ${requestedStatus}`,
            `Order #${order.id} was updated to ${requestedStatus.replace('_', ' ')}.`,
            `/seller/orders/${order.id}`,
            buyerPriority,
            { orderId: order.id, status: requestedStatus }
          )
        }
      } catch (notificationError) {
        console.error('Failed to create order status notifications:', notificationError)
      }
    })()
    sendSuccess(res, { success: true }, 'Order status updated')
  } catch (error) {
    console.error('Update order status error:', error)
    sendError(res, String(error), 500, 'Failed to update order')
  }
})

export default router
