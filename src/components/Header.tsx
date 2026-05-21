import { useState, useEffect, useCallback } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { useCartStore } from '@/store/cartStore'
import { Repeat, ShoppingCart, Bell } from 'lucide-react'
import { notificationService } from '@/services/notificationService'

export default function Header(): JSX.Element {
  const { isAuthenticated, user, currentRole, logout, switchRole } = useAuthStore()
  const cartItems = useCartStore((s) => s.items)
  const location = useLocation()
  const navigate = useNavigate()

  const [scrolled, setScrolled] = useState(false)
  const [cartAnimating, setCartAnimating] = useState(false)
  const [unreadNotifications, setUnreadNotifications] = useState(0)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const prevCount = useCartStore((s) => s.items.length)
  useEffect(() => {
    if (prevCount > 0) {
      setCartAnimating(true)
      const t = setTimeout(() => setCartAnimating(false), 300)
      return () => clearTimeout(t)
    }
  }, [prevCount])

  const isActive = useCallback((path: string) => location.pathname === path, [location.pathname])

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
        // Keep last known value on transient errors (e.g., temporary 429/connection blips).
      }
    }

    void loadUnread()
    const interval = setInterval(loadUnread, 30000)
    return () => {
      mounted = false
      clearInterval(interval)
    }
  }, [isAuthenticated])

  const getLogoLink = () => {
    if (currentRole === 'seller') {
      return '/seller/shop'
    }
    return '/'
  }

  const getNavLinks = () => {
    if (currentRole === 'seller') {
      return [
        { to: '/seller/shop', label: 'Dashboard' },
        { to: '/seller/products', label: 'Products' },
        { to: '/seller/orders', label: 'Orders' },
        { to: '/messages', label: 'Messages' },
        { to: '/access-management', label: 'Access' },
        { to: '/seller/analytics', label: 'Analytics' },
        { to: '/profile', label: 'Profile' },
      ]
    }
    if (currentRole === 'admin') {
      return [
        { to: '/', label: 'Home' },
        { to: '/products', label: 'Products' },
        { to: '/admin', label: 'Admin' },
      ]
    }
    return [
      { to: '/', label: 'Home' },
      { to: '/products', label: 'Search' },
      { to: '/orders', label: 'Orders' },
      { to: '/notifications', label: 'Notifications' },
      { to: '/messages', label: 'Messages' },
      { to: '/profile', label: 'Profile' },
      { to: '/cart', label: 'Cart' },
    ]
  }

  const navLinks = getNavLinks()
  const canSwitchRole = isAuthenticated && user?.role === 'seller'

  const handleRoleToggle = () => {
    const newRole = currentRole === 'seller' ? 'user' : 'seller'
    switchRole(newRole as 'user' | 'seller')
    navigate(newRole === 'seller' ? '/seller/shop' : '/')
  }

  return (
    <header
      className={`bg-white/95 backdrop-blur-md border-b sticky top-0 z-50 transition-shadow duration-200 ${
        scrolled ? 'shadow-md border-transparent' : 'border-border shadow-none'
      }`}
    >
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16 sm:h-[72px]">
          <Link to={getLogoLink()} className="text-xl sm:text-2xl font-bold text-primary">
            eShop
          </Link>

          <nav className="hidden lg:flex items-center gap-1 flex-1 ml-10">
            {navLinks.map(({ to, label }) => (
              <Link
                key={to}
                to={to}
                className={`relative px-4 py-2 rounded-lg text-sm font-medium transition-base ${
                  isActive(to) ? 'text-secondary bg-green-50' : 'text-text hover:text-secondary hover:bg-gray-50'
                }`}
              >
                {label}
                {isActive(to) && <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-5 h-0.5 bg-secondary rounded-full" />}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2 sm:gap-3">
            {currentRole !== 'seller' && (
              <Link to="/cart" className={`relative p-2.5 rounded-lg hover:bg-gray-100 ${isActive('/cart') ? 'bg-gray-100' : ''}`} aria-label={`Cart with ${cartItems.length} items`}>
                <ShoppingCart className={`w-5 h-5 sm:w-6 sm:h-6 text-gray-700 ${cartAnimating ? 'animate-cart-bounce' : ''}`} strokeWidth={1.75} />
                {cartItems.length > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 bg-danger text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                    {cartItems.length > 99 ? '99+' : cartItems.length}
                  </span>
                )}
              </Link>
            )}

            {isAuthenticated && (
              <Link
                to="/notifications"
                className="relative inline-flex items-center justify-center rounded-xl border border-border bg-white p-2.5 text-text hover:border-primary/30 hover:text-primary transition-colors"
                aria-label={`Notifications with ${unreadNotifications} unread`}
              >
                <Bell className="w-5 h-5" strokeWidth={1.9} />
                {unreadNotifications > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full bg-danger text-white text-[10px] font-bold flex items-center justify-center px-1">
                    {unreadNotifications > 99 ? '99+' : unreadNotifications}
                  </span>
                )}
              </Link>
            )}

            <div className="hidden sm:flex items-center gap-3">
              {isAuthenticated ? (
                <>
                  {canSwitchRole && (
                    <button
                      onClick={handleRoleToggle}
                      role="switch"
                      aria-checked={currentRole === 'seller'}
                      className="flex items-center gap-3"
                      title={`Switch to ${currentRole === 'seller' ? 'buyer' : 'seller'}`}
                    >
                      <div className="relative w-14 h-7 p-1 rounded-full bg-gray-100 flex items-center cursor-pointer" aria-hidden>
                        <div
                          className={`absolute left-1 w-5 h-5 bg-white rounded-full shadow-sm transform transition-transform ${
                            currentRole === 'seller' ? 'translate-x-6' : 'translate-x-0'
                          }`}
                        />
                      </div>
                      <span className="text-sm capitalize">{currentRole === 'seller' ? 'Seller' : 'Buyer'}</span>
                    </button>
                  )}

                  <Link to="/profile" className="flex items-center gap-2 rounded-xl border border-border bg-white px-3 py-1.5 hover:border-primary/30 hover:shadow-sm transition-all">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <span className="text-sm font-semibold text-primary">{user?.name?.[0]?.toUpperCase() || 'U'}</span>
                    </div>
                    <span className="text-sm text-muted-text hidden md:block max-w-[100px] truncate">{user?.name}</span>
                  </Link>
                  <button onClick={logout} className="ml-1 text-sm text-danger hover:text-red-700 hover:bg-red-50 px-3 py-1.5 rounded-lg">Logout</button>
                </>
              ) : (
                <>
                  <Link to="/login" className="text-sm font-medium text-secondary px-3 py-2 rounded-lg hover:bg-green-50">Login</Link>
                  <Link to="/signup" className="text-sm font-medium bg-primary text-white px-4 py-2 rounded-lg">Sign Up</Link>
                </>
              )}
            </div>

            {isAuthenticated && canSwitchRole && (
              <button
                onClick={handleRoleToggle}
                className="sm:hidden flex items-center gap-2 px-3 py-2 rounded-xl border border-primary/25 bg-primary/5 text-primary active:scale-[0.98] transition-all"
                title={`Switch to ${currentRole === 'seller' ? 'buyer' : 'seller'}`}
                aria-pressed={currentRole === 'seller'}
              >
                <Repeat className="w-4 h-4" strokeWidth={2.25} />
                <span className="text-xs font-semibold tracking-wide uppercase">
                  {currentRole === 'seller' ? 'Seller' : 'Buyer'}
                </span>
              </button>
            )}

          </div>
        </div>
      </div>
    </header>
  )
}
