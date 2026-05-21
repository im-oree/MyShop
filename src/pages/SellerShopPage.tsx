import { useEffect, useState, useMemo, useCallback } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { Product } from '@/types'
import { formatPrice } from '@/utils'
import { productService } from '@/services/productService'
import ProductForm from '@/components/ProductForm'
import SellerProductCard from '@/components/SellerProductCard'
import Dropdown from '@/components/Dropdown'

const sortOptions = [
  { value: 'newest', label: 'Newest' },
  { value: 'price-asc', label: 'Price ↑' },
  { value: 'price-desc', label: 'Price ↓' },
  { value: 'stock', label: 'Stock' },
]

/* ─── Stat Card ─── */
function StatCard({
  icon,
  label,
  value,
  subtext,
  color = 'primary',
}: {
  icon: React.ReactNode
  label: string
  value: string | number
  subtext?: string
  color?: 'primary' | 'green' | 'amber' | 'blue'
}) {
  const colorMap = {
    primary: 'bg-primary/10 text-primary',
    green:   'bg-green-50 text-green-600',
    amber:   'bg-amber-50 text-amber-600',
    blue:    'bg-blue-50 text-blue-600',
  }

  return (
    <div className="bg-white rounded-2xl border border-border p-3 sm:p-5
                    hover:shadow-sm transition-all duration-200">
      <div className="flex items-center gap-2.5">
        <div className={`w-9 h-9 sm:w-11 sm:h-11 rounded-xl flex items-center
                         justify-center shrink-0 ${colorMap[color]}`}>
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] sm:text-xs text-muted-text leading-tight">{label}</p>
          <p className="text-lg sm:text-2xl font-bold text-text truncate tabular-nums leading-tight mt-0.5">
            {value}
          </p>
          {subtext && (
            <p className="text-[10px] text-muted-text truncate leading-tight">{subtext}</p>
          )}
        </div>
      </div>
    </div>
  )
}

/* ─── Quick Action Button ─── */
function QuickAction({
  icon,
  label,
  sublabel,
  onClick,
  primary = false,
}: {
  icon: React.ReactNode
  label: string
  sublabel?: string
  onClick?: () => void
  primary?: boolean
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-3 px-3.5 py-3 rounded-xl text-left
                  active:scale-[0.98] transition-all duration-200 w-full
                  ${primary
                    ? 'bg-primary text-white hover:bg-primary/90'
                    : 'bg-white border border-border text-text hover:border-gray-300'
                  }`}
    >
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0
        ${primary ? 'bg-white/20' : 'bg-gray-50'}`}>
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className={`text-sm font-semibold truncate
          ${primary ? 'text-white' : 'text-text'}`}>
          {label}
        </p>
        {sublabel && (
          <p className={`text-xs truncate mt-0.5
            ${primary ? 'text-white/70' : 'text-muted-text'}`}>
            {sublabel}
          </p>
        )}
      </div>
      <svg
        className={`w-4 h-4 shrink-0 ${primary ? 'text-white/60' : 'text-gray-300'}`}
        fill="none" stroke="currentColor" viewBox="0 0 24 24"
      >
        <path strokeLinecap="round" strokeLinejoin="round"
              strokeWidth={2} d="M9 5l7 7-7 7" />
      </svg>
    </button>
  )
}

/* ─── Product List Item ─── */
function ProductListItem({
  product,
  onEdit,
}: {
  product: Product
  onEdit: (product: Product) => void
}) {
  const price      = product.salePrice ?? product.price
  const hasDiscount = product.salePrice != null && product.salePrice < product.price

  return (
    <div className="flex items-center gap-3 p-3 bg-white rounded-xl border
                    border-border hover:border-gray-200 transition-all duration-200">
      <div className="w-14 h-14 rounded-xl overflow-hidden bg-gray-100 shrink-0 border border-border/50">
        <img
          src={product.images?.[0] || 'https://placehold.co/200x200?text=Product'}
          alt={product.name}
          className="w-full h-full object-cover"
          loading="lazy"
        />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-text truncate">{product.name}</p>
            <p className="text-xs text-muted-text">{product.category}</p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-sm font-bold text-accent">{formatPrice(price)}</p>
            {hasDiscount && (
              <p className="text-[10px] text-muted-text line-through">{formatPrice(product.price)}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full
            ${product.stock > 10 ? 'bg-green-50 text-green-700'
              : product.stock > 0 ? 'bg-amber-50 text-amber-700'
              : 'bg-red-50 text-red-600'}`}>
            {product.stock > 0 ? `${product.stock} in stock` : 'Out of stock'}
          </span>
          {product.featured && (
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-600">
              Featured
            </span>
          )}
          <button
            onClick={() => onEdit(product)}
            className="ml-auto text-xs font-medium text-secondary hover:underline
                       underline-offset-2 transition-all duration-200"
          >
            Edit
          </button>
        </div>
      </div>
    </div>
  )
}

/* ─── View Toggle ─── */
function ViewToggle({
  view,
  onChange,
}: {
  view: 'grid' | 'list'
  onChange: (v: 'grid' | 'list') => void
}) {
  return (
    <div className="inline-flex rounded-xl border border-border overflow-hidden bg-white">
      {(['grid', 'list'] as const).map((v) => (
        <button
          key={v}
          onClick={() => onChange(v)}
          className={`p-2.5 transition-colors duration-150
            ${view === v ? 'bg-primary text-white' : 'text-gray-400 hover:text-text'}`}
          aria-label={`${v} view`}
        >
          {v === 'grid' ? (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6z
                   M14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6z
                   M4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2z
                   M14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M4 6h16M4 10h16M4 14h16M4 18h16" />
            </svg>
          )}
        </button>
      ))}
    </div>
  )
}

/* ═══════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════ */
function SellerShopPage() {
  const navigate = useNavigate()
  const { user, isAuthenticated, currentRole } = useAuthStore()

  const [products,        setProducts]        = useState<Product[]>([])
  const [loading,         setLoading]         = useState(true)
  const [showProductForm, setShowProductForm] = useState(false)
  const [editingProduct,  setEditingProduct]  = useState<Product | null>(null)
  const [view,            setView]            = useState<'grid' | 'list'>('grid')
  const [searchQuery,     setSearchQuery]     = useState('')
  const [stockFilter,     setStockFilter]     = useState<'all' | 'in-stock' | 'low' | 'out'>('all')
  const [sortBy,          setSortBy]          = useState<'newest' | 'price-asc' | 'price-desc' | 'stock'>('newest')
  const [showSidebar,     setShowSidebar]     = useState(false)
  const [hideOutOfStockOnDashboard, setHideOutOfStockOnDashboard] = useState(true)
  const hideProductListOnDashboard = true
  const [analyticsSeries, setAnalyticsSeries] = useState<Array<{ label: string; amount: number; count?: number }>>([])
  const [topSelling, setTopSelling] = useState<Product[]>([])

  useEffect(() => {
    if (!isAuthenticated || !user || user.role !== 'seller' || currentRole !== 'seller') {
      navigate('/profile')
      return
    }
    const load = async () => {
      setLoading(true)
      try {
        const items = await productService.getMine()
        setProducts(items || [])
      } catch (e) {
        console.error(e)
        setProducts([])
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [isAuthenticated, user, currentRole, navigate])

  // load seller analytics + top selling preview
  useEffect(() => {
    let mounted = true
    void (async () => {
      try {
        const data = await productService.getMineAnalytics('30day')
        if (!mounted) return
        setAnalyticsSeries(data.series || data?.data?.series || [])
        const tops = data.topProducts || data.topSelling || data?.data?.topProducts || []
        if (Array.isArray(tops) && tops.length) setTopSelling(tops)
      } catch (err) {
        // ignore
      }
    })()
    return () => { mounted = false }
  }, [])

  /* ── Stats ── */
  const stats = useMemo(() => {
    const total          = products.length
    const featured       = products.filter(p => p.featured).length
    const outOfStock     = products.filter(p => p.stock === 0).length
    const lowStock       = products.filter(p => p.stock > 0 && p.stock <= 5).length
    const avgPrice       = total > 0 ? products.reduce((s, p) => s + (p.salePrice ?? p.price), 0) / total : 0
    const inventoryValue = products.reduce((s, p) => s + (p.salePrice ?? p.price) * p.stock, 0)
    const totalStock     = products.reduce((s, p) => s + p.stock, 0)
    return { total, featured, outOfStock, lowStock, avgPrice, inventoryValue, totalStock }
  }, [products])

  

  /* ── Filtered & sorted ── */
  const filteredProducts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    return products
      .filter(p => {
        if (q && !p.name.toLowerCase().includes(q) &&
            !p.category.toLowerCase().includes(q) &&
            !p.tags?.some(t => t.toLowerCase().includes(q))) return false
        if (stockFilter === 'in-stock' && p.stock <= 0) return false
        if (stockFilter === 'low'      && (p.stock > 5 || p.stock <= 0)) return false
        if (stockFilter === 'out'      && p.stock > 0) return false
        return true
      })
      .sort((a, b) => {
        const pa = a.salePrice ?? a.price, pb = b.salePrice ?? b.price
        if (sortBy === 'price-asc')  return pa - pb
        if (sortBy === 'price-desc') return pb - pa
        if (sortBy === 'stock')      return a.stock - b.stock
        return 0
      })
  }, [products, searchQuery, stockFilter, sortBy])

  const hasFilters = !!(searchQuery.trim() || stockFilter !== 'all' || sortBy !== 'newest')

  const clearFilters = useCallback(() => {
    setSearchQuery('')
    setStockFilter('all')
    setSortBy('newest')
  }, [])

  const handleProductCreated = useCallback((p: Product) => {
    setProducts(c => [p, ...c])
    setShowProductForm(false)
  }, [])

  const handleEditProduct = useCallback((p: Product) => {
    setEditingProduct(p)
    setShowProductForm(true)
  }, [])

  const dashboardVisibleProducts = useMemo(() => {
    return filteredProducts.filter(p => !(hideOutOfStockOnDashboard && p.stock <= 0))
  }, [filteredProducts, hideOutOfStockOnDashboard])

  const handleDeleteProduct = useCallback(async (p: Product) => {
    if (!confirm(`Delete "${p.name}"? This cannot be undone.`)) return
    try {
      await productService.delete(p.id)
      setProducts(c => c.filter(x => x.id !== p.id))
    } catch {
      alert('Failed to delete product')
    }
  }, [])

  /* ── Access denied ── */
  if (!isAuthenticated || !user || user.role !== 'seller') {
    return (
      <div className="min-h-[70dvh] flex flex-col items-center justify-center px-4">
        <div className="w-16 h-16 rounded-2xl bg-red-50 flex items-center justify-center mb-5">
          <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0
                 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-text mb-2">Access Denied</h1>
        <p className="text-muted-text mb-6 text-sm text-center max-w-xs">
          Only verified sellers can access the shop dashboard.
        </p>
        <button
          onClick={() => navigate('/profile')}
          className="bg-primary text-white px-8 py-3 rounded-xl font-semibold text-sm
                     hover:bg-primary/90 active:scale-[0.98] transition-all duration-200"
        >
          Go to Profile
        </button>
      </div>
    )
  }

  const shopName = user.sellerProfile?.shopName || 'My Shop'

  return (
    <div className="min-h-[80dvh] animate-fade-in pb-24 lg:pb-10">
      <div className="container mx-auto px-3 sm:px-4 max-w-7xl">

        {/* ══════════════════════════════════
            SHOP HEADER
            ══════════════════════════════════ */}
        <div className="relative mb-6">
          {/* Cover banner */}
          <div className="h-24 sm:h-32 rounded-2xl bg-gradient-to-r from-primary
                          via-primary/80 to-secondary overflow-hidden relative">
            <div
              className="absolute inset-0 opacity-10"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23fff' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
              }}
            />
          </div>

          {/* Info row — sits below the banner, NOT overlapping */}
          <div className="flex items-end gap-3 px-2 sm:px-4 mt-3">
            {/* Avatar — raised to overlap banner bottom */}
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-white border-4
                            border-white shadow-md flex items-center justify-center
                            overflow-hidden -mt-10 sm:-mt-12 shrink-0">
              <img
                src={`https://api.dicebear.com/7.x/initials/svg?seed=${shopName}&backgroundColor=e0f2fe&textColor=0369a1&fontSize=36`}
                alt={shopName}
                className="w-full h-full object-cover"
              />
            </div>

            {/* Name + description */}
            <div className="flex-1 min-w-0 pb-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-bold text-text truncate">
                  {shopName}
                </h1>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full
                                 text-[10px] font-semibold bg-green-50 text-green-700 shrink-0">
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0
                         00-1.414-1.414L9 10.586 7.707 9.293a1 1 0
                         00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd" />
                  </svg>
                  Active
                </span>
              </div>
              <p className="text-xs sm:text-sm text-muted-text mt-0.5 truncate">
                {user.sellerProfile?.shopDescription || 'Manage your products and orders'}
              </p>
            </div>

            {/* Header action buttons */}
            <div className="flex items-center gap-1.5 shrink-0 pb-1">
              <Link
                to="/profile"
                className="p-2 rounded-xl border border-border bg-white text-gray-500
                           hover:bg-gray-50 hover:text-text active:scale-95
                           transition-all duration-200"
                aria-label="Profile"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </Link>

              {/* Mobile sidebar toggle */}
              <button
                onClick={() => setShowSidebar(true)}
                className="p-2 rounded-xl border border-border bg-white text-gray-500
                           hover:bg-gray-50 hover:text-text active:scale-95
                           transition-all duration-200 lg:hidden"
                aria-label="Quick actions"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>

              <button
                className="hidden lg:flex p-2 rounded-xl border border-border bg-white text-gray-500
                           hover:bg-gray-50 hover:text-text active:scale-95
                           transition-all duration-200 items-center"
                aria-label="Settings"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573
                       1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066
                       2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066
                       2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573
                       1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724
                       1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724
                       0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* ══════════════════════════════════
            STATS — 2 cols mobile, 4 desktop
            ══════════════════════════════════ */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3 mb-5">
          <StatCard
            icon={
              <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            }
            label="Total Products"
            value={stats.total}
            subtext={`${stats.totalStock} units`}
            color="primary"
          />
          <StatCard
            icon={
              <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3
                     2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11
                     0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
            label="Inventory"
            value={formatPrice(stats.inventoryValue)}
            color="green"
          />
          <StatCard
            icon={<span className="text-base sm:text-lg">⭐</span>}
            label="Featured"
            value={stats.featured}
            subtext={`of ${stats.total}`}
            color="amber"
          />
          <StatCard
            icon={
              <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0
                     002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2
                     2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2
                     2 0 01-2-2z" />
              </svg>
            }
            label="Avg. Price"
            value={formatPrice(Math.round(stats.avgPrice))}
            color="blue"
          />
        </div>

        {/* ══════════════════════════════════
            STOCK ALERTS (with quick navigation)
            ══════════════════════════════════ */}
        {(stats.outOfStock > 0 || stats.lowStock > 0) && (
          <div className="flex flex-col sm:flex-row gap-2.5 mb-5">
            {stats.outOfStock > 0 && (
              <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl border
                              border-red-200 bg-red-50 flex-1">
                <div className="w-7 h-7 rounded-lg bg-red-100 flex items-center justify-center shrink-0">
                  <svg className="w-3.5 h-3.5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732
                         4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-red-800">{stats.outOfStock} product(s) out of stock</p>
                  <p className="text-xs text-red-600">Restock soon to avoid lost sales</p>
                  <div className="mt-2 flex items-center gap-2">
                    <button onClick={() => navigate('/seller/products?stock=out')}
                      className="text-sm rounded-lg px-3 py-1 bg-white border border-border text-text hover:bg-gray-50">View out-of-stock</button>
                    <button onClick={() => setHideOutOfStockOnDashboard(false)} className="text-sm rounded-lg px-3 py-1 bg-primary text-white">Show on dashboard</button>
                  </div>
                </div>
              </div>
            )}
            {stats.lowStock > 0 && (
              <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl border
                              border-amber-200 bg-amber-50 flex-1">
                <div className="w-7 h-7 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
                  <svg className="w-3.5 h-3.5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-amber-800">{stats.lowStock} product(s) running low</p>
                  <p className="text-xs text-amber-600">Below 5 units</p>
                  <div className="mt-2 flex items-center gap-2">
                    <button onClick={() => navigate('/seller/products?stock=low')}
                      className="text-sm rounded-lg px-3 py-1 bg-white border border-border text-text hover:bg-gray-50">View low-stock</button>
                    <button onClick={() => setHideOutOfStockOnDashboard(false)} className="text-sm rounded-lg px-3 py-1 bg-primary text-white">Show low stock</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Seller analytics (compact) ── */}
        {analyticsSeries.length > 0 && (
          <div className="mb-4 rounded-2xl border border-border bg-white p-4">
              <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-text">Sales (30d)</h3>
                <p className="text-xs text-muted-text">Recent orders and revenue</p>
              </div>
              <div className="text-sm font-medium text-text">{formatPrice(analyticsSeries.reduce((s, a) => s + a.amount, 0))}</div>
            </div>
            <div className="mt-3 flex items-end gap-2 h-16">
              {analyticsSeries.map((pt) => (
                <div key={pt.label} className="flex-1 flex flex-col items-center">
                  <div className="w-full rounded-t-xl bg-secondary/80" style={{ height: `${Math.max((pt.amount / (Math.max(...analyticsSeries.map(x => x.amount), 1))) * 100, 4)}%` }} />
                  <div className="text-[10px] text-muted-text mt-1">{pt.label}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Compact top-selling preview ── */}
        {topSelling.length > 0 && (
          <div className="mb-4 rounded-2xl border border-border bg-white p-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-text">Top products</h3>
              <button onClick={() => navigate('/seller/products')} className="text-sm text-secondary hover:underline">Manage</button>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-3">
              {topSelling.slice(0,6).map(p => {
                const resolved: any = products.find(x => x.id === p.id) || p || {}
                const img = resolved.images?.[0]
                const name = resolved.name || p.name || 'Untitled'
                const stock = typeof resolved.stock === 'number' ? resolved.stock : (p.stock ?? 0)
                return (
                  <div key={p.id} className="text-center text-xs">
                    <div className="w-16 h-16 rounded-md bg-gray-50 overflow-hidden mx-auto">
                      {img ? <img src={img} alt={name} className="w-full h-full object-cover" /> : <div className="text-muted-text py-6">No image</div>}
                    </div>
                    <div className="mt-1 truncate w-16 mx-auto">{name}</div>
                    <div className="text-[11px] text-muted-text">{stock <= 0 ? 'Out' : `${stock}`}</div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ══════════════════════════════════
            MAIN LAYOUT  sidebar + products
            ══════════════════════════════════ */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">

          {/* ── Desktop Sidebar ── */}
          <aside className="hidden lg:block lg:col-span-1 space-y-3">
            <SidebarContent
              onAddProduct={() => setShowProductForm(true)}
              onViewOrders={() => navigate('/seller/orders')}
            />
          </aside>

          {/* ── Mobile Sidebar Drawer ── */}
          {showSidebar && (
            <div className="fixed inset-0 z-50 lg:hidden">
              {/* Backdrop */}
              <div
                className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                onClick={() => setShowSidebar(false)}
              />
              {/* Drawer */}
              <div className="absolute right-0 top-0 bottom-0 w-72 bg-gray-50
                              shadow-2xl overflow-y-auto animate-slide-left">
                <div className="flex items-center justify-between p-4 border-b border-border bg-white">
                  <h3 className="font-bold text-text">Quick Actions</h3>
                  <button
                    onClick={() => setShowSidebar(false)}
                    className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500
                               transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round"
                            strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <div className="p-4 space-y-3">
                  <SidebarContent
                    onAddProduct={() => { setShowProductForm(true); setShowSidebar(false) }}
                    onViewOrders={() => { navigate('/seller/orders'); setShowSidebar(false) }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* ── Products Panel ── */}
          <div className="lg:col-span-3">

            {/* Products header row */}
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-text">Your Products</h2>
                <p className="text-xs text-muted-text mt-0.5">
                  {dashboardVisibleProducts.length} of {stats.total} product{stats.total !== 1 ? 's' : ''}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <label className="inline-flex items-center text-xs text-muted-text gap-2">
                  <input type="checkbox" checked={hideOutOfStockOnDashboard} onChange={(e) => setHideOutOfStockOnDashboard(e.target.checked)} className="w-4 h-4" />
                  Hide out-of-stock
                </label>
                <ViewToggle view={view} onChange={setView} />
              </div>
            </div>

            {/* ── Search bar ── */}
            <div className="relative mb-3">
              <svg
                className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4
                           text-gray-400 pointer-events-none"
                fill="none" stroke="currentColor" viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="search"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search products…"
                className="w-full rounded-xl border border-border bg-white pl-10 pr-10
                           py-2.5 text-sm text-text placeholder:text-gray-400
                           outline-none focus:border-primary focus:ring-2 focus:ring-primary/20
                           transition-all duration-200"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded
                             text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round"
                          strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>

            {/* ── Stock filters + sort (scrollable row on mobile) ── */}
            <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-1 hide-scrollbar">
              {(
                [
                  { key: 'all',      label: 'All' },
                  { key: 'in-stock', label: 'In Stock' },
                  { key: 'low',      label: 'Low Stock' },
                  { key: 'out',      label: 'Out of Stock' },
                ] as const
              ).map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setStockFilter(key)}
                  className={`shrink-0 px-3 py-1.5 rounded-xl text-xs font-medium
                              border transition-all duration-200 flex items-center gap-1.5
                    ${stockFilter === key
                      ? 'bg-primary text-white border-primary'
                      : 'bg-white border-border text-text hover:border-gray-300'
                    }`}
                >
                  {label}
                  {key === 'out' && stats.outOfStock > 0 && (
                    <span className="inline-flex items-center justify-center w-4 h-4 rounded-full
                                     bg-red-500 text-white text-[9px] font-bold">
                      {stats.outOfStock}
                    </span>
                  )}
                </button>
              ))}

              {/* Divider */}
              <span className="shrink-0 w-px h-5 bg-border mx-1" />

              {/* Sort select */}
              <div className="relative shrink-0">
                <Dropdown
                  options={sortOptions}
                  value={sortBy}
                  onChange={(value) => setSortBy(value as typeof sortBy)}
                  className="shrink-0 min-w-[140px]"
                  buttonClassName="px-3 pr-7 py-1.5 text-xs font-medium"
                />
              </div>
            </div>

            {/* Active filters */}
            {hasFilters && (
              <div className="flex items-center gap-2 mb-3 flex-wrap animate-fade-in">
                <span className="text-xs text-muted-text">Filters:</span>
                {searchQuery && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg
                                   bg-primary/5 text-primary text-xs font-medium">
                    "{searchQuery}"
                    <button onClick={() => setSearchQuery('')}
                            className="hover:text-primary/70 leading-none">×</button>
                  </span>
                )}
                {stockFilter !== 'all' && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg
                                   bg-primary/5 text-primary text-xs font-medium">
                    {stockFilter}
                    <button onClick={() => setStockFilter('all')}
                            className="hover:text-primary/70 leading-none">×</button>
                  </span>
                )}
                <button onClick={clearFilters}
                        className="text-xs text-secondary font-medium hover:underline
                                   underline-offset-2 ml-auto">
                  Clear all
                </button>
              </div>
            )}

            {/* Dashboard product list hidden? show CTA if true */}
            {hideProductListOnDashboard ? (
          <div className="rounded-2xl border border-border bg-white p-6 mb-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-text">Manage products</h3>
                <p className="text-sm text-muted-text">Products are managed on your products page — open the manager to edit, filter, and bulk update listings.</p>
              </div>
              <div className="flex gap-3">
                <Link to="/seller/products" className="px-4 py-2 rounded-xl bg-primary text-white text-sm">Manage products</Link>
                <button onClick={() => setShowProductForm(true)} className="px-4 py-2 rounded-xl border border-border text-sm">Add product</button>
              </div>
            </div>
          </div>
          ) : (
          /* ── Loading Skeleton ── */
          loading ? (
              view === 'grid' ? (
                <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 gap-2.5 sm:gap-4">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="rounded-2xl overflow-hidden border border-border">
                      <div className="skeleton aspect-[4/3]" />
                      <div className="p-3 space-y-2">
                        <div className="skeleton h-3 w-12 rounded" />
                        <div className="skeleton h-4 w-full rounded" />
                        <div className="skeleton h-5 w-16 rounded" />
                        <div className="flex gap-2 pt-1">
                          <div className="skeleton h-8 flex-1 rounded-xl" />
                          <div className="skeleton h-8 flex-1 rounded-xl" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                ) : (
                <div className="space-y-2.5">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 rounded-xl border border-border">
                      <div className="skeleton w-14 h-14 rounded-xl shrink-0" />
                      <div className="flex-1 space-y-2">
                        <div className="skeleton h-4 w-36 rounded" />
                        <div className="skeleton h-3 w-24 rounded" />
                      </div>
                      <div className="skeleton h-5 w-14 rounded" />
                    </div>
                  ))}
                </div>
              ) : filteredProducts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 sm:py-20
                              rounded-2xl border border-dashed border-border bg-white
                              text-center px-4 animate-fade-in">
                <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center
                                justify-center mb-4">
                  {hasFilters ? (
                    <svg className="w-7 h-7 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  ) : (
                    <svg className="w-7 h-7 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                        d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                  )}
                </div>
                <h3 className="text-base font-bold text-text mb-1">
                  {hasFilters ? 'No products match' : 'No Products Yet'}
                </h3>
                <p className="text-sm text-muted-text max-w-xs mb-5">
                  {hasFilters
                    ? 'Try adjusting your search or filters.'
                    : 'Start selling by adding your first product.'}
                </p>
                {hasFilters ? (
                  <button
                    onClick={clearFilters}
                    className="px-5 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold
                               hover:bg-primary/90 active:scale-[0.98] transition-all duration-200"
                  >
                    Clear Filters
                  </button>
                ) : (
                  <button
                    onClick={() => setShowProductForm(true)}
                    className="px-5 py-2.5 rounded-xl bg-primary text-white font-semibold text-sm
                               hover:bg-primary/90 active:scale-[0.98] transition-all duration-200
                               flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round"
                            strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    Add First Product
                  </button>
                )}
              </div>
            ) : (
              <>
                {view === 'grid' ? (
                  <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3
                                  gap-2.5 sm:gap-4">
                    {dashboardVisibleProducts.map(product => (
                      <SellerProductCard
                        key={product.id}
                        product={product}
                        onEdit={handleEditProduct}
                        onDelete={handleDeleteProduct}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {dashboardVisibleProducts.map(product => (
                      <ProductListItem
                        key={product.id}
                        product={product}
                        onEdit={handleEditProduct}
                      />
                    ))}
                  </div>
                )}
                <p className="text-center text-xs text-muted-text mt-5">
                  Showing {dashboardVisibleProducts.length} of {stats.total} products
                </p>
              </>
          )}
      </div>
    </div>
  </div>

      {/* ── Product Form Modal ── */}
      <ProductForm
        open={showProductForm}
        onClose={() => { setShowProductForm(false); setEditingProduct(null) }}
        onCreated={handleProductCreated}
        product={editingProduct}
        onUpdated={updated => {
          setProducts(c => c.map(p => p.id === updated.id ? updated : p))
          setShowProductForm(false)
          setEditingProduct(null)
        }}
      />

      {/* ── Mobile FAB ── */}
      <button
        onClick={() => setShowProductForm(true)}
        className="fixed bottom-6 right-4 z-40 flex items-center gap-2
                   px-4 py-3 rounded-2xl bg-primary text-white font-semibold text-sm
                   shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40
                   hover:scale-105 active:scale-95 transition-all duration-200
                   lg:hidden"
        aria-label="Add new product"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round"
                strokeWidth={2.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
        </svg>
        Add Product
      </button>
    </div>
  )
}

/* ══════════════════════════════════════
   SIDEBAR CONTENT  (shared desktop + drawer)
   ══════════════════════════════════════ */
function SidebarContent({
  onAddProduct,
  onViewOrders,
}: {
  onAddProduct: () => void
  onViewOrders: () => void
}) {
  return (
    <>
      <h3 className="text-xs font-bold text-muted-text uppercase tracking-wider px-1 mb-2">
        Quick Actions
      </h3>

      <QuickAction
        primary
        icon={
          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round"
                  strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
        }
        label="Add New Product"
        sublabel="List a new item for sale"
        onClick={onAddProduct}
      />

      <QuickAction
        icon={
          <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9
                 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
          </svg>
        }
        label="View Orders"
        sublabel="Manage incoming orders"
        onClick={onViewOrders}
      />

      <QuickAction
        icon={
          <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0
                 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2
                 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        }
        label="Analytics"
        sublabel="Sales & performance"
      />

      <QuickAction
        icon={
          <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0
                 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
          </svg>
        }
        label="Messages"
        sublabel="Customer inquiries"
      />

      {/* Shop Health */}
      <div className="bg-white rounded-2xl border border-border p-4 mt-2">
        <h4 className="text-sm font-bold text-text mb-3">Shop Health</h4>
        <div className="space-y-3">
          {[
            { label: 'Listing Quality',    value: 85, color: 'bg-green-500' },
            { label: 'Response Rate',      value: 92, color: 'bg-blue-500'  },
            { label: 'Order Fulfillment',  value: 78, color: 'bg-amber-500' },
          ].map(({ label, value, color }) => (
            <div key={label}>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-muted-text">{label}</span>
                <span className="font-semibold text-text">{value}%</span>
              </div>
              <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
                <div
                  className={`h-full rounded-full ${color} transition-all duration-700`}
                  style={{ width: `${value}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}

export default SellerShopPage