# E-Commerce Platform - Architecture & Development Guide

## System Architecture

```
┌─────────────────────────────────────────────────────┐
│                   Frontend (Vercel)                 │
│         React + TypeScript + Tailwind CSS           │
│              Vite Build Tool                        │
└──────────────────┬──────────────────────────────────┘
                   │ HTTPS
                   │
┌──────────────────▼──────────────────────────────────┐
│              API Gateway (Express)                  │
│           Backend (Railway/Render)                  │
│     TypeScript + REST API                          │
└──────────────┬──────────────────┬───────────────────┘
               │                  │
         [Firebase]          [Paystack]
        Firestore            Payment
        Auth                 Gateway
  ┌──────────────┴──────────┐
  │    Services Layer       │
  │ - Products              │
  │ - Orders                │
  │ - Payments              │
  │ - Users                 │
  └────────────────────────┘
```

## Data Flow

### Product Browsing
1. Frontend requests products from `/api/products`
2. Backend queries Firestore
3. Returns paginated results

### Checkout Flow
1. User adds items to cart (Zustand store)
2. Navigates to checkout
3. Selects address
4. Clicks "Pay Now"
5. Backend creates order in Firestore
6. Calls Paystack API to generate payment link
7. User redirected to Paystack page
8. After payment, webhook confirms transaction
9. Order status updated in Firestore

## Code Organization

### Frontend Structure

```
frontend/
├── src/
│   ├── components/       # Reusable UI components
│   │   ├── Header.tsx
│   │   ├── Footer.tsx
│   │   ├── Layout.tsx
│   ├── pages/           # Page components
│   │   ├── HomePage.tsx
│   │   ├── LoginPage.tsx
│   ├── services/        # API communication
│   │   ├── api.ts       # Axios instance
│   │   ├── productService.ts
│   │   ├── authService.ts
│   ├── store/           # Zustand stores
│   │   ├── authStore.ts
│   │   ├── cartStore.ts
│   ├── hooks/           # Custom React hooks
│   ├── utils/           # Utility functions
│   └── styles/          # CSS/Tailwind
├── index.html
├── vite.config.ts
├── tailwind.config.ts
└── tsconfig.json
```

### Backend Structure

```
backend/
├── src/
│   ├── config/          # Configuration
│   │   ├── index.ts     # Environment loading
│   │   ├── firebase.ts  # Firebase setup
│   ├── services/        # Business logic
│   │   ├── ProductService.ts
│   │   ├── UserService.ts
│   │   ├── OrderService.ts
│   │   ├── PaymentService.ts
│   ├── providers/       # Payment providers
│   │   ├── PaystackProvider.ts
│   │   ├── OtherProviders.ts
│   ├── routes/          # API routes
│   │   ├── auth.ts
│   │   ├── products.ts
│   │   ├── orders.ts
│   │   ├── payments.ts
│   ├── middlewares/     # Express middleware
│   │   └── index.ts     # Auth, error handling
│   ├── types/           # TypeScript types
│   ├── utils/           # Utilities
│   ├── app.ts           # Express app setup
│   └── server.ts        # Server entry point
└── tsconfig.json
```

## Key Features Implementation

### 1. Environment Detection

The app automatically detects environment based on:
- `NODE_ENV` variable
- Railway/Render platform metadata
- Manual `APP_ENV` override

See `backend/src/config/index.ts`

### 2. Payment Abstraction

All payment providers implement `IPaymentProvider`:

```typescript
interface IPaymentProvider {
  initializePayment(data: PaymentInitiation): Promise<PaymentResponse>
  verifyPayment(data: PaymentVerification): Promise<PaymentResponse>
  refundPayment(reference: string, amount: number): Promise<PaymentResponse>
}
```

Adding a new provider:
1. Create class implementing `IPaymentProvider`
2. Register in `PaymentService`
3. Enable with feature flag in `.env`

### 3. Firebase Integration

- Firestore for data storage
- Auth for user management
- Never expose Firebase SDK on frontend
- All Firebase calls through backend APIs

### 4. Authentication Flow

1. User signs up with email/password
2. Firebase creates user account
3. Backend generates JWT token
4. Token stored in localStorage
5. Token sent with each API request
6. Middleware validates token

### 5. Price Handling

All prices stored in **kobo** (100 kobo = 1 naira):
- Product prices: stored as kobo
- Cart amounts: calculated in kobo
- Display: converted to naira using `formatPrice()`

## Development Workflow

### Creating a New Feature

1. **Backend**
   - Add types in `backend/src/types/index.ts`
   - Create service in `backend/src/services/`
   - Create route in `backend/src/routes/`

2. **Frontend**
   - Create service in `frontend/src/services/`
   - Create component/page in `frontend/src/pages/`
   - Add store if state management needed

3. **Testing**
   - Test API manually with curl/Postman
   - Test UI in browser

### Adding a Route

Backend:
```typescript
router.get('/endpoint', middleware, async (req, res) => {
  try {
    // Implementation
    sendSuccess(res, data)
  } catch (error) {
    sendError(res, error.message)
  }
})
```

Frontend:
```typescript
const { data, loading, error } = useFetch('/api/endpoint')
```

## Common Patterns

### Error Handling

Backend: Use consistent `sendError` format
Frontend: Try-catch with Zustand state update

### Pagination

Backend:
```typescript
const page = parseInt(req.query.page) || 1
const limit = parseInt(req.query.limit) || 20
// Query, count, offset, limit
sendPaginated(res, items, total, page, limit)
```

### Authentication Check

Frontend:
```typescript
useEffect(() => {
  if (!isAuthenticated) {
    navigate('/login')
  }
}, [isAuthenticated])
```

## Testing

### API Testing

```bash
# Test health
curl http://localhost:5000/health

# Test products
curl http://localhost:5000/api/products

# Test with auth
curl -H "Authorization: Bearer token" http://localhost:5000/api/auth/me
```

### Frontend Testing

Use React DevTools to:
- Inspect component state
- Check Zustand stores
- Monitor network requests

## Performance Tips

1. Use `React.memo` for expensive components
2. Lazy load routes with `React.lazy`
3. Optimize images with CDN
4. Use Firestore indexes for common queries
5. Implement pagination for large datasets
6. Cache API responses where appropriate

## Security Best Practices

1. Never log sensitive data
2. Always validate input
3. Use HTTPS everywhere
4. Rotate secrets regularly
5. Monitor failed login attempts
6. Implement rate limiting
7. Keep dependencies updated

## Useful Commands

```bash
# Backend
cd backend
npm run dev      # Start dev server
npm run build    # Build for production
npm run type-check # Check TypeScript

# Frontend
cd frontend
npm run dev      # Start dev server
npm run build    # Build for production
npm run preview  # Preview production build
npm run type-check # Check TypeScript
```

## Deployment Checklist

- [ ] All environment variables set
- [ ] Firebase credentials configured
- [ ] Paystack API keys added
- [ ] Frontend API URL updated
- [ ] CORS origin configured
- [ ] Database indexes created
- [ ] Webhooks configured
- [ ] SSL certificate installed
- [ ] Monitoring setup
- [ ] Backup strategy verified
