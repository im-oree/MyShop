<div align="center">
  <img src="public/myshop-mark.svg" alt="MyShop logo" width="96" height="96">
  <h1>MyShop</h1>
  <p><strong>A full-stack marketplace for discovering products, taking payments, and running a seller operation.</strong></p>
  <p>
    <a href="#quick-start">Quick start</a> ·
    <a href="#how-it-works">How it works</a> ·
    <a href="#configuration">Configuration</a> ·
    <a href="#api-overview">API overview</a>
  </p>
</div>

## What this project is

MyShop is a TypeScript e-commerce and marketplace application. It has two connected parts:

- **Customer storefront (frontend):** a Vite + React single-page application for browsing products, registering and signing in, managing a cart, checking out, tracking orders, editing a profile and addresses, receiving notifications, and messaging.
- **Marketplace backend:** an Express + Node.js API that authenticates users, owns business rules, reads and writes Firestore, manages orders and payments, and exposes administrator and seller operations.

The application is designed for a small business, independent seller, or marketplace team that needs both a customer buying experience and an internal store console. Prices are represented internally in the smallest currency unit (for example, Nigerian kobo) to avoid floating-point payment errors.

> **Implementation status:** the core application is implemented, and both frontend and backend production builds succeed. A live catalog, authentication, payment, messaging, and administration require the external Firebase, Paystack, and optional image/email services described below. Without those services the UI can still be built and opened, but data-backed flows will show an API/configuration error or an empty catalog.

## Product capabilities

### Customers

- Browse a responsive product catalog with category filters and search.
- Open product detail pages and add items to the cart.
- Create an account, sign in, update a profile, and manage saved addresses.
- Place an order and initialize payment through Paystack.
- View order history, order detail, payment status, and order-progress stages.
- Receive in-app notifications and communicate through conversations/messages.
- Use the interface on mobile, tablet, and desktop widths.

### Seller and staff console

Management users can switch from customer mode to the store workspace. The console provides:

- Store overview and revenue reporting.
- Product creation, editing, deletion, and seller product analytics.
- Order lists, order detail, and status updates.
- Business profile/configuration management.
- Employee creation and access management.
- Role-based permissions for products, orders, analytics, notifications, messages, and employees.
- Audit log access and seller-application approval/rejection.

### Platform concerns

- JWT session tokens are attached to API requests by the frontend.
- Firebase Admin SDK is used by the backend for Firebase Authentication and Firestore.
- The browser Firebase SDK is used for Firestore-backed messaging and browser messaging support.
- Paystack is the active payment provider; Stripe and Flutterwave are configuration-ready but not the default flow.
- CORS, request rate limiting, JSON body limits, centralized error responses, and environment-based configuration are included.
- Product image uploads can use ImgBB when `VITE_IMGBB_API_KEY` is configured in the product form service.

## Who it is for

- **Shoppers:** people buying physical products, services, or downloadable products.
- **Owners and administrators:** people who manage catalog, orders, revenue, configuration, users, and staff.
- **Employees:** staff with a restricted permission template such as cashier, sales representative, support agent, or operations manager.
- **Developers and deployers:** teams maintaining a React frontend, Express API, Firebase project, and payment integration.

## Technology stack

| Layer | Technology | Responsibility |
| --- | --- | --- |
| UI | React 18, TypeScript, React Router | Pages, forms, navigation, responsive marketplace UI |
| Build/dev server | Vite 5, Tailwind CSS, PostCSS | Fast local development and production assets |
| Client state | Zustand | Authentication/session, cart, and view mode state |
| Client networking | Axios | `/api` calls, token injection, 401 handling |
| Charts/icons | Recharts, Lucide React | Seller analytics and interface icons |
| API | Node.js, Express, TypeScript | HTTP routes, validation/orchestration, auth and access control |
| Persistence/auth | Firebase Admin, Firestore, Firebase Auth | Users, products, carts, orders, messages, notifications, configuration |
| Payments | Paystack | Payment initialization, verification, and webhook handling |
| Deployment | Render/Vercel-compatible configuration | Frontend and backend hosting descriptors |

## Repository layout

```text
.
├── src/                         # React frontend source
│   ├── components/              # Header, footer, cards, forms, layout
│   ├── pages/                   # Customer, checkout, account, and staff pages
│   ├── services/                # API, auth, product, order, message services
│   ├── store/                   # Zustand auth and cart stores
│   ├── types/                   # Shared frontend models
│   └── utils/                   # Formatting, RBAC, order-stage helpers
├── backend/
│   └── src/
│       ├── routes/               # Express route modules
│       ├── services/             # Firestore/payment/business services
│       ├── providers/            # Payment-provider abstractions
│       ├── middlewares/          # Auth, rate-limit, and error middleware
│       ├── config/               # Firebase and environment configuration
│       └── scripts/              # Product seeding and operational scripts
├── public/                      # Static marketing pages and MyShop favicon
├── firestore.rules              # Firestore security rules
├── render.yaml                  # Frontend + backend Render blueprint
├── render-backend.yaml          # Backend-only Render blueprint
├── vite.config.ts               # Vite aliases, `/api` proxy, preview settings
└── .env.example                 # Frontend environment template
```

The repository root is the frontend project; there is no `frontend/` subdirectory. The older documentation that referred to `frontend/` has been replaced by this README.

## How it works

### Request and data flow

```text
Browser
  │ React pages + Zustand stores
  │ Axios requests to /api (same-origin in production)
  ▼
Express API (backend/src)
  ├─ CORS + rate limiting + JSON parsing
  ├─ JWT authentication and role/permission checks
  ├─ Firebase Admin SDK → Firebase Auth / Firestore
  └─ Paystack provider → payment initialization and verification
```

In local development Vite proxies `/api/*` to `http://localhost:5000`. The browser should call `/api`, not `localhost`, when using a deployed or proxied frontend. `src/services/api.ts` normalizes `VITE_API_BASE_URL` so both a host and a host ending in `/api` work.

### Typical purchase workflow

1. The storefront requests products from `GET /api/products`.
2. A customer adds a product to the local/cart-backed cart.
3. The checkout page creates an order with `POST /api/orders`.
4. The client asks `POST /api/payments/initialize` for a Paystack checkout URL/reference.
5. Paystack redirects the customer back to the payment verification route.
6. The client calls `POST /api/payments/verify`; the backend verifies the reference with Paystack and updates the order/payment state.
7. Paystack can notify `POST /api/payments/webhook`; webhook signature verification is marked as a follow-up in the current backend implementation and should be completed before live payments.
8. Order status changes are made by authorized staff through `PATCH /api/orders/:id/status` and become visible in the customer order timeline.

### Authentication and authorization

- `POST /api/auth/signup` and `POST /api/auth/login` return a JWT.
- The frontend stores the token in `localStorage` under `authToken` and sends it as `Authorization: Bearer <token>`.
- Protected routes run the backend authentication middleware.
- Admin and manager users receive full effective permissions.
- Employees receive normalized permissions from their role template or custom permissions.
- Customers do not receive staff permissions.

### Data and money

Firestore is the system of record for application entities. The model includes users, products, carts, orders, addresses, notifications, conversations, messages, business configuration, and audit records. Product and order prices are stored as integer minor units (`kobo` for NGN); use the backend helpers to convert to and from display values. Supported currency configuration currently includes NGN, USD, GBP, and EUR, while Paystack is the implemented payment provider.

## Quick start

### Requirements

- Node.js 18+ (Node 20 LTS is recommended).
- npm.
- A Firebase project with Firestore and Firebase Authentication enabled for real data.
- Paystack test credentials for checkout testing.

### 1. Install dependencies

```bash
# from the repository root
npm install
npm --prefix backend install
```

### 2. Configure the frontend

```bash
cp .env.example .env
```

For a local backend, the important value is:

```env
VITE_API_BASE_URL=http://localhost:5000/api
```

Add the Firebase Web SDK values if you want browser messaging/notifications. Leave optional values empty when not needed.

### 3. Configure the backend

```bash
cp backend/.env.example backend/.env
```

At minimum, fill in:

```env
NODE_ENV=development
APP_ENV=dev
PORT=5000
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=your-service-account-email
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
JWT_SECRET=replace-with-a-long-random-secret
JWT_EXPIRY=7d
PAYSTACK_ENV=test
PAYSTACK_TEST_SECRET_KEY=sk_test_...
PAYSTACK_TEST_PUBLIC_KEY=pk_test_...
CORS_ORIGIN=http://localhost:5173
```

`FIREBASE_PRIVATE_KEY` may contain escaped `\n` characters; the backend converts them to newlines. Do not commit either `.env` file or service-account credentials.

### 4. Start the two processes

Use two terminals:

```bash
# Terminal 1: backend
cd backend
npm run dev

# Terminal 2: frontend, from the repository root
npm run dev
```

Open `http://localhost:5173`. The API health check is `http://localhost:5000/api/health` and returns the environment and timestamp when backend configuration is valid.

### 5. Seed sample products (optional)

After the backend environment is configured:

```bash
cd backend
npm run seed:products
```

The seed script writes sample products to Firestore; inspect it before using it against a production database.

## Available commands

### Frontend (repository root)

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start Vite development server on port 5173 |
| `npm run build` | Type-check-independent production asset build to `dist/` |
| `npm run preview` | Serve the built frontend |
| `npm run start` | Start the repository's preview helper |
| `npm run type-check` | Run TypeScript checks |
| `npm run lint` | Lint `src/` |

### Backend (`backend/`)

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start Express with `tsx` watch mode |
| `npm run build` | Compile TypeScript to `backend/dist/` |
| `npm start` | Run the compiled API |
| `npm run type-check` | Check backend TypeScript without emitting |
| `npm run seed:products` | Seed product records in Firestore |

## Configuration

### Frontend variables

See `.env.example` for the complete list. The main groups are:

- `VITE_API_BASE_URL`: API host/prefix; empty means same-origin `/api`.
- `VITE_FIREBASE_*`: browser Firebase configuration used for Firestore messaging support.
- `VITE_CACHE_*`: session-storage cache controls.
- `VITE_ANALYTICS_ID` and `VITE_ENABLE_DEBUG`: optional analytics/debug flags.

### Backend variables

See `backend/.env.example`. The main groups are:

- Server/environment: `NODE_ENV`, `APP_ENV`, `PORT`, `CORS_ORIGIN`.
- Firebase Admin: `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`.
- Session security: `JWT_SECRET`, `JWT_EXPIRY`.
- Email: `BREVO_API_KEY`, sender fields.
- Payments: `PAYSTACK_ENV` plus test/live key pairs.
- Optional providers: `ENABLE_STRIPE`, `STRIPE_SECRET_KEY`, `ENABLE_FLUTTERWAVE`, `FLUTTERWAVE_SECRET_KEY`.
- Server cache: `CACHE_ENABLED`, `CACHE_TTL_DEFAULT`, `CACHE_TTL_MAX`.

## API overview

All endpoints are prefixed with `/api`. Authenticated endpoints require the bearer token unless noted.

| Area | Main endpoints | Access |
| --- | --- | --- |
| Health | `GET /health` | Public |
| Auth | `POST /auth/signup`, `POST /auth/login`, `GET /auth/me`, `PUT /auth/profile` | Mixed |
| Products | `GET /products`, `/featured`, `/search`, `GET /products/:id`, `/mine`, `POST`, `PUT`, `DELETE` | Mixed / protected writes |
| Cart | `GET /cart`, `POST /cart`, `DELETE /cart` | Authenticated |
| Orders | `POST /orders`, `GET /orders`, `GET /orders/:id`, `/seller`, `PATCH /orders/:id/status` | Authenticated + role checks |
| Payments | `POST /payments/initialize`, `/verify`, `/webhook` | Mixed; initialization authenticated |
| Addresses | CRUD under `/addresses` | Authenticated |
| Notifications | list, unread count, mark read, register device | Authenticated |
| Messages | conversations, messages, unread count, read markers | Authenticated |
| Admin | overview, users, employees, revenue, business config | Admin/manager as applicable |
| Users/sellers | employee access, seller applications, seller profiles | Authenticated/admin as applicable |
| Audit | `GET /audit` | Authenticated |

Success responses generally use `{ success: true, message, data }`; errors use `{ success: false, message, error }`. Paginated responses include `items`, `total`, `page`, `limit`, and `pages`.

## Deployment

### Render

`render.yaml` describes a frontend and backend service. `render-backend.yaml` describes the backend alone. Before deploying:

1. Set backend secrets in the Render dashboard; do not put them in YAML.
2. Set the frontend build-time `VITE_API_BASE_URL` to the public backend URL (or use a same-origin reverse proxy).
3. Set backend `CORS_ORIGIN` to the exact frontend origin(s), comma-separated if needed.
4. Configure Paystack webhook URL as `https://<backend-host>/api/payments/webhook`.
5. Enable Firebase services and use production Paystack credentials only after completing payment/webhook testing.

### Vercel or another static host

```bash
npm run build
```

Deploy `dist/` as a single-page application and configure all non-file routes to serve `index.html`. The API still needs a separately deployed backend unless the host is configured to proxy `/api` to it. `vercel.json` is included for the repository's Vercel-oriented setup.

## Verification and known limitations

Verified in this checkout:

- `npm run build` (frontend): passes.
- `npm run build` in `backend/`: passes.
- `npm run type-check` (frontend): passes after correcting the stale TypeScript `ignoreDeprecations` setting.
- Vite preview host support is enabled for sandbox/deployed preview hosts.

Important production follow-ups:

- Complete Paystack webhook signature verification before relying on webhooks for fulfillment.
- Review and tighten `firestore.rules` for the exact production data model and least privilege.
- Add automated unit/API/browser tests; the repository currently has no test script.
- Split the large frontend bundle with route-level `import()` if initial-load performance is important.
- Run `npm audit` and plan dependency upgrades; installation currently reports transitive vulnerabilities.
- Configure a real email provider and ImgBB key if those optional features are required.

## Screenshots

Playwright was attempted for this documentation pass, but the browser binary could not be downloaded in the sandbox because the Playwright CDN connection was reset. No fabricated UI images have been added. Once Chromium is available, capture screenshots from the running frontend and place them under `docs/screenshots/`, then link them here. The most useful views to capture are:

- Customer home/catalog with category chips and product cards.
- Product detail and cart.
- Checkout/payment redirect state.
- Staff dashboard with analytics and order management.

## Further documentation

The repository also contains focused notes in `APP_DOCUMENTATION.md`, `ARCHITECTURE.md`, `CLIENT_GUIDE.md`, `DEPLOYMENT.md`, `MIGRATION_PLAN.md`, `PROJECT_SUMMARY.md`, and `QUICKSTART.md`. This README is the canonical entry point for current setup and repository structure.

## License

MIT
