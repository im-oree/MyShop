# Multi-Seller → Single-Owner Migration Plan

## Overview
Transform the enterprise multi-seller e-commerce platform into a **single-owner, multi-product platform** while maintaining scalability and customization.

---

## 🔄 Core Changes

### 1. **User & Authorization Model**
**Current:** user roles = 'user' | 'seller' | 'admin' | 'moderator' | 'employee'
**New:** user roles = 'user' | 'admin' | 'manager' *(optional, for future staff)*

#### Changes:
- ❌ Remove: `sellerProfile`, `appliedAsSeller`, `sellerApproved`, `employeeOfSellerId`, `employeeTitle`, `employeeRoleTemplate`, `employeePermissions`
- ❌ Remove: Employee role system entirely
- ✅ Keep: `admin` role (for owner/business manager)
- ✅ Keep: Basic `user` role (customers)
- ✅ Optional: Add `manager` role for future staff (disable by default)

**Impact:** Drastically simplifies auth, removes seller applications, simplifies RBAC

---

### 2. **Product Model**
**Current:** `sellerId` and `sellerName` in Product
**New:** Single owner owns all products

#### Changes:
- ❌ Remove: `sellerId`, `sellerName`
- ✅ Keep: All other product fields
- **Benefit:** Products belong to the business, not individuals

---

### 3. **UI Pages - Cut/Consolidate**

#### ❌ DELETE (Seller-Specific):
- `SellerProductsPage.tsx` → consolidate into `AdminDashboard`
- `SellerOrdersPage.tsx` → consolidate into `AdminDashboard`
- `SellerOrderDetailPage.tsx` → consolidate into `AdminDashboard`
- `SellerAnalyticsPage.tsx` → consolidate into `AdminDashboard`
- `SellerShopPage.tsx` → **convert to public "About" page** (optional)
- `AccessManagementPage.tsx` → delete (no more employees)

#### ✅ KEEP & ENHANCE:
- `AdminDashboard.tsx` → **unified owner dashboard** with:
  - Product management (add/edit/delete/inventory)
  - Order management & fulfillment
  - Analytics & revenue
  - Settings/business config

#### ✅ KEEP (Customer-Facing):
- HomePage, ProductsPage, ProductDetailPage
- CartPage, CheckoutPage
- LoginPage, SignupPage, ProfilePage
- OrdersPage, OrderDetailPage
- MessagesPage, NotificationsPage

---

### 4. **Backend Routes**

#### Current Routes (likely seller-specific):
```
/api/admin/*              (for admins)
/api/seller/*             (for sellers)
/api/employee/*           (for employees)
```

#### Simplified Routes:
```
/api/admin/*              (for owner/admin only)
  ├── /products           (manage products)
  ├── /orders             (manage orders)
  ├── /analytics          (business metrics)
  ├── /settings           (business config)
```

**No separate `/api/seller/*` needed** — admin routes handle everything.

---

### 5. **Database Structure**

#### Keep (no changes needed):
- `users` collection
- `products` collection ← *remove sellerId field*
- `orders` collection
- `categories` collection
- `notifications` collection

#### Delete:
- Any seller-specific Firestore collections
- Employee role templates
- Seller applications/approvals

---

### 6. **Business Configuration**

#### Add new "Business Settings" table:
```typescript
interface BusinessConfig {
  id: string (fixed: "config")
  ownerName: string
  ownerEmail: string
  businessName: string
  businessLogo: string
  businessDescription: string
  businessPhone: string
  businessAddress: string
  socialLinks?: Record<string, string>
  colors?: {
    primary: string
    secondary: string
    accent: string
  }
  features?: {
    showAboutPage: boolean
    showContactPage: boolean
    enableGmail: boolean
    enableMailgun: boolean
  }
  createdAt: Date
  updatedAt: Date
}
```

**Benefit:** Easy customization without code changes — supports multiple business setups

---

## 📋 Implementation Checklist

### Phase 1: Backend Types & Config
- [ ] Update `backend/src/types/index.ts` — remove seller/employee types
- [ ] Create `BusinessConfig` type
- [ ] Create `backend/src/services/BusinessConfigService.ts`
- [ ] Update environment config for business defaults

### Phase 2: Backend Routes
- [ ] Remove any `/api/seller/*` routes
- [ ] Remove any `/api/employee/*` routes
- [ ] Update `/api/admin/*` routes to manage products directly (no sellerId checks)
- [ ] Add `/api/admin/settings` for business config CRUD
- [ ] Update `/api/products` query — remove sellerId filtering
- [ ] Update `/api/orders` query — remove seller-specific logic

### Phase 3: Backend Services
- [ ] Simplify `ProductService` — remove seller checks
- [ ] Simplify `OrderService` — remove seller notifications/logic
- [ ] Remove `SellerService` (if exists)
- [ ] Remove `EmployeeService` (if exists)
- [ ] Add business config initialization on first admin login

### Phase 4: Frontend Types
- [ ] Update `src/types/models.ts` — remove seller/employee types
- [ ] Update `src/store/authStore.ts` — remove seller state
- [ ] Remove any seller-specific auth logic

### Phase 5: Frontend Pages
- [ ] Delete 6 seller-specific page files
- [ ] Enhance `AdminDashboard.tsx` with unified product + order + analytics views
- [ ] Add settings panel to admin dashboard
- [ ] Update navigation to remove seller links
- [ ] Add business logo/name to header from config

### Phase 6: Frontend Services
- [ ] Update `productService.ts` — remove seller filters
- [ ] Update `orderService.ts` — remove seller context
- [ ] Create `businessConfigService.ts` for settings CRUD
- [ ] Update API endpoints in `services/api.ts`

### Phase 7: Testing & Cleanup
- [ ] Test product CRUD (no sellerId)
- [ ] Test order creation & fulfillment
- [ ] Test admin settings save/load
- [ ] Verify mobile & desktop UI
- [ ] Update QUICKSTART.md & README.md

---

## 🎯 Benefits

1. **Simpler Codebase:** ~30% less code, easier to maintain
2. **Faster Feature Dev:** No multi-tenant complexity
3. **Better UX:** Clear single-owner experience
4. **Scalable Config:** BusinessConfig allows white-labeling for future multi-business setup
5. **Easier Deployment:** Fewer role checks, cleaner RBAC
6. **Customizable:** Business name, logo, colors via admin panel

---

## 🔮 Future Scalability

If you ever want to support **multiple business owners**:
1. Add `businessId` field to Users
2. Partition Firestore by `businessId`
3. Add business selection UI during login
4. Reactivate seller role when needed

This structure keeps that door open without complicating today's single-owner model.

---

## 📝 Notes

- **Admin role** becomes "owner/business manager"
- **Remove all seller logic** but architecture stays clean
- **Backward compatibility:** Existing data will work — just ignore old fields
- **No migrations needed** for Firestore — old seller documents can coexist with new simplified structure
