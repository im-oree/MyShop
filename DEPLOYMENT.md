# E-Commerce Platform - Deployment Guide

## Prerequisites

- Node.js 16+ and npm/yarn
- Firebase project (Firestore + Auth)
- Paystack account
- Vercel account (for frontend)
- Railway or Render account (for backend)

## Environment Setup

### 1. Firebase Setup

1. Create a project on [Firebase Console](https://console.firebase.google.com)
2. Enable Firestore Database
3. Enable Authentication (Email/Password)
4. Create a service account:
   - Go to Project Settings → Service Accounts
   - Click "Generate New Private Key"
   - Copy the JSON credentials

### 2. Paystack Setup

1. Sign up on [Paystack](https://paystack.com)
2. Get your API keys from Settings → Developers
3. Copy Secret Key and Public Key

### 3. Backend Deployment (Railway)

1. Create a Railway account
2. Create a new project
3. Connect your GitHub repository
4. Add environment variables from `.env.example`:

```env
NODE_ENV=production
APP_ENV=auto
PORT=5000
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY=your-private-key
FIREBASE_CLIENT_EMAIL=your-client-email
JWT_SECRET=your-secret-key
PAYSTACK_SECRET_KEY=your-secret-key
PAYSTACK_PUBLIC_KEY=your-public-key
CORS_ORIGIN=https://your-frontend-domain.com
```

5. Deploy the backend directory

### 4. Frontend Deployment (Vercel)

1. Push frontend code to GitHub
2. Go to [Vercel](https://vercel.com)
3. Import the repository
4. Set root directory to `frontend`
5. Add environment variables:

```env
VITE_API_BASE_URL=https://your-backend-domain.com/api
VITE_APP_ENV=production
```

6. Deploy

## Local Development

### Backend

```bash
cd backend
cp .env.example .env
# Update .env with your credentials
npm install
npm run dev
```

Server runs on `http://localhost:5000`

### Frontend

```bash
cd frontend
cp .env.example .env.local
# Update .env.local with your API URL
npm install
npm run dev
```

App runs on `http://localhost:3000`

## Payment Webhook Setup (Paystack)

1. Go to Paystack Dashboard → Settings → Webhooks
2. Add webhook URL: `https://your-backend-domain.com/api/payments/webhook`
3. Select events: `charge.success`

## Database Schema

### Collections in Firestore

```
/users
  /userId
    - email: string
    - name: string
    - phone: string
    - addresses: Address[]
    - createdAt: timestamp
    - updatedAt: timestamp

/products
  /productId
    - name: string
    - description: string
    - price: number (kobo)
    - images: string[]
    - category: string
    - stock: number
    - featured: boolean
    - createdAt: timestamp

/orders
  /orderId
    - userId: string
    - items: OrderItem[]
    - totalAmount: number (kobo)
    - status: string
    - paymentStatus: string
    - shippingAddress: Address
    - paymentRef: string
    - createdAt: timestamp

/categories
  /categoryId
    - name: string
    - slug: string
```

## Scaling Considerations

### Frontend
- Image optimization with CDN
- Code splitting with React.lazy
- Service worker for offline support
- Database indexes for Firestore queries

### Backend
- Connection pooling for Firestore
- Rate limiting per user/IP
- Caching layer (Redis)
- Async job queue for emails/notifications

### Database
- Composite indexes for common queries
- Archive old orders to separate collection
- Backup strategy

## Monitoring & Logging

- Use Railway/Render logs for backend monitoring
- Vercel analytics for frontend performance
- Firebase billing alerts
- Consider sending logs to external service (e.g., LogRocket, Sentry)

## Security Checklist

- [ ] Firebase Rules restrict unauthorized access
- [ ] JWT tokens have expiration
- [ ] Passwords hashed with bcrypt
- [ ] CORS properly configured
- [ ] Environment variables not committed
- [ ] Payment webhook signature verified
- [ ] Rate limiting enabled
- [ ] Input validation on all endpoints
- [ ] HTTPS enforced everywhere

## Troubleshooting

### Backend won't start
- Check environment variables
- Verify Firebase credentials
- Check port availability

### Payment integration failing
- Verify Paystack credentials
- Check webhook URL is accessible
- Enable CORS for payment domain

### Frontend can't reach backend
- Check CORS_ORIGIN in backend
- Verify API URL in frontend .env
- Check network connectivity

## Support

For issues, check:
1. Firebase documentation
2. Paystack API docs
3. Express/Fastify guides
4. React/Vite documentation
