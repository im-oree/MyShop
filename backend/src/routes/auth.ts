import { Router, Request, Response } from 'express'
import { sendSuccess, sendError } from '../utils/response.js'
import { userService } from '../services/index.js'
import { generateToken } from '../utils/auth.js'
import { authenticate } from '../middlewares/index.js'

const router = Router()

/**
 * POST /api/auth/signup
 * Register a new user
 */
router.post('/signup', async (req: Request, res: Response) => {
  try {
    const { email, password, name } = req.body
    
    if (!email || !password || !name) {
      sendError(res, 'Missing required fields', 400)
      return
    }
    
    // Check if user exists
    const existing = await userService.getByEmail(email)
    if (existing) {
      sendError(res, 'Email already registered', 400)
      return
    }
    
    // Create user
    const user = await userService.create(email, password, name)
    
    // Generate token
    const token = generateToken({ userId: user.id, email: user.email })
    
    sendSuccess(res, { user, token }, 'User registered successfully', 201)
  } catch (error) {
    console.error('Signup error:', error)
    sendError(res, String(error), 500, 'Signup failed')
  }
})

/**
 * POST /api/auth/login
 * Login user with email and password
 */
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body
    
    if (!email || !password) {
      sendError(res, 'Missing email or password', 400)
      return
    }
    
    // Get user
    const user = await userService.getByEmail(email)
    if (!user) {
      sendError(res, 'Invalid credentials', 401)
      return
    }
    
    // For now, just generate token (in production, verify password via Firebase)
    const token = generateToken({ userId: user.id, email: user.email })
    
    sendSuccess(res, { user, token }, 'Login successful')
  } catch (error) {
    console.error('Login error:', error)
    sendError(res, String(error), 500, 'Login failed')
  }
})

/**
 * GET /api/auth/me
 * Get current user
 */
router.get('/me', authenticate, async (req: Request, res: Response) => {
  try {
    const user = await userService.getById(req.userId!)
    
    if (!user) {
      sendError(res, 'User not found', 404)
      return
    }
    
    sendSuccess(res, user, 'User fetched')
  } catch (error) {
    console.error('Get user error:', error)
    sendError(res, String(error), 500, 'Failed to fetch user')
  }
})

/**
 * PUT /api/auth/profile
 * Update user profile
 */
router.put('/profile', authenticate, async (req: Request, res: Response) => {
  try {
    const { name, phone } = req.body
    
    const updates: Record<string, unknown> = {}
    if (name) updates.name = name
    if (phone) updates.phone = phone
    
    await userService.update(req.userId!, updates)
    const user = await userService.getById(req.userId!)
    
    sendSuccess(res, user, 'Profile updated')
  } catch (error) {
    console.error('Update profile error:', error)
    sendError(res, String(error), 500, 'Failed to update profile')
  }
})

export default router
