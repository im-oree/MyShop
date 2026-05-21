import { Router, Request, Response } from 'express'
import { sendSuccess, sendError } from '../utils/response.js'
import { userService } from '../services/index.js'
import { authenticate } from '../middlewares/index.js'

const router = Router()

/**
 * GET /api/addresses
 * Get user addresses
 */
router.get('/', authenticate, async (req: Request, res: Response) => {
  try {
    const user = await userService.getById(req.userId!)
    
    if (!user) {
      sendError(res, 'User not found', 404)
      return
    }
    
    sendSuccess(res, user.addresses || [], 'Addresses fetched')
  } catch (error) {
    console.error('Get addresses error:', error)
    sendError(res, String(error), 500, 'Failed to fetch addresses')
  }
})

/**
 * POST /api/addresses
 * Add new address
 */
router.post('/', authenticate, async (req: Request, res: Response) => {
  try {
    const { street, city, state, zipCode, country, isDefault, phone, whatsapp } = req.body

    if (!street || !city || !state || !zipCode || !country || !phone) {
      sendError(res, 'Missing required fields (phone is required)', 400)
      return
    }

    const address = await userService.addAddress(req.userId!, {
      street,
      city,
      state,
      zipCode,
      country,
      isDefault: isDefault || false,
      phone,
      whatsapp,
    })
    
    sendSuccess(res, address, 'Address added', 201)
  } catch (error) {
    console.error('Add address error:', error)
    sendError(res, String(error), 500, 'Failed to add address')
  }
})

/**
 * PUT /api/addresses/:id
 * Update address
 */
router.put('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const updates = req.body
    
    await userService.updateAddress(req.userId!, req.params.id, updates)
    const user = await userService.getById(req.userId!)
    const address = user?.addresses?.find(a => a.id === req.params.id)
    
    sendSuccess(res, address, 'Address updated')
  } catch (error) {
    console.error('Update address error:', error)
    sendError(res, String(error), 500, 'Failed to update address')
  }
})

/**
 * DELETE /api/addresses/:id
 * Delete address
 */
router.delete('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    await userService.deleteAddress(req.userId!, req.params.id)
    sendSuccess(res, { success: true }, 'Address deleted')
  } catch (error) {
    console.error('Delete address error:', error)
    sendError(res, String(error), 500, 'Failed to delete address')
  }
})

export default router
