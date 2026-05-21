/**
 * E-Commerce Platform - Quick Reference
 */

# Getting Started

## Quick Setup (5 minutes)

```bash
# Clone/setup directory
cd "E - Commerce"

# Backend setup
cd backend
copy .env.example .env
# Update .env with your Firebase & Paystack credentials
npm install
npm run dev  # Runs on http://localhost:5000

# Frontend setup (in another terminal)
cd frontend
copy .env.example .env.local
# Keep VITE_API_BASE_URL=http://localhost:5000/api
npm install
npm run dev  # Runs on http://localhost:3000
```

## Project Structure

- `/frontend` - React + Vite + Tailwind
- `/backend` - Express + TypeScript
- `/README.md` - Full documentation
- `/DEPLOYMENT.md` - Deployment guide
- `/ARCHITECTURE.md` - System design

## Key Endpoints

**Health Check**: GET `/health`
**Products**: GET `/api/products`
**Auth**: POST `/api/auth/signup`, POST `/api/auth/login`
**Orders**: GET/POST `/api/orders`
**Payments**: POST `/api/payments/initialize`, POST `/api/payments/verify`

## Technologies

- **Frontend**: React 18, TypeScript, Tailwind CSS, Zustand, Vite
- **Backend**: Express, TypeScript, Firebase (Firestore + Auth), Paystack
- **Deployment**: Vercel (frontend), Railway/Render (backend)
- **Database**: Firebase Firestore
- **Auth**: Firebase Auth + JWT

## Color Palette

- Primary: #0F172A (Dark Navy)
- Secondary: #16A34A (Green Success)
- Accent: #F59E0B (Amber Warning)
- Danger: #DC2626 (Red Error)

## Important Notes

✅ All prices stored in **kobo** (100 kobo = 1 naira)
✅ Firebase only accessed from backend
✅ Environment auto-detects: dev/staging/production
✅ Payment providers abstracted for easy addition
✅ Nigeria-first (NGN), but supports USD, GBP, EUR

## Next Steps

1. Configure Firebase service account
2. Get Paystack API keys
3. Run setup `npm install` in both directories
4. Start backend: `npm run dev`
5. Start frontend: `npm run dev`
6. Visit http://localhost:3000

## Support Docs

- Setup troubleshooting: See DEPLOYMENT.md
- Architecture details: See ARCHITECTURE.md
- API docs: See backend src/routes/
