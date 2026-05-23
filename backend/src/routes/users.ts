import { Router, Request, Response } from 'express'
import { sendSuccess, sendError } from '../utils/response.js'
import { authenticate, requireAdmin } from '../middlewares/index.js'
import { userService, notificationService, auditLogService } from '../services/index.js'
import { EMPLOYEE_ROLE_TEMPLATES, normalizePermissions, resolveTemplatePermissions } from '../utils/rbac.js'

const router = Router()

async function requireStaffAdmin(req: Request, res: Response) {
  if (!req.userId) {
    sendError(res, 'Unauthorized', 401)
    return null
  }
  const actor = await userService.getById(req.userId)
  if (!actor || (actor.role !== 'admin' && actor.role !== 'manager')) {
    sendError(res, 'Only admin/managers can manage employees', 403)
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

    const adminId = actor.role === 'admin' || actor.role === 'manager' ? actor.id : actor.managedByUserId
    if (!adminId) {
      sendError(res, 'Only admin/managers or employees can view this list', 403)
      return
    }

    const employees = await userService.getEmployeesByAdminId(adminId)
    sendSuccess(res, employees, 'Employees fetched')
  } catch (error) {
    console.error('Get employees error:', error)
    sendError(res, String(error), 500, 'Failed to fetch employees')
  }
})

router.post('/employees', authenticate, async (req: Request, res: Response) => {
  try {
    const owner = await requireStaffAdmin(req, res)
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
      `You now have employee access for ${owner.name}'s store.`,
      '/seller/shop',
      'important',
      { sellerId: owner.id }
    )

    // Audit log: employee assigned
    void auditLogService.log({
      actorId: owner.id,
      actorName: owner.name,
      actorRole: owner.role,
      action: 'employee.assign',
      resourceType: 'user',
      resourceId: assigned.id,
      meta: { title: assigned.employeeTitle, permissions: assigned.employeePermissions },
      ip: req.ip,
      userAgent: req.headers['user-agent'] as string | undefined,
    })

    sendSuccess(res, assigned, 'Employee added successfully', 201)
  } catch (error) {
    console.error('Add employee error:', error)
    sendError(res, String(error), 500, 'Failed to add employee')
  }
})

router.patch('/employees/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const owner = await requireStaffAdmin(req, res)
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

    void auditLogService.log({
      actorId: owner.id,
      actorName: owner.name,
      actorRole: owner.role,
      action: 'employee.update',
      resourceType: 'user',
      resourceId: updated.id,
      meta: { title: updated.employeeTitle, permissions: updated.employeePermissions },
      ip: req.ip,
      userAgent: req.headers['user-agent'] as string | undefined,
    })

    sendSuccess(res, updated, 'Employee access updated')
  } catch (error) {
    console.error('Update employee access error:', error)
    sendError(res, String(error), 500, 'Failed to update employee access')
  }
})

router.delete('/employees/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const owner = await requireStaffAdmin(req, res)
    if (!owner) return

    const removed = await userService.removeEmployee(owner.id, req.params.id)
    void auditLogService.log({
      actorId: owner.id,
      actorName: owner.name,
      actorRole: owner.role,
      action: 'employee.remove',
      resourceType: 'user',
      resourceId: removed.id,
      meta: {},
      ip: req.ip,
      userAgent: req.headers['user-agent'] as string | undefined,
    })

    sendSuccess(res, removed, 'Employee removed successfully')
  } catch (error) {
    console.error('Remove employee error:', error)
    sendError(res, String(error), 500, 'Failed to remove employee')
  }
})

router.post('/:id/apply-seller', authenticate, async (_req: Request, res: Response) => {
  sendError(res, 'Seller applications are disabled in single-owner mode', 410)
})

/**
 * POST /api/users/:id/approve-seller
 * Admin approves seller application (admin only)
 */
router.post('/:id/approve-seller', authenticate, requireAdmin, async (_req: Request, res: Response) => {
  sendError(res, 'Seller approvals are disabled in single-owner mode', 410)
})

/**
 * POST /api/users/:id/reject-seller
 * Admin rejects seller application (admin only)
 */
router.post('/:id/reject-seller', authenticate, requireAdmin, async (_req: Request, res: Response) => {
  sendError(res, 'Seller applications are disabled in single-owner mode', 410)
})


/**
 * GET /api/users/pending-seller-applications
 * Admin: list pending seller applications
 */
router.get('/pending-seller-applications', authenticate, requireAdmin, async (_req: Request, res: Response) => {
  sendSuccess(res, [], 'Seller applications are disabled in single-owner mode')
})


/**
 * POST /api/users/:id/set-role
 * Admin: set a user's role (admin/manager/employee/user)
 */
router.post('/:id/set-role', authenticate, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const { role } = req.body

    if (!role || !['admin', 'manager', 'employee', 'user'].includes(role)) {
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
    // Audit: role change
    void auditLogService.log({
      actorId: req.userId,
      actorName: (req.user && (req.user as any).name) || undefined,
      actorRole: (req.user && (req.user as any).role) || undefined,
      action: 'user.setRole',
      resourceType: 'user',
      resourceId: id,
      meta: { role },
      ip: req.ip,
      userAgent: req.headers['user-agent'] as string | undefined,
    })

    sendSuccess(res, updated, 'User role updated')
  } catch (error) {
    console.error('Set role error:', error)
    sendError(res, String(error), 500, 'Failed to set role')
  }
})

router.get('/:id/seller-profile', async (_req: Request, res: Response) => {
  sendError(res, 'Seller profiles are unavailable in single-owner mode', 410)
})

export default router
