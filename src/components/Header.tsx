import { useState, useEffect, useCallback } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { useCartStore } from '@/store/cartStore'
import {
  ShoppingCart,
  Bell,
  MessageCircle,
  LayoutDashboard,
  Store,
} from 'lucide-react'
import { notificationService } from '@/services/notificationService'
import { messageService } from '@/services/messageService'
import { orderService } from '@/services/orderService'

export default function Header(): JSX.Element {
  const { isAuthenticated, user, logout, viewMode, toggleViewMode } = useAuthStore()
  const cartItems = useCartStore((s) => s.items)
  const location = useLocation()
  const navigate = useNavigate()

  const [scrolled, setScrolled] = useState(false)
  const [cartAnimating, setCartAnimating] = useState(false)
  const [unreadNotifications, setUnreadNotifications] = useState(0)
  const [unreadMessages, setUnreadMessages] = useState(0)
  const [incompleteOrders, setIncompleteOrders] = useState(0)

  /* ── Scroll shadow ── */
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  /* ── Cart bounce animation ── */
  const prevCount = useCartStore((s) => s.items.length)
  useEffect(() => {
    if (prevCount > 0) {
      setCartAnimating(true)
      const t = setTimeout(() => setCartAnimating(false), 300)
      return () => clearTimeout(t)
    }
  }, [prevCount])

  const isActive = useCallback(
    (path: string) => location.pathname === path,
    [location.pathname]
  )

  const isManagementUser = user?.role === 'admin' || user?.role === 'manager'
  const isStaffMode = viewMode === 'staff' && isManagementUser

  /* ── Unread notifications polling ── */
  useEffect(() => {
    if (!isAuthenticated) {
      setUnreadNotifications(0)
      return
    }

    let mounted = true
    const loadUnread = async () => {
      try {
        const count = await notificationService.getUnreadCount()
        if (mounted) setUnreadNotifications(count)
      } catch {
        /* keep last known */
      }
    }

    void loadUnread()
    const interval = setInterval(loadUnread, 30000)
    return () => {
      mounted = false
      clearInterval(interval)
    }
  }, [isAuthenticated])

  /* ── Unread messages polling ── */
  useEffect(() => {
    if (!isAuthenticated) {
      setUnreadMessages(0)
      return
    }

    let mounted = true
    const loadUnread = async () => {
      try {
        const count = await messageService.getUnreadCount()
        if (mounted) setUnreadMessages(count)
      } catch {
        /* keep last known */
      }
    }

    void loadUnread()
    const interval = setInterval(loadUnread, 30000)
    return () => {
      mounted = false
      clearInterval(interval)
    }
  }, [isAuthenticated])

  /* ── Incomplete orders polling ── */
  useEffect(() => {
    if (!isAuthenticated) {
      setIncompleteOrders(0)
      return
    }

    let mounted = true
    const loadIncompleteCount = async () => {
      try {
        const count = await orderService.getIncompleteCount()
        if (mounted) setIncompleteOrders(count)
      } catch {
        /* keep last known */
      }
    }

    void loadIncompleteCount()
    const interval = setInterval(loadIncompleteCount, 30000)
    return () => {
      mounted = false
      clearInterval(interval)
    }
  }, [isAuthenticated])

  /* ── Clear messages badge instantly when on /messages ── */
  useEffect(() => {
    if (location.pathname.startsWith('/messages')) {
      setUnreadMessages(0)
    }
  }, [location.pathname])

  /* ── Clear notifications badge instantly when on /notifications ── */
  useEffect(() => {
    if (location.pathname.startsWith('/notifications')) {
      setUnreadNotifications(0)
    }
  }, [location.pathname])

  const getNavLinks = () => {
    if (isStaffMode) {
      return [
        { to: '/', label: 'Home' },
        { to: '/admin/store', label: 'Dashboard' },
        { to: '/admin/store/products', label: 'Products' },
        { to: '/admin/store/orders', label: 'Orders' },
        { to: '/admin/store/analytics', label: 'Analytics' },
        { to: '/admin/store/access', label: 'Access' },
      ]
    }
    return [
      { to: '/', label: 'Home' },
      { to: '/products', label: 'Search' },
      { to: '/orders', label: 'Orders' },
      { to: '/profile', label: 'Profile' },
    ]
  }
  const navLinks = getNavLinks()

  const handleViewModeToggle = () => {
    const nextMode = viewMode === 'staff' ? 'customer' : 'staff'
    toggleViewMode()
    if (nextMode === 'customer') navigate('/')
    else navigate('/admin/store')
  }

  /* ── Reusable icon button with badge ── */
  const IconBtn = ({
    to,
    label,
    count,
    children,
  }: {
    to: string
    label: string
    count?: number
    children: React.ReactNode
  }) => (
    <Link
      to={to}
      aria-label={`${label}${count ? ` (${count} unread)` : ''}`}
      className={`relative inline-flex items-center justify-center rounded-xl border bg-white p-2 sm:p-2.5 transition-colors ${
        isActive(to)
          ? 'border-primary/40 text-primary bg-primary/5'
          : 'border-border text-text hover:border-primary/30 hover:text-primary'
      }`}
    >
      {children}
      {!!count && count > 0 && (
        <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full bg-danger text-white text-[10px] font-bold flex items-center justify-center px-1">
          {count > 99 ? '99+' : count}
        </span>
      )}
    </Link>
  )

  return (
    <header
      className={`bg-white/95 backdrop-blur-md border-b sticky top-0 z-50 transition-shadow duration-200 ${
        scrolled ? 'shadow-md border-transparent' : 'border-border shadow-none'
      }`}
    >
      <div className="container mx-auto px-3 sm:px-4">
        <div className="flex items-center justify-between h-16 sm:h-[72px] gap-2">
          {/* Logo */}
          <Link to="/" className="text-xl sm:text-2xl font-bold text-primary shrink-0">
            MyShop
          </Link>

          {/* Desktop nav links */}
          <nav className="hidden lg:flex items-center gap-1 flex-1 ml-6">
            {navLinks.map(({ to, label }) => (
              <Link
                key={to}
                to={to}
                className={`relative px-4 py-2 rounded-lg text-sm font-medium transition-base ${
                  isActive(to)
                    ? 'text-secondary bg-green-50'
                    : 'text-text hover:text-secondary hover:bg-gray-50'
                }`}
              >
                {label}
                {label === 'Orders' && incompleteOrders > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full bg-danger text-white text-[10px] font-bold flex items-center justify-center px-1">
                    {incompleteOrders > 99 ? '99+' : incompleteOrders}
                  </span>
                )}
                {isActive(to) && (
                  <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-5 h-0.5 bg-secondary rounded-full" />
                )}
              </Link>
            ))}
          </nav>

          {/* Right cluster — visible on all screens */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* ── Mode lever (mobile + desktop) ── */}
            {isAuthenticated && isManagementUser && (
              <button
                onClick={handleViewModeToggle}
                aria-label={
                  isStaffMode
                    ? 'Switch to customer mode'
                    : 'Switch to store management mode'
                }
                title={
                  isStaffMode
                    ? 'Switch to customer browsing'
                    : 'Switch to store management'
                }
                className="flex items-center rounded-full border border-border bg-white p-0.5 hover:border-primary/40 transition-all"
              >
                <div className="relative flex h-8 w-[60px] sm:h-9 sm:w-[68px] items-center rounded-full bg-gray-100">
                  <span
                    className={`absolute top-0.5 h-7 w-7 sm:h-8 sm:w-8 rounded-full bg-primary shadow-sm transition-transform duration-300 ${
                      isStaffMode
                        ? 'translate-x-[30px] sm:translate-x-[32px]'
                        : 'translate-x-0.5'
                    }`}
                  />
                  <span
                    className={`relative z-10 flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center transition-colors ${
                      !isStaffMode ? 'text-white' : 'text-muted-text'
                    }`}
                  >
                    <Store className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  </span>
                  <span
                    className={`relative z-10 flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center transition-colors ${
                      isStaffMode ? 'text-white' : 'text-muted-text'
                    }`}
                  >
                    <LayoutDashboard className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  </span>
                </div>
              </button>
            )}

            {/* ── Cart (customer mode only) ── */}
            {isAuthenticated && !isStaffMode && (
              <Link
                to="/cart"
                aria-label={`Cart with ${cartItems.length} items`}
                className={`relative inline-flex items-center justify-center rounded-xl border bg-white p-2 sm:p-2.5 transition-colors ${
                  isActive('/cart')
                    ? 'border-primary/40 text-primary bg-primary/5'
                    : 'border-border text-text hover:border-primary/30 hover:text-primary'
                }`}
              >
                <ShoppingCart
                  className={`w-5 h-5 ${cartAnimating ? 'animate-cart-bounce' : ''}`}
                  strokeWidth={1.9}
                />
                {cartItems.length > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full bg-danger text-white text-[10px] font-bold flex items-center justify-center px-1">
                    {cartItems.length > 99 ? '99+' : cartItems.length}
                  </span>
                )}
              </Link>
            )}

            {/* ── Messages ── */}
            {isAuthenticated && (
              <IconBtn to="/messages" label="Messages" count={unreadMessages}>
                <MessageCircle className="w-5 h-5" strokeWidth={1.9} />
              </IconBtn>
            )}

            {/* ── Notifications ── */}
            {isAuthenticated && (
              <IconBtn
                to="/notifications"
                label="Notifications"
                count={unreadNotifications}
              >
                <Bell className="w-5 h-5" strokeWidth={1.9} />
              </IconBtn>
            )}

            {/* ── Profile + logout (desktop only) ── */}
            <div className="hidden sm:flex items-center gap-2 ml-1">
              {isAuthenticated ? (
                <>
                  <Link
                    to="/profile"
                    className="flex items-center gap-2 rounded-xl border border-border bg-white px-2.5 py-1.5 hover:border-primary/30 hover:shadow-sm transition-all"
                  >
                    <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <span className="text-xs font-semibold text-primary">
                        {user?.name?.[0]?.toUpperCase() || 'U'}
                      </span>
                    </div>
                    <span className="text-sm text-muted-text hidden md:block max-w-[90px] truncate">
                      {user?.name}
                    </span>
                  </Link>
                  <button
                    onClick={logout}
                    className="text-sm text-danger hover:text-red-700 hover:bg-red-50 px-3 py-1.5 rounded-lg"
                  >
                    Logout
                  </button>
                </>
              ) : (
                <>
                  <Link
                    to="/login"
                    className="text-sm font-medium text-secondary px-3 py-2 rounded-lg hover:bg-green-50"
                  >
                    Login
                  </Link>
                  <Link
                    to="/signup"
                    className="text-sm font-medium bg-primary text-white px-4 py-2 rounded-lg"
                  >
                    Sign Up
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}