import { useEffect, useState, useId } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { userService } from '@/services/userService'
import { orderService } from '@/services/orderService'
import { notificationService } from '@/services/notificationService'
import { formatDate, formatPrice } from '@/utils'

/* ─── Stat Card ─── */
function StatCard({ icon, label, value, accent = false }: {
  icon: React.ReactNode
  label: string
  value: string | number
  accent?: boolean
}) {
  return (
    <div className="rounded-xl border border-border bg-white p-4 flex items-center gap-3
                    hover:border-gray-200 transition-colors duration-200">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0
        ${accent ? 'bg-amber-50 text-amber-500' : 'bg-primary/5 text-primary'}`}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs text-muted-text">{label}</p>
        <p className="text-sm font-bold text-text truncate">{value}</p>
      </div>
    </div>
  )
}

/* ─── Info Row ─── */
function InfoRow({ icon, label, value }: {
  icon: React.ReactNode
  label: string
  value: React.ReactNode
}) {
  return (
    <div className="flex items-start gap-3 py-3.5 border-b border-border/50 last:border-0">
      <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center
                      shrink-0 text-gray-400 mt-0.5">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-muted-text mb-0.5">{label}</p>
        <div className="text-sm font-medium text-text">{value}</div>
      </div>
    </div>
  )
}

/* ─── Section Wrapper ─── */
function Section({ title, children, action }: {
  title: string
  children: React.ReactNode
  action?: React.ReactNode
}) {
  return (
    <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-border">
        <h3 className="font-bold text-text">{title}</h3>
        {action}
      </div>
      <div className="px-5 sm:px-6 py-5">
        {children}
      </div>
    </div>
  )
}

/* ─── Main Component ─── */
function ProfilePage() {
  const navigate = useNavigate()
  const { user, isAuthenticated, logout } = useAuthStore()

  const [isApplying, setIsApplying] = useState(false)
  const [shopName, setShopName] = useState('')
  const [shopDescription, setShopDescription] = useState('')
  const [showApplicationForm, setShowApplicationForm] = useState(false)
  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'orders' | 'seller-orders' | 'notifications'>('profile')
  const [recentOrders, setRecentOrders] = useState<any[]>([])
  const [ordersLoading, setOrdersLoading] = useState(false)
  const [ordersError, setOrdersError] = useState('')
  const [unreadNotifications, setUnreadNotifications] = useState(0)

  const shopNameId = useId()
  const shopDescId = useId()

  /* ── Not authenticated ── */
  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-[70dvh] flex flex-col items-center justify-center px-4 animate-fade-in">
        <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-5">
          <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-text mb-2">Not Authenticated</h1>
        <p className="text-muted-text mb-6 text-sm text-center max-w-xs">
          Please log in to view your profile and manage your account.
        </p>
        <button
          onClick={() => navigate('/login')}
          className="bg-primary text-white px-8 py-3 rounded-xl font-semibold text-sm
                     hover:bg-primary/90 active:scale-[0.98] transition-all duration-200"
        >
          Go to Login
        </button>
      </div>
    )
  }

  const isSeller = user.role === 'seller'
  const isPending = user.appliedAsSeller && !user.sellerApproved
  const memberSince = formatDate(user.createdAt)

  useEffect(() => {
    if (activeTab !== 'orders') return

    let mounted = true
    ;(async () => {
      try {
        setOrdersLoading(true)
        setOrdersError('')
        const data = await orderService.getAll(1, 3)
        if (!mounted) return
        setRecentOrders(data.items || [])
      } catch (error) {
        console.error('Failed to load recent orders:', error)
        if (mounted) {
          setRecentOrders([])
          setOrdersError('Could not load your recent orders right now.')
        }
      } finally {
        if (mounted) {
          setOrdersLoading(false)
        }
      }
    })()

    return () => {
      mounted = false
    }
  }, [activeTab])

  useEffect(() => {
    let mounted = true
    const loadUnread = async () => {
      try {
        const count = await notificationService.getUnreadCount()
        if (mounted) setUnreadNotifications(count)
      } catch {
        if (mounted) setUnreadNotifications(0)
      }
    }

    void loadUnread()
    const interval = setInterval(loadUnread, 30000)
    return () => {
      mounted = false
      clearInterval(interval)
    }
  }, [])

  const handleApplyAsSeller = async (e: React.FormEvent) => {
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
      console.error('Apply as seller error:', error)
      alert(error?.response?.data?.message || 'Failed to submit application')
    } finally {
      setIsApplying(false)
    }
  }

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  const tabs = [
    { key: 'profile' as const, label: 'Profile', icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    )},
    { key: 'orders' as const, label: 'Orders', icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
      </svg>
    ), badge: undefined},
    { key: 'notifications' as const, label: 'Notifications', icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
      </svg>
    ), badge: unreadNotifications > 0 ? unreadNotifications : undefined},
    ...(isSeller ? [{ key: 'seller-orders' as const, label: 'Seller Orders', icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    )}] : []),
    { key: 'security' as const, label: 'Security', icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0
             00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
      </svg>
    )},
  ]

  return (
    <div className="min-h-[80dvh] animate-fade-in pb-8">
      <div className="container mx-auto px-4">

        {/* ── Hero Header ── */}
        <div className="relative mb-8">
          {/* Cover gradient */}
          <div className="h-32 sm:h-40 rounded-2xl bg-gradient-to-br from-primary via-primary/80
                          to-secondary overflow-hidden relative">
            <div className="absolute inset-0 opacity-10"
              style={{
                backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'40\' height=\'40\' viewBox=\'0 0 40 40\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cpath d=\'M20 20.5V18H0v-2h20v-2l2 3-2 3zm0-6V12H0v-2h20V8l2 3-2 3z\' fill=\'%23fff\' fill-opacity=\'0.3\' fill-rule=\'evenodd\'/%3E%3C/svg%3E")',
              }}
            />
          </div>

          {/* Profile row */}
          <div className="flex flex-col sm:flex-row items-center sm:items-end gap-4
                          -mt-12 sm:-mt-10 px-4 sm:px-6">
            {/* Avatar */}
            <div className="relative">
              <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-white border-4
                              border-white shadow-lg flex items-center justify-center overflow-hidden">
                <img
                  src={`https://api.dicebear.com/7.x/initials/svg?seed=${user.name}&backgroundColor=e2e8f0&textColor=0f172a&fontSize=40`}
                  alt={user.name}
                  className="w-full h-full object-cover"
                />
              </div>
              {/* Status dot */}
              <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-green-500
                              border-3 border-white flex items-center justify-center">
                <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0
                       011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd" />
                </svg>
              </div>
            </div>

            {/* Name & meta */}
            <div className="flex-1 text-center sm:text-left min-w-0 pb-1">
              <div className="flex items-center justify-center sm:justify-start gap-2 flex-wrap">
                <h1 className="text-2xl sm:text-3xl font-bold text-text truncate">
                  {user.name}
                </h1>
                {isSeller && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full
                                   text-xs font-semibold bg-amber-100 text-amber-700">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd"
                        d="M5 2a1 1 0 011 1v1h1a1 1 0 010 2H6v1a1 1 0 01-2 0V6H3a1 1 0
                           010-2h1V3a1 1 0 011-1zm0 10a1 1 0 011 1v1h1a1 1 0 110
                           2H6v1a1 1 0 11-2 0v-1H3a1 1 0 110-2h1v-1a1 1 0
                           011-1zM12 2a1 1 0 01.967.744L14.146 7.2 17.5
                           9.134a1 1 0 010 1.732l-3.354 1.935-1.18
                           4.455a1 1 0 01-1.933 0L9.854 12.8 6.5
                           10.866a1 1 0 010-1.732l3.354-1.935
                           1.18-4.455A1 1 0 0112 2z"
                        clipRule="evenodd" />
                    </svg>
                    Seller
                  </span>
                )}
              </div>
              <p className="text-sm text-muted-text mt-1">{user.email}</p>
              <p className="text-xs text-muted-text mt-0.5">Member since {memberSince}</p>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => {/* edit profile modal */}}
                className="px-4 py-2 rounded-xl border border-border text-sm font-medium
                           text-text bg-white hover:bg-gray-50 active:scale-[0.98]
                           transition-all duration-200 flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0
                       002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                <span className="hidden sm:inline">Edit Profile</span>
              </button>
              <button
                onClick={handleLogout}
                className="px-4 py-2 rounded-xl border border-red-200 text-sm font-medium
                           text-danger bg-white hover:bg-red-50 active:scale-[0.98]
                           transition-all duration-200 flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0
                       01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          </div>
        </div>

        {/* ── Stat Cards ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
          <StatCard
            icon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            }
            label="Orders"
            value="12"
          />
          <StatCard
            icon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0
                     00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
            }
            label="Wishlist"
            value="8"
          />
          {isSeller && user.sellerProfile ? (
            <>
              <StatCard
                icon={<span className="text-lg">★</span>}
                label="Rating"
                value={`${user.sellerProfile.rating.toFixed(1)} (${user.sellerProfile.totalReviews})`}
                accent
              />
              <StatCard
                icon={
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7
                         20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0
                         0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                }
                label="Followers"
                value={user.sellerProfile.followers}
              />
            </>
          ) : (
            <>
              <StatCard
                icon={
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                }
                label="Reviews"
                value="5"
              />
              <StatCard
                icon={
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09
                         5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
                  </svg>
                }
                label="Points"
                value="240"
              />
            </>
          )}
        </div>

        {/* ── Tab Navigation ── */}
        <div className="flex gap-1 border-b border-border mb-6 overflow-x-auto hide-scrollbar">
          {tabs.map(({ key, label, icon, badge }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`shrink-0 flex items-center gap-2 px-4 sm:px-5 py-3 text-sm
                          font-medium border-b-2 transition-all duration-200
                          ${activeTab === key
                            ? 'border-secondary text-secondary'
                            : 'border-transparent text-muted-text hover:text-text hover:border-gray-200'}`}
            >
              {icon}
              {label}
              {badge ? (
                <span className="ml-1 min-w-[18px] h-[18px] rounded-full bg-danger text-white text-[10px] font-bold flex items-center justify-center px-1">
                  {badge > 99 ? '99+' : badge}
                </span>
              ) : null}
            </button>
          ))}
        </div>

        {/* ── Tab Content ── */}
        <div className="animate-fade-in" key={activeTab}>

          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

              {/* Left: Account info */}
              <div className="lg:col-span-2 space-y-6">
                <Section title="Account Information" action={
                  <button className="text-xs font-medium text-secondary hover:underline
                                     underline-offset-2 transition-colors">
                    Edit
                  </button>
                }>
                  <div className="space-y-0">
                    <InfoRow
                      icon={
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      }
                      label="Full Name"
                      value={user.name}
                    />
                    <InfoRow
                      icon={
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2
                               0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                      }
                      label="Email Address"
                      value={
                        <div className="flex items-center gap-2">
                          <span>{user.email}</span>
                          <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold
                                         text-green-700 bg-green-50 px-2 py-0.5 rounded-full">
                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd"
                                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0
                                   00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414
                                   1.414l2 2a1 1 0 001.414 0l4-4z"
                                clipRule="evenodd" />
                            </svg>
                            Verified
                          </span>
                        </div>
                      }
                    />
                    {user.phone && (
                      <InfoRow
                        icon={
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                              d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0
                                 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1
                                 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0
                                 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                          </svg>
                        }
                        label="Phone Number"
                        value={user.phone}
                      />
                    )}
                    <InfoRow
                      icon={
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0
                               00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      }
                      label="Member Since"
                      value={memberSince}
                    />
                    <InfoRow
                      icon={
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955
                               11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824
                               10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                        </svg>
                      }
                      label="Account Type"
                      value={
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full
                                         text-xs font-semibold
                          ${isSeller
                            ? 'bg-amber-50 text-amber-700'
                            : 'bg-primary/5 text-primary'}`}>
                          {isSeller ? (
                            <>
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                              </svg>
                              Seller Account
                            </>
                          ) : (
                            <>
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                              </svg>
                              Customer Account
                            </>
                          )}
                        </span>
                      }
                    />
                  </div>
                </Section>

                {/* Seller shop info */}
                {isSeller && user.sellerProfile && (
                  <Section
                    title="Shop Information"
                    action={
                      <Link to="/seller/shop"
                        className="text-xs font-medium text-secondary hover:underline
                                   underline-offset-2 transition-colors flex items-center gap-1">
                        Manage Shop →
                      </Link>
                    }
                  >
                    {/* Shop header */}
                    <div className="flex items-center gap-4 mb-5 p-4 rounded-xl bg-gray-50
                                    border border-border/50">
                      <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center
                                      justify-center overflow-hidden shrink-0">
                        <img
                          src={`https://api.dicebear.com/7.x/initials/svg?seed=${user.sellerProfile.shopName}&backgroundColor=dbeafe&textColor=1e40af`}
                          alt={user.sellerProfile.shopName}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="font-bold text-text truncate">
                          {user.sellerProfile.shopName}
                        </h4>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <span className="inline-flex items-center gap-1 text-xs text-amber-600">
                            <span className="text-amber-400">★</span>
                            {user.sellerProfile.rating.toFixed(1)}
                          </span>
                          <span className="text-gray-300">•</span>
                          <span className="text-xs text-muted-text">
                            {user.sellerProfile.totalReviews} reviews
                          </span>
                          <span className="text-gray-300">•</span>
                          <span className="text-xs text-muted-text">
                            {user.sellerProfile.followers} followers
                          </span>
                        </div>
                      </div>
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold
                                       text-green-700 bg-green-50 px-2 py-1 rounded-full shrink-0">
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd"
                            d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0
                               00-1.414-1.414L9 10.586 7.707 9.293a1 1 0
                               00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                            clipRule="evenodd" />
                        </svg>
                        Verified
                      </span>
                    </div>

                    <div>
                      <p className="text-xs text-muted-text mb-1">Shop Description</p>
                      <p className="text-sm text-text leading-relaxed">
                        {user.sellerProfile.shopDescription}
                      </p>
                    </div>
                  </Section>
                )}
              </div>

              {/* Right sidebar */}
              <div className="space-y-6">

                {/* Seller CTA or status */}
                {user.role === 'user' && !isPending && (
                  <div className="rounded-2xl border border-green-200 overflow-hidden">
                    <div className="bg-gradient-to-br from-primary/5 via-green-50 to-emerald-50 p-6">
                      <div className="flex flex-col items-center text-center">
                        <div className="w-14 h-14 rounded-2xl bg-white shadow-sm flex items-center
                                        justify-center mb-4">
                          <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                              d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                          </svg>
                        </div>
                        <h3 className="text-lg font-bold text-text mb-1.5">
                          Start Selling on eShop
                        </h3>
                        <p className="text-sm text-muted-text mb-5 max-w-xs">
                          Open your own shop and reach thousands of customers
                        </p>

                        {!showApplicationForm ? (
                          <button
                            onClick={() => setShowApplicationForm(true)}
                            className="w-full bg-primary text-white font-semibold py-3 rounded-xl
                                       hover:bg-primary/90 active:scale-[0.98] transition-all duration-200
                                       flex items-center justify-center gap-2"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                            </svg>
                            Apply as Seller
                          </button>
                        ) : (
                          <form onSubmit={handleApplyAsSeller}
                                className="w-full space-y-4 text-left animate-slide-up">
                            <div className="space-y-1.5">
                              <label htmlFor={shopNameId}
                                     className="block text-sm font-medium text-text">
                                Shop Name
                              </label>
                              <input
                                id={shopNameId}
                                type="text"
                                value={shopName}
                                onChange={(e) => setShopName(e.target.value)}
                                placeholder="e.g., Tech Haven Store"
                                required
                                className="w-full rounded-xl border border-border bg-white px-4 py-2.5
                                           text-sm outline-none focus:border-primary focus:ring-2
                                           focus:ring-primary/20 transition-all duration-200"
                              />
                            </div>

                            <div className="space-y-1.5">
                              <label htmlFor={shopDescId}
                                     className="block text-sm font-medium text-text">
                                Shop Description
                              </label>
                              <textarea
                                id={shopDescId}
                                value={shopDescription}
                                onChange={(e) => setShopDescription(e.target.value)}
                                placeholder="Tell us about your shop and what makes you unique..."
                                rows={4}
                                required
                                className="w-full rounded-xl border border-border bg-white px-4 py-2.5
                                           text-sm outline-none focus:border-primary focus:ring-2
                                           focus:ring-primary/20 transition-all duration-200 resize-none"
                              />
                              <p className="text-xs text-muted-text">
                                {shopDescription.length}/500 characters
                              </p>
                            </div>

                            <div className="flex gap-2">
                              <button
                                type="submit"
                                disabled={isApplying || !shopName.trim() || !shopDescription.trim()}
                                className="flex-1 bg-primary text-white font-semibold py-2.5 rounded-xl
                                           hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed
                                           active:scale-[0.98] transition-all duration-200 flex items-center
                                           justify-center gap-2"
                              >
                                {isApplying ? (
                                  <>
                                    <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                      <circle className="opacity-25" cx="12" cy="12" r="10"
                                              stroke="currentColor" strokeWidth="4" />
                                      <path className="opacity-75" fill="currentColor"
                                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                    </svg>
                                    Submitting…
                                  </>
                                ) : 'Submit'}
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setShowApplicationForm(false)
                                  setShopName('')
                                  setShopDescription('')
                                }}
                                className="px-4 py-2.5 rounded-xl border border-border text-sm font-medium
                                           text-text hover:bg-gray-50 transition-all duration-200"
                              >
                                Cancel
                              </button>
                            </div>
                          </form>
                        )}
                      </div>
                    </div>

                    {/* Benefits */}
                    <div className="px-6 py-4 bg-white border-t border-green-100 space-y-2.5">
                      {[
                        { icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9-4v4m0 0H8m4 0h4" /></svg>, text: 'List unlimited products' },
                        { icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>, text: 'Competitive commission rates' },
                        { icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>, text: 'Analytics & insights dashboard' },
                        { icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>, text: 'Marketing tools & promotions' },
                      ].map(({ icon, text }, idx) => (
                        <div key={idx} className="flex items-center gap-2.5 text-sm text-muted-text">
                          <div className="text-gray-500">{icon}</div>
                          <span>{text}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Pending badge */}
                {isPending && (
                  <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5
                                  animate-slide-down">
                    <div className="flex gap-3">
                      <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center
                                      justify-center shrink-0">
                        <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <div>
                        <h4 className="font-bold text-amber-900">Application Pending</h4>
                        <p className="text-sm text-amber-800 mt-1 leading-relaxed">
                          Your seller application is under review. We'll notify you once approved.
                          This usually takes 1–2 business days.
                        </p>
                      </div>
                    </div>
                    <div className="mt-4 pt-3 border-t border-amber-200">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 rounded-full bg-amber-200 overflow-hidden">
                          <div className="h-full w-1/2 bg-amber-400 rounded-full
                                          animate-pulse" />
                        </div>
                        <span className="text-xs font-medium text-amber-700">In Review</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Seller verified */}
                {isSeller && (
                  <div className="rounded-2xl border border-green-200 bg-green-50 p-5">
                    <div className="flex flex-col items-center text-center">
                      <div className="w-14 h-14 rounded-2xl bg-green-100 flex items-center
                                      justify-center mb-3">
                        <svg className="w-7 h-7 text-green-600" fill="none" stroke="currentColor"
                             viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <h3 className="text-lg font-bold text-text mb-1">Active Seller</h3>
                      <p className="text-sm text-muted-text mb-4">
                        Your shop is live and ready for business
                      </p>
                      <button
                        onClick={() => navigate('/seller/shop')}
                        className="w-full bg-green-600 text-white font-semibold py-3 rounded-xl
                                   hover:bg-green-700 active:scale-[0.98] transition-all duration-200
                                   flex items-center justify-center gap-2"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M13 7l5 5m0 0l-5 5m5-5H6" />
                        </svg>
                        Go to My Shop
                      </button>
                    </div>
                  </div>
                )}

                {/* Quick links */}
                <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
                  <div className="px-5 py-4 border-b border-border">
                    <h3 className="font-bold text-text text-sm">Quick Links</h3>
                  </div>
                  <div className="divide-y divide-border/50">
                    {[
                      { to: '/orders', label: 'My Orders', icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg> },
                      { to: '/wishlist', label: 'Wishlist', icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg> },
                      { to: '/addresses', label: 'Addresses', icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg> },
                      { to: '/notifications', label: 'Notifications', icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>, badge: unreadNotifications > 0 ? String(unreadNotifications) : undefined },
                    ].map(({ to, label, icon, badge }) => (
                      <Link
                        key={to}
                        to={to}
                        className="flex items-center gap-3 px-5 py-3.5
                                   hover:bg-gray-50 transition-colors duration-150 group"
                      >
                        <div className="text-gray-500">{icon}</div>
                        <span className="text-sm font-medium text-text flex-1
                                         group-hover:text-secondary transition-colors">
                          {label}
                        </span>
                        {badge && (
                          <span className="w-5 h-5 rounded-full bg-danger text-white text-[10px]
                                         font-bold flex items-center justify-center">
                            {badge}
                          </span>
                        )}
                        <svg className="w-4 h-4 text-gray-300 group-hover:text-secondary
                                        transition-colors" fill="none" stroke="currentColor"
                             viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round"
                                strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Orders Tab */}
          {activeTab === 'orders' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-text">Recent Orders</h3>
                <Link to="/orders"
                  className="text-sm font-medium text-secondary hover:underline
                             underline-offset-2 transition-colors">
                  View all →
                </Link>
              </div>

              {ordersLoading ? (
                <div className="space-y-4 animate-pulse">
                  {[...Array(3)].map((_, index) => (
                    <div key={index} className="bg-white rounded-2xl border border-border p-4 sm:p-5">
                      <div className="skeleton h-4 w-24 rounded mb-3" />
                      <div className="skeleton h-3 w-20 rounded mb-4" />
                      <div className="flex justify-between items-center">
                        <div className="skeleton h-4 w-16 rounded" />
                        <div className="skeleton h-4 w-20 rounded" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : ordersError ? (
                <div className="text-center py-8 border border-dashed border-border rounded-2xl bg-white">
                  <p className="text-sm text-danger">{ordersError}</p>
                  <button
                    onClick={() => navigate('/orders')}
                    className="inline-block mt-3 text-sm font-semibold text-secondary hover:underline underline-offset-2 transition-colors"
                  >
                    Open Orders Page
                  </button>
                </div>
              ) : recentOrders.length > 0 ? (
                recentOrders.map((order) => (
                  <Link
                    key={order.id}
                    to={`/orders/${order.id}`}
                    className="block bg-white rounded-2xl border border-border p-4 sm:p-5
                               hover:border-gray-200 hover:shadow-sm transition-all duration-200"
                  >
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div>
                        <p className="font-bold text-text text-sm">{order.id}</p>
                        <p className="text-xs text-muted-text mt-0.5">
                          {formatDate(order.createdAt)}
                        </p>
                      </div>
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full capitalize
                        ${String(order.status).toLowerCase() === 'delivered'
                          ? 'bg-green-50 text-green-700'
                          : String(order.status).toLowerCase() === 'shipped'
                          ? 'bg-blue-50 text-blue-700'
                          : String(order.status).toLowerCase() === 'processing'
                          ? 'bg-amber-50 text-amber-700'
                          : 'bg-gray-100 text-gray-700'}`}>
                        {order.status}
                      </span>
                    </div>
                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/50">
                      <p className="text-sm text-muted-text">
                        {order.items.length} item{order.items.length > 1 ? 's' : ''}
                      </p>
                      <p className="font-bold text-text">{formatPrice(order.totalAmount)}</p>
                    </div>
                  </Link>
                ))
              ) : (
                <div className="text-center py-8 border border-dashed border-border rounded-2xl bg-white">
                  <p className="text-sm text-muted-text">
                    You have no orders yet.
                  </p>
                  <Link
                    to="/products"
                    className="inline-block mt-3 text-sm font-semibold text-secondary hover:underline underline-offset-2 transition-colors"
                  >
                    Browse Products →
                  </Link>
                </div>
              )}
            </div>
          )}

          {/* Notifications Tab */}
          {activeTab === 'notifications' && (
            <div className="space-y-4">
              <div className="rounded-2xl border border-border bg-white p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h3 className="font-bold text-text">Notification Center</h3>
                  <p className="text-sm text-muted-text mt-1">
                    Your live order updates are in the dedicated notifications page.
                  </p>
                </div>
                <Link
                  to="/notifications"
                  className="inline-flex items-center justify-center rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-white hover:bg-primary/90"
                >
                  Open Notifications
                </Link>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <StatCard icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>} label="Unread" value={unreadNotifications} />
                <StatCard icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>} label="Today" value="Live" />
                <StatCard icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>} label="Type" value="Orders" />
              </div>
            </div>
          )}

          {/* Seller Orders Tab */}
          {activeTab === 'seller-orders' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-text">Seller Orders</h3>
                <Link to="/seller/orders"
                  className="text-sm font-medium text-secondary hover:underline
                             underline-offset-2 transition-colors">
                  Manage orders →
                </Link>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
                <svg className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="text-sm">
                  <p className="font-medium text-blue-900">View all customer orders</p>
                  <p className="text-blue-800 mt-1">Go to your Seller Orders page to manage all orders, update statuses, and view customer details.</p>
                </div>
              </div>
            </div>
          )}

          {/* Security Tab */}
          {activeTab === 'security' && (
            <div className="max-w-2xl space-y-6">
              <Section title="Change Password">
                <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
                  <div className="space-y-1.5">
                    <label className="block text-sm font-medium text-text">
                      Current Password
                    </label>
                    <input
                      type="password"
                      placeholder="Enter current password"
                      className="w-full rounded-xl border border-border bg-white px-4 py-2.5
                                 text-sm outline-none focus:border-primary focus:ring-2
                                 focus:ring-primary/20 transition-all duration-200"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-sm font-medium text-text">
                      New Password
                    </label>
                    <input
                      type="password"
                      placeholder="Enter new password"
                      className="w-full rounded-xl border border-border bg-white px-4 py-2.5
                                 text-sm outline-none focus:border-primary focus:ring-2
                                 focus:ring-primary/20 transition-all duration-200"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-sm font-medium text-text">
                      Confirm New Password
                    </label>
                    <input
                      type="password"
                      placeholder="Confirm new password"
                      className="w-full rounded-xl border border-border bg-white px-4 py-2.5
                                 text-sm outline-none focus:border-primary focus:ring-2
                                 focus:ring-primary/20 transition-all duration-200"
                    />
                  </div>
                  <button
                    type="submit"
                    className="px-6 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold
                               hover:bg-primary/90 active:scale-[0.98] transition-all duration-200"
                  >
                    Update Password
                  </button>
                </form>
              </Section>

              <Section title="Two-Factor Authentication">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center
                                  justify-center shrink-0">
                    <svg className="w-5 h-5 text-amber-500" fill="none" stroke="currentColor"
                         viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0
                           00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-text text-sm">
                      Add an extra layer of security
                    </p>
                    <p className="text-xs text-muted-text mt-1">
                      Enable two-factor authentication to protect your account from unauthorized access.
                    </p>
                    <button className="mt-3 px-4 py-2 rounded-xl border border-border text-sm
                                       font-medium text-text hover:bg-gray-50 active:scale-[0.98]
                                       transition-all duration-200">
                      Enable 2FA
                    </button>
                  </div>
                </div>
              </Section>

              <Section title="Danger Zone">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center
                                  justify-center shrink-0">
                    <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor"
                         viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0
                           01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0
                           00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-text text-sm">Delete Account</p>
                    <p className="text-xs text-muted-text mt-1">
                      Permanently delete your account and all associated data. This action cannot be undone.
                    </p>
                    <button className="mt-3 px-4 py-2 rounded-xl border border-red-200 text-sm
                                       font-medium text-danger hover:bg-red-50 active:scale-[0.98]
                                       transition-all duration-200">
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