import { Router, Request, Response } from 'express'
import { sendSuccess, sendError } from '../utils/response.js'
import { PaymentService } from '../services/index.js'
import { orderService, userService, emailService, notificationService } from '../services/index.js'
import { getFirestore } from '../config/firebase.js'
import { authenticate, optionalAuth } from '../middlewares/index.js'
import { PaymentStatus } from '../types/index.js'

const router = Router()

/**
 * POST /api/payments/initialize
 * Initialize payment for an order
 */
router.post('/initialize', authenticate, async (req: Request, res: Response) => {
  try {
    const { orderId } = req.body
    
    if (!orderId) {
      sendError(res, 'Order ID required', 400)
      return
    }
    
    // Get order
    const order = await orderService.getById(orderId)
    if (!order) {
      sendError(res, 'Order not found', 404)
      return
    }
    
    // Check authorization
    if (order.userId !== req.userId) {
      sendError(res, 'Unauthorized', 403)
      return
    }
    
    // Initialize payment
    const paymentService = new PaymentService('paystack')
    const result = await paymentService.initializePayment({
      orderId,
      amount: order.totalAmount,
      currency: order.currency,
      email: req.user?.email as string,
      metadata: {
        userId: order.userId,
      },
    })

    if (result.success && result.reference) {
      await orderService.updatePaymentStatus(order.id, PaymentStatus.PENDING, result.reference)
    }
    
    sendSuccess(res, result, result.success ? 'Payment initialized' : result.message)
  } catch (error) {
    console.error('Initialize payment error:', error)
    sendError(res, String(error), 500, 'Payment initialization failed')
  }
})

/**
 * POST /api/payments/verify
 * Verify payment
 */
router.post('/verify', optionalAuth, async (req: Request, res: Response) => {
  try {
    const { reference, orderId } = req.body
    
    if (!reference) {
      sendError(res, 'Payment reference required', 400)
      return
    }
    
    // Get order by payment reference
    let order = await orderService.getByPaymentRef(reference)
    if (!order && orderId) {
      order = await orderService.getById(orderId)
    }
    
    if (!order) {
      sendError(res, 'Order not found', 404)
      return
    }
    
    // Check authorization for authenticated users
    if (req.userId && order.userId !== req.userId) {
      sendError(res, 'Unauthorized', 403)
      return
    }
    
    // Verify payment
    const paymentService = new PaymentService('paystack')
    const result = await paymentService.verifyPayment({
      reference,
      amount: order.totalAmount,
      currency: order.currency,
    })
    
    if (result.success) {
      // Update order payment status
      await orderService.updatePaymentStatus(
        order.id,
        PaymentStatus.COMPLETED,
        reference
      )
      
      // Send confirmation emails (async, don't block response)
      ;(async () => {
        try {
          const buyer = await userService.getById(order.userId)
          if (buyer?.email) {
            await emailService.sendPaymentConfirmation(order, buyer.email, buyer.name)
          }

          // Send a single owner notification instead of splitting by seller
          const owner = (await userService.getAll(1, 1000)).users.find(u => u.role === 'admin' || u.role === 'manager')
          if (owner?.email) {
            await emailService.sendOrderNotificationToSeller(
              order,
              owner.email,
              owner.name,
              order.items.map(item => ({ id: item.productId })) as any
            )
          }
        } catch (emailError) {
          console.error('Error sending emails:', emailError)
          // Don't fail the payment verification if emails fail
        }
      })()

      // Create important in-app notifications
      void (async () => {
        try {
          const buyer = await userService.getById(order.userId)
          if (buyer?.email) {
            await emailService.sendPaymentConfirmation(order, buyer.email, buyer.name)
          }
          await notificationService.createForUser(
            order.userId,
            'payment_confirmed',
            'Payment confirmed',
            `Payment for order #${order.id} was confirmed successfully.`,
            `/orders/${order.id}`,
            'important',
            { orderId: order.id, reference }
          )

          const owner = (await userService.getAll(1, 1000)).users.find(u => u.role === 'admin' || u.role === 'manager')
          if (owner) {
            await notificationService.createForUser(
              owner.id,
              'order_created',
              'New order received',
              `A new order #${order.id} was placed in the store.`,
              `/orders/${order.id}`,
              'important',
              { orderId: order.id, reference }
            )
          }

        } catch (notificationError) {
          console.error('Failed to create payment notifications:', notificationError)
        }
      })()
      
      // Create fulfillment record for the store owner
      try {
        const db = getFirestore()
        const docRef = db.collection('ownerOrders').doc()
        await docRef.set({
          id: docRef.id,
          orderId: order.id,
          items: order.items.map(item => ({ ...item, orderId: order.id })),
          status: 'pending',
          createdAt: new Date(),
          updatedAt: new Date(),
        })
      } catch (e) {
        console.error('Failed to create owner order record:', e)
      }
    }

    // Refresh order data to return updated order
    const updatedOrder = await orderService.getById(order.id)
    sendSuccess(res, { result, order: updatedOrder }, result.success ? 'Payment verified' : result.message)
  } catch (error) {
    console.error('Verify payment error:', error)
    sendError(res, String(error), 500, 'Payment verification failed')
  }
})

/**
 * POST /api/payments/webhook
 * Paystack webhook handler
 */
router.post('/webhook', async (req: Request, res: Response) => {
  try {
    // TODO: Verify Paystack signature
    
    const { data } = req.body
    
    if (data.status === 'success') {
      const reference = data.reference
      const order = await orderService.getByPaymentRef(reference)
      
      if (order) {
        await orderService.updatePaymentStatus(
          order.id,
          PaymentStatus.COMPLETED,
          reference
        )
      }
    }
    
    sendSuccess(res, { success: true }, 'Webhook processed')
  } catch (error) {
    console.error('Webhook error:', error)
    sendError(res, String(error), 500, 'Webhook processing failed')
  }
})

export default router
