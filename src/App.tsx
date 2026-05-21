import { Routes, Route } from 'react-router-dom'
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
import SellerShopPage from '@/pages/SellerShopPage'
import SellerProductsPage from '@/pages/SellerProductsPage'
import SellerAnalyticsPage from '@/pages/SellerAnalyticsPage'
import AdminDashboard from '@/pages/AdminDashboard'
import PaymentVerifiedPage from '@/pages/PaymentVerifiedPage'
import SellerOrdersPage from '@/pages/SellerOrdersPage'
import SellerOrderDetailPage from '@/pages/SellerOrderDetailPage'
import AddressesPage from '@/pages/AddressesPage'
import NotificationsPage from '@/pages/NotificationsPage'
import AccessManagementPage from '@/pages/AccessManagementPage'
import MessagesPage from '@/pages/MessagesPage'

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
        <Route path="/access-management" element={<AccessManagementPage />} />
        <Route path="/messages" element={<MessagesPage />} />
        <Route path="/orders" element={<OrdersPage />} />
        <Route path="/orders/completed" element={<OrdersPage />} />
        <Route path="/orders/:id" element={<OrderDetailPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/seller/shop" element={<SellerShopPage />} />
        <Route path="/seller/products" element={<SellerProductsPage />} />
        <Route path="/seller/analytics" element={<SellerAnalyticsPage />} />
        <Route path="/payment/verified" element={<PaymentVerifiedPage />} />
        <Route path="/seller/orders" element={<SellerOrdersPage />} />
        <Route path="/seller/orders/completed" element={<SellerOrdersPage />} />
        <Route path="/seller/orders/:id" element={<SellerOrderDetailPage />} />
        <Route path="/admin" element={<AdminDashboard />} />
        {/* Additional routes to be added */}
      </Route>
    </Routes>
  )
}

export default App
