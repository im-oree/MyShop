
import { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { formatPrice } from '@/utils'
import { productService } from '@/services/productService'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'

function SellerAnalyticsPage() {
  const navigate = useNavigate()
  const { user, isAuthenticated, currentRole } = useAuthStore()

  const [analytics, setAnalytics] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [dateRange, setDateRange] = useState<'7day' | '30day' | '90day'>('30day')

  useEffect(() => {
    if (!isAuthenticated || !user || user.role !== 'seller' || currentRole !== 'seller') {
      navigate('/profile')
      return
    }

    const loadAnalytics = async () => {
      setLoading(true)
      try {
        const data = await productService.getMineAnalytics(dateRange)
        setAnalytics(data || null)
      } catch (error) {
        console.error('Failed to load seller analytics:', error)
        setAnalytics(null)
      } finally {
        setLoading(false)
      }
    }

    void loadAnalytics()
  }, [isAuthenticated, user, currentRole, navigate, dateRange])

  const salesData = analytics?.charts?.salesSeries ?? []
  const categoryData = analytics?.charts?.categorySeries ?? []
  const inventoryStatus = analytics?.charts?.inventoryStatus ?? { inStock: 0, lowStock: 0, outOfStock: 0 }
  const topProducts = analytics?.topProducts ?? []
  const metrics = analytics?.summary ?? {
    totalProducts: 0,
    totalOrders: 0,
    totalSalesCount: 0,
    totalRevenue: 0,
    avgOrderValue: 0,
    inventoryValue: 0,
    avgPrice: 0,
    rating: user?.sellerProfile?.rating ?? 0,
    totalReviews: user?.sellerProfile?.totalReviews ?? 0,
  }

  const inventoryData = useMemo(() => ([
    { name: 'In Stock', value: inventoryStatus.inStock, color: '#16A34A' },
    { name: 'Low Stock', value: inventoryStatus.lowStock, color: '#F59E0B' },
    { name: 'Out of Stock', value: inventoryStatus.outOfStock, color: '#DC2626' },
  ]), [inventoryStatus])
  if (!isAuthenticated || !user || user.role !== 'seller') {
    return (
      <div className="min-h-[70dvh] flex flex-col items-center justify-center px-4">
        <h1 className="text-2xl font-bold text-text mb-2">Access Denied</h1>
        <p className="text-muted-text">Only verified sellers can access this page.</p>
      </div>
    )
  }


  return (
    <div className="min-h-[80dvh] animate-fade-in pb-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-text mb-2">Analytics & Insights</h1>
        <p className="text-muted-text mb-4">Monitor your sales, inventory, and shop performance.</p>

        {/* Date Range Selector */}
        <div className="flex gap-2">
          {(['7day', '30day', '90day'] as const).map((range) => (
            <button
              key={range}
              onClick={() => setDateRange(range)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                dateRange === range
                  ? 'bg-secondary text-white'
                  : 'bg-gray-100 text-text hover:bg-gray-200'
              }`}
            >
              {range === '7day' ? 'Last 7 Days' : range === '30day' ? 'Last 30 Days' : 'Last 90 Days'}
            </button>
          ))}
        </div>
      </div>
      {loading ? (
        <div className="text-center py-12">
          <p className="text-muted-text">Loading analytics...</p>
        </div>
      ) : (
        <>

          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <div className="bg-white rounded-xl border border-border p-5">
              <p className="text-xs text-muted-text font-semibold uppercase mb-2">Total Sales</p>
              <p className="text-3xl font-bold text-text">{metrics.totalSalesCount || 0}</p>
              <p className="text-xs text-green-600 mt-2">Real orders and item quantities</p>
            </div>

            <div className="bg-white rounded-xl border border-border p-5">
              <p className="text-xs text-muted-text font-semibold uppercase mb-2">Total Revenue</p>
              <p className="text-3xl font-bold text-text">{formatPrice(metrics.totalRevenue || 0)}</p>
              <p className="text-xs text-green-600 mt-2">Computed from paid orders</p>
            </div>

            <div className="bg-white rounded-xl border border-border p-5">
              <p className="text-xs text-muted-text font-semibold uppercase mb-2">Avg. Order Value</p>
              <p className="text-3xl font-bold text-text">{formatPrice(Math.round(metrics.avgOrderValue || 0))}</p>
              <p className="text-xs text-gray-500 mt-2">Per transaction</p>
            </div>

            <div className="bg-white rounded-xl border border-border p-5">
              <p className="text-xs text-muted-text font-semibold uppercase mb-2">Shop Rating</p>
              <p className="text-3xl font-bold text-text">{(metrics.rating ?? 0).toFixed(1)}</p>
              <p className="text-xs text-gray-500 mt-2">({metrics.totalReviews || 0} reviews)</p>
            </div>
          </div>

          {/* Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Sales Revenue Chart */}
            <div className="bg-white rounded-xl border border-border p-6">
              <h3 className="text-lg font-bold text-text mb-4">Sales & Revenue Trend</h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={salesData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis
                    dataKey="date"
                    stroke="#9ca3af"
                    style={{ fontSize: '12px' }}
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis stroke="#9ca3af" style={{ fontSize: '12px' }} yAxisId="left" />
                  <YAxis stroke="#9ca3af" style={{ fontSize: '12px' }} yAxisId="right" orientation="right" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#f9fafb',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                    }}
                    labelStyle={{ color: '#1f2937' }}
                  />
                  <Legend />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="salesCount"
                    stroke="#16A34A"
                    strokeWidth={2}
                    dot={{ fill: '#16A34A', r: 4 }}
                    activeDot={{ r: 6 }}
                    name="Sales Count"
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="revenue"
                    stroke="#F59E0B"
                    strokeWidth={2}
                    dot={{ fill: '#F59E0B', r: 4 }}
                    activeDot={{ r: 6 }}
                    name="Revenue (₦)"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Product Category Distribution */}
            <div className="bg-white rounded-xl border border-border p-6">
              <h3 className="text-lg font-bold text-text mb-4">Products by Category</h3>
              {categoryData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={categoryData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="name" stroke="#9ca3af" style={{ fontSize: '12px' }} />
                    <YAxis stroke="#9ca3af" style={{ fontSize: '12px' }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#f9fafb',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                      }}
                      labelStyle={{ color: '#1f2937' }}
                    />
                    <Bar dataKey="value" fill="#0F172A" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[300px]">
                  <p className="text-muted-text">No category data available</p>
                </div>
              )}
            </div>
          </div>

          {/* Inventory & Price Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Inventory Status Pie */}
            <div className="bg-white rounded-xl border border-border p-6">
              <h3 className="text-lg font-bold text-text mb-4">Inventory Status Distribution</h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={inventoryData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: ${value}`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {inventoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#f9fafb',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                    }}
                    labelStyle={{ color: '#1f2937' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Top Products by Price */}
            <div className="bg-white rounded-xl border border-border p-6">
              <h3 className="text-lg font-bold text-text mb-4">Top 5 Products by Price</h3>
              {topProducts.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={topProducts} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis type="number" stroke="#9ca3af" style={{ fontSize: '12px' }} />
                    <YAxis dataKey="name" type="category" stroke="#9ca3af" style={{ fontSize: '12px' }} width={120} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#f9fafb',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                      }}
                      labelStyle={{ color: '#1f2937' }}
                      formatter={(value) => formatPrice(value as number)}
                    />
                    <Bar dataKey="price" fill="#16A34A" radius={[0, 8, 8, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[300px]">
                  <p className="text-muted-text">No products available</p>
                </div>
              )}
            </div>
          </div>
          {/* Inventory Metrics */}
        </>
      )}
    </div>
  )
}

export default SellerAnalyticsPage
