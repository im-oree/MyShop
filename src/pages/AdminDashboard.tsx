import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import apiClient from '@/services/api'
import { useAuthStore } from '@/store/authStore'
import type { User } from '@/types'
import Dropdown from '@/components/Dropdown'
import { productService } from '@/services/productService'
import {
  Users,
  DollarSign,
  Package,
  ShieldCheck,
  TrendingUp,
  TrendingDown,
  Crown,
  Briefcase,
  UserCircle,
  Search,
  X,
  Eye,
  AlertCircle,
  Calendar,
  ArrowRight,
  RefreshCw,
  Shield,
  FileText,
  ShoppingBag,
  ChevronRight,
} from 'lucide-react'

type RevenueRange = 'today' | 'week' | 'month'
type AdminSection = 'users' | 'revenue' | 'staff'

const roleOptions = [
  { value: 'user',     label: 'User' },
  { value: 'manager',  label: 'Manager' },
  { value: 'employee', label: 'Employee' },
  { value: 'admin',    label: 'Admin' },
]

type AdminOverview = {
  users: {
    totalUsers: number
    activeUsers: number
    sellerCount: number
    users: User[]
  }
  revenue: {
    totalRevenue: number
    today: number
    thisWeek: number
    thisMonth: number
    timeline: Array<{ label: string; date: string; revenue: number; orders: number }>
  }
  products: { totalProducts: number }
  sellerVerification: { pending: User[]; approved: number }
}

type RevenuePayload = {
  range: RevenueRange
  totalRevenue: number
  today: number
  thisWeek: number
  series: Array<{ label: string; amount: number; count: number }>
}

function currency(value: number) {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 0,
  }).format(value / 100)
}

function roleLabel(role: User['role']) {
  if (role === 'admin')    return 'Admin'
  if (role === 'manager')  return 'Manager'
  if (role === 'employee') return 'Employee'
  return 'User'
}

function roleConfig(role: User['role']) {
  if (role === 'admin')    return { icon: Crown,       color: 'text-amber-700', bg: 'bg-amber-100' }
  if (role === 'manager')  return { icon: ShieldCheck, color: 'text-emerald-700', bg: 'bg-emerald-100' }
  if (role === 'employee') return { icon: Briefcase,   color: 'text-sky-700',    bg: 'bg-sky-100' }
  return { icon: UserCircle, color: 'text-gray-700', bg: 'bg-gray-100' }
}

/* ─────────────────────────────────────────────
   METRIC CARD
───────────────────────────────────────────── */
function MetricCard({
  icon: Icon,
  label,
  value,
  sub,
  badge,
  badgeColor,
  loading,
  color = 'primary',
}: {
  icon: any
  label: string
  value?: React.ReactNode
  sub?: string
  badge?: string
  badgeColor?: 'green' | 'amber' | 'blue' | 'gray'
  loading?: boolean
  color?: 'primary' | 'green' | 'amber' | 'blue'
}) {
  const colorMap = {
    primary: 'bg-primary/10 text-primary',
    green:   'bg-green-50 text-green-600',
    amber:   'bg-amber-50 text-amber-600',
    blue:    'bg-blue-50 text-blue-600',
  }
  const badgeMap = {
    green: 'bg-emerald-50 text-emerald-700',
    amber: 'bg-amber-50 text-amber-700',
    blue:  'bg-blue-50 text-blue-700',
    gray:  'bg-gray-100 text-gray-700',
  }
  return (
    <div className="bg-white rounded-2xl border border-border p-3 sm:p-4 hover:shadow-sm transition-all">
      <div className="flex items-start justify-between mb-2">
        <div className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center ${colorMap[color]}`}>
          <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
        </div>
        {badge && !loading && (
          <span className={`text-[10px] sm:text-xs font-semibold px-2 py-0.5 rounded-full ${badgeMap[badgeColor || 'gray']}`}>
            {badge}
          </span>
        )}
      </div>
      <p className="text-[10px] sm:text-xs text-muted-text font-medium uppercase tracking-wider mb-0.5">{label}</p>
      {loading ? (
        <div className="h-6 sm:h-7 w-16 bg-gray-100 rounded animate-pulse" />
      ) : (
        <p className="text-lg sm:text-2xl font-bold text-text tabular-nums leading-tight truncate">{value}</p>
      )}
      {sub && !loading && <p className="text-[10px] sm:text-xs text-muted-text mt-0.5 truncate">{sub}</p>}
    </div>
  )
}

/* ─────────────────────────────────────────────
   QUICK LINK CARD
───────────────────────────────────────────── */
function QuickLink({
  to,
  icon: Icon,
  label,
  description,
  color = 'primary',
}: {
  to: string
  icon: any
  label: string
  description: string
  color?: 'primary' | 'green' | 'amber' | 'blue'
}) {
  const colorMap = {
    primary: 'bg-primary/10 text-primary group-hover:bg-primary/15',
    green:   'bg-green-50 text-green-600 group-hover:bg-green-100',
    amber:   'bg-amber-50 text-amber-600 group-hover:bg-amber-100',
    blue:    'bg-blue-50 text-blue-600 group-hover:bg-blue-100',
  }
  return (
    <Link
      to={to}
      className="group flex items-center gap-3 rounded-2xl border border-border bg-white p-3 sm:p-4 hover:shadow-md hover:border-primary/30 transition-all"
    >
      <div className={`w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center shrink-0 transition-colors ${colorMap[color]}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-text">{label}</p>
        <p className="text-[11px] text-muted-text mt-0.5 truncate">{description}</p>
      </div>
      <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0" />
    </Link>
  )
}

/* ═════════════════════════════════════════════
   MAIN PAGE
═════════════════════════════════════════════ */
function AdminDashboard() {
  const navigate = useNavigate()
  const { user } = useAuthStore()

  const [activeSection, setActiveSection]   = useState<AdminSection>('users')
  const [overview, setOverview]             = useState<AdminOverview | null>(null)
  const [revenue, setRevenue]               = useState<RevenuePayload | null>(null)
  const [loadingOverview, setLoadingOverview] = useState(true)
  const [loadingRevenue, setLoadingRevenue]   = useState(false)
  const [refreshing, setRefreshing]         = useState(false)
  const [timeline, setTimeline]             = useState<RevenueRange>('week')
  const [selectedUser, setSelectedUser]     = useState<User | null>(null)
  const [mutatingId, setMutatingId]         = useState<string | null>(null)
  const [searchInput, setSearchInput]       = useState('')
  const [searchQuery, setSearchQuery]       = useState('')
  const [topProducts, setTopProducts]       = useState<any[]>([])

  /* ── Auth ── */
  useEffect(() => {
    if (!user) {
      navigate('/login')
      return
    }
    if (user.role !== 'admin' && user.role !== 'manager') {
      navigate('/')
    }
  }, [navigate, user])

  /* ── Debounce search ── */
  useEffect(() => {
    const t = setTimeout(() => setSearchQuery(searchInput.trim().toLowerCase()), 250)
    return () => clearTimeout(t)
  }, [searchInput])

  /* ── Load overview ── */
  const loadOverview = async (silent = false) => {
    if (silent) setRefreshing(true); else setLoadingOverview(true)
    try {
      const { data } = await apiClient.get('/admin/overview')
      setOverview(data.data)
    } catch (error) {
      console.error('Failed to load admin overview:', error)
    } finally {
      setLoadingOverview(false)
      setRefreshing(false)
    }
  }

  useEffect(() => { void loadOverview() }, [])

  /* ── Load revenue ── */
  useEffect(() => {
    const loadRevenue = async () => {
      setLoadingRevenue(true)
      try {
        const { data } = await apiClient.get('/admin/revenue', { params: { range: timeline } })
        setRevenue(data.data)
      } catch (error) {
        console.error('Failed to load revenue:', error)
      } finally {
        setLoadingRevenue(false)
      }
    }
    void loadRevenue()
  }, [timeline])

  /* ── Load top products ── */
  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const data: any = await productService.getFeatured(6)
        if (mounted) setTopProducts(data.items || data || [])
      } catch (err) {
        console.error('Failed to load featured products', err)
      }
    })()
    return () => { mounted = false }
  }, [])

  const refresh = async () => {
    setRefreshing(true)
    try {
      const [{ data: o }, { data: r }] = await Promise.all([
        apiClient.get('/admin/overview'),
        apiClient.get('/admin/revenue', { params: { range: timeline } }),
      ])
      setOverview(o.data)
      setRevenue(r.data)
    } catch (e) {
      console.error('Refresh failed:', e)
    } finally {
      setRefreshing(false)
    }
  }

  async function setRole(id: string, role: User['role']) {
    setMutatingId(id)
    try {
      await apiClient.post(`/users/${id}/set-role`, { role })
      await refresh()
    } catch (error) {
      console.error('Role update failed:', error)
    } finally {
      setMutatingId(null)
    }
  }

  const users          = overview?.users.users || []
  const totalUsers     = overview?.users.totalUsers || 0
  const activeUsers    = overview?.users.activeUsers || 0
  const sellerCount    = overview?.users.sellerCount || 0
  const totalProducts  = overview?.products.totalProducts || 0
  const totalRevenue   = revenue?.totalRevenue ?? overview?.revenue.totalRevenue ?? 0
  const pendingStaff   = overview?.sellerVerification?.pending?.length || 0

  const revenueSeries = useMemo(() => revenue?.series || [], [revenue])
  const chartMax = Math.max(...revenueSeries.map((item) => item.amount), 1)

  // Filter users by search
  const filteredUsers = useMemo(() => {
    if (!searchQuery) return users
    return users.filter((u) =>
      u.name?.toLowerCase().includes(searchQuery) ||
      u.email?.toLowerCase().includes(searchQuery) ||
      u.role?.toLowerCase().includes(searchQuery)
    )
  }, [users, searchQuery])

  const tabs: Array<{ key: AdminSection; label: string; icon: any; count?: number }> = [
    { key: 'users',   label: 'Users',   icon: Users,       count: totalUsers },
    { key: 'revenue', label: 'Revenue', icon: DollarSign },
    { key: 'staff',   label: 'Staff',   icon: ShieldCheck, count: sellerCount },
  ]

  if (!user || (user.role !== 'admin' && user.role !== 'manager')) {
    return null
  }

  return (
    <div className="min-h-[80dvh] animate-fade-in pb-24 lg:pb-10">
      {/* ── Sticky header ── */}
      <div className="sticky top-16 sm:top-[72px] z-20 -mx-3 sm:mx-0 px-3 sm:px-0 py-3 bg-bg/95 backdrop-blur-md mb-3">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] sm:text-xs font-bold text-secondary uppercase tracking-wider">Control center</p>
            <h1 className="text-xl sm:text-2xl font-bold text-text">Admin Dashboard</h1>
            <p className="text-xs text-muted-text mt-0.5 hidden sm:block">
              Users, revenue, and staff access at a glance
            </p>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={refresh}
              disabled={refreshing}
              aria-label="Refresh"
              className="inline-flex items-center justify-center p-2 rounded-xl border border-border bg-white text-text hover:border-primary/30 hover:text-primary disabled:opacity-50 transition-all"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
            <Link
              to="/"
              className="hidden sm:inline-flex items-center gap-1.5 rounded-xl border border-border bg-white px-3 py-2 text-xs sm:text-sm font-semibold text-text hover:border-primary/30 hover:text-primary transition-all"
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              Store
            </Link>
          </div>
        </div>

        {/* Section tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 -mx-1 px-1 hide-scrollbar">
          {tabs.map((tab) => {
            const active = activeSection === tab.key
            const Icon = tab.icon
            return (
              <button
                key={tab.key}
                onClick={() => setActiveSection(tab.key)}
                className={`shrink-0 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold border transition-colors ${
                  active
                    ? 'bg-text text-white border-text'
                    : 'bg-white text-text border-border hover:border-gray-400'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {tab.label}
                {tab.count !== undefined && (
                  <span className={`text-[10px] font-bold ${active ? 'text-white/80' : 'text-muted-text'}`}>
                    {loadingOverview ? '…' : tab.count}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Quick links ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 mb-4">
        <QuickLink to="/admin/store/access"   icon={Shield}      label="Staff access" description="Manage permissions" color="green" />
        <QuickLink to="/admin/store/audit"    icon={FileText}    label="Audit log"    description="Activity history"   color="amber" />
        <QuickLink to="/admin/store/products" icon={Package}     label="Products"     description="Inventory & listings" color="blue" />
        <QuickLink to="/admin/store/orders"   icon={ShoppingBag} label="Orders"       description="Manage customer orders" color="primary" />
      </div>

      {/* ── Hero stats ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3 mb-4">
        <MetricCard
          icon={Users}
          label="Users"
          value={totalUsers}
          badge={`${activeUsers} active`}
          badgeColor="green"
          loading={loadingOverview}
          color="primary"
        />
        <MetricCard
          icon={ShieldCheck}
          label="Staff"
          value={sellerCount}
          badge={pendingStaff > 0 ? `${pendingStaff} pending` : 'all clear'}
          badgeColor={pendingStaff > 0 ? 'amber' : 'green'}
          loading={loadingOverview}
          color="green"
        />
        <MetricCard
          icon={DollarSign}
          label="Revenue"
          value={currency(totalRevenue)}
          sub={`This ${timeline}`}
          loading={loadingRevenue && !revenue}
          color="amber"
        />
        <MetricCard
          icon={Package}
          label="Products"
          value={totalProducts}
          badge="live"
          badgeColor="blue"
          loading={loadingOverview}
          color="blue"
        />
      </div>

      {/* ── Pending staff alert ── */}
      {pendingStaff > 0 && (
        <div className="mb-4 rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shrink-0">
            <AlertCircle className="w-5 h-5 text-amber-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-text">
              {pendingStaff} staff account{pendingStaff !== 1 ? 's' : ''} pending review
            </p>
            <p className="text-xs text-muted-text mt-0.5">Verify their access permissions</p>
          </div>
          <button
            onClick={() => setActiveSection('staff')}
            className="shrink-0 inline-flex items-center gap-1 text-xs font-semibold text-amber-700 hover:underline"
          >
            Review
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* ─────────────────────────────────
         USERS SECTION
      ───────────────────────────────── */}
      {activeSection === 'users' && (
        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
            <input
              type="search"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search by name, email, or role…"
              className="w-full rounded-xl border border-border bg-white pl-10 pr-10 py-2.5 text-sm placeholder:text-gray-400 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
            {searchInput && (
              <button
                onClick={() => { setSearchInput(''); setSearchQuery('') }}
                aria-label="Clear search"
                className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {loadingOverview ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-2xl border border-border bg-white">
                  <div className="skeleton w-11 h-11 rounded-xl shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="skeleton h-4 w-32 rounded" />
                    <div className="skeleton h-3 w-48 rounded" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-white px-4 py-16 text-center">
              <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
                <Users className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-bold text-text mb-1">
                {searchQuery ? 'No users match' : 'No users yet'}
              </h3>
              <p className="text-sm text-muted-text">
                {searchQuery ? 'Try a different search' : 'New users will appear here'}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredUsers.map((u) => {
                const cfg = roleConfig(u.role)
                const Icon = cfg.icon
                return (
                  <div
                    key={u.id}
                    className="group flex items-center gap-3 p-3 rounded-2xl border border-border bg-white hover:shadow-sm hover:border-primary/30 transition-all"
                  >
                    {/* Avatar */}
                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center font-semibold shrink-0 ${cfg.bg} ${cfg.color}`}>
                      {u.name?.[0]?.toUpperCase() || 'U'}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="text-sm font-bold text-text truncate">{u.name}</p>
                        <span className={`shrink-0 inline-flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${cfg.bg} ${cfg.color}`}>
                          <Icon className="w-2.5 h-2.5" />
                          {roleLabel(u.role)}
                        </span>
                      </div>
                      <p className="text-xs text-muted-text truncate">{u.email}</p>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => setSelectedUser(u)}
                        aria-label="View user"
                        className="p-2 rounded-lg text-muted-text hover:text-primary hover:bg-primary/5 transition-colors"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <Dropdown
                        options={roleOptions}
                        value={u.role}
                        onChange={(value) => setRole(u.id, value as User['role'])}
                        className="min-w-[120px]"
                        buttonClassName="rounded-lg px-2 py-1 text-xs"
                        disabled={mutatingId === u.id}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {!loadingOverview && filteredUsers.length > 0 && (
            <p className="text-center text-xs text-muted-text">
              Showing {filteredUsers.length} of {users.length} user{users.length !== 1 ? 's' : ''}
            </p>
          )}
        </div>
      )}

      {/* ─────────────────────────────────
         REVENUE SECTION
      ───────────────────────────────── */}
      {activeSection === 'revenue' && (
        <div className="space-y-4">
          {/* Range pills */}
          <div className="flex items-center justify-between gap-3">
            <div className="inline-flex rounded-xl border border-border bg-white p-0.5">
              {(['today', 'week', 'month'] as RevenueRange[]).map((range) => (
                <button
                  key={range}
                  onClick={() => setTimeline(range)}
                  className={`px-3 sm:px-4 py-1.5 rounded-lg text-xs sm:text-sm font-semibold capitalize transition-all ${
                    timeline === range
                      ? 'bg-primary text-white shadow-sm'
                      : 'text-muted-text hover:text-text'
                  }`}
                >
                  <Calendar className="w-3 h-3 inline mr-1 -mt-0.5" />
                  {range}
                </button>
              ))}
            </div>
          </div>

          {/* Revenue stats */}
          <div className="grid grid-cols-3 gap-2.5">
            <MetricCard
              icon={TrendingUp}
              label="Today"
              value={currency(revenue?.today ?? overview?.revenue.today ?? 0)}
              loading={loadingRevenue}
              color="green"
            />
            <MetricCard
              icon={TrendingUp}
              label="This week"
              value={currency(revenue?.thisWeek ?? overview?.revenue.thisWeek ?? 0)}
              loading={loadingRevenue}
              color="primary"
            />
            <MetricCard
              icon={TrendingUp}
              label="This month"
              value={currency(overview?.revenue.thisMonth ?? 0)}
              loading={loadingOverview}
              color="blue"
            />
          </div>

          {/* Chart */}
          <div className="rounded-2xl border border-border bg-white p-4 sm:p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm sm:text-base font-bold text-text">Revenue trend</h3>
                <p className="text-[10px] sm:text-xs text-muted-text mt-0.5 capitalize">{timeline} view</p>
              </div>
              <div className="text-right">
                <p className="text-base sm:text-lg font-bold text-text tabular-nums">{currency(totalRevenue)}</p>
                <p className="text-[10px] text-muted-text">total</p>
              </div>
            </div>

            {loadingRevenue ? (
              <div className="h-48 bg-gray-50 rounded-xl animate-pulse" />
            ) : revenueSeries.length === 0 ? (
              <div className="h-48 flex flex-col items-center justify-center text-sm text-muted-text gap-2">
                <TrendingDown className="w-8 h-8 text-gray-300" />
                <p>No revenue data for this period</p>
              </div>
            ) : (
              <div className="h-48 flex items-end gap-1.5 sm:gap-2 overflow-x-auto pb-2 hide-scrollbar">
                {revenueSeries.map((point) => {
                  const pct = Math.max((point.amount / chartMax) * 100, 4)
                  return (
                    <div
                      key={`${point.label}-${point.count}`}
                      className="group/bar relative flex w-10 sm:w-12 min-w-[40px] flex-col items-center justify-end gap-1.5 shrink-0"
                    >
                      <div className="relative w-full flex items-end" style={{ height: '100%' }}>
                        <div
                          className="w-full rounded-t-lg bg-gradient-to-t from-primary to-primary/70 hover:from-primary hover:to-primary transition-all cursor-pointer"
                          style={{ height: `${pct}%` }}
                          title={`${currency(point.amount)} • ${point.count} orders`}
                        />
                      </div>
                      <div className="text-[10px] font-medium text-text">{point.label}</div>
                      <div className="text-[9px] text-muted-text">{point.count}</div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Top products preview */}
          <div className="rounded-2xl border border-border bg-white p-4 sm:p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm sm:text-base font-bold text-text">Featured products</h3>
              <Link to="/admin/store/products" className="text-xs font-semibold text-secondary hover:underline">
                View all →
              </Link>
            </div>
            {topProducts.length === 0 ? (
              <p className="text-sm text-muted-text text-center py-6">No featured products</p>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 sm:gap-3">
                {topProducts.map((p) => (
                  <Link
                    key={p.id}
                    to="/admin/store/products"
                    className="group/p flex flex-col items-center text-center"
                  >
                    <div className="w-full aspect-square bg-gray-50 rounded-xl overflow-hidden border border-border group-hover/p:border-primary/30 transition-colors">
                      {p.images?.[0] ? (
                        <img src={p.images[0]} alt={p.name} className="w-full h-full object-cover" loading="lazy" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-300 text-xs">
                          <Package className="w-6 h-6" />
                        </div>
                      )}
                    </div>
                    <p className="text-[10px] font-medium text-text mt-1.5 truncate w-full">{p.name}</p>
                    <p className="text-[10px] text-muted-text">{currency(p.price)}</p>
                    <p className={`text-[9px] font-semibold mt-0.5 ${
                      p.stock <= 0 ? 'text-red-600'
                      : p.stock <= 5 ? 'text-amber-700'
                      : 'text-green-700'
                    }`}>
                      {p.stock <= 0 ? 'Out' : `${p.stock} left`}
                    </p>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─────────────────────────────────
         STAFF SECTION
      ───────────────────────────────── */}
      {activeSection === 'staff' && (
        <div className="space-y-4">
          {selectedUser && (
            <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4">
              <div className="flex items-start gap-3">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-semibold shrink-0 ${roleConfig(selectedUser.role).bg} ${roleConfig(selectedUser.role).color}`}>
                  {selectedUser.name?.[0]?.toUpperCase() || 'U'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-bold text-text truncate">{selectedUser.name}</p>
                    <span className={`shrink-0 inline-flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${roleConfig(selectedUser.role).bg} ${roleConfig(selectedUser.role).color}`}>
                      {roleLabel(selectedUser.role)}
                    </span>
                  </div>
                  <p className="text-xs text-muted-text truncate">{selectedUser.email}</p>
                  <p className="text-[11px] text-muted-text mt-1">
                    {selectedUser.role === 'admin' ? 'Has full owner access'
                      : selectedUser.role === 'manager' ? 'Can manage store operations'
                      : selectedUser.role === 'employee' ? 'Limited staff permissions'
                      : 'Regular customer account'}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedUser(null)}
                  aria-label="Close details"
                  className="p-2 rounded-lg hover:bg-white text-gray-500 transition-colors shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {loadingOverview ? (
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex items-center gap-3 p-4 rounded-2xl border border-border bg-white">
                  <div className="skeleton w-12 h-12 rounded-xl shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="skeleton h-4 w-32 rounded" />
                    <div className="skeleton h-3 w-48 rounded" />
                  </div>
                </div>
              ))}
            </div>
          ) : (overview?.sellerVerification?.pending?.length || 0) === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-white px-4 py-16 text-center">
              <div className="w-16 h-16 rounded-2xl bg-green-50 flex items-center justify-center mb-4">
                <ShieldCheck className="w-8 h-8 text-green-500" />
              </div>
              <h3 className="text-lg font-bold text-text mb-1">All clear</h3>
              <p className="text-sm text-muted-text max-w-xs mb-6">
                No staff accounts pending review at the moment
              </p>
              <Link
                to="/admin/store/access"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition-all"
              >
                <Shield className="w-4 h-4" />
                Manage access
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {(overview?.sellerVerification?.pending || []).map((staff) => {
                const cfg = roleConfig(staff.role)
                const Icon = cfg.icon
                return (
                  <div
                    key={staff.id}
                    className="flex items-center gap-3 p-3 sm:p-4 rounded-2xl border border-border bg-white hover:shadow-sm transition-all"
                  >
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-semibold shrink-0 ${cfg.bg} ${cfg.color}`}>
                      {staff.name?.[0]?.toUpperCase() || 'U'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="text-sm font-bold text-text truncate">{staff.name}</p>
                        <span className={`shrink-0 inline-flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${cfg.bg} ${cfg.color}`}>
                          <Icon className="w-2.5 h-2.5" />
                          {roleLabel(staff.role)}
                        </span>
                      </div>
                      <p className="text-xs text-muted-text truncate">{staff.email}</p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => setSelectedUser(staff)}
                        aria-label="View staff"
                        className="p-2 rounded-lg text-muted-text hover:text-primary hover:bg-primary/5 transition-colors"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default AdminDashboard