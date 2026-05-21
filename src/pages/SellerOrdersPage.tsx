import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { orderService } from '@/services/orderService'
import { formatPrice } from '@/utils'
import { OrderStageBadge } from '@/components/OrderStageIndicator'
import Dropdown from '@/components/Dropdown'
import { formatRelativeTime, isWithinAgeFilter, normalizeOrderStage, sortOrdersByDate } from '@/utils/orderStage'

interface SellerOrder {
  id: string
  totalAmount: number
  items: Array<{ productId: string; quantity: number; price: number }>
  shippingAddress?: { city?: string; state?: string }
  paymentStatus?: string
  status?: string
  createdAt?: string
}

type OrderStatusFilter = 'all' | 'noted' | 'processing' | 'in_transit' | 'completed' | 'cancelled'
type AgeFilter = 'all' | 'today' | '7d' | '30d' | '90d'
type SortOrder = 'newest' | 'oldest'

const statusOptions = [
  { value: 'all', label: 'All stages' },
  { value: 'noted', label: 'Noted' },
  { value: 'processing', label: 'Processing' },
  { value: 'in_transit', label: 'In Transit' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
]

const ageOptions = [
  { value: 'all', label: 'Any time' },
  { value: 'today', label: 'Today' },
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: '90d', label: 'Last 90 days' },
]

const sortOptions = [
  { value: 'newest', label: 'Newest first' },
  { value: 'oldest', label: 'Oldest first' },
]

function SellerOrdersPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { isAuthenticated, user } = useAuthStore()

  const [orders, setOrders] = useState<SellerOrder[]>([])
  const [loading, setLoading] = useState(false)
  const [searchInput, setSearchInput] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<OrderStatusFilter>('all')
  const [ageFilter, setAgeFilter] = useState<AgeFilter>('all')
  const [sortOrder, setSortOrder] = useState<SortOrder>('newest')
  const limit = 500
  const isCompletedView = location.pathname.includes('/completed')
  const activeStatusFilter = isCompletedView ? 'completed' : statusFilter

  useEffect(() => {
    if (!isAuthenticated || !user || user.role !== 'seller') {
      navigate('/profile')
      return
    }

    const timeout = setTimeout(() => {
      setSearchQuery(searchInput.trim())
    }, 300)

    return () => clearTimeout(timeout)
  }, [searchInput, isAuthenticated, user, navigate])

  useEffect(() => {
    setStatusFilter(isCompletedView ? 'completed' : 'all')
  }, [isCompletedView])

  useEffect(() => {
    if (!isAuthenticated || !user || user.role !== 'seller') return

    ;(async () => {
      try {
        setLoading(true)
        const res = await orderService.getSellerOrders(1, limit, searchQuery)
        setOrders(res.orders || [])
      } catch (err) {
        console.error('Failed to load seller orders:', err)
        setOrders([])
      } finally {
        setLoading(false)
      }
    })()
  }, [isAuthenticated, user, searchQuery])

  const clearSearch = () => {
    setSearchInput('')
    setSearchQuery('')
  }

  const filteredOrders = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    const prepared = orders.filter((order) => {
      const stage = normalizeOrderStage(order.status)
      const matchesQuery = !query || order.id.toLowerCase().includes(query) || String(order.totalAmount).includes(query)
      const matchesStatus = activeStatusFilter === 'all' || stage === activeStatusFilter
      const matchesAge = isWithinAgeFilter(order.createdAt, ageFilter)
      return matchesQuery && matchesStatus && matchesAge
    })

    return sortOrdersByDate(prepared, sortOrder)
  }, [orders, searchQuery, activeStatusFilter, ageFilter, sortOrder])

  const counts = useMemo(() => ({
    all: orders.length,
    noted: orders.filter((o) => normalizeOrderStage(o.status) === 'noted').length,
    processing: orders.filter((o) => normalizeOrderStage(o.status) === 'processing').length,
    in_transit: orders.filter((o) => normalizeOrderStage(o.status) === 'in_transit').length,
    completed: orders.filter((o) => normalizeOrderStage(o.status) === 'completed').length,
  }), [orders])

  if (!isAuthenticated || !user || user.role !== 'seller') {
    return (
      <div className="min-h-[70dvh] flex flex-col items-center justify-center px-4 animate-fade-in">
        <h1 className="text-2xl font-bold text-text mb-2">Access Denied</h1>
        <p className="text-muted-text mb-6 text-center">Only sellers can access this page.</p>
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
  const subtitle = isCompletedView
    ? 'Orders that have reached the final stage'
    : 'Manage orders from your customer purchases'

  return (
    <div className="min-h-[80dvh] animate-fade-in pb-8">
      <div className="container mx-auto px-4">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-text mb-1">{title}</h1>
            <p className="text-sm text-muted-text">{subtitle}</p>
          </div>

          <div className="flex items-center gap-2">
            <div className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-white border border-border text-sm text-muted-text">
              <span className="font-semibold text-text">{filteredOrders.length}</span>
              shown
            </div>
            <button
              onClick={() => navigate(isCompletedView ? '/seller/orders' : '/seller/orders/completed')}
              className="rounded-xl border border-border bg-white px-4 py-2 text-sm font-medium text-text hover:bg-gray-50"
            >
              {isCompletedView ? 'View all orders' : 'Completed orders'}
            </button>
          </div>
        </div>

        <div className="grid gap-3 mb-5 lg:grid-cols-[1fr_auto_auto_auto]">
          <div className="relative w-full">
            <svg
              className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>

            <input
              type="search"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search order ID or amount..."
              className="w-full rounded-xl border border-border bg-white pl-10 pr-10 py-2.5 text-sm text-text placeholder:text-gray-400 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            />

            {searchInput && (
              <button
                onClick={clearSearch}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                aria-label="Clear search"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>

          <Dropdown
            options={statusOptions}
            value={activeStatusFilter}
            onChange={(value) => setStatusFilter(value as OrderStatusFilter)}
            className="w-full"
            buttonClassName="px-4 py-2.5 text-sm"
          />

          <Dropdown
            options={ageOptions}
            value={ageFilter}
            onChange={(value) => setAgeFilter(value as AgeFilter)}
            className="w-full"
            buttonClassName="px-4 py-2.5 text-sm"
          />

          <Dropdown
            options={sortOptions}
            value={sortOrder}
            onChange={(value) => setSortOrder(value as SortOrder)}
            className="w-full"
            buttonClassName="px-4 py-2.5 text-sm"
          />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {[
            { label: 'All', value: counts.all },
            { label: 'Noted', value: counts.noted },
            { label: 'Processing', value: counts.processing },
            { label: 'In Transit', value: counts.in_transit },
            { label: 'Completed', value: counts.completed },
          ].map((stat) => (
            <div key={stat.label} className="rounded-2xl border border-border bg-white p-4">
              <p className="text-xs text-muted-text">{stat.label}</p>
              <p className="text-2xl font-bold text-text mt-1">{stat.value}</p>
            </div>
          ))}
        </div>

        {loading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="rounded-2xl border border-border bg-white p-4">
                <div className="skeleton h-4 w-36 rounded mb-3" />
                <div className="skeleton h-3 w-24 rounded mb-2" />
                <div className="skeleton h-3 w-48 rounded" />
              </div>
            ))}
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-white px-4 py-16 text-center animate-fade-in">
            <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </div>

            <h3 className="text-lg font-bold text-text mb-1">No Orders Yet</h3>
            <p className="text-sm text-muted-text max-w-xs mb-6">
              {searchQuery
                ? 'No orders match your search query.'
                : 'Orders from your customers will appear here when they complete their purchases.'}
            </p>

            {searchQuery && (
              <button
                onClick={clearSearch}
                className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90"
              >
                Clear Search
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredOrders.map((order) => {
              const location = [order.shippingAddress?.city, order.shippingAddress?.state].filter(Boolean).join(', ')

              return (
                <Link
                  key={order.id}
                  to={`/seller/orders/${order.id}`}
                  className="block rounded-2xl border border-border bg-white p-4 hover:shadow-md hover:border-gray-200 transition-all duration-200"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3 sm:gap-4">
                        <div className="min-w-0">
                          <p className="text-[11px] uppercase tracking-wide text-muted-text font-semibold mb-1">Order</p>
                          <h3 className="text-sm sm:text-base font-semibold text-text truncate">#{order.id}</h3>
                        </div>

                        <div className="shrink-0 sm:hidden">
                          <OrderStageBadge status={order.status} />
                        </div>
                      </div>

                      <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-text">
                        <span>{order.items.length} item{order.items.length !== 1 ? 's' : ''}</span>
                        <span className="text-gray-300">•</span>
                        <span>{location || 'Unknown location'}</span>
                        <span className="text-gray-300">•</span>
                        <span>{formatRelativeTime(order.createdAt)}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end sm:text-right gap-4 pt-3 sm:pt-0 border-t sm:border-t-0 border-border">
                      <div className="hidden sm:block">
                        <OrderStageBadge status={order.status} />
                      </div>

                      <div>
                        <p className="text-[11px] uppercase tracking-wide text-muted-text font-semibold">Total</p>
                        <p className="text-base sm:text-lg font-bold text-text">{formatPrice(order.totalAmount)}</p>
                      </div>

                      <div className="flex items-center gap-1 text-secondary text-sm font-medium shrink-0">
                        View
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

export default SellerOrdersPage
