// ProfilePage.tsx
import { useEffect, useState, useId, useMemo, useCallback } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { userService } from '@/services/userService'
import { orderService } from '@/services/orderService'
import { notificationService } from '@/services/notificationService'
import { formatDate, formatPrice } from '@/utils'
import { getEffectivePermissions, hasAccess } from '@/utils/rbac'

/* ─────────────────────────── Small Components ─────────────────────────── */

function StatCard({
  icon,
  label,
  value,
  accent = false,
}: {
  icon: React.ReactNode
  label: string
  value: string | number
  accent?: boolean
}) {
  return (
    <div className="rounded-xl border border-border bg-white p-3.5 flex items-center gap-3 hover:border-gray-200 transition-colors">
      <div
        className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
          accent ? 'bg-amber-50 text-amber-500' : 'bg-primary/5 text-primary'
        }`}
      >
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-[11px] text-muted-text leading-none mb-1">{label}</p>
        <p className="text-sm font-bold text-text truncate leading-none">{value}</p>
      </div>
    </div>
  )
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: React.ReactNode
}) {
  return (
    <div className="flex items-start gap-3 py-3 border-b border-border/40 last:border-0">
      <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center shrink-0 text-gray-400 mt-0.5">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] text-muted-text mb-0.5">{label}</p>
        <div className="text-sm font-medium text-text">{value}</div>
      </div>
    </div>
  )
}

function Section({
  title,
  children,
  action,
  noPadding = false,
}: {
  title: string
  children: React.ReactNode
  action?: React.ReactNode
  noPadding?: boolean
}) {
  return (
    <div className="bg-white rounded-2xl border border-border overflow-hidden">
      <div className="flex items-center justify-between px-4 sm:px-5 py-3.5 border-b border-border">
        <h3 className="font-bold text-sm text-text">{title}</h3>
        {action}
      </div>
      <div className={noPadding ? '' : 'px-4 sm:px-5 py-4'}>{children}</div>
    </div>
  )
}

function QuickLinkItem({
  to,
  icon,
  label,
  description,
  badge,
  accent,
}: {
  to: string
  icon: React.ReactNode
  label: string
  description?: string
  badge?: number
  accent?: string
}) {
  return (
    <Link
      to={to}
      className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors group"
    >
      <div
        className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
          accent || 'bg-gray-50 text-gray-500'
        }`}
      >
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-text group-hover:text-primary transition-colors truncate">
          {label}
        </p>
        {description && (
          <p className="text-[11px] text-muted-text truncate">{description}</p>
        )}
      </div>
      {badge !== undefined && badge > 0 && (
        <span className="min-w-[20px] h-5 rounded-full bg-danger text-white text-[10px] font-bold flex items-center justify-center px-1.5 shrink-0">
          {badge > 99 ? '99+' : badge}
        </span>
      )}
      <svg
        className="w-4 h-4 text-gray-300 group-hover:text-primary transition-colors shrink-0"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
      </svg>
    </Link>
  )
}

function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: string
  title: string
  description: string
  action?: React.ReactNode
}) {
  return (
    <div className="rounded-2xl border-2 border-dashed border-border bg-gray-50/50 py-10 px-4 text-center">
      <div className="text-3xl mb-3">{icon}</div>
      <p className="text-sm font-semibold text-text">{title}</p>
      <p className="text-xs text-muted-text mt-1 max-w-xs mx-auto">{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

/* ─────────────────────────── Icons (reusable) ─────────────────────────── */

const Icons = {
  user: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
      />
    </svg>
  ),
  mail: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
      />
    </svg>
  ),
  phone: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
      />
    </svg>
  ),
  calendar: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
      />
    </svg>
  ),
  shield: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
      />
    </svg>
  ),
  orders: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
      />
    </svg>
  ),
  heart: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
      />
    </svg>
  ),
  bell: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
      />
    </svg>
  ),
  lock: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
      />
    </svg>
  ),
  shop: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
      />
    </svg>
  ),
  bolt: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
  ),
  team: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
      />
    </svg>
  ),
  edit: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
      />
    </svg>
  ),
  logout: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
      />
    </svg>
  ),
  check: (
    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
      <path
        fillRule="evenodd"
        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
        clipRule="evenodd"
      />
    </svg>
  ),
  location: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
      />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  chart: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
      />
    </svg>
  ),
  clock: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  ),
  trash: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
      />
    </svg>
  ),
  plus: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
    </svg>
  ),
  arrow: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
    </svg>
  ),
  star: (
    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
    </svg>
  ),
  products: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9-4v4m0 0H8m4 0h4"
      />
    </svg>
  ),
  money: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  ),
  info: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  ),
}

/* ─────────────────────────── Tab type ─────────────────────────── */

type TabKey = 'profile' | 'orders' | 'notifications' | 'security'

/* ─────────────────────────── Main Component ─────────────────────────── */

function ProfilePage() {
  const navigate = useNavigate()
  const { user, isAuthenticated, logout } = useAuthStore()

  const [isApplying, setIsApplying] = useState(false)
  const [shopName, setShopName] = useState('')
  const [shopDescription, setShopDescription] = useState('')
  const [showApplicationForm, setShowApplicationForm] = useState(false)
  const [activeTab, setActiveTab] = useState<TabKey>('profile')
  const [recentOrders, setRecentOrders] = useState<any[]>([])
  const [ordersLoading, setOrdersLoading] = useState(false)
  const [ordersError, setOrdersError] = useState('')
  const [unreadNotifications, setUnreadNotifications] = useState(0)

  const shopNameId = useId()
  const shopDescId = useId()

  const isSeller = user?.role === 'admin' || user?.role === 'manager'
  const isEmployee = user?.role === 'employee'
  const isPending = user?.appliedAsSeller && !user?.sellerApproved
  const memberSince = user?.createdAt ? formatDate(user.createdAt) : ''

  const canManageAccess = useMemo(() => {
    if (!user) return false
    if (user.role === 'admin' || user.role === 'manager') return true
    if (user.role === 'employee') {
      const perms = getEffectivePermissions(user)
      return hasAccess(perms.employees, 'write')
    }
    return false
  }, [user])

  // Load orders when tab is active
  useEffect(() => {
    if (!isAuthenticated || !user || activeTab !== 'orders') return

    let mounted = true
    ;(async () => {
      try {
        setOrdersLoading(true)
        setOrdersError('')
        const data = await orderService.getAll(1, 5)
        if (mounted) setRecentOrders(data.items || [])
      } catch {
        if (mounted) {
          setRecentOrders([])
          setOrdersError('Could not load your recent orders right now.')
        }
      } finally {
        if (mounted) setOrdersLoading(false)
      }
    })()

    return () => {
      mounted = false
    }
  }, [activeTab, isAuthenticated, user])

  // Load unread notification count
  useEffect(() => {
    if (!isAuthenticated || !user) return

    let mounted = true
    const load = async () => {
      try {
        const count = await notificationService.getUnreadCount()
        if (mounted) setUnreadNotifications(count)
      } catch {
        if (mounted) setUnreadNotifications(0)
      }
    }

    void load()
    const interval = setInterval(load, 30000)
    return () => {
      mounted = false
      clearInterval(interval)
    }
  }, [isAuthenticated, user])

  const handleApplyAsSeller = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      if (!shopName.trim() || !shopDescription.trim() || !user) return

      setIsApplying(true)
      try {
        await userService.applyAsSeller(user.id, shopName, shopDescription)
        setShowApplicationForm(false)
        setShopName('')
        setShopDescription('')
        window.location.reload()
      } catch (error: any) {
        alert(error?.response?.data?.message || 'Failed to submit application')
      } finally {
        setIsApplying(false)
      }
    },
    [shopName, shopDescription, user]
  )

  const handleLogout = useCallback(() => {
    logout()
    navigate('/')
  }, [logout, navigate])

  /* ── Not authenticated ── */
  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-[70dvh] flex flex-col items-center justify-center px-4 animate-fade-in">
        <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mb-5">
          <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
            />
          </svg>
        </div>
        <h1 className="text-xl font-bold text-text mb-2">Sign in to continue</h1>
        <p className="text-sm text-muted-text mb-6 text-center max-w-xs">
          Log in to view your profile, orders, and manage your account.
        </p>
        <button
          onClick={() => navigate('/login')}
          className="bg-primary text-white px-8 py-3 rounded-xl font-semibold text-sm hover:bg-primary/90 active:scale-[0.98] transition-all"
        >
          Go to Login
        </button>
      </div>
    )
  }

  /* ── Tabs config ── */
  const tabs: Array<{ key: TabKey; label: string; icon: React.ReactNode; badge?: number }> = [
    { key: 'profile', label: 'Profile', icon: Icons.user },
    { key: 'orders', label: 'Orders', icon: Icons.orders },
    {
      key: 'notifications',
      label: 'Notifications',
      icon: Icons.bell,
      badge: unreadNotifications > 0 ? unreadNotifications : undefined,
    },
    { key: 'security', label: 'Security', icon: Icons.lock },
  ]

  /* ── Order status styles ── */
  const getStatusStyle = (status: string) => {
    switch (status.toLowerCase()) {
      case 'delivered':
        return 'bg-green-50 text-green-700'
      case 'shipped':
        return 'bg-blue-50 text-blue-700'
      case 'processing':
        return 'bg-amber-50 text-amber-700'
      case 'cancelled':
        return 'bg-red-50 text-red-700'
      default:
        return 'bg-gray-100 text-gray-700'
    }
  }

  return (
    <div className="min-h-[80dvh] animate-fade-in pb-10">
      <div className="max-w-5xl mx-auto px-4">
        {/* ────────────── Header / Hero ────────────── */}
        <div className="relative mb-6">
          {/* Cover */}
          <div className="h-28 sm:h-36 rounded-2xl bg-gradient-to-br from-primary via-primary/80 to-secondary overflow-hidden relative">
            <div
              className="absolute inset-0 opacity-[0.07]"
              style={{
                backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`,
                backgroundSize: '24px 24px',
              }}
            />
          </div>

          {/* Profile card overlapping the cover */}
          <div className="relative -mt-14 mx-3 sm:mx-5">
            <div className="bg-white rounded-2xl border border-border p-4 sm:p-5">
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
                {/* Avatar */}
                <div className="relative shrink-0 -mt-12 sm:-mt-14">
                  <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-white border-4 border-white shadow-md overflow-hidden">
                    <img
                      src={`https://api.dicebear.com/7.x/initials/svg?seed=${user.name}&backgroundColor=e2e8f0&textColor=0f172a&fontSize=40`}
                      alt={user.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-green-500 border-2 border-white" />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0 text-center sm:text-left">
                  <div className="flex items-center justify-center sm:justify-start gap-2 flex-wrap">
                    <h1 className="text-xl sm:text-2xl font-bold text-text truncate">{user.name}</h1>
                    {isSeller && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700 uppercase tracking-wide">
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                          <path
                            fillRule="evenodd"
                            d="M5 2a1 1 0 011 1v1h1a1 1 0 010 2H6v1a1 1 0 01-2 0V6H3a1 1 0 010-2h1V3a1 1 0 011-1zm0 10a1 1 0 011 1v1h1a1 1 0 110 2H6v1a1 1 0 11-2 0v-1H3a1 1 0 110-2h1v-1a1 1 0 011-1zM12 2a1 1 0 01.967.744L14.146 7.2 17.5 9.134a1 1 0 010 1.732l-3.354 1.935-1.18 4.455a1 1 0 01-1.933 0L9.854 12.8 6.5 10.866a1 1 0 010-1.732l3.354-1.935 1.18-4.455A1 1 0 0112 2z"
                            clipRule="evenodd"
                          />
                        </svg>
                        Seller
                      </span>
                    )}
                    {isEmployee && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-700 uppercase tracking-wide">
                        Employee
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-text mt-0.5 truncate">{user.email}</p>
                  <p className="text-xs text-muted-text mt-0.5">Member since {memberSince}</p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => {}}
                    className="p-2.5 sm:px-4 sm:py-2 rounded-xl border border-border text-sm font-medium text-text bg-white hover:bg-gray-50 active:scale-[0.98] transition-all flex items-center gap-2"
                  >
                    {Icons.edit}
                    <span className="hidden sm:inline">Edit</span>
                  </button>
                  <button
                    onClick={handleLogout}
                    className="p-2.5 sm:px-4 sm:py-2 rounded-xl border border-red-200 text-sm font-medium text-danger bg-white hover:bg-red-50 active:scale-[0.98] transition-all flex items-center gap-2"
                  >
                    {Icons.logout}
                    <span className="hidden sm:inline">Logout</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ────────────── Stats Row ────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-6">
          <StatCard
            icon={<span className="text-sm">📦</span>}
            label="Total Orders"
            value={recentOrders.length > 0 ? `${recentOrders.length}+` : '—'}
          />
          <StatCard icon={<span className="text-sm">❤️</span>} label="Wishlist" value="—" />
          {isSeller && user.sellerProfile ? (
            <>
              <StatCard
                icon={<span className="text-sm">⭐</span>}
                label="Rating"
                value={`${user.sellerProfile.rating.toFixed(1)} (${user.sellerProfile.totalReviews})`}
                accent
              />
              <StatCard
                icon={<span className="text-sm">👥</span>}
                label="Followers"
                value={user.sellerProfile.followers}
              />
            </>
          ) : (
            <>
              <StatCard icon={<span className="text-sm">✍️</span>} label="Reviews" value="—" />
              <StatCard icon={<span className="text-sm">🔥</span>} label="Points" value="—" />
            </>
          )}
        </div>

        {/* ────────────── Tab Bar ────────────── */}
        <div className="flex gap-1 border-b border-border mb-6 overflow-x-auto hide-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0">
          {tabs.map(({ key, label, icon, badge }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`shrink-0 flex items-center gap-1.5 px-3.5 sm:px-4 py-2.5 text-sm font-medium border-b-2 transition-all whitespace-nowrap ${
                activeTab === key
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-text hover:text-text hover:border-gray-200'
              }`}
            >
              {icon}
              <span>{label}</span>
              {badge !== undefined && badge > 0 && (
                <span className="ml-0.5 min-w-[18px] h-[18px] rounded-full bg-danger text-white text-[10px] font-bold flex items-center justify-center px-1">
                  {badge > 99 ? '99+' : badge}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ────────────── Tab Content ────────────── */}
        <div className="animate-fade-in" key={activeTab}>
          {/* ═══════ PROFILE TAB ═══════ */}
          {activeTab === 'profile' && (
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
              {/* Left column — Account info */}
              <div className="lg:col-span-3 space-y-5">
                <Section
                  title="Account Information"
                  action={
                    <button className="text-xs font-medium text-primary hover:underline underline-offset-2">
                      Edit
                    </button>
                  }
                >
                  <div className="space-y-0">
                    <InfoRow icon={Icons.user} label="Full Name" value={user.name} />
                    <InfoRow
                      icon={Icons.mail}
                      label="Email Address"
                      value={
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="truncate">{user.email}</span>
                          <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-green-700 bg-green-50 px-1.5 py-0.5 rounded-full shrink-0">
                            {Icons.check}
                            Verified
                          </span>
                        </div>
                      }
                    />
                    {user.phone && <InfoRow icon={Icons.phone} label="Phone" value={user.phone} />}
                    <InfoRow icon={Icons.calendar} label="Member Since" value={memberSince} />
                    <InfoRow
                      icon={Icons.shield}
                      label="Account Type"
                      value={
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${
                            isSeller
                              ? 'bg-amber-50 text-amber-700'
                              : isEmployee
                                ? 'bg-blue-50 text-blue-700'
                                : 'bg-primary/5 text-primary'
                          }`}
                        >
                          {isSeller ? 'Store Manager' : isEmployee ? 'Employee' : 'Customer'}
                        </span>
                      }
                    />
                  </div>
                </Section>

                {/* Store Management Section */}
                {isSeller && user.sellerProfile && (
                  <Section
                    title="Store"
                    action={
                      <Link
                        to="/admin/store"
                        className="text-xs font-medium text-primary hover:underline underline-offset-2 flex items-center gap-1"
                      >
                        Manage →
                      </Link>
                    }
                  >
                    <div className="flex items-center gap-3 mb-4 p-3 rounded-xl bg-gray-50 border border-border/50">
                      <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center overflow-hidden shrink-0">
                        <img
                          src={`https://api.dicebear.com/7.x/initials/svg?seed=${user.sellerProfile.shopName}&backgroundColor=dbeafe&textColor=1e40af`}
                          alt={user.sellerProfile.shopName}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="font-bold text-sm text-text truncate">
                          {user.sellerProfile.shopName}
                        </h4>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          <span className="inline-flex items-center gap-0.5 text-xs text-amber-600">
                            <span className="text-amber-400">★</span>
                            {user.sellerProfile.rating.toFixed(1)}
                          </span>
                          <span className="text-gray-300 text-xs">•</span>
                          <span className="text-xs text-muted-text">
                            {user.sellerProfile.totalReviews} reviews
                          </span>
                          <span className="text-gray-300 text-xs">•</span>
                          <span className="text-xs text-muted-text">
                            {user.sellerProfile.followers} followers
                          </span>
                        </div>
                      </div>
                      <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-green-700 bg-green-50 px-2 py-1 rounded-full shrink-0">
                        {Icons.check}
                        Active
                      </span>
                    </div>
                    <p className="text-xs text-muted-text mb-1">Description</p>
                    <p className="text-sm text-text leading-relaxed">
                      {user.sellerProfile.shopDescription}
                    </p>
                  </Section>
                )}
              </div>

              {/* Right column — Actions & Links */}
              <div className="lg:col-span-2 space-y-5">
                {/* Store Management Links */}
                {(isSeller || isEmployee) && (
                  <Section title="Store Tools" noPadding>
                    <div className="divide-y divide-border/50">
                      <QuickLinkItem
                        to="/admin/store"
                        icon={Icons.shop}
                        label="Store Hub"
                        description="Manage shop settings and profile"
                        accent="bg-primary/5 text-primary"
                      />
                      <QuickLinkItem
                        to="/admin/store/orders"
                        icon={Icons.bolt}
                        label="Store Orders"
                        description="View and manage customer orders"
                        accent="bg-amber-50 text-amber-600"
                      />
                      <QuickLinkItem
                        to="/admin/store/products"
                        icon={Icons.products}
                        label="Products"
                        description="Manage your product listings"
                        accent="bg-green-50 text-green-600"
                      />
                      {canManageAccess && (
                        <QuickLinkItem
                          to="/admin/store/access"
                          icon={Icons.team}
                          label="Team & Access"
                          description="Manage employees and permissions"
                          accent="bg-purple-50 text-purple-600"
                        />
                      )}
                    </div>
                  </Section>
                )}

                {/* Quick Links for everyone */}
                <Section title="Quick Links" noPadding>
                  <div className="divide-y divide-border/50">
                    <QuickLinkItem
                      to="/orders"
                      icon={Icons.orders}
                      label="My Orders"
                      description="Track and view your purchases"
                    />
                    <QuickLinkItem
                      to="/wishlist"
                      icon={Icons.heart}
                      label="Wishlist"
                      description="Items you've saved for later"
                    />
                    <QuickLinkItem
                      to="/addresses"
                      icon={Icons.location}
                      label="Addresses"
                      description="Manage delivery addresses"
                    />
                    <QuickLinkItem
                      to="/notifications"
                      icon={Icons.bell}
                      label="Notifications"
                      description="Order updates and alerts"
                      badge={unreadNotifications}
                    />
                  </div>
                </Section>

                {/* Become a Seller CTA */}
                {user.role === 'user' && !isPending && (
                  <div className="rounded-2xl border border-primary/20 overflow-hidden">
                    <div className="bg-gradient-to-br from-primary/5 to-green-50 p-5">
                      <div className="text-center">
                        <div className="w-12 h-12 rounded-2xl bg-white shadow-sm flex items-center justify-center mx-auto mb-3">
                          <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
                            />
                          </svg>
                        </div>
                        <h3 className="text-base font-bold text-text mb-1">Start Selling</h3>
                        <p className="text-xs text-muted-text mb-4">
                          Open your shop and reach thousands of customers
                        </p>

                        {!showApplicationForm ? (
                          <button
                            onClick={() => setShowApplicationForm(true)}
                            className="w-full bg-primary text-white font-semibold py-2.5 rounded-xl text-sm hover:bg-primary/90 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                          >
                            {Icons.plus}
                            Apply as Seller
                          </button>
                        ) : (
                          <form
                            onSubmit={handleApplyAsSeller}
                            className="space-y-3 text-left animate-fade-in"
                          >
                            <div>
                              <label
                                htmlFor={shopNameId}
                                className="block text-xs font-medium text-text mb-1"
                              >
                                Shop Name
                              </label>
                              <input
                                id={shopNameId}
                                type="text"
                                value={shopName}
                                onChange={(e) => setShopName(e.target.value)}
                                placeholder="e.g., Tech Haven Store"
                                required
                                className="w-full rounded-xl border border-border bg-white px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                              />
                            </div>
                            <div>
                              <label
                                htmlFor={shopDescId}
                                className="block text-xs font-medium text-text mb-1"
                              >
                                Description
                              </label>
                              <textarea
                                id={shopDescId}
                                value={shopDescription}
                                onChange={(e) => setShopDescription(e.target.value)}
                                placeholder="Tell us about your shop..."
                                rows={3}
                                required
                                className="w-full rounded-xl border border-border bg-white px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all resize-none"
                              />
                              <p className="text-[10px] text-muted-text mt-1">
                                {shopDescription.length}/500
                              </p>
                            </div>
                            <div className="flex gap-2">
                              <button
                                type="submit"
                                disabled={isApplying || !shopName.trim() || !shopDescription.trim()}
                                className="flex-1 bg-primary text-white font-semibold py-2.5 rounded-xl text-sm hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                              >
                                {isApplying ? (
                                  <>
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    Submitting…
                                  </>
                                ) : (
                                  'Submit'
                                )}
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setShowApplicationForm(false)
                                  setShopName('')
                                  setShopDescription('')
                                }}
                                className="px-4 py-2.5 rounded-xl border border-border text-sm font-medium text-muted-text hover:bg-gray-50 transition-all"
                              >
                                Cancel
                              </button>
                            </div>
                          </form>
                        )}
                      </div>
                    </div>

                    <div className="px-5 py-3 bg-white border-t border-primary/10 space-y-2">
                      {['List unlimited products', 'Low commission rates', 'Analytics dashboard', 'Marketing tools'].map(
                        (text, i) => (
                          <div key={i} className="flex items-center gap-2 text-xs text-muted-text">
                            <svg
                              className="w-3.5 h-3.5 text-green-500 shrink-0"
                              fill="currentColor"
                              viewBox="0 0 20 20"
                            >
                              <path
                                fillRule="evenodd"
                                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                clipRule="evenodd"
                              />
                            </svg>
                            {text}
                          </div>
                        )
                      )}
                    </div>
                  </div>
                )}

                {/* Pending application */}
                {isPending && (
                  <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                    <div className="flex gap-3">
                      <div className="w-9 h-9 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
                        {Icons.clock}
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-bold text-sm text-amber-900">Application Pending</h4>
                        <p className="text-xs text-amber-800 mt-1 leading-relaxed">
                          Your seller application is under review. We'll notify you once approved
                          (usually 1–2 business days).
                        </p>
                        <div className="mt-3 flex items-center gap-2">
                          <div className="flex-1 h-1.5 rounded-full bg-amber-200 overflow-hidden">
                            <div className="h-full w-1/2 bg-amber-400 rounded-full animate-pulse" />
                          </div>
                          <span className="text-[10px] font-medium text-amber-700">In Review</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Active seller card */}
                {isSeller && (
                  <div className="rounded-2xl border border-green-200 bg-green-50 p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center shrink-0">
                        <svg
                          className="w-5 h-5 text-green-600"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold text-green-900">Active Seller</p>
                        <p className="text-xs text-green-700">Your shop is live</p>
                      </div>
                      <button
                        onClick={() => navigate('/admin/store')}
                        className="shrink-0 bg-green-600 text-white text-xs font-semibold px-3 py-2 rounded-lg hover:bg-green-700 active:scale-[0.98] transition-all"
                      >
                        Open Store
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ═══════ ORDERS TAB ═══════ */}
          {activeTab === 'orders' && (
            <div className="max-w-3xl space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-text">Recent Orders</h3>
                <Link
                  to="/orders"
                  className="text-sm font-medium text-primary hover:underline underline-offset-2 transition-colors"
                >
                  View all →
                </Link>
              </div>

              {ordersLoading ? (
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="bg-white rounded-2xl border border-border p-4 animate-pulse">
                      <div className="flex justify-between mb-3">
                        <div className="skeleton h-4 w-28 rounded" />
                        <div className="skeleton h-5 w-16 rounded-full" />
                      </div>
                      <div className="flex justify-between pt-3 border-t border-border/50">
                        <div className="skeleton h-3 w-16 rounded" />
                        <div className="skeleton h-4 w-20 rounded" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : ordersError ? (
                <EmptyState
                  icon="⚠️"
                  title="Could not load orders"
                  description={ordersError}
                  action={
                    <Link
                      to="/orders"
                      className="inline-block text-sm font-semibold text-primary hover:underline"
                    >
                      Open Orders Page
                    </Link>
                  }
                />
              ) : recentOrders.length > 0 ? (
                <div className="space-y-3">
                  {recentOrders.map((order) => (
                    <Link
                      key={order.id}
                      to={`/orders/${order.id}`}
                      className="block bg-white rounded-2xl border border-border p-4 hover:border-gray-200 hover:shadow-sm transition-all group"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-bold text-sm text-text truncate group-hover:text-primary transition-colors">
                            {order.id}
                          </p>
                          <p className="text-xs text-muted-text mt-0.5">{formatDate(order.createdAt)}</p>
                        </div>
                        <span
                          className={`text-[10px] font-bold px-2.5 py-1 rounded-full capitalize shrink-0 ${getStatusStyle(
                            order.status
                          )}`}
                        >
                          {order.status}
                        </span>
                      </div>
                      <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/40">
                        <p className="text-xs text-muted-text">
                          {order.items?.length || 0} item{(order.items?.length || 0) !== 1 ? 's' : ''}
                        </p>
                        <p className="font-bold text-sm text-text">{formatPrice(order.totalAmount)}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <EmptyState
                  icon="📦"
                  title="No orders yet"
                  description="Once you make a purchase, your orders will appear here."
                  action={
                    <Link
                      to="/products"
                      className="inline-flex items-center gap-2 bg-primary text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors"
                    >
                      Browse Products
                    </Link>
                  }
                />
              )}
            </div>
          )}

          {/* ═══════ NOTIFICATIONS TAB ═══════ */}
          {activeTab === 'notifications' && (
            <div className="max-w-3xl space-y-4">
              <div className="bg-white rounded-2xl border border-border p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h3 className="font-bold text-text text-sm">Notification Center</h3>
                  <p className="text-xs text-muted-text mt-1">
                    View live order updates and alerts in the dedicated notifications page.
                  </p>
                </div>
                <Link
                  to="/notifications"
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary/90 transition-colors shrink-0"
                >
                  {Icons.bell}
                  Open Notifications
                  {unreadNotifications > 0 && (
                    <span className="min-w-[18px] h-[18px] rounded-full bg-white/20 text-white text-[10px] font-bold flex items-center justify-center px-1">
                      {unreadNotifications}
                    </span>
                  )}
                </Link>
              </div>

              <div className="grid grid-cols-3 gap-2.5">
                <StatCard icon={<span className="text-sm">📬</span>} label="Unread" value={unreadNotifications} />
                <StatCard icon={<span className="text-sm">🔔</span>} label="Status" value="Live" />
                <StatCard icon={<span className="text-sm">📋</span>} label="Type" value="Orders" />
              </div>
            </div>
          )}

          {/* ═══════ SECURITY TAB ═══════ */}
          {activeTab === 'security' && (
            <div className="max-w-2xl space-y-5">
              <Section title="Change Password">
                <form className="space-y-3" onSubmit={(e) => e.preventDefault()}>
                  {[
                    { label: 'Current Password', placeholder: 'Enter current password' },
                    { label: 'New Password', placeholder: 'Enter new password' },
                    { label: 'Confirm Password', placeholder: 'Confirm new password' },
                  ].map(({ label, placeholder }) => (
                    <div key={label}>
                      <label className="block text-xs font-medium text-text mb-1">{label}</label>
                      <input
                        type="password"
                        placeholder={placeholder}
                        className="w-full rounded-xl border border-border bg-white px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                      />
                    </div>
                  ))}
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary/90 active:scale-[0.98] transition-all"
                  >
                    Update Password
                  </button>
                </form>
              </Section>

              <Section title="Two-Factor Authentication">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-lg bg-amber-50 flex items-center justify-center shrink-0 text-amber-500">
                    {Icons.lock}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-text">Extra layer of security</p>
                    <p className="text-xs text-muted-text mt-0.5">
                      Enable 2FA to protect your account from unauthorized access.
                    </p>
                    <button className="mt-3 px-4 py-2 rounded-xl border border-border text-sm font-medium text-text hover:bg-gray-50 active:scale-[0.98] transition-all">
                      Enable 2FA
                    </button>
                  </div>
                </div>
              </Section>

              <Section title="Danger Zone">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-lg bg-red-50 flex items-center justify-center shrink-0 text-red-500">
                    {Icons.trash}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-text">Delete Account</p>
                    <p className="text-xs text-muted-text mt-0.5">
                      Permanently delete your account and all data. This cannot be undone.
                    </p>
                    <button className="mt-3 px-4 py-2 rounded-xl border border-red-200 text-sm font-medium text-danger hover:bg-red-50 active:scale-[0.98] transition-all">
                      Delete Account
                    </button>
                  </div>
                </div>
              </Section>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default ProfilePage