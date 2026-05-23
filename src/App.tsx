import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from '@/components/Layout'
import HomePage from '@/pages/HomePage'
import ProductsPage from '@/pages/ProductsPage'
import ProductDetailPage from '@/pages/ProductDetailPage'
import LoginPage from '@/pages/LoginPage'
import SignupPage from '@/pages/SignupPage'
import CartPage from '@/pages/CartPage'
import CheckoutPage from '@/pages/CheckoutPage'
import OrdersPage from '@/pages/OrdersPage'
import OrderDetailPage from '@/pages/OrderDetailPage'
import ProfilePage from '@/pages/ProfilePage'
import AdminDashboard from '@/pages/AdminDashboard'
import PaymentVerifiedPage from '@/pages/PaymentVerifiedPage'
import AddressesPage from '@/pages/AddressesPage'
import NotificationsPage from '@/pages/NotificationsPage'
import MessagesPage from '@/pages/MessagesPage'
import AccessManagementPage from '@/pages/AccessManagementPage'
import SellerShopPage from '@/pages/SellerShopPage'
import SellerProductsPage from '@/pages/SellerProductsPage'
import SellerOrdersPage from '@/pages/SellerOrdersPage'
import SellerOrderDetailPage from '@/pages/SellerOrderDetailPage'
import SellerAnalyticsPage from '@/pages/SellerAnalyticsPage'
import AuditLogPage from '@/pages/AuditLogPage'

function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/products" element={<ProductsPage />} />
        <Route path="/products/:id" element={<ProductDetailPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/cart" element={<CartPage />} />
        <Route path="/checkout" element={<CheckoutPage />} />
        <Route path="/addresses" element={<AddressesPage />} />
        <Route path="/notifications" element={<NotificationsPage />} />
        <Route path="/messages" element={<MessagesPage />} />
        <Route path="/orders" element={<OrdersPage />} />
        <Route path="/orders/completed" element={<OrdersPage />} />
        <Route path="/orders/:id" element={<OrderDetailPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/payment/verified" element={<PaymentVerifiedPage />} />
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/admin/store" element={<SellerShopPage />} />
        <Route path="/admin/store/products" element={<SellerProductsPage />} />
        <Route path="/admin/store/orders" element={<SellerOrdersPage />} />
        <Route path="/admin/store/orders/completed" element={<SellerOrdersPage />} />
        <Route path="/admin/store/orders/:id" element={<SellerOrderDetailPage />} />
        <Route path="/admin/store/analytics" element={<SellerAnalyticsPage />} />
        <Route path="/admin/store/audit" element={<AuditLogPage />} />
        <Route path="/admin/store/access" element={<AccessManagementPage />} />
        <Route path="/admin/store/messages" element={<MessagesPage />} />
        <Route path="/seller/shop" element={<Navigate to="/admin/store" replace />} />
        <Route path="/seller/products" element={<Navigate to="/admin/store/products" replace />} />
        <Route path="/seller/orders" element={<Navigate to="/admin/store/orders" replace />} />
        <Route path="/seller/orders/completed" element={<Navigate to="/admin/store/orders/completed" replace />} />
        <Route path="/seller/orders/:id" element={<SellerOrderDetailPage />} />
        <Route path="/seller/analytics" element={<Navigate to="/admin/store/analytics" replace />} />
        <Route path="/seller/access" element={<Navigate to="/admin/store/access" replace />} />
        <Route path="/seller/messages" element={<Navigate to="/admin/store/messages" replace />} />
        {/* Additional routes to be added */}
      </Route>
    </Routes>
  )
}

export default App
