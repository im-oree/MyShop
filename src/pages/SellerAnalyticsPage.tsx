import { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { formatPrice } from '@/utils'
import { productService } from '@/services/productService'
import { orderService } from '@/services/orderService'
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import {
  TrendingUp,
  TrendingDown,
  ShoppingBag,
  Package,
  DollarSign,
  Users,
  AlertTriangle,
  CheckCircle2,
  Clock,
  XCircle,
  RefreshCw,
  Calendar,
} from 'lucide-react'

type DateRange = '7day' | '30day' | '90day'

const DATE_LABEL: Record<DateRange, string> = {
  '7day':  '7 days',
  '30day': '30 days',
  '90day': '90 days',
}

/* ─────────────────────────────────────────────
   MINI METRIC CARD (mobile-optimized)
───────────────────────────────────────────── */
function MetricCard({
  icon: Icon,
  label,
  value,
  sub,
  trend,
  loading,
  color = 'primary',
}: {
  icon: any
  label: string
  value?: React.ReactNode
  sub?: string
  trend?: { value: number; positive: boolean }
  loading?: boolean
  color?: 'primary' | 'green' | 'amber' | 'red' | 'blue'
}) {
  const colorMap = {
    primary: 'bg-primary/10 text-primary',
    green:   'bg-green-50 text-green-600',
    amber:   'bg-amber-50 text-amber-600',
    red:     'bg-red-50 text-red-600',
    blue:    'bg-blue-50 text-blue-600',
  }

  return (
    <div className="bg-white rounded-2xl border border-border p-3 sm:p-4 hover:shadow-sm transition-all">
      <div className="flex items-start justify-between mb-2">
        <div className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center ${colorMap[color]}`}>
          <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
        </div>
        {trend && !loading && (
          <span className={`inline-flex items-center gap-0.5 text-[10px] sm:text-xs font-semibold px-1.5 py-0.5 rounded-full ${
            trend.positive ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
          }`}>
            {trend.positive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {Math.abs(trend.value).toFixed(0)}%
          </span>
        )}
      </div>
      <p className="text-[10px] sm:text-xs text-muted-text font-medium uppercase tracking-wider mb-1">{label}</p>
      {loading ? (
        <div className="h-6 sm:h-7 w-20 bg-gray-100 rounded animate-pulse" />
      ) : (
        <p className="text-lg sm:text-2xl font-bold text-text tabular-nums leading-tight truncate">
          {value}
        </p>
      )}
      {sub && !loading && <p className="text-[10px] sm:text-xs text-muted-text mt-0.5 truncate">{sub}</p>}
    </div>
  )
}

/* ─────────────────────────────────────────────
   CHART CARD WRAPPER
───────────────────────────────────────────── */
function ChartCard({
  title,
  subtitle,
  children,
  action,
}: {
  title: string
  subtitle?: string
  children: React.ReactNode
  action?: React.ReactNode
}) {
  return (
    <div className="bg-white rounded-2xl border border-border p-4 sm:p-5">
      <div className="flex items-start justify-between mb-4 gap-2">
        <div className="min-w-0">
          <h3 className="text-sm sm:text-base font-bold text-text truncate">{title}</h3>
          {subtitle && <p className="text-[10px] sm:text-xs text-muted-text mt-0.5">{subtitle}</p>}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
      {children}
    </div>
  )
}

/* ═════════════════════════════════════════════
   MAIN PAGE
═════════════════════════════════════════════ */
function SellerAnalyticsPage() {
  const navigate = useNavigate()
  const { user, isAuthenticated } = useAuthStore()

  const [analytics, setAnalytics] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [dateRange, setDateRange] = useState<DateRange>('30day')

  useEffect(() => {
    if (!isAuthenticated || !user || (user.role !== 'admin' && user.role !== 'manager')) {
      navigate('/profile')
      return
    }

    const loadAnalytics = async () => {
      if (analytics) setRefreshing(true); else setLoading(true)

      try {
        const [productResponse, orderResponse]: any = await Promise.all([
          productService.getAll(1, 1000),
          orderService.getAll(1, 1000),
        ])

        const products = productResponse.items || productResponse.products || []
        const orders   = orderResponse.items || orderResponse.orders || []
        const rangeDays = dateRange === '7day' ? 7 : dateRange === '30day' ? 30 : 90
        const cutoff = Date.now() - (rangeDays * 24 * 60 * 60 * 1000)
        const prevCutoff = Date.now() - (rangeDays * 2 * 24 * 60 * 60 * 1000)

        const filteredOrders = orders.filter((o: any) => {
          const t = o.createdAt ? new Date(o.createdAt).getTime() : 0
          return t >= cutoff
        })

        // Previous period for trend comparison
        const prevPeriodOrders = orders.filter((o: any) => {
          const t = o.createdAt ? new Date(o.createdAt).getTime() : 0
          return t >= prevCutoff && t < cutoff
        })

        // Daily sales series
        const salesMap = new Map<string, { date: string; orders: number; revenue: number }>()
        // Pre-fill with zeroes for every day in range so chart isn't gappy
        for (let i = rangeDays - 1; i >= 0; i--) {
          const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000)
          const key = d.toISOString().slice(0, 10)
          salesMap.set(key, { date: key, orders: 0, revenue: 0 })
        }

        filteredOrders.forEach((o: any) => {
          const date = o.createdAt ? new Date(o.createdAt).toISOString().slice(0, 10) : null
          if (!date || !salesMap.has(date)) return
          const cur = salesMap.get(date)!
          cur.orders  += 1
          cur.revenue += Number(o.totalAmount || 0)
        })

        const salesSeries = [...salesMap.values()].map(s => ({
          ...s,
          dateShort: new Date(s.date).toLocaleDateString('en', { month: 'short', day: 'numeric' }),
        }))

        // Categories
        const categoryMap = new Map<string, number>()
        products.forEach((p: any) => {
          const c = p.category || 'Other'
          categoryMap.set(c, (categoryMap.get(c) || 0) + 1)
        })

        // Inventory
        const inventoryStatus = {
          inStock:    products.filter((p: any) => (p.stock || 0) > 5).length,
          lowStock:   products.filter((p: any) => (p.stock || 0) > 0 && (p.stock || 0) <= 5).length,
          outOfStock: products.filter((p: any) => (p.stock || 0) <= 0).length,
        }

        const totalRevenue   = filteredOrders.reduce((s: number, o: any) => s + Number(o.totalAmount || 0), 0)
        const prevRevenue    = prevPeriodOrders.reduce((s: number, o: any) => s + Number(o.totalAmount || 0), 0)
        const totalSalesCount = filteredOrders.length
        const prevSalesCount  = prevPeriodOrders.length

        const revenueTrend = prevRevenue > 0 ? ((totalRevenue - prevRevenue) / prevRevenue) * 100 : 0
        const ordersTrend  = prevSalesCount > 0 ? ((totalSalesCount - prevSalesCount) / prevSalesCount) * 100 : 0

        // Orders by status
        const ordersByStatus = filteredOrders.reduce((acc: Record<string, number>, o: any) => {
          const s = o.status || 'unknown'
          acc[s] = (acc[s] || 0) + 1
          return acc
        }, {})

        // Items metrics
        let totalItems = 0
        const productSalesMap = new Map<string, { name: string; qty: number; revenue: number }>()
        filteredOrders.forEach((o: any) => {
          const items = o.items || []
          items.forEach((it: any) => {
            const pid = it.productId || it.id
            const name = it.productName || it.name || 'Unknown'
            const qty = Number(it.quantity || 0)
            const price = Number(it.price || 0)
            totalItems += qty
            const cur = productSalesMap.get(pid) || { name, qty: 0, revenue: 0 }
            cur.qty     += qty
            cur.revenue += qty * price
            productSalesMap.set(pid, cur)
          })
        })

        const avgItemsPerOrder = totalSalesCount > 0 ? totalItems / totalSalesCount : 0

        const topSelling = [...productSalesMap.entries()]
          .map(([id, v]) => ({ id, name: v.name, quantity: v.qty, revenue: v.revenue }))
          .sort((a, b) => b.quantity - a.quantity)
          .slice(0, 5)

        const topByRevenue = [...productSalesMap.entries()]
          .map(([id, v]) => ({ id, name: v.name, quantity: v.qty, revenue: v.revenue }))
          .sort((a, b) => b.revenue - a.revenue)
          .slice(0, 5)

        // Best/worst day
        const bestDay = [...salesSeries].sort((a, b) => b.revenue - a.revenue)[0]

        setAnalytics({
          salesSeries,
          categorySeries: [...categoryMap.entries()].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value),
          inventoryStatus,
          topSelling,
          topByRevenue,
          ordersByStatus,
          summary: {
            totalProducts: products.length,
            totalOrders: filteredOrders.length,
            totalSalesCount,
            totalRevenue,
            avgOrderValue: totalSalesCount > 0 ? totalRevenue / totalSalesCount : 0,
            inventoryValue: products.reduce((s: number, p: any) => s + ((p.salePrice ?? p.price) * (p.stock || 0)), 0),
            avgPrice: products.length > 0 ? products.reduce((s: number, p: any) => s + (p.salePrice ?? p.price), 0) / products.length : 0,
            totalItems,
            avgItemsPerOrder,
            revenueTrend,
            ordersTrend,
            bestDay: bestDay && bestDay.revenue > 0 ? bestDay : null,
          },
        })
      } catch (error) {
        console.error('Failed to load analytics:', error)
        setAnalytics(null)
      } finally {
        setLoading(false)
        setRefreshing(false)
      }
    }

    void loadAnalytics()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, user, navigate, dateRange])

  const salesData      = analytics?.salesSeries ?? []
  const categoryData   = analytics?.categorySeries ?? []
  const inventoryStat  = analytics?.inventoryStatus ?? { inStock: 0, lowStock: 0, outOfStock: 0 }
  const metrics        = analytics?.summary ?? {}

  const inventoryData = useMemo(() => ([
    { name: 'In Stock',     value: inventoryStat.inStock,    color: '#16A34A' },
    { name: 'Low Stock',    value: inventoryStat.lowStock,   color: '#F59E0B' },
    { name: 'Out of Stock', value: inventoryStat.outOfStock, color: '#DC2626' },
  ].filter(d => d.value > 0)), [inventoryStat])

  const statusConfig: Record<string, { icon: any; color: string; bg: string }> = {
    pending:    { icon: Clock,         color: 'text-amber-600',  bg: 'bg-amber-50' },
    processing: { icon: RefreshCw,     color: 'text-blue-600',   bg: 'bg-blue-50' },
    shipped:    { icon: Package,       color: 'text-indigo-600', bg: 'bg-indigo-50' },
    delivered:  { icon: CheckCircle2,  color: 'text-green-600',  bg: 'bg-green-50' },
    completed:  { icon: CheckCircle2,  color: 'text-green-600',  bg: 'bg-green-50' },
    cancelled:  { icon: XCircle,       color: 'text-red-600',    bg: 'bg-red-50' },
    refunded:   { icon: XCircle,       color: 'text-red-600',    bg: 'bg-red-50' },
  }

  if (!isAuthenticated || !user || (user.role !== 'admin' && user.role !== 'manager')) {
    return (
      <div className="min-h-[70dvh] flex flex-col items-center justify-center px-4">
        <h1 className="text-2xl font-bold text-text mb-2">Access Denied</h1>
        <p className="text-muted-text">Only store managers can access this page.</p>
      </div>
    )
  }

  return (
    <div className="min-h-[80dvh] animate-fade-in pb-24 lg:pb-10">
      {/* ── Sticky header with date range ── */}
      <div className="sticky top-16 sm:top-[72px] z-20 -mx-3 sm:mx-0 px-3 sm:px-0 py-3 bg-bg/95 backdrop-blur-md mb-4">
        <div className="flex items-center justify-between gap-3 mb-3">
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold text-text truncate">Analytics</h1>
            <p className="text-xs text-muted-text">
              Last {DATE_LABEL[dateRange]} • {refreshing && '↻ refreshing…'}
            </p>
          </div>
          <button
            onClick={() => setDateRange(prev => prev)} // triggers re-fetch via effect
            disabled={refreshing}
            aria-label="Refresh"
            className="shrink-0 inline-flex items-center justify-center p-2 rounded-xl border border-border bg-white text-text hover:border-primary/30 hover:text-primary disabled:opacity-50 transition-all"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Date range pills */}
        <div className="inline-flex rounded-xl border border-border bg-white p-0.5">
          {(['7day', '30day', '90day'] as const).map((range) => (
            <button
              key={range}
              onClick={() => setDateRange(range)}
              className={`px-3 sm:px-4 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
                dateRange === range
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-muted-text hover:text-text'
              }`}
            >
              <Calendar className="w-3 h-3 inline mr-1 -mt-0.5" />
              {DATE_LABEL[range]}
            </button>
          ))}
        </div>
      </div>

      {/* ── Hero stats (4 key metrics) ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3 mb-6">
        <MetricCard
          icon={DollarSign}
          label="Revenue"
          value={formatPrice(metrics.totalRevenue || 0)}
          trend={metrics.revenueTrend ? { value: metrics.revenueTrend, positive: metrics.revenueTrend >= 0 } : undefined}
          loading={loading}
          color="green"
        />
        <MetricCard
          icon={ShoppingBag}
          label="Orders"
          value={metrics.totalSalesCount || 0}
          trend={metrics.ordersTrend ? { value: metrics.ordersTrend, positive: metrics.ordersTrend >= 0 } : undefined}
          loading={loading}
          color="primary"
        />
        <MetricCard
          icon={Users}
          label="Avg. Order"
          value={formatPrice(Math.round(metrics.avgOrderValue || 0))}
          sub={`${(metrics.avgItemsPerOrder || 0).toFixed(1)} items avg`}
          loading={loading}
          color="blue"
        />
        <MetricCard
          icon={Package}
          label="Items Sold"
          value={metrics.totalItems || 0}
          sub={`across ${metrics.totalSalesCount || 0} orders`}
          loading={loading}
          color="amber"
        />
      </div>

      {/* ── Inventory snapshot ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3 mb-6">
        <MetricCard
          icon={Package}
          label="Products"
          value={metrics.totalProducts || 0}
          loading={loading}
        />
        <MetricCard
          icon={DollarSign}
          label="Inventory Value"
          value={formatPrice(metrics.inventoryValue || 0)}
          loading={loading}
          color="green"
        />
        <MetricCard
          icon={AlertTriangle}
          label="Low Stock"
          value={inventoryStat.lowStock}
          sub="needs restocking"
          loading={loading}
          color="amber"
        />
        <MetricCard
          icon={XCircle}
          label="Out of Stock"
          value={inventoryStat.outOfStock}
          sub="missed sales risk"
          loading={loading}
          color="red"
        />
      </div>

      {/* ── Best day callout ── */}
      {metrics.bestDay && (
        <div className="mb-6 rounded-2xl border border-green-200 bg-gradient-to-br from-green-50 to-emerald-50 p-4 sm:p-5">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shrink-0">
              <TrendingUp className="w-5 h-5 text-green-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-green-700 uppercase tracking-wider">Best day in period</p>
              <p className="text-lg sm:text-xl font-bold text-text mt-0.5">
                {formatPrice(metrics.bestDay.revenue)}
                <span className="text-sm font-medium text-muted-text ml-2">
                  on {new Date(metrics.bestDay.date).toLocaleDateString('en', { weekday: 'long', month: 'short', day: 'numeric' })}
                </span>
              </p>
              <p className="text-xs text-muted-text mt-0.5">{metrics.bestDay.orders} order{metrics.bestDay.orders !== 1 ? 's' : ''}</p>
            </div>
          </div>
        </div>
      )}

      {/* ── Revenue trend chart ── */}
      <ChartCard
        title="Revenue Trend"
        subtitle={`Daily revenue over the last ${DATE_LABEL[dateRange]}`}
      >
        {loading ? (
          <div className="h-[240px] bg-gray-50 rounded animate-pulse" />
        ) : salesData.length === 0 ? (
          <div className="h-[240px] flex items-center justify-center text-sm text-muted-text">
            No sales data yet
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={salesData} margin={{ top: 5, right: 5, bottom: 5, left: 0 }}>
              <defs>
                <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%"  stopColor="#16A34A" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#16A34A" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
              <XAxis
                dataKey="dateShort"
                stroke="#9ca3af"
                style={{ fontSize: '10px' }}
                tickLine={false}
                axisLine={false}
                interval="preserveStartEnd"
                minTickGap={20}
              />
              <YAxis
                stroke="#9ca3af"
                style={{ fontSize: '10px' }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#fff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '12px',
                  fontSize: '12px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                }}
                formatter={(value: any, name?: string | number) =>
                  name === 'revenue' ? [formatPrice(value), 'Revenue'] : [value, 'Orders']
                }
                labelStyle={{ color: '#1f2937', fontWeight: 600 }}
              />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="#16A34A"
                strokeWidth={2}
                fill="url(#revGrad)"
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </ChartCard>

      {/* ── Two-column on desktop, stacked on mobile ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-5 mt-4">
        {/* Inventory pie */}
        <ChartCard
          title="Inventory Health"
          subtitle="Stock distribution"
        >
          {loading ? (
            <div className="h-[220px] bg-gray-50 rounded animate-pulse" />
          ) : inventoryData.length === 0 ? (
            <div className="h-[220px] flex items-center justify-center text-sm text-muted-text">
              No inventory data
            </div>
          ) : (
            <div className="flex items-center gap-4">
              <ResponsiveContainer width="50%" height={180}>
                <PieChart>
                  <Pie
                    data={inventoryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={75}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {inventoryData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#fff',
                      border: '1px solid #e5e7eb',
                      borderRadius: '12px',
                      fontSize: '12px',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-2.5">
                {inventoryData.map((d) => {
                  const total = inventoryData.reduce((s, x) => s + x.value, 0)
                  const pct = total > 0 ? (d.value / total) * 100 : 0
                  return (
                    <div key={d.name} className="text-sm">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: d.color }} />
                          <span className="text-text truncate">{d.name}</span>
                        </div>
                        <span className="font-semibold text-text">{d.value}</span>
                      </div>
                      <div className="h-1 rounded-full bg-gray-100 overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{ width: `${pct}%`, background: d.color }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </ChartCard>

        {/* Order status breakdown */}
        <ChartCard
          title="Order Status"
          subtitle={`${metrics.totalOrders || 0} orders in period`}
        >
          {loading ? (
            <div className="h-[220px] bg-gray-50 rounded animate-pulse" />
          ) : Object.keys(analytics?.ordersByStatus || {}).length === 0 ? (
            <div className="h-[220px] flex items-center justify-center text-sm text-muted-text">
              No orders in this range
            </div>
          ) : (
            <div className="space-y-2">
              {Object.entries(analytics.ordersByStatus)
                .sort(([, a]: any, [, b]: any) => b - a)
                .map(([status, count]: any) => {
                  const cfg = statusConfig[status] || { icon: Package, color: 'text-gray-600', bg: 'bg-gray-50' }
                  const Icon = cfg.icon
                  const total = metrics.totalOrders || 1
                  const pct = (count / total) * 100
                  return (
                    <div key={status} className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${cfg.bg}`}>
                        <Icon className={`w-4 h-4 ${cfg.color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between text-sm mb-1">
                          <span className="capitalize font-medium text-text truncate">{status.replace('_', ' ')}</span>
                          <span className="font-semibold text-text tabular-nums shrink-0 ml-2">{count}</span>
                        </div>
                        <div className="h-1 rounded-full bg-gray-100 overflow-hidden">
                          <div
                            className="h-full bg-primary rounded-full transition-all"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  )
                })}
            </div>
          )}
        </ChartCard>

        {/* Top selling by qty */}
        <ChartCard
          title="Top Sellers"
          subtitle="Most units sold"
        >
          {loading ? (
            <div className="h-[220px] bg-gray-50 rounded animate-pulse" />
          ) : !analytics?.topSelling?.length ? (
            <div className="h-[220px] flex items-center justify-center text-sm text-muted-text">
              No product sales yet
            </div>
          ) : (
            <div className="space-y-2.5">
              {analytics.topSelling.map((p: any, i: number) => {
                const max = analytics.topSelling[0]?.quantity || 1
                const pct = (p.quantity / max) * 100
                return (
                  <div key={p.id} className="group">
                    <div className="flex items-center justify-between text-sm mb-1">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold shrink-0 ${
                          i === 0 ? 'bg-amber-100 text-amber-700'
                          : i === 1 ? 'bg-gray-200 text-gray-700'
                          : i === 2 ? 'bg-orange-100 text-orange-700'
                          : 'bg-gray-100 text-muted-text'
                        }`}>
                          {i + 1}
                        </span>
                        <span className="text-text truncate font-medium">{p.name}</span>
                      </div>
                      <span className="font-semibold text-text tabular-nums shrink-0 ml-2">{p.quantity}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden ml-7">
                      <div
                        className="h-full bg-gradient-to-r from-primary to-primary/70 rounded-full transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </ChartCard>

        {/* Top by revenue */}
        <ChartCard
          title="Top Earners"
          subtitle="Highest revenue"
        >
          {loading ? (
            <div className="h-[220px] bg-gray-50 rounded animate-pulse" />
          ) : !analytics?.topByRevenue?.length ? (
            <div className="h-[220px] flex items-center justify-center text-sm text-muted-text">
              No revenue data yet
            </div>
          ) : (
            <div className="space-y-2.5">
              {analytics.topByRevenue.map((p: any, i: number) => {
                const max = analytics.topByRevenue[0]?.revenue || 1
                const pct = (p.revenue / max) * 100
                return (
                  <div key={p.id}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold shrink-0 ${
                          i === 0 ? 'bg-amber-100 text-amber-700'
                          : i === 1 ? 'bg-gray-200 text-gray-700'
                          : i === 2 ? 'bg-orange-100 text-orange-700'
                          : 'bg-gray-100 text-muted-text'
                        }`}>
                          {i + 1}
                        </span>
                        <span className="text-text truncate font-medium">{p.name}</span>
                      </div>
                      <span className="font-semibold text-text tabular-nums shrink-0 ml-2 text-xs sm:text-sm">
                        {formatPrice(p.revenue)}
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden ml-7">
                      <div
                        className="h-full bg-gradient-to-r from-green-500 to-emerald-400 rounded-full transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </ChartCard>
      </div>

      {/* ── Category breakdown ── */}
      <div className="mt-4">
        <ChartCard
          title="Products by Category"
          subtitle={`${categoryData.length} categories`}
        >
          {loading ? (
            <div className="h-[200px] bg-gray-50 rounded animate-pulse" />
          ) : categoryData.length === 0 ? (
            <div className="h-[200px] flex items-center justify-center text-sm text-muted-text">
              No category data
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={Math.max(200, categoryData.length * 32)}>
              <BarChart data={categoryData} layout="vertical" margin={{ top: 0, right: 20, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" horizontal={false} />
                <XAxis type="number" stroke="#9ca3af" style={{ fontSize: '10px' }} tickLine={false} axisLine={false} />
                <YAxis
                  dataKey="name"
                  type="category"
                  stroke="#9ca3af"
                  style={{ fontSize: '11px' }}
                  width={110}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '12px',
                    fontSize: '12px',
                  }}
                />
                <Bar dataKey="value" fill="#16A34A" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>
    </div>
  )
}

export default SellerAnalyticsPage