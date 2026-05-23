import express, { Express, Request, Response, NextFunction } from 'express'
import cors from 'cors'
import { config } from './config/index.js'
import { initializeFirebase } from './config/firebase.js'
import { authenticate, rateLimit, errorHandler } from './middlewares/index.js'

// Import routes
import authRoutes from './routes/auth.js'
import productRoutes from './routes/products.js'
import orderRoutes from './routes/orders.js'
import paymentRoutes from './routes/payments.js'
import notificationRoutes from './routes/notifications.js'
import messageRoutes from './routes/messages.js'
import addressRoutes from './routes/addresses.js'
import userRoutes from './routes/users.js'
import adminRoutes from './routes/admin.js'
import auditRoutes from './routes/audit.js'
import cartRoutes from './routes/cart.js'

export class App {
  private app: Express
  
  constructor() {
    this.app = express()
    this.setupMiddlewares()
    this.setupRoutes()
    this.setupErrorHandling()
  }
  
  private setupMiddlewares(): void {
    // Initialize Firebase
    initializeFirebase()
    
    // Body parsing
    this.app.use(express.json({ limit: '10mb' }))
    this.app.use(express.urlencoded({ limit: '10mb', extended: true }))

    const configuredOrigins = config.corsOrigin
      .split(',')
      .map(origin => origin.trim())
      .filter(Boolean)
    
    // CORS
    this.app.use(cors({
      origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
        if (!origin) {
          callback(null, true)
          return
        }

        const localhostRegex = /^http:\/\/(localhost|127\.0\.0\.1):\d+$/
        const isDevLocalhost = config.isDevelopment && localhostRegex.test(origin)
        const isConfigured = configuredOrigins.includes(origin)
        const allowAllConfigured = configuredOrigins.includes('*')

        if (isDevLocalhost || isConfigured || allowAllConfigured) {
          callback(null, true)
          return
        }

        callback(new Error(`CORS blocked for origin: ${origin}`))
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    }))
    
    // Rate limiting
    this.app.use(rateLimit(15 * 60 * 1000, 100))
    
    // Request logging (basic)
    this.app.use((_req: Request, _res: Response, next: NextFunction) => {
      console.log(`[${new Date().toISOString()}] ${_req.method} ${_req.path}`)
      next()
    })
  }
  
  private setupRoutes(): void {
    // API routes prefix
    const apiRouter = express.Router()
    
    // Health check (under /api)
    apiRouter.get('/health', (_req: Request, res: Response) => {
      res.json({
        status: 'ok',
        environment: config.env,
        timestamp: new Date().toISOString(),
      })
    })
    
    // Register routes
    apiRouter.use('/auth', authRoutes)
    apiRouter.use('/products', productRoutes)
    apiRouter.use('/orders', authenticate, orderRoutes)
    apiRouter.use('/payments', paymentRoutes)
    apiRouter.use('/notifications', authenticate, notificationRoutes)
    apiRouter.use('/messages', authenticate, messageRoutes)
    apiRouter.use('/addresses', authenticate, addressRoutes)
    apiRouter.use('/users', userRoutes)
    apiRouter.use('/admin', adminRoutes)
    apiRouter.use('/audit', auditRoutes)
    apiRouter.use('/cart', authenticate, cartRoutes)
    
    this.app.use('/api', apiRouter)
    
    // 404 handler
    this.app.use((req: Request, res: Response) => {
      res.status(404).json({
        success: false,
        message: 'Not found',
        error: `${req.method} ${req.path} not found`,
      })
    })
  }
  
  private setupErrorHandling(): void {
    this.app.use(errorHandler)
  }
  
  getApp(): Express {
    return this.app
  }
  
  listen(port: number = config.port): void {
    this.app.listen(port, () => {
      console.log(`🚀 Server running on port ${port}`)
      console.log(`📍 Environment: ${config.env}`)
      console.log(`🔗 CORS Origin: ${config.corsOrigin}`)
    })
  }
}
