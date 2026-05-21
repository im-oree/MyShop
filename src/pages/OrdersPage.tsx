import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { orderService } from '@/services/orderService'
import { formatPrice } from '@/utils'
import { OrderStageBadge } from '@/components/OrderStageIndicator'
import Dropdown from '@/components/Dropdown'
import { formatRelativeTime, isWithinAgeFilter, normalizeOrderStage, sortOrdersByDate } from '@/utils/orderStage'

type OrderStatusFilter = 'all' | 'noted' | 'processing' | 'in_transit' | 'completed' | 'cancelled'
type AgeFilter = 'all' | 'today' | '7d' | '30d' | '90d'
type SortOrder = 'newest' | 'oldest'

const stageOptions = [
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

function OrdersPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { isAuthenticated } = useAuthStore()
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<OrderStatusFilter>('all')
  const [ageFilter, setAgeFilter] = useState<AgeFilter>('all')
  const [sortOrder, setSortOrder] = useState<SortOrder>('newest')
  const limit = 500
  const isCompletedView = location.pathname.includes('/completed')
  const activeStatusFilter = isCompletedView ? 'completed' : statusFilter
  
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login')
      return
    }

    loadOrders()
  }, [isAuthenticated, navigate])

  useEffect(() => {
    setStatusFilter(isCompletedView ? 'completed' : 'all')
  }, [isCompletedView])

  const loadOrders = async () => {
    try {
      setLoading(true)
      setError('')
      const data = await orderService.getAll(1, limit)
      setOrders(data.items || [])
    } catch (error) {
      console.error('Failed to load orders:', error)
      setError('Failed to load your orders right now. Please try again.')
      setOrders([])
    } finally {
      setLoading(false)
    }
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

  const displayedCounts = useMemo(() => ({
    all: orders.length,
    noted: orders.filter((o) => normalizeOrderStage(o.status) === 'noted').length,
    processing: orders.filter((o) => normalizeOrderStage(o.status) === 'processing').length,
    in_transit: orders.filter((o) => normalizeOrderStage(o.status) === 'in_transit').length,
    completed: orders.filter((o) => normalizeOrderStage(o.status) === 'completed').length,
  }), [orders])

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="skeleton h-24 rounded-lg" />
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <h1 className="text-3xl font-bold mb-4 text-primary">My Orders</h1>
        <p className="text-danger mb-6">{error}</p>
        <button
          onClick={loadOrders}
          className="bg-primary text-white px-6 py-2 rounded hover:bg-opacity-90 transition"
        >
          Retry
        </button>
      </div>
    )
  }

  const title = isCompletedView ? 'Completed Orders' : 'My Orders'
  const subtitle = isCompletedView
    ? 'Orders that have reached the final stage'
    : 'Review current, processing, and previous purchases'

  if (orders.length === 0) {
    return (
      <div className="text-center py-12">
        <h1 className="text-3xl font-bold mb-4 text-primary">{title}</h1>
        <p className="text-muted-text mb-6">You haven't placed any orders yet</p>
        <button
          onClick={() => navigate('/')}
          className="bg-primary text-white px-6 py-2 rounded hover:bg-opacity-90 transition"
        >
          Start Shopping
        </button>
      </div>
    )
  }
  
  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-text">{title}</h1>
          <p className="text-muted-text mt-1">{subtitle}</p>
        </div>

        <button
          onClick={() => navigate(isCompletedView ? '/orders' : '/orders/completed')}
          className="self-start rounded-xl border border-border bg-white px-4 py-2 text-sm font-medium text-text hover:bg-gray-50"
        >
          {isCompletedView ? 'View all orders' : 'Completed orders'}
        </button>
      </div>

      <div className="grid gap-3 mb-5 lg:grid-cols-[1fr_auto_auto_auto]">
        <div className="relative flex-1">
          <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by order ID or amount..."
            className="w-full rounded-xl border border-border bg-white pl-10 pr-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </div>
        <Dropdown
          options={stageOptions}
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
          { label: 'All', value: displayedCounts.all },
          { label: 'Noted', value: displayedCounts.noted },
          { label: 'Processing', value: displayedCounts.processing },
          { label: 'In Transit', value: displayedCounts.in_transit },
          { label: 'Completed', value: displayedCounts.completed },
        ].map((stat) => (
          <div key={stat.label} className="rounded-2xl border border-border bg-white p-4">
            <p className="text-xs text-muted-text">{stat.label}</p>
            <p className="text-2xl font-bold text-text mt-1">{stat.value}</p>
          </div>
        ))}
      </div>
      
      <div className="space-y-4">
        {filteredOrders.map((order) => (
          <div
            key={order.id}
            className="bg-white border border-border rounded-2xl p-5 hover:shadow-md hover:border-gray-200 transition cursor-pointer"
            onClick={() => navigate(`/orders/${order.id}`)}
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between mb-3">
              <div>
                <h3 className="font-bold text-lg text-text">Order {order.id}</h3>
                <p className="text-sm text-muted-text">{formatRelativeTime(order.createdAt)} • {order.createdAt ? new Date(order.createdAt as any).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' }) : 'N/A'}</p>
              </div>
              <div className="flex flex-col items-start sm:items-end gap-2">
                <OrderStageBadge status={order.status} />
                <p className="font-bold text-accent text-lg">{formatPrice(order.totalAmount)}</p>
              </div>
            </div>
            
            <div className="flex flex-wrap gap-4 text-sm text-muted-text">
              <span>{order.items.length} items</span>
              <span>•</span>
              <span>Payment: {order.paymentStatus}</span>
              <span>•</span>
              <span>Stage: {normalizeOrderStage(order.status)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default OrdersPage
