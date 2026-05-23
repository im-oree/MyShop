import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { orderService } from '@/services/orderService'
import { formatPrice } from '@/utils'
import { OrderStageBadge } from '@/components/OrderStageIndicator'
import {
  formatRelativeTime,
  isWithinAgeFilter,
  normalizeOrderStage,
  sortOrdersByDate,
} from '@/utils/orderStage'
import {
  Search,
  X,
  SlidersHorizontal,
  ChevronRight,
  Package,
  Inbox,
  RefreshCw,
  CheckCircle2,
  Truck,
  XCircle,
  Clock,
  ArrowUpDown,
  Calendar,
} from 'lucide-react'

interface SellerOrder {
  id: string
  totalAmount: number
  items: Array<{ productId: string; quantity: number; price: number; productName?: string }>
  shippingAddress?: { city?: string; state?: string }
  paymentStatus?: string
  status?: string
  createdAt?: string
}

type OrderStatusFilter = 'all' | 'noted' | 'processing' | 'in_transit' | 'completed' | 'cancelled'
type AgeFilter = 'all' | 'today' | '7d' | '30d' | '90d'
type SortOrder = 'newest' | 'oldest' | 'highest' | 'lowest'

const STATUS_TABS: Array<{ value: OrderStatusFilter; label: string; icon: any; color: string }> = [
  { value: 'all',         label: 'All',         icon: Inbox,        color: 'text-text' },
  { value: 'noted',       label: 'Noted',       icon: Clock,        color: 'text-amber-600' },
  { value: 'processing',  label: 'Processing',  icon: RefreshCw,    color: 'text-blue-600' },
  { value: 'in_transit',  label: 'In Transit',  icon: Truck,        color: 'text-indigo-600' },
  { value: 'completed',   label: 'Completed',   icon: CheckCircle2, color: 'text-green-600' },
  { value: 'cancelled',   label: 'Cancelled',   icon: XCircle,      color: 'text-red-600' },
]

const AGE_OPTIONS: Array<{ value: AgeFilter; label: string }> = [
  { value: 'all',   label: 'Any time' },
  { value: 'today', label: 'Today' },
  { value: '7d',    label: 'Last 7 days' },
  { value: '30d',   label: 'Last 30 days' },
  { value: '90d',   label: 'Last 90 days' },
]

const SORT_OPTIONS: Array<{ value: SortOrder; label: string }> = [
  { value: 'newest',  label: 'Newest first' },
  { value: 'oldest',  label: 'Oldest first' },
  { value: 'highest', label: 'Highest value' },
  { value: 'lowest',  label: 'Lowest value' },
]

function SellerOrdersPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { isAuthenticated, user } = useAuthStore()

  const [orders, setOrders] = useState<SellerOrder[]>([])
  const [loading, setLoading]         = useState(false)
  const [refreshing, setRefreshing]   = useState(false)
  const [searchInput, setSearchInput] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<OrderStatusFilter>('all')
  const [ageFilter, setAgeFilter]       = useState<AgeFilter>('all')
  const [sortOrder, setSortOrder]       = useState<SortOrder>('newest')
  const [filtersOpen, setFiltersOpen]   = useState(false)

  const isCompletedView = location.pathname.includes('/completed')
  const activeStatusFilter = isCompletedView ? 'completed' : statusFilter

  /* ── Auth guard ── */
  useEffect(() => {
    if (!isAuthenticated || !user || (user.role !== 'admin' && user.role !== 'manager')) {
      navigate('/profile')
    }
  }, [isAuthenticated, user, navigate])

  /* ── Debounce search ── */
  useEffect(() => {
    const t = setTimeout(() => setSearchQuery(searchInput.trim()), 250)
    return () => clearTimeout(t)
  }, [searchInput])

  /* ── Sync URL view → filter ── */
  useEffect(() => {
    setStatusFilter(isCompletedView ? 'completed' : 'all')
  }, [isCompletedView])

  /* ── Load orders ── */
  const loadOrders = async (silent = false) => {
    if (!isAuthenticated || !user) return
    try {
      if (silent) setRefreshing(true); else setLoading(true)
      const res: any = await orderService.getAll(1, 500)
      setOrders(res.items || res.orders || [])
    } catch (err) {
      console.error('Failed to load seller orders:', err)
      setOrders([])
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    void loadOrders()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, user])

  const clearSearch = () => {
    setSearchInput('')
    setSearchQuery('')
  }

  const clearAllFilters = () => {
    clearSearch()
    setAgeFilter('all')
    setSortOrder('newest')
    if (!isCompletedView) setStatusFilter('all')
  }

  /* ── Filter + sort ── */
  const filteredOrders = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()

    const prepared = orders.filter((o) => {
      const stage = normalizeOrderStage(o.status)
      const matchesQuery = !q || o.id.toLowerCase().includes(q) || String(o.totalAmount).includes(q)
      const matchesStatus = activeStatusFilter === 'all' || stage === activeStatusFilter
      const matchesAge = isWithinAgeFilter(o.createdAt, ageFilter)
      return matchesQuery && matchesStatus && matchesAge
    })

    // Sort
    if (sortOrder === 'highest' || sortOrder === 'lowest') {
      return [...prepared].sort((a, b) =>
        sortOrder === 'highest' ? b.totalAmount - a.totalAmount : a.totalAmount - b.totalAmount
      )
    }
    return sortOrdersByDate(prepared, sortOrder)
  }, [orders, searchQuery, activeStatusFilter, ageFilter, sortOrder])

  /* ── Stage counts ── */
  const counts = useMemo(() => ({
    all:         orders.length,
    noted:       orders.filter((o) => normalizeOrderStage(o.status) === 'noted').length,
    processing:  orders.filter((o) => normalizeOrderStage(o.status) === 'processing').length,
    in_transit:  orders.filter((o) => normalizeOrderStage(o.status) === 'in_transit').length,
    completed:   orders.filter((o) => normalizeOrderStage(o.status) === 'completed').length,
    cancelled:   orders.filter((o) => normalizeOrderStage(o.status) === 'cancelled').length,
  }), [orders])

  /* ── Aggregate metrics ── */
  const totals = useMemo(() => {
    const totalRevenue = filteredOrders.reduce((s, o) => s + o.totalAmount, 0)
    const incomplete = counts.noted + counts.processing + counts.in_transit
    return { totalRevenue, incomplete }
  }, [filteredOrders, counts])

  const hasActiveFilters =
    !!searchQuery || ageFilter !== 'all' || sortOrder !== 'newest' ||
    (!isCompletedView && statusFilter !== 'all')

  /* ── Access denied ── */
  if (!isAuthenticated || !user || (user.role !== 'admin' && user.role !== 'manager')) {
    return (
      <div className="min-h-[70dvh] flex flex-col items-center justify-center px-4 animate-fade-in">
        <div className="w-16 h-16 rounded-2xl bg-red-50 flex items-center justify-center mb-4">
          <XCircle className="w-8 h-8 text-red-400" />
        </div>
        <h1 className="text-2xl font-bold text-text mb-2">Access Denied</h1>
        <p className="text-muted-text mb-6 text-center">Only store managers can access this page.</p>
        <button
          onClick={() => navigate('/profile')}
          className="bg-primary text-white px-8 py-3 rounded-xl font-semibold hover:bg-primary/90"
        >
          Go to Profile
        </button>
      </div>
    )
  }

  const title = isCompletedView ? 'Completed Orders' : 'Orders'

  return (
    <div className="min-h-[80dvh] animate-fade-in pb-24 lg:pb-10">
      {/* ── Sticky header ── */}
      <div className="sticky top-16 sm:top-[72px] z-20 -mx-3 sm:mx-0 px-3 sm:px-0 py-3 bg-bg/95 backdrop-blur-md mb-3">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="min-w-0 flex-1">
            <h1 className="text-xl sm:text-2xl font-bold text-text">{title}</h1>
            <p className="text-xs text-muted-text mt-0.5">
              <span className="font-semibold text-text">{filteredOrders.length}</span>
              {' '}of {counts.all} • {formatPrice(totals.totalRevenue)}
            </p>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => void loadOrders(true)}
              disabled={refreshing}
              aria-label="Refresh orders"
              className="inline-flex items-center justify-center p-2 rounded-xl border border-border bg-white text-text hover:border-primary/30 hover:text-primary disabled:opacity-50 transition-all"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={() => navigate(isCompletedView ? '/admin/store/orders' : '/admin/store/orders/completed')}
              className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-white px-3 py-2 text-xs sm:text-sm font-semibold text-text hover:border-primary/30 hover:text-primary transition-all"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{isCompletedView ? 'All orders' : 'Completed'}</span>
            </button>
          </div>
        </div>

        {/* Search + filters toggle */}
        <div className="flex items-stretch gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
            <input
              type="search"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search order ID or amount…"
              className="w-full rounded-xl border border-border bg-white pl-10 pr-10 py-2.5 text-sm text-text placeholder:text-gray-400 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
            {searchInput && (
              <button
                onClick={clearSearch}
                aria-label="Clear search"
                className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <button
            onClick={() => setFiltersOpen(true)}
            className="lg:hidden relative inline-flex items-center gap-1.5 rounded-xl border border-border bg-white px-3 py-2 text-sm font-semibold text-text hover:border-primary/30"
          >
            <SlidersHorizontal className="w-4 h-4" />
            {hasActiveFilters && (
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-primary border-2 border-bg" />
            )}
          </button>
        </div>

        {/* Status tabs — horizontal scrollable */}
        {!isCompletedView && (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 mt-3 -mx-1 px-1 hide-scrollbar">
            {STATUS_TABS.map((tab) => {
              const active = statusFilter === tab.value
              const count  = counts[tab.value as keyof typeof counts] || 0
              const Icon   = tab.icon
              return (
                <button
                  key={tab.value}
                  onClick={() => setStatusFilter(tab.value)}
                  className={`shrink-0 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold border transition-colors ${
                    active
                      ? 'bg-text text-white border-text'
                      : 'bg-white text-text border-border hover:border-gray-400'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${active ? 'text-white' : tab.color}`} />
                  {tab.label}
                  <span className={`text-[10px] font-bold ${active ? 'text-white/80' : 'text-muted-text'}`}>
                    {count}
                  </span>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* ── Incomplete callout ── */}
      {!isCompletedView && totals.incomplete > 0 && statusFilter === 'all' && !searchQuery && (
        <div className="mb-4 rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shrink-0">
            <Clock className="w-5 h-5 text-amber-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-text">
              {totals.incomplete} order{totals.incomplete !== 1 ? 's' : ''} need{totals.incomplete === 1 ? 's' : ''} attention
            </p>
            <p className="text-xs text-muted-text mt-0.5">
              Noted, processing, or in transit
            </p>
          </div>
          <button
            onClick={() => setStatusFilter('processing')}
            className="shrink-0 inline-flex items-center gap-1 text-xs font-semibold text-amber-700 hover:underline"
          >
            View
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* ── Active filter chips ── */}
      {hasActiveFilters && (
        <div className="flex items-center gap-2 flex-wrap mb-4">
          <span className="text-xs text-muted-text">Active:</span>
          {searchQuery && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
              "{searchQuery}"
              <button onClick={clearSearch} className="hover:opacity-70" aria-label="Remove search">
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
          {ageFilter !== 'all' && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
              <Calendar className="w-3 h-3" />
              {AGE_OPTIONS.find((o) => o.value === ageFilter)?.label}
              <button onClick={() => setAgeFilter('all')} className="hover:opacity-70" aria-label="Remove age filter">
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
          {sortOrder !== 'newest' && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
              <ArrowUpDown className="w-3 h-3" />
              {SORT_OPTIONS.find((o) => o.value === sortOrder)?.label}
              <button onClick={() => setSortOrder('newest')} className="hover:opacity-70" aria-label="Reset sort">
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
          <button
            onClick={clearAllFilters}
            className="text-xs font-semibold text-danger hover:underline ml-1"
          >
            Clear all
          </button>
        </div>
      )}

      {/* ── Main: sidebar + list ── */}
      <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-5">
        {/* Desktop filters sidebar */}
        <aside className="hidden lg:block">
          <div className="sticky top-[180px] rounded-2xl border border-border bg-white p-4 space-y-5">
            <div>
              <h3 className="text-xs font-bold text-text uppercase tracking-wider mb-3 flex items-center gap-2">
                <Calendar className="w-3.5 h-3.5" />
                Date Range
              </h3>
              <div className="space-y-1">
                {AGE_OPTIONS.map((o) => {
                  const active = ageFilter === o.value
                  return (
                    <label key={o.value} className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-gray-50 cursor-pointer">
                      <span className={`flex items-center justify-center w-4 h-4 rounded-full border-2 transition-colors shrink-0 ${
                        active ? 'border-primary' : 'border-gray-300'
                      }`}>
                        {active && <span className="w-2 h-2 rounded-full bg-primary" />}
                      </span>
                      <input
                        type="radio"
                        checked={active}
                        onChange={() => setAgeFilter(o.value)}
                        className="sr-only"
                      />
                      <span className="text-sm text-text">{o.label}</span>
                    </label>
                  )
                })}
              </div>
            </div>

            <div>
              <h3 className="text-xs font-bold text-text uppercase tracking-wider mb-3 flex items-center gap-2">
                <ArrowUpDown className="w-3.5 h-3.5" />
                Sort By
              </h3>
              <div className="space-y-1">
                {SORT_OPTIONS.map((o) => {
                  const active = sortOrder === o.value
                  return (
                    <label key={o.value} className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-gray-50 cursor-pointer">
                      <span className={`flex items-center justify-center w-4 h-4 rounded-full border-2 transition-colors shrink-0 ${
                        active ? 'border-primary' : 'border-gray-300'
                      }`}>
                        {active && <span className="w-2 h-2 rounded-full bg-primary" />}
                      </span>
                      <input
                        type="radio"
                        checked={active}
                        onChange={() => setSortOrder(o.value)}
                        className="sr-only"
                      />
                      <span className="text-sm text-text">{o.label}</span>
                    </label>
                  )
                })}
              </div>
            </div>

            {hasActiveFilters && (
              <button
                onClick={clearAllFilters}
                className="w-full text-center text-xs font-semibold text-danger hover:underline pt-2 border-t border-border"
              >
                Clear all filters
              </button>
            )}
          </div>
        </aside>

        {/* Orders list */}
        <div>
          {loading ? (
            <div className="space-y-2.5">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="rounded-2xl border border-border bg-white p-4">
                  <div className="flex items-center gap-3">
                    <div className="skeleton w-12 h-12 rounded-xl shrink-0" />
                    <div className="flex-1 space-y-2">
                      <div className="skeleton h-4 w-32 rounded" />
                      <div className="skeleton h-3 w-48 rounded" />
                    </div>
                    <div className="skeleton h-6 w-20 rounded" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-white px-4 py-16 text-center animate-fade-in">
              <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
                <Package className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-bold text-text mb-1">
                {hasActiveFilters ? 'No matching orders' : 'No orders yet'}
              </h3>
              <p className="text-sm text-muted-text max-w-xs mb-6">
                {hasActiveFilters
                  ? 'Try adjusting your search or filters'
                  : 'Customer orders will appear here once they complete their purchases'}
              </p>
              {hasActiveFilters && (
                <button
                  onClick={clearAllFilters}
                  className="px-5 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary/90 active:scale-[0.98] transition-all"
                >
                  Clear filters
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-2.5">
              {filteredOrders.map((order) => {
                const loc = [order.shippingAddress?.city, order.shippingAddress?.state].filter(Boolean).join(', ')
                const itemCount = order.items.reduce((s, i) => s + (i.quantity || 0), 0)

                return (
                  <Link
                    key={order.id}
                    to={`/admin/store/orders/${order.id}`}
                    className="group block rounded-2xl border border-border bg-white p-3 sm:p-4 hover:shadow-md hover:border-primary/30 transition-all"
                  >
                    <div className="flex items-start gap-3">
                      {/* Icon */}
                      <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/15 transition-colors">
                        <Package className="w-5 h-5 text-primary" />
                      </div>

                      {/* Main content */}
                      <div className="flex-1 min-w-0">
                        {/* Top row */}
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-text truncate">
                              #{order.id.slice(-8).toUpperCase()}
                            </p>
                            <p className="text-[10px] text-muted-text uppercase tracking-wider font-medium">
                              Order ID
                            </p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-sm sm:text-base font-bold text-text tabular-nums">
                              {formatPrice(order.totalAmount)}
                            </p>
                            <OrderStageBadge status={order.status} />
                          </div>
                        </div>

                        {/* Meta */}
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] sm:text-xs text-muted-text mt-2">
                          <span className="inline-flex items-center gap-1">
                            <Package className="w-3 h-3" />
                            {itemCount} item{itemCount !== 1 ? 's' : ''}
                          </span>
                          {loc && (
                            <>
                              <span className="text-gray-300">•</span>
                              <span className="truncate">{loc}</span>
                            </>
                          )}
                          <span className="text-gray-300">•</span>
                          <span>{formatRelativeTime(order.createdAt)}</span>
                        </div>

                        {/* Quick item preview */}
                        {order.items.length > 0 && (
                          <p className="text-xs text-muted-text mt-1.5 truncate hidden sm:block">
                            {order.items.slice(0, 2).map((i: any) => i.productName || 'Item').join(', ')}
                            {order.items.length > 2 && ` +${order.items.length - 2} more`}
                          </p>
                        )}
                      </div>

                      {/* Chevron */}
                      <ChevronRight className="hidden sm:block w-4 h-4 text-gray-300 group-hover:text-primary group-hover:translate-x-0.5 transition-all self-center shrink-0" />
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Mobile filters drawer ── */}
      {filtersOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setFiltersOpen(false)}
          />
          <div className="absolute right-0 top-0 bottom-0 w-[88%] max-w-sm bg-white shadow-2xl overflow-y-auto animate-slide-left flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-border shrink-0">
              <div>
                <h3 className="font-bold text-text">Filters</h3>
                {hasActiveFilters && <p className="text-xs text-muted-text mt-0.5">Some filters active</p>}
              </div>
              <button
                onClick={() => setFiltersOpen(false)}
                className="p-2 rounded-lg hover:bg-gray-100 text-gray-500"
                aria-label="Close filters"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-6">
              <div>
                <h4 className="text-xs font-bold text-text uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Calendar className="w-3.5 h-3.5" />
                  Date Range
                </h4>
                <div className="space-y-1">
                  {AGE_OPTIONS.map((o) => {
                    const active = ageFilter === o.value
                    return (
                      <label key={o.value} className="flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-gray-50 cursor-pointer">
                        <span className={`flex items-center justify-center w-4 h-4 rounded-full border-2 transition-colors shrink-0 ${
                          active ? 'border-primary' : 'border-gray-300'
                        }`}>
                          {active && <span className="w-2 h-2 rounded-full bg-primary" />}
                        </span>
                        <input
                          type="radio"
                          checked={active}
                          onChange={() => setAgeFilter(o.value)}
                          className="sr-only"
                        />
                        <span className="text-sm text-text">{o.label}</span>
                      </label>
                    )
                  })}
                </div>
              </div>

              <div>
                <h4 className="text-xs font-bold text-text uppercase tracking-wider mb-3 flex items-center gap-2">
                  <ArrowUpDown className="w-3.5 h-3.5" />
                  Sort By
                </h4>
                <div className="space-y-1">
                  {SORT_OPTIONS.map((o) => {
                    const active = sortOrder === o.value
                    return (
                      <label key={o.value} className="flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-gray-50 cursor-pointer">
                        <span className={`flex items-center justify-center w-4 h-4 rounded-full border-2 transition-colors shrink-0 ${
                          active ? 'border-primary' : 'border-gray-300'
                        }`}>
                          {active && <span className="w-2 h-2 rounded-full bg-primary" />}
                        </span>
                        <input
                          type="radio"
                          checked={active}
                          onChange={() => setSortOrder(o.value)}
                          className="sr-only"
                        />
                        <span className="text-sm text-text">{o.label}</span>
                      </label>
                    )
                  })}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 p-4 border-t border-border shrink-0 bg-white">
              <button
                onClick={clearAllFilters}
                className="flex-1 rounded-xl border border-border bg-white px-4 py-2.5 text-sm font-semibold text-text"
              >
                Reset
              </button>
              <button
                onClick={() => setFiltersOpen(false)}
                className="flex-1 rounded-xl bg-primary text-white px-4 py-2.5 text-sm font-semibold"
              >
                Show {filteredOrders.length}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default SellerOrdersPage