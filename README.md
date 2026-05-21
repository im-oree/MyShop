# eShop - Production Ready E-Commerce Platform

A modern, scalable, and secure e-commerce platform built with Vite + React + TypeScript on the frontend and Express + Node.js on the backend, with Firebase for authentication and Firestore for data.

## Quick Start

### Frontend

```bash
cd frontend
npm install
npm run dev
```

### Backend

```bash
cd backend
npm install
cp .env.example .env
# Update .env with your Firebase and Paystack credentials
npm run dev
```

## Project Structure

```
frontend/
├── src/
│   ├── components/      # React components
│   ├── pages/          # Page components
│   ├── services/       # API services
│   ├── store/          # Zustand stores
│   ├── types/          # TypeScript types
│   ├── utils/          # Utility functions
│   └── styles/         # CSS/Tailwind styles
├── vite.config.ts
├── tailwind.config.ts
└── tsconfig.json

backend/
├── src/
│   ├── config/         # Configuration
│   ├── controllers/    # Route handlers
│   ├── services/       # Business logic
│   ├── providers/      # Payment providers
│   ├── middlewares/    # Express middlewares
│   ├── routes/         # API routes
│   ├── types/          # TypeScript types
│   └── utils/          # Utility functions
├── tsconfig.json
└── package.json
```

## Features

- ✅ Product catalog with search
- ✅ Shopping cart management
- ✅ User authentication (Firebase)
- ✅ Payment processing (Paystack)
- ✅ Order management
- ✅ Admin dashboard
- ✅ Responsive design
- ✅ TypeScript support
- ✅ Environment detection (dev/staging/production)

## Environment Setup

### Frontend (.env)

```env
VITE_API_BASE_URL=http://localhost:5000/api
VITE_APP_ENV=auto
```

### Backend (.env)

```env
NODE_ENV=development
APP_ENV=auto
PORT=5000
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY=your-private-key
FIREBASE_CLIENT_EMAIL=your-client-email
JWT_SECRET=your-jwt-secret
PAYSTACK_SECRET_KEY=your-paystack-secret
PAYSTACK_PUBLIC_KEY=your-paystack-public-key
CORS_ORIGIN=http://localhost:3000
```

## Deployment

### Frontend (Vercel)

```bash
npm run build
# Deploy dist/ folder to Vercel
```

### Backend (Railway/Render)

Set environment variables in the platform dashboard and deploy.

## Payment Integration

The payment system is abstracted and supports:

- **Paystack** (default)
- **Stripe** (ready for integration)
- **Flutterwave** (ready for integration)
- **PayPal** (future)

To enable additional providers, set feature flags in `.env`.

## Security

- ✅ No Firebase SDK on frontend
- ✅ Backend-only Firebase access
- ✅ JWT-based authentication
- ✅ Rate limiting
- ✅ CORS protection
- ✅ Input validation
- ✅ Environment variable management

## License

MIT
