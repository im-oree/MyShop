import { Router, Request, Response } from 'express'
import { authenticate } from '../middlewares/index.js'
import { sendError, sendSuccess, sendPaginated } from '../utils/response.js'
import { notificationService, userService } from '../services/index.js'

const router = Router()

router.get('/', authenticate, async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1
    const limit = parseInt(req.query.limit as string) || 20
    const unreadOnly = req.query.unreadOnly === 'true'

    const { notifications, total } = await notificationService.listByUser(req.userId!, page, limit, unreadOnly)
    sendPaginated(res, notifications, total, page, limit)
  } catch (error) {
    console.error('Get notifications error:', error)
    sendError(res, String(error), 500, 'Failed to fetch notifications')
  }
})

router.get('/unread-count', authenticate, async (req: Request, res: Response) => {
  try {
    const count = await notificationService.getUnreadCount(req.userId!)
    sendSuccess(res, { count }, 'Unread count fetched')
  } catch (error) {
    console.error('Unread count error:', error)
    sendError(res, String(error), 500, 'Failed to fetch unread count')
  }
})

router.patch('/:id/read', authenticate, async (req: Request, res: Response) => {
  try {
    await notificationService.markRead(req.userId!, req.params.id)
    sendSuccess(res, { success: true }, 'Notification marked as read')
  } catch (error) {
    console.error('Mark notification read error:', error)
    sendError(res, String(error), 500, 'Failed to mark notification as read')
  }
})

router.patch('/read-all', authenticate, async (req: Request, res: Response) => {
  try {
    await notificationService.markAllRead(req.userId!)
    sendSuccess(res, { success: true }, 'Notifications marked as read')
  } catch (error) {
    console.error('Mark all notifications read error:', error)
    sendError(res, String(error), 500, 'Failed to mark notifications as read')
  }
})

router.post('/register-device', authenticate, async (req: Request, res: Response) => {
  try {
    const { token } = req.body
    if (!token) {
      sendError(res, 'Device token required', 400)
      return
    }

    const user = await userService.getById(req.userId!)
    if (!user) {
      sendError(res, 'User not found', 404)
      return
    }

    const fcmTokens = Array.from(new Set([...(user.fcmTokens || []), String(token)]))
    await userService.update(req.userId!, { fcmTokens })
    sendSuccess(res, { success: true }, 'Device registered')
  } catch (error) {
    console.error('Register device error:', error)
    sendError(res, String(error), 500, 'Failed to register device')
  }
})

export default router
