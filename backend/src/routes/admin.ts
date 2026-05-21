import { Router, Request, Response } from 'express'
import { authenticate, requireAdmin } from '../middlewares/index.js'
import { sendSuccess, sendError } from '../utils/response.js'
import { orderService, userService, productService } from '../services/index.js'
import { OrderStatus, PaymentStatus, User } from '../types/index.js'

const router = Router()

function toDateValue(value: unknown): Date {
  if (value instanceof Date) return value
  if (value && typeof value === 'object' && 'toDate' in value && typeof (value as { toDate?: () => Date }).toDate === 'function') {
    return (value as { toDate: () => Date }).toDate()
  }
  return new Date(value as string | number | Date)
}

function isActiveUser(user: User): boolean {
  const updatedAt = toDateValue(user.updatedAt)
  const createdAt = toDateValue(user.createdAt)
  const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000
  return updatedAt.getTime() >= cutoff || createdAt.getTime() >= cutoff
}

function bucketKey(date: Date, range: 'today' | 'week' | 'month'): string {
  if (range === 'today') {
    return date.toISOString().slice(0, 13)
  }

  if (range === 'week') {
    return date.toISOString().slice(0, 10)
  }

  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`
}

/**
 * GET /api/admin/overview
 * Dashboard summary for users, revenue, and seller verification.
 */
router.get('/overview', authenticate, requireAdmin, async (_req: Request, res: Response) => {
  try {
    const [{ users: allUsers }, { orders: allOrders }, productResult] = await Promise.all([
      userService.getAll(1, 500),
      orderService.getAll(1, 500),
      productService.getAll(1, 1),
    ])
    const { total: totalProducts } = productResult

    const totalUsers = allUsers.length
    const activeUsers = allUsers.filter(isActiveUser).length
    const sellerCount = allUsers.filter(user => user.role === 'seller').length
    const pendingSellerApplications = allUsers.filter(user => user.appliedAsSeller && user.sellerApproved !== true && user.role !== 'seller')

    const now = new Date()
    const dayStart = new Date(now)
    dayStart.setHours(0, 0, 0, 0)
    const weekStart = new Date(now)
    weekStart.setDate(now.getDate() - 6)
    weekStart.setHours(0, 0, 0, 0)
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

    const completedOrders = allOrders.filter(order => order.paymentStatus === PaymentStatus.COMPLETED || order.status === OrderStatus.COMPLETED)

    const revenueForRange = (start: Date) =>
      completedOrders
        .filter(order => toDateValue(order.createdAt) >= start)
        .reduce((sum, order) => sum + (order.totalAmount || 0), 0)

    const timelineMap = new Map<string, number>()
    completedOrders.forEach(order => {
      const key = bucketKey(toDateValue(order.createdAt), 'week')
      timelineMap.set(key, (timelineMap.get(key) || 0) + (order.totalAmount || 0))
    })

    const last7Days = Array.from({ length: 7 }, (_, index) => {
      const day = new Date()
      day.setDate(day.getDate() - (6 - index))
      day.setHours(0, 0, 0, 0)
      const key = bucketKey(day, 'week')
      return {
        label: day.toLocaleDateString('en-NG', { weekday: 'short' }),
        date: key,
        revenue: timelineMap.get(key) || 0,
        orders: completedOrders.filter(order => {
          const orderDate = toDateValue(order.createdAt)
          return orderDate.toDateString() === day.toDateString()
        }).length,
      }
    })

    sendSuccess(res, {
      users: {
        totalUsers,
        activeUsers,
        sellerCount,
        users: allUsers,
      },
      revenue: {
        totalRevenue: completedOrders.reduce((sum, order) => sum + (order.totalAmount || 0), 0),
        today: revenueForRange(dayStart),
        thisWeek: revenueForRange(weekStart),
        thisMonth: revenueForRange(monthStart),
        timeline: last7Days,
      },
      products: {
        totalProducts,
      },
      sellerVerification: {
        pending: pendingSellerApplications,
        approved: sellerCount,
      },
    }, 'Admin overview fetched')
  } catch (error) {
    console.error('Admin overview error:', error)
    sendError(res, String(error), 500, 'Failed to load admin overview')
  }
})

/**
 * GET /api/admin/users
 * Admin user listing.
 */
router.get('/users', authenticate, requireAdmin, async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1
    const limit = parseInt(req.query.limit as string) || 20
    const { users, total } = await userService.getAll(page, limit)

    sendSuccess(res, {
      items: users,
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    }, 'Users fetched')
  } catch (error) {
    console.error('Admin users error:', error)
    sendError(res, String(error), 500, 'Failed to fetch users')
  }
})

/**
 * GET /api/admin/revenue
 * Admin revenue analytics.
 */
router.get('/revenue', authenticate, requireAdmin, async (req: Request, res: Response) => {
  try {
    const range = (req.query.range as string) || 'week'
    const allOrders = await orderService.getAll(1, 1000)
    const completedOrders = allOrders.orders.filter(order => order.paymentStatus === PaymentStatus.COMPLETED || order.status === OrderStatus.COMPLETED)

    const dayStart = new Date()
    dayStart.setHours(0, 0, 0, 0)
    const weekStart = new Date()
    weekStart.setDate(weekStart.getDate() - 6)
    weekStart.setHours(0, 0, 0, 0)

    const bucketed = new Map<string, { amount: number; count: number }>()

    completedOrders.forEach(order => {
      const createdAt = toDateValue(order.createdAt)
      if (range === 'today' && createdAt < dayStart) return
      if (range === 'week' && createdAt < weekStart) return

      const key = range === 'today'
        ? `${String(createdAt.getHours()).padStart(2, '0')}:00`
        : range === 'week'
          ? createdAt.toLocaleDateString('en-NG', { weekday: 'short' })
          : `${createdAt.getFullYear()}-${String(createdAt.getMonth() + 1).padStart(2, '0')}`

      const current = bucketed.get(key) || { amount: 0, count: 0 }
      current.amount += order.totalAmount || 0
      current.count += 1
      bucketed.set(key, current)
    })

    const series = Array.from(bucketed.entries()).map(([label, value]) => ({
      label,
      amount: value.amount,
      count: value.count,
    }))

    sendSuccess(res, {
      range,
      totalRevenue: completedOrders.reduce((sum, order) => sum + (order.totalAmount || 0), 0),
      today: completedOrders.filter(order => toDateValue(order.createdAt) >= dayStart).reduce((sum, order) => sum + (order.totalAmount || 0), 0),
      thisWeek: completedOrders.filter(order => toDateValue(order.createdAt) >= weekStart).reduce((sum, order) => sum + (order.totalAmount || 0), 0),
      series,
    }, 'Revenue fetched')
  } catch (error) {
    console.error('Admin revenue error:', error)
    sendError(res, String(error), 500, 'Failed to fetch revenue')
  }
})

export default router