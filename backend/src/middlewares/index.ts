import { Request, Response, NextFunction } from 'express'
import { sendError } from '../utils/response.js'
import { verifyToken } from '../utils/auth.js'
import { userService } from '../services/index.js'

declare global {
  namespace Express {
    interface Request {
      userId?: string
      user?: Record<string, unknown>
    }
  }
}

/**
 * Authenticate JWT token
 */
export function authenticate(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    sendError(res, 'Missing or invalid authorization header', 401, 'Unauthorized')
    return
  }
  
  const token = authHeader.substring(7)
  const payload = verifyToken(token)
  
  if (!payload) {
    sendError(res, 'Invalid or expired token', 401, 'Unauthorized')
    return
  }
  
  req.userId = payload.userId as string
  req.user = payload
  next()
}

/**
 * Optional authentication - doesn't fail if missing
 */
export function optionalAuth(req: Request, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7)
    const payload = verifyToken(token)
    
    if (payload) {
      req.userId = payload.userId as string
      req.user = payload
    }
  }
  
  next()
}

/**
 * Require admin role
 */
export async function requireAdmin(req: Request, res: Response, next: NextFunction): Promise<void> {
  if (!req.userId) {
    sendError(res, 'Unauthorized', 401, 'Unauthorized')
    return
  }

  try {
    const user = await userService.getById(req.userId)
    if (!user || user.role !== 'admin') {
      sendError(res, 'Only admins can perform this action', 403)
      return
    }
    next()
  } catch (err) {
    console.error('requireAdmin error:', err)
    sendError(res, 'Server error', 500)
  }
}

/**
 * Rate limit middleware
 */
export function rateLimit(windowMs: number = 15 * 60 * 1000, maxRequests: number = 100) {
  const store = new Map<string, { count: number; resetTime: number }>()
  
  return (req: Request, res: Response, next: NextFunction): void => {
    // Keep notification inbox endpoints responsive for live badge + list fetches.
    if (req.path.startsWith('/api/notifications')) {
      next()
      return
    }

    const key = req.ip || 'unknown'
    const now = Date.now()
    const record = store.get(key)
    
    if (record && record.resetTime > now) {
      record.count++
      
      if (record.count > maxRequests) {
        sendError(res, 'Too many requests', 429, 'Rate limited')
        return
      }
    } else {
      store.set(key, { count: 1, resetTime: now + windowMs })
    }
    
    next()
  }
}

/**
 * Error handler middleware
 */
export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction): void {
  console.error('Error:', err.message)
  
  sendError(
    res,
    err.message || 'Internal server error',
    500,
    'Server error'
  )
}
