import dotenv from 'dotenv'
import { EnvironmentConfig, CurrencyConfig } from '../types/config.js'
import { Currency } from '../types/index.js'

// Load environment variables
dotenv.config()

/**
 * Detects the current environment automatically or uses manual override
 */
function detectEnvironment(): 'dev' | 'staging' | 'production' {
  const appEnv = process.env.APP_ENV
  const nodeEnv = process.env.NODE_ENV
  
  // Manual override takes priority
  if (appEnv === 'dev' || appEnv === 'staging' || appEnv === 'production') {
    return appEnv
  }
  
  // Auto-detect from NODE_ENV and hostname
  if (appEnv === 'auto' || !appEnv) {
    // Production detection: Railway, Render, or production NODE_ENV
    if (nodeEnv === 'production' || 
        process.env.RAILWAY_ENVIRONMENT_NAME === 'production' ||
        process.env.RENDER_GIT_BRANCH === 'main') {
      return 'production'
    }
    
    // Staging detection
    if (nodeEnv === 'staging' || 
        process.env.RAILWAY_ENVIRONMENT_NAME === 'staging' ||
        process.env.RENDER_GIT_BRANCH === 'staging') {
      return 'staging'
    }
    
    // Default to development
    return 'dev'
  }
  
  return 'dev'
}

/**
 * Validates required environment variables
 */
function validateEnvVars(): void {
  const required = [
    'FIREBASE_PROJECT_ID',
    'FIREBASE_PRIVATE_KEY',
    'FIREBASE_CLIENT_EMAIL',
    'JWT_SECRET',
    'PAYSTACK_ENV',
  ]

  const paystackEnv = process.env.PAYSTACK_ENV
  if (paystackEnv && !['test', 'live'].includes(paystackEnv)) {
    throw new Error('PAYSTACK_ENV must be either test or live')
  }

  if (paystackEnv === 'test') {
    required.push('PAYSTACK_TEST_SECRET_KEY', 'PAYSTACK_TEST_PUBLIC_KEY')
  } else if (paystackEnv === 'live') {
    required.push('PAYSTACK_LIVE_SECRET_KEY', 'PAYSTACK_LIVE_PUBLIC_KEY')
  }

  const missing = required.filter(v => !process.env[v])

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`)
  }
}

/**
 * Get parsed Firebase private key
 */
function parseFirebaseKey(): string {
  let key = process.env.FIREBASE_PRIVATE_KEY || ''
  
  // Handle escaped newlines
  return key.replace(/\\n/g, '\n')
}

/**
 * Load and validate configuration
 */
export function loadConfig(): EnvironmentConfig {
  validateEnvVars()
  
  const env = detectEnvironment()
  
  return {
    env,
    isDevelopment: env === 'dev',
    isProduction: env === 'production',
    nodeEnv: process.env.NODE_ENV || 'development',
    port: parseInt(process.env.PORT || '5000', 10),
    
    firebase: {
      projectId: process.env.FIREBASE_PROJECT_ID || '',
      privateKey: parseFirebaseKey(),
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL || '',
    },
    
    jwt: {
      secret: process.env.JWT_SECRET || '',
      expiry: process.env.JWT_EXPIRY || '7d',
    },
    
    paystack: {
      environment: (process.env.PAYSTACK_ENV as 'test' | 'live') || 'test',
      secretKey: process.env.PAYSTACK_ENV === 'live'
        ? (process.env.PAYSTACK_LIVE_SECRET_KEY || '')
        : (process.env.PAYSTACK_TEST_SECRET_KEY || ''),
      publicKey: process.env.PAYSTACK_ENV === 'live'
        ? (process.env.PAYSTACK_LIVE_PUBLIC_KEY || '')
        : (process.env.PAYSTACK_TEST_PUBLIC_KEY || ''),
      testSecretKey: process.env.PAYSTACK_TEST_SECRET_KEY || undefined,
      testPublicKey: process.env.PAYSTACK_TEST_PUBLIC_KEY || undefined,
      liveSecretKey: process.env.PAYSTACK_LIVE_SECRET_KEY || undefined,
      livePublicKey: process.env.PAYSTACK_LIVE_PUBLIC_KEY || undefined,
    },
    
    stripe: process.env.ENABLE_STRIPE === 'true'
      ? { secretKey: process.env.STRIPE_SECRET_KEY || '' }
      : undefined,
    
    flutterwave: process.env.ENABLE_FLUTTERWAVE === 'true'
      ? { secretKey: process.env.FLUTTERWAVE_SECRET_KEY || '' }
      : undefined,
    
    corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  }
}

/**
 * Currency configurations for supported currencies
 */
export const currencyConfigs: Record<Currency, CurrencyConfig> = {
  [Currency.NGN]: {
    code: Currency.NGN,
    symbol: '₦',
    name: 'Nigerian Naira',
    decimal: 2,
  },
  [Currency.USD]: {
    code: Currency.USD,
    symbol: '$',
    name: 'US Dollar',
    decimal: 2,
  },
  [Currency.GBP]: {
    code: Currency.GBP,
    symbol: '£',
    name: 'British Pound',
    decimal: 2,
  },
  [Currency.EUR]: {
    code: Currency.EUR,
    symbol: '€',
    name: 'Euro',
    decimal: 2,
  },
}

// Load and export the active configuration
export const config = loadConfig()
