declare namespace NodeJS {
  interface ProcessEnv {
    NODE_ENV: 'development' | 'staging' | 'production'
    APP_ENV: 'auto' | 'dev' | 'staging' | 'production'
    PORT: string
    
    // Firebase
    FIREBASE_PROJECT_ID: string
    FIREBASE_PRIVATE_KEY: string
    FIREBASE_CLIENT_EMAIL: string
    
    // JWT
    JWT_SECRET: string
    JWT_EXPIRY: string
    
    // Paystack
    PAYSTACK_SECRET_KEY: string
    PAYSTACK_PUBLIC_KEY: string
    
    // CORS
    CORS_ORIGIN: string
    
    // Features
    ENABLE_STRIPE: string
    ENABLE_FLUTTERWAVE: string
  }
}
