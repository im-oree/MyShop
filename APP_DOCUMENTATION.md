# MyShop Full Application Documentation

## Overview

MyShop is a role-aware e-commerce platform built with a React + Vite + TypeScript frontend and an Express + TypeScript backend. The app supports customer shopping, payments, order tracking, notifications, in-app messaging, shipping address management, staff access controls, product management, audit logging, and admin analytics.

The system is intentionally structured around two runtime layers:

- Frontend: public storefront, customer account pages, staff dashboards, and UI state.
- Backend: authentication, product/order/payment persistence, staff permissions, notifications, audit logs, business configuration, and mail integration.

The app is currently configured for a single-owner store model with staff roles. Some older marketplace/seller application paths still exist for compatibility, but several of those flows are disabled in single-owner mode.

## Technology Stack

- Frontend: React 18, TypeScript, Vite, React Router, Zustand, Axios, Tailwind CSS, Lucide icons, Recharts
- Backend: Node.js, Express, TypeScript, Firebase Admin SDK, Firestore, JWT, CORS, bcryptjs, Paystack integration, Brevo email API
- Storage and data: Firestore collections for users, products, orders, carts, notifications, conversations, messages, audit logs, business config, and staff-related records

## Application Structure

### Frontend folders

- `src/components`: shared UI building blocks such as layout, header, footer, dropdowns, product cards, order stage UI, and product form
- `src/pages`: route-level screens for storefront, checkout, customer account, messaging, notifications, admin, and seller/staff workflows
- `src/services`: API clients and service wrappers used by the UI
- `src/store`: Zustand stores for auth and cart state
- `src/utils`: shared helpers for formatting, order stage normalization, and RBAC logic
- `src/types`: shared TypeScript models used by the frontend

### Backend folders

- `src/config`: environment loading and Firebase Admin initialization
- `src/middlewares`: authentication, optional authentication, admin guard, rate limiting, and error handling
- `src/routes`: HTTP endpoints grouped by domain
- `src/services`: Firestore-backed business logic
- `src/providers`: payment provider abstraction and provider implementations
- `src/utils`: response formatting, JWT auth helpers, RBAC helpers, and misc utilities

## Runtime Flow

1. The browser loads the React app from `index.html` and `src/main.tsx`.
2. React Router mounts the correct page under a shared layout.
3. The frontend uses Axios services to call the backend API for most data.
4. The backend validates JWT sessions, reads and writes Firestore, and coordinates payment, notification, audit, and email side effects.
5. For messaging, the frontend also uses a Firebase client connection for Firestore-backed conversation rendering and live updates.

## Main User Roles

- Guest: can browse products and view public pages
- User: can sign up, log in, manage addresses, cart, orders, notifications, and messages
- Admin: full store control, business config, staff management, analytics, audits, product and order management
- Manager: similar to admin for store operations, with role-based access checks in the frontend and backend
- Employee: restricted access granted by an admin or manager through employee permissions

## Route Map

### Public and customer routes

- `/` home page with featured and recommended products
- `/products` searchable and filterable catalog
- `/products/:id` product detail page
- `/login` sign in page
- `/signup` registration page
- `/cart` cart review and quantity management
- `/checkout` shipping and payment initiation
- `/addresses` shipping address management
- `/orders` order history
- `/orders/completed` completed orders view
- `/orders/:id` order detail view
- `/payment/verified` payment return page after Paystack redirect
- `/profile` user profile page
- `/notifications` notification inbox
- `/messages` conversation inbox and chat screen

### Admin and staff routes

- `/admin` admin dashboard
- `/admin/store` staff/store home
- `/admin/store/products` product management
- `/admin/store/orders` order management
- `/admin/store/orders/completed` completed orders management
- `/admin/store/orders/:id` staff order detail
- `/admin/store/analytics` sales and inventory analytics
- `/admin/store/audit` audit log viewer
- `/admin/store/access` employee access management
- `/admin/store/messages` staff messaging view

### Legacy seller aliases

These paths redirect to the newer admin/store routes:

- `/seller/shop`
- `/seller/products`
- `/seller/orders`
- `/seller/orders/completed`
- `/seller/orders/:id`
- `/seller/analytics`
- `/seller/access`
- `/seller/messages`

## Frontend Page Responsibilities

### Home page

The home screen shows a search bar, category chips, and a recommended product grid. It refreshes product data on load, every 15 seconds, and when the browser regains focus. Category counts are derived from the loaded product list and the page scrolls the active chip into view.

### Products page

The catalog page supports:

- Text search across name, description, tags, category, and product type
- Multi-select categories
- Product type filtering: physical, service, downloadable
- Stock filtering: in stock, low stock, out of stock
- Price range filtering
- Featured only toggle
- On-sale only toggle
- Sorting by relevance, newest, price, name, or discount size
- URL synchronization so filters are shareable and persistent across refreshes

### Product detail page

The product detail screen provides:

- Product image gallery and lightbox
- Quantity selection
- Add to cart and buy now actions
- Related products from the same category
- Description, review, and shipping tabs
- Seller messaging entry point for product-related questions

### Cart page

The cart page shows line items, quantity controls, removals, subtotal, shipping estimate, and the checkout call to action. It redirects unauthenticated users to the login page.

### Checkout page

Checkout loads the user’s addresses, requires a valid shipping address with a phone number, creates an order, initializes Paystack payment, stores a pending order marker in session storage, and redirects to the payment provider.

### Orders pages

The customer order list supports search, stage filters, age filters, and sorting. The order detail page hydrates product names if needed, shows the item list, shipping address, payment summary, and an order stage timeline, and allows the customer to open a support conversation about the order.

### Payment verified page

After Paystack redirects back, this page verifies the payment reference, hydrates order items if needed, clears the cart, removes the pending order marker, and shows a confirmation summary.

### Profile page

Profile aggregates account information, order activity, notifications, quick links, and access-related information. It also uses the RBAC helpers to determine what the user can do.

### Addresses page

Users can add, list, and delete shipping addresses. Each address records street, city, state, zip code, country, phone, optional WhatsApp, and default status.

### Notifications page

The notification inbox supports unread counts, search, unread and important filters, date filters, browser notification opt-in, mark-read actions, and mark-all-read actions.

### Messages page

The messaging screen is a two-pane conversation interface on desktop and a stacked experience on mobile. It supports conversation search, conversation selection, live message lists, unread counts, read markers, and message composition.

### Admin dashboard

The admin dashboard shows users, revenue, and staff summaries plus quick links to access management, audit logs, products, and orders. It pulls data from the admin overview and revenue endpoints.

### Product management pages

Store staff can list, filter, create, edit, and delete products. The product form supports multiple product types, pricing, inventory, tags, images, features, specs, service metadata, and downloadable metadata.

### Seller/staff analytics pages

The analytics screen shows revenue trends, order counts, average order value, items sold, inventory distribution, category breakdowns, top products, and low-stock items over configurable date ranges.

### Access management page

Admins and managers can assign employee access using templates or custom permissions. The UI lets them create, update, and remove employees and control access for products, orders, analytics, notifications, messages, and employees.

### Audit log page

The audit log lists administrative actions with actor, role, timestamp, and metadata so store activity can be reviewed.

## Backend API Reference

All backend routes are mounted under `/api` unless stated otherwise.

### Health check

- `GET /health` returns status, environment, and timestamp

### Auth routes

- `POST /api/auth/signup` registers a new user, creates the Firebase Auth record, creates the Firestore user document, and returns a JWT token
- `POST /api/auth/login` looks up the user by email and returns a JWT token
- `GET /api/auth/me` returns the authenticated user record
- `PUT /api/auth/profile` updates profile fields such as name and phone

### Product routes

- `GET /api/products` lists products with pagination and optional category, featured, search, and product type filters
- `GET /api/products/mine` returns products for the current store owner or manager context
- `GET /api/products/mine/analytics` returns seller/owner analytics derived from products and orders
- `POST /api/products` creates a product
- `GET /api/products/featured` returns featured products
- `GET /api/products/search` performs a search by query string
- `GET /api/products/:id` returns a product by ID
- `PUT /api/products/:id` updates a product
- `DELETE /api/products/:id` deletes a product

### Order routes

- `POST /api/orders` creates an order
- `GET /api/orders` lists the authenticated user’s orders
- `GET /api/orders/seller` lists seller-side orders for the current staff context
- `GET /api/orders/seller/:id` returns a seller-specific order detail view
- `GET /api/orders/:id` returns a user-owned order by ID
- `PATCH /api/orders/:id/status` advances order status one stage at a time
- `GET /api/orders/incomplete/count` returns the count of incomplete orders for the current user

### Payment routes

- `POST /api/payments/initialize` starts payment for an order and stores the payment reference
- `POST /api/payments/verify` verifies a payment reference and finalizes the order state
- `POST /api/payments/webhook` handles Paystack webhooks

### Address routes

- `GET /api/addresses` returns the authenticated user’s address list
- `POST /api/addresses` adds a new address
- `PUT /api/addresses/:id` updates an address
- `DELETE /api/addresses/:id` deletes an address

### Notification routes

- `GET /api/notifications` lists notifications with pagination and optional unread-only filtering
- `GET /api/notifications/unread-count` returns unread count
- `PATCH /api/notifications/:id/read` marks one notification as read
- `PATCH /api/notifications/read-all` marks all notifications as read
- `POST /api/notifications/register-device` stores an FCM token for push notifications

### Message routes

- `POST /api/messages/conversations/start` starts or fetches a conversation
- `GET /api/messages/conversations` lists conversations with per-thread unread counts
- `GET /api/messages/unread-count` returns total unread messages across conversations
- `GET /api/messages/conversations/:id/messages` lists messages and marks the conversation as read for the viewer
- `POST /api/messages/conversations/:id/read` explicitly marks a conversation as read
- `POST /api/messages/conversations/:id/messages` sends a message

### Cart routes

- `GET /api/cart` returns the saved cart for the authenticated user
- `POST /api/cart` saves the current cart items
- `DELETE /api/cart` clears the cart

### User routes

- `GET /api/users/employee-role-templates` returns predefined staff permission templates
- `GET /api/users/employees` lists employees for the current owner or manager
- `POST /api/users/employees` assigns an existing user as an employee
- `PATCH /api/users/employees/:id` updates employee access
- `DELETE /api/users/employees/:id` removes employee access
- `POST /api/users/:id/apply-seller` is disabled in single-owner mode
- `POST /api/users/:id/approve-seller` is disabled in single-owner mode
- `POST /api/users/:id/reject-seller` is disabled in single-owner mode
- `GET /api/users/pending-seller-applications` returns an empty list in single-owner mode
- `POST /api/users/:id/set-role` changes a user role for admins
- `GET /api/users/:id/seller-profile` is unavailable in single-owner mode

### Admin routes

- `GET /api/admin/overview` returns users, revenue, and product totals
- `GET /api/admin/users` returns paginated users
- `POST /api/admin/employees/create` creates an employee account directly
- `GET /api/admin/revenue` returns revenue analytics by time range
- `GET /api/admin/config` returns business configuration
- `POST /api/admin/config` creates or replaces business configuration
- `PATCH /api/admin/config` partially updates business configuration

### Audit routes

- `GET /api/audit` returns paginated audit logs for admins and managers

## Data Model

### Users

Users store:

- `id`, `email`, `name`, optional `phone`
- `role` set to `user`, `admin`, `manager`, or `employee`
- `addresses` as an embedded list
- `fcmTokens` for push notifications
- employee fields such as `managedByUserId`, `employeeTitle`, `employeeRoleTemplate`, and `employeePermissions`

### Products

Products store:

- `name`, `description`, `price`, `salePrice`, `discount`
- `currency` and `price` values in kobo for precision
- `images`, `category`, `tags`, `stock`, `featured`
- `productType`: `physical`, `service`, or `downloadable`
- `features`, `specs`, and type-specific detail objects

### Orders

Orders store:

- user identity
- item list with product name, price, and quantity
- `totalAmount` in kobo
- `currency`, `status`, `paymentStatus`, `paymentMethod`, `paymentRef`
- shipping address and optional billing address

### Notifications

Notifications store:

- `type`, `title`, `message`, `priority`
- `link` and `metadata`
- `readAt` to track whether the notification has been opened

### Conversations and messages

- Conversations keep participant IDs, participant metadata, context type, context ID, last message info, and per-user read timestamps
- Messages store conversation ID, sender ID, body, and timestamps

### Business config

Business config stores store branding and feature toggles:

- business name, logo, description, contact details, website
- social links and color values
- feature flags for about/contact/notifications

### Audit logs

Audit records track:

- actor identity and role
- action name
- resource type and resource ID
- request metadata such as IP address and user agent

## Frontend State Management

### Auth store

The auth store holds:

- current user
- auth token
- loading and authentication state
- current role
- view mode for staff-capable users: `customer` or `staff`
- product form open state

Behavior:

- Tokens are stored in `localStorage` under `authToken`
- The store restores sessions from the saved token on app startup
- Admin and manager users can toggle between customer and staff modes
- View mode is also stored in `localStorage`

### Cart store

The cart store keeps items in memory and synchronizes them to the backend cart endpoint. It supports:

- add item
- remove item
- update quantity
- clear cart
- load cart from backend
- calculate total

The store hydrates missing product name or image values by fetching product details when needed.

## Frontend Service Behavior

### Axios API client

The main Axios client attaches the JWT token from `localStorage` to every request. If a response returns 401, it clears the token and redirects the user to `/login`.

### Product service

The product service wraps list, detail, search, featured, category, create, update, and delete calls. It also caches list and detail responses for short periods to reduce network load.

### Order service

The order service handles order creation, user order history, single order lookups, incomplete order count, and status updates.

### Payment service

The payment service initializes and verifies payments through the backend.

### User service

The user service includes employee management helpers and legacy seller compatibility helpers.

### Notification service

The notification service fetches notification lists and unread counts, marks notifications read, registers push tokens, and can request browser notification permission.

### Message service

The message service uses backend endpoints for conversation and message management. The page layer also uses Firebase Firestore helpers for live conversation rendering.

### Business config service

The business config service reads and writes store branding and feature settings from the backend admin config endpoint.

## Authentication and Security

### Session model

The backend uses JWT-based sessions. After sign up or login, the frontend stores the token and sends it as a Bearer token on API calls.

### Backend verification

Middleware verifies tokens on protected routes and attaches the user ID to the request. Admin-only routes additionally verify the user role.

### Route protection

- Public read routes use optional auth where needed
- User routes require authentication
- Admin routes require both authentication and the admin role
- Manager and employee routes apply role and permission checks using RBAC helpers

### Rate limiting

The backend includes a basic in-memory rate limiter with a 15 minute window and 100 request limit per IP. Notification routes are exempt so live badge polling stays responsive.

### CORS

The backend checks configured origins and allows localhost development origins when running in development.

## RBAC Model

Employees can be assigned template-based or custom permissions across these modules:

- products
- orders
- analytics
- notifications
- messages
- employees

Access levels are `none`, `read`, or `write`.

Template presets:

- cashier
- sales_rep
- support_agent
- operations_manager
- custom

Managers and admins receive full store permissions by default in the frontend helper layer.

## Order State Model

Order stages are normalized to this lifecycle:

1. `noted`
2. `processing`
3. `in_transit`
4. `completed`

Legacy or alternate labels such as `pending`, `paid`, `shipped`, and `delivered` are normalized into the same stage model for display and filtering.

The UI uses an order stage badge and timeline to show progress. The backend only allows stage advancement one step at a time.

## Payment Flow

1. The customer reviews the cart and chooses a shipping address.
2. Checkout creates an order with `pending` payment state.
3. The backend initializes Paystack payment and stores the payment reference.
4. The customer is redirected to Paystack.
5. On return, the payment verified page calls the backend verify endpoint.
6. The backend confirms payment, updates the order payment status, and records the `paymentRef`.
7. Notifications and confirmation emails are sent asynchronously.
8. The cart is cleared after successful verification.

## Notifications

Notifications are created for events such as order creation, payment confirmation, and order stage updates. Important notifications can trigger push delivery if the user has registered FCM tokens.

The header and footer poll unread counts every 30 seconds so badges stay current.

## Messaging

Messaging is conversation-based and can be started from a product or order context, or directly with a target user.

Conversation contexts:

- general
- product
- order

The backend stores conversations and messages in Firestore collections. The frontend presents them as an inbox, supports read tracking, and uses the Firebase client for live updates in the message view.

## Product Types

### Physical

- Requires stock value
- Requires at least one image
- Used for normal shippable inventory

### Service

- Includes delivery mode, duration, turnaround, and booking notes
- Stock is treated as virtual availability

### Downloadable

- Includes download URL, file format, file size, and license info
- Suitable for digital assets and files

## UI and Design System

The UI uses a navy, green, and amber palette with a light background and card-based layout. The main shell includes a sticky header, responsive footer navigation, and route-aware visibility rules for pages like messaging and the product form overlay.

Key interaction patterns:

- Skeletons for loading states
- Animated transitions on cards and overlays
- Search and filter controls that sync with the URL where appropriate
- Sticky action areas for dense workflows
- Mobile-first layouts that collapse into stacked panels on smaller screens

## Environment Configuration

### Frontend

The frontend expects values such as:

- `VITE_API_BASE_URL`
- Firebase client values for Firestore and messaging

### Backend

The backend requires:

- Firebase service account values
- JWT secret
- Paystack environment and keys
- optional Stripe and Flutterwave keys
- CORS origin configuration

Environment detection supports development, staging, and production based on explicit overrides and hosting platform metadata.

## Scripts

### Root frontend

- `npm run dev` starts the Vite app
- `npm run build` type-checks and builds production assets
- `npm run preview` previews the production build
- `npm run type-check` runs TypeScript without output
- `npm run lint` runs ESLint

### Backend

- `npm run dev` runs the backend in watch mode
- `npm run build` compiles TypeScript
- `npm run start` runs the compiled server
- `npm run type-check` checks backend types
- `npm run seed:products` seeds product data

## Deployment Notes

- Frontend is intended for static deployment such as Vercel
- Backend is intended for managed Node hosting such as Railway or Render
- The backend health check is available at `/health`
- Production deployment requires all required env vars to be set and CORS origins to include the frontend domain

## Important Constraints and Current Behavior

- The app currently runs in a single-owner mode. Seller application endpoints return disabled or unavailable responses.
- Prices are handled in kobo in backend and frontend state so display formatting must convert to naira.
- Some pages and services still carry compatibility hooks for older seller-marketplace behavior.
- The messaging view uses Firestore client access on the frontend for realtime chat behavior.
- Email delivery depends on Brevo API credentials being configured.

## End-to-End User Journeys

### Customer journey

1. Browse products from the home page or catalog.
2. Open a product detail page and choose quantity.
3. Add the item to cart or buy immediately.
4. Review the cart and proceed to checkout.
5. Pick a shipping address and pay through Paystack.
6. Return to the payment verified page and wait for order processing.
7. Track the order from the orders page and order detail page.
8. Receive notifications and messages as the order progresses.

### Staff journey

1. Log in as an admin, manager, or employee.
2. Switch to staff mode if the account supports it.
3. Open product, order, analytics, messages, audit, or access pages based on permissions.
4. Process orders one stage at a time.
5. Review staff permissions and audit logs as needed.

### Admin journey

1. Open the admin dashboard.
2. Review revenue, user, and product summaries.
3. Manage employee access or create staff accounts.
4. Inspect audit logs and configure business settings.
5. Monitor order processing, notifications, and analytics.

## Where the Main Logic Lives

- App routing: `src/App.tsx`
- Global shell and session restore: `src/components/Layout.tsx`
- Auth state: `src/store/authStore.ts`
- Cart state: `src/store/cartStore.ts`
- Product data loading: `src/services/productService.ts`
- Order and payment actions: `src/services/orderService.ts`
- Notifications: `src/services/notificationService.ts`
- Messaging: `src/services/messageService.ts`
- Backend app setup: `backend/src/app.ts`
- Backend config: `backend/src/config/index.ts`
- Backend route registration: `backend/src/app.ts`
- Product business logic: `backend/src/services/ProductService.ts`
- Order business logic: `backend/src/services/OrderService.ts`
- User and staff logic: `backend/src/services/UserService.ts`

## Summary

MyShop is a complete e-commerce and store-operations system with customer shopping, payment processing, order management, notifications, staff access control, analytics, and auditability. The codebase is organized so the frontend owns presentation and local interaction, while the backend owns persistence, authorization, and store-side business rules.