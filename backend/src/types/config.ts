import { Currency } from './index.js'

export interface EnvironmentConfig {
  env: 'dev' | 'staging' | 'production'
  isDevelopment: boolean
  isProduction: boolean
  nodeEnv: string
  port: number
  
  // Firebase
  firebase: {
    projectId: string
    privateKey: string
    clientEmail: string
  }
  
  // JWT
  jwt: {
    secret: string
    expiry: string
  }
  
  // Paystack
  paystack: {
    environment: 'test' | 'live'
    secretKey: string
    publicKey: string
    testSecretKey?: string
    testPublicKey?: string
    liveSecretKey?: string
    livePublicKey?: string
  }
  
  // Optional Providers
  stripe?: {
    secretKey: string
  }
  flutterwave?: {
    secretKey: string
  }
  
  // CORS
  corsOrigin: string
}

export interface CurrencyConfig {
  code: Currency
  symbol: string
  name: string
  decimal: number
}
