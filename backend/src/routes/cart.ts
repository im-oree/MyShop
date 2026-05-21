import { Router, Request, Response } from 'express'
import { sendSuccess, sendError } from '../utils/response.js'
import { cartService } from '../services/index.js'

const router = Router()

/**
 * GET /api/cart
 * Get the current user's cart
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    if (!req.userId) {
      sendError(res, 'Unauthorized', 401)
      return
    }

    const items = await cartService.getCart(req.userId)
    sendSuccess(res, items, 'Cart fetched')
  } catch (error) {
    console.error('Get cart error:', error)
    sendError(res, String(error), 500, 'Failed to fetch cart')
  }
})

/**
 * POST /api/cart
 * Save the current user's cart
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    if (!req.userId) {
      sendError(res, 'Unauthorized', 401)
      return
    }

    const { items } = req.body

    if (!Array.isArray(items)) {
      sendError(res, 'Items must be an array', 400)
      return
    }

    await cartService.saveCart(req.userId, items)
    sendSuccess(res, items, 'Cart saved')
  } catch (error) {
    console.error('Save cart error:', error)
    sendError(res, String(error), 500, 'Failed to save cart')
  }
})

/**
 * DELETE /api/cart
 * Clear the current user's cart
 */
router.delete('/', async (req: Request, res: Response) => {
  try {
    if (!req.userId) {
      sendError(res, 'Unauthorized', 401)
      return
    }

    await cartService.clearCart(req.userId)
    sendSuccess(res, [], 'Cart cleared')
  } catch (error) {
    console.error('Clear cart error:', error)
    sendError(res, String(error), 500, 'Failed to clear cart')
  }
})

export default router
