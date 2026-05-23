import { Router, Request, Response } from 'express'
import { authenticate } from '../middlewares/index.js'
import { sendSuccess, sendError } from '../utils/response.js'
import { auditLogService, userService } from '../services/index.js'

const router = Router()

router.get('/', authenticate, async (req: Request, res: Response) => {
  try {
    const user = await userService.getById(req.userId!)
    if (!user) {
      sendError(res, 'User not found', 404)
      return
    }

    if (!['admin', 'manager'].includes(user.role)) {
      sendError(res, 'Only admin or managers can view audit logs', 403)
      return
    }

    const page = parseInt(req.query.page as string) || 1
    const limit = Math.min(100, parseInt(req.query.limit as string) || 50)
    const { items, total } = await auditLogService.query(page, limit)

    sendSuccess(res, { items, total, page, limit, pages: Math.ceil(total / limit) }, 'Audit logs fetched')
  } catch (error) {
    console.error('Fetch audit logs error:', error)
    sendError(res, String(error), 500, 'Failed to fetch audit logs')
  }
})

export default router
