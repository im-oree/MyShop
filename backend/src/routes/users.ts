import { Router, Request, Response } from 'express'
import { sendSuccess, sendError } from '../utils/response.js'
import { authenticate, requireAdmin } from '../middlewares/index.js'
import { userService, notificationService } from '../services/index.js'
import { EMPLOYEE_ROLE_TEMPLATES, normalizePermissions, resolveTemplatePermissions } from '../utils/rbac.js'

const router = Router()

async function requireSellerOwner(req: Request, res: Response) {
  if (!req.userId) {
    sendError(res, 'Unauthorized', 401)
    return null
  }
  const actor = await userService.getById(req.userId)
  if (!actor || actor.role !== 'seller') {
    sendError(res, 'Only seller owners can manage employees', 403)
    return null
  }
  return actor
}

router.get('/employee-role-templates', authenticate, async (_req: Request, res: Response) => {
  sendSuccess(res, EMPLOYEE_ROLE_TEMPLATES, 'Employee role templates fetched')
})

router.get('/employees', authenticate, async (req: Request, res: Response) => {
  try {
    const actor = await userService.getById(req.userId!)
    if (!actor) {
      sendError(res, 'User not found', 404)
      return
    }

    const sellerId = actor.role === 'seller' ? actor.id : actor.employeeOfSellerId
    if (!sellerId) {
      sendError(res, 'Only seller owners or employees can view this list', 403)
      return
    }

    const employees = await userService.getEmployeesBySellerId(sellerId)
    sendSuccess(res, employees, 'Employees fetched')
  } catch (error) {
    console.error('Get employees error:', error)
    sendError(res, String(error), 500, 'Failed to fetch employees')
  }
})

router.post('/employees', authenticate, async (req: Request, res: Response) => {
  try {
    const owner = await requireSellerOwner(req, res)
    if (!owner) return

    const { email, title, template, permissions } = req.body
    if (!email) {
      sendError(res, 'Employee email is required', 400)
      return
    }

    const target = await userService.getByEmail(String(email).trim().toLowerCase())
    if (!target) {
      sendError(res, 'User with this email was not found', 404)
      return
    }

    if (target.id === owner.id) {
      sendError(res, 'Owner cannot assign self as employee', 400)
      return
    }

    const normalizedTemplate = template || 'custom'
    const resolvedPermissions = resolveTemplatePermissions(normalizedTemplate, normalizePermissions(permissions))
    const assigned = await userService.assignEmployee(
      owner.id,
      target.id,
      title || 'Employee',
      normalizedTemplate,
      resolvedPermissions,
    )

    void notificationService.createForUser(
      target.id,
      'general',
      'You were added as an employee',
      `You now have employee access for ${owner.sellerProfile?.shopName || owner.name}'s shop.`,
      '/seller/shop',
      'important',
      { sellerId: owner.id }
    )

    sendSuccess(res, assigned, 'Employee added successfully', 201)
  } catch (error) {
    console.error('Add employee error:', error)
    sendError(res, String(error), 500, 'Failed to add employee')
  }
})

router.patch('/employees/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const owner = await requireSellerOwner(req, res)
    if (!owner) return

    const { title, template, permissions } = req.body
    const normalizedTemplate = template || 'custom'
    const resolvedPermissions = resolveTemplatePermissions(normalizedTemplate, normalizePermissions(permissions))

    const updated = await userService.updateEmployeeAccess(
      owner.id,
      req.params.id,
      title,
      normalizedTemplate,
      resolvedPermissions,
    )

    sendSuccess(res, updated, 'Employee access updated')
  } catch (error) {
    console.error('Update employee access error:', error)
    sendError(res, String(error), 500, 'Failed to update employee access')
  }
})

/**
 * POST /api/users/:id/apply-seller
 * User applies to become a seller
 */
router.post('/:id/apply-seller', authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const { shopName, shopDescription } = req.body

    // Verify user is applying for themselves
    if (id !== req.userId) {
      sendError(res, 'Unauthorized', 403)
      return
    }

    if (!shopName || !shopDescription) {
      sendError(res, 'Shop name and description are required', 400)
      return
    }

    // Get user
    const user = await userService.getById(id)
    if (!user) {
      sendError(res, 'User not found', 404)
      return
    }

    // Check if already a seller
    if (user.role === 'seller') {
      sendError(res, 'User is already a seller', 400)
      return
    }

    // Check if already applied
    if (user.appliedAsSeller) {
      sendError(res, 'Application already submitted', 400)
      return
    }

    // Update user with seller profile
    await userService.update(id, {
      appliedAsSeller: true,
      sellerApproved: false,
      sellerProfile: {
        shopName,
        shopDescription,
        rating: 5.0,
        totalReviews: 0,
        followers: 0,
      },
    })

    const updatedUser = await userService.getById(id)
    sendSuccess(res, updatedUser, 'Seller application submitted successfully', 201)
  } catch (error) {
    console.error('Apply seller error:', error)
    sendError(res, String(error), 500, 'Failed to submit seller application')
  }
})

/**
 * POST /api/users/:id/approve-seller
 * Admin approves seller application (admin only)
 */
router.post('/:id/approve-seller', authenticate, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params

    // only admins can approve sellers
    // We require the caller to be an admin; use requireAdmin middleware above
    // Note: For safety we also verify the target user exists below

    const user = await userService.getById(id)
    if (!user) {
      sendError(res, 'User not found', 404)
      return
    }

    if (!user.appliedAsSeller) {
      sendError(res, 'User has not applied as seller', 400)
      return
    }

    if (user.sellerApproved) {
      sendError(res, 'Seller already approved', 400)
      return
    }

    // Update user
    await userService.update(id, {
      role: 'seller',
      sellerApproved: true,
    })

    const updatedUser = await userService.getById(id)
    sendSuccess(res, updatedUser, 'Seller approved successfully')
  } catch (error) {
    console.error('Approve seller error:', error)
    sendError(res, String(error), 500, 'Failed to approve seller')
  }
})

/**
 * POST /api/users/:id/reject-seller
 * Admin rejects seller application (admin only)
 */
router.post('/:id/reject-seller', authenticate, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params

    const user = await userService.getById(id)
    if (!user) {
      sendError(res, 'User not found', 404)
      return
    }

    if (!user.appliedAsSeller) {
      sendError(res, 'User has not applied as seller', 400)
      return
    }

    await userService.update(id, {
      role: 'user',
      sellerApproved: false,
      appliedAsSeller: false,
    })

    const updatedUser = await userService.getById(id)
    sendSuccess(res, updatedUser, 'Seller application rejected')
  } catch (error) {
    console.error('Reject seller error:', error)
    sendError(res, String(error), 500, 'Failed to reject seller')
  }
})


/**
 * GET /api/users/pending-seller-applications
 * Admin: list pending seller applications
 */
router.get('/pending-seller-applications', authenticate, requireAdmin, async (_req: Request, res: Response) => {
  try {
    const pending = await userService.getPendingSellerApplications()
    sendSuccess(res, pending, 'Pending seller applications fetched')
  } catch (error) {
    console.error('Get pending seller applications error:', error)
    sendError(res, String(error), 500, 'Failed to fetch pending applications')
  }
})


/**
 * POST /api/users/:id/set-role
 * Admin: set a user's role (admin/moderator/seller/user)
 */
router.post('/:id/set-role', authenticate, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const { role } = req.body

    if (!role || !['admin', 'moderator', 'seller', 'user'].includes(role)) {
      sendError(res, 'Invalid role', 400)
      return
    }

    const user = await userService.getById(id)
    if (!user) {
      sendError(res, 'User not found', 404)
      return
    }

    await userService.update(id, { role })
    const updated = await userService.getById(id)
    sendSuccess(res, updated, 'User role updated')
  } catch (error) {
    console.error('Set role error:', error)
    sendError(res, String(error), 500, 'Failed to set role')
  }
})

/**
 * GET /api/users/:id/seller-profile
 * Get seller profile
 */
router.get('/:id/seller-profile', async (req: Request, res: Response) => {
  try {
    const { id } = req.params

    const user = await userService.getById(id)
    if (!user || user.role !== 'seller') {
      sendError(res, 'Seller not found', 404)
      return
    }

    sendSuccess(res, {
      id: user.id,
      name: user.name,
      shopName: user.sellerProfile?.shopName,
      shopDescription: user.sellerProfile?.shopDescription,
      rating: user.sellerProfile?.rating,
      totalReviews: user.sellerProfile?.totalReviews,
      followers: user.sellerProfile?.followers,
    }, 'Seller profile fetched')
  } catch (error) {
    console.error('Get seller profile error:', error)
    sendError(res, String(error), 500, 'Failed to fetch seller profile')
  }
})

export default router
