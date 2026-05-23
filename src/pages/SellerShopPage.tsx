import { useEffect, useState, useMemo, useCallback } from 'react'
import { useNavigate, Link, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { Product } from '@/types'
import { formatPrice } from '@/utils'
import { productService } from '@/services/productService'
import ProductForm from '@/components/ProductForm'
import SellerProductCard from '@/components/SellerProductCard'
import Dropdown from '@/components/Dropdown'

/* ─────────────────────────────────────────────
   CONSTANTS
───────────────────────────────────────────── */
const sortOptions = [
  { value: 'newest',     label: 'Newest'  },
  { value: 'price-asc',  label: 'Price ↑' },
  { value: 'price-desc', label: 'Price ↓' },
  { value: 'stock',      label: 'Stock'   },
]

const stockFilterOptions = [
  { key: 'all',      label: 'All'          },
  { key: 'in-stock', label: 'In Stock'     },
  { key: 'low',      label: 'Low Stock'    },
  { key: 'out',      label: 'Out of Stock' },
] as const

type StockFilter = typeof stockFilterOptions[number]['key']
type SortBy      = 'newest' | 'price-asc' | 'price-desc' | 'stock'

/* ─────────────────────────────────────────────
   STAT CARD
───────────────────────────────────────────── */
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
    <div className="bg-white rounded-2xl border border-border p-3 sm:p-4 hover:shadow-sm transition-all">
      <div className="flex items-center gap-2.5">
        <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center shrink-0 ${colorMap[color]}`}>
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] sm:text-xs text-muted-text leading-tight">{label}</p>
          <p className="text-base sm:text-xl font-bold text-text truncate tabular-nums leading-tight mt-0.5">
            {value}
          </p>
          {subtext && <p className="text-[10px] text-muted-text truncate">{subtext}</p>}
        </div>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────
   QUICK ACTION
───────────────────────────────────────────── */
function QuickAction({
  icon,
  label,
  sublabel,
  onClick,
  primary = false,
  to,
}: {
  icon: React.ReactNode
  label: string
  sublabel?: string
  onClick?: () => void
  primary?: boolean
  to?: string
}) {
  const cls = `flex items-center gap-3 px-3.5 py-3 rounded-xl text-left
    active:scale-[0.98] transition-all w-full
    ${primary
      ? 'bg-primary text-white hover:bg-primary/90'
      : 'bg-white border border-border text-text hover:border-gray-300'
    }`

  const content = (
    <>
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0
        ${primary ? 'bg-white/20' : 'bg-gray-50'}`}>
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className={`text-sm font-semibold truncate ${primary ? 'text-white' : 'text-text'}`}>
          {label}
        </p>
        {sublabel && (
          <p className={`text-xs truncate mt-0.5 ${primary ? 'text-white/70' : 'text-muted-text'}`}>
            {sublabel}
          </p>
        )}
      </div>
      <svg className={`w-4 h-4 shrink-0 ${primary ? 'text-white/60' : 'text-gray-300'}`}
           fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
      </svg>
    </>
  )

  if (to) return <Link to={to} className={cls}>{content}</Link>
  return <button onClick={onClick} className={cls}>{content}</button>
}

/* ─────────────────────────────────────────────
   PRODUCT LIST ITEM
───────────────────────────────────────────── */
function ProductListItem({
  product,
  onEdit,
  onDelete,
}: {
  product: Product
  onEdit: (p: Product) => void
  onDelete: (p: Product) => void
}) {
  const price       = product.salePrice ?? product.price
  const hasDiscount = product.salePrice != null && product.salePrice < product.price

  return (
    <div className="flex items-center gap-3 p-3 bg-white rounded-xl border border-border hover:border-gray-200 transition-all">
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
            <p className="text-sm font-bold text-text">{formatPrice(price)}</p>
            {hasDiscount && (
              <p className="text-[10px] text-muted-text line-through">{formatPrice(product.price)}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full
            ${product.stock > 10
              ? 'bg-green-50 text-green-700'
              : product.stock > 0
              ? 'bg-amber-50 text-amber-700'
              : 'bg-red-50 text-red-600'}`}>
            {product.stock > 0 ? `${product.stock} in stock` : 'Out of stock'}
          </span>
          {product.featured && (
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-600">
              Featured
            </span>
          )}
          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={() => onEdit(product)}
              className="text-xs font-medium text-primary hover:underline underline-offset-2"
            >
              Edit
            </button>
            <span className="text-gray-200">|</span>
            <button
              onClick={() => onDelete(product)}
              className="text-xs font-medium text-danger hover:underline underline-offset-2"
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────
   VIEW TOGGLE
───────────────────────────────────────────── */
function ViewToggle({ view, onChange }: { view: 'grid' | 'list'; onChange: (v: 'grid' | 'list') => void }) {
  return (
    <div className="inline-flex rounded-xl border border-border overflow-hidden bg-white">
      {(['grid', 'list'] as const).map((v) => (
        <button
          key={v}
          onClick={() => onChange(v)}
          className={`p-2.5 transition-colors ${view === v ? 'bg-primary text-white' : 'text-gray-400 hover:text-text'}`}
          aria-label={`${v} view`}
        >
          {v === 'grid' ? (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <rect x="3" y="3" width="7" height="7" rx="1.5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <rect x="14" y="3" width="7" height="7" rx="1.5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <rect x="3" y="14" width="7" height="7" rx="1.5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <rect x="14" y="14" width="7" height="7" rx="1.5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
            </svg>
          )}
        </button>
      ))}
    </div>
  )
}

/* ─────────────────────────────────────────────
   LOADING SKELETON
───────────────────────────────────────────── */
function ProductsSkeleton({ view }: { view: 'grid' | 'list' }) {
  if (view === 'grid') {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 gap-2.5 sm:gap-4">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="rounded-2xl overflow-hidden border border-border animate-pulse">
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
    )
  }
  return (
    <div className="space-y-2.5">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-3 rounded-xl border border-border animate-pulse">
          <div className="skeleton w-14 h-14 rounded-xl shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="skeleton h-4 w-36 rounded" />
            <div className="skeleton h-3 w-24 rounded" />
          </div>
          <div className="skeleton h-5 w-14 rounded" />
        </div>
      ))}
    </div>
  )
}

/* ─────────────────────────────────────────────
   EMPTY STATE
───────────────────────────────────────────── */
function ProductsEmpty({
  hasFilters,
  onClearFilters,
  onAdd,
}: {
  hasFilters: boolean
  onClearFilters: () => void
  onAdd: () => void
}) {
  return (
    <div className="flex flex-col items-center justify-center py-14 rounded-2xl border border-dashed border-border bg-white text-center px-4 animate-fade-in">
      <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
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
        {hasFilters ? 'No products match' : 'No products yet'}
      </h3>
      <p className="text-sm text-muted-text max-w-xs mb-5">
        {hasFilters
          ? 'Try adjusting your search or filters.'
          : 'Start selling by adding your first product.'}
      </p>
      {hasFilters ? (
        <button
          onClick={onClearFilters}
          className="px-5 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary/90 active:scale-[0.98] transition-all"
        >
          Clear Filters
        </button>
      ) : (
        <button
          onClick={onAdd}
          className="px-5 py-2.5 rounded-xl bg-primary text-white font-semibold text-sm hover:bg-primary/90 active:scale-[0.98] transition-all flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Add First Product
        </button>
      )}
    </div>
  )
}

/* ─────────────────────────────────────────────
   SIDEBAR CONTENT
───────────────────────────────────────────── */
function SidebarContent({
  onAddProduct,
  onViewOrders,
}: {
  onAddProduct: () => void
  onViewOrders: () => void
}) {
  return (
    <div className="space-y-2">
      <p className="text-[10px] font-bold text-muted-text uppercase tracking-wider px-1 mb-3">
        Quick Actions
      </p>

      <QuickAction
        icon={
          <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M3 7h18M3 12h18M3 17h18" />
          </svg>
        }
        label="Dashboard"
        sublabel="Overview and store summary"
        to="/admin/store"
      />

      <QuickAction
        primary
        icon={
          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
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
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
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
              d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
          </svg>
        }
        label="All Products"
        sublabel="Full product manager"
        to="/admin/store/products"
      />

      <QuickAction
        icon={
          <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0
                 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2
                 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2
                 2 0 01-2-2z" />
          </svg>
        }
        label="Analytics"
        sublabel="Sales & performance"
        to="/admin/store/analytics"
      />

      <QuickAction
        icon={
          <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7
                 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0
                 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        }
        label="Team & Access"
        sublabel="Manage permissions"
        to="/admin/store/access"
      />

      <QuickAction
        icon={
          <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863
                 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3
                 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        }
        label="Messages"
        sublabel="Customer inquiries"
        to="/admin/store/messages"
      />
    </div>
  )
}

/* ═════════════════════════════════════════════
   MAIN PAGE
═════════════════════════════════════════════ */
function SellerShopPage() {
  const { isAuthenticated, user } = useAuthStore()
  const navigate = useNavigate()
  const location = useLocation()

  const [products,        setProducts]        = useState<Product[]>([])
  const [loading,         setLoading]         = useState(true)
  const [showProductForm, setShowProductForm] = useState(false)
  const [editingProduct,  setEditingProduct]  = useState<Product | null>(null)
  const [view,            setView]            = useState<'grid' | 'list'>('grid')
  const [searchQuery,     setSearchQuery]     = useState('')
  const [stockFilter,     setStockFilter]     = useState<StockFilter>('all')
  const [sortBy,          setSortBy]          = useState<SortBy>('newest')
  const [showSidebar,     setShowSidebar]     = useState(false)
  const [topSelling,      setTopSelling]      = useState<Product[]>([])
  const [analyticsSeries] = useState<{ label: string; amount: number }[]>([])

  /* ── Auth guard ── */
  useEffect(() => {
    if (!isAuthenticated || !user || (user.role !== 'admin' && user.role !== 'manager')) {
      navigate('/profile')
    }
  }, [isAuthenticated, user, navigate])

  /* ── Load products ── */
  useEffect(() => {
    let mounted = true
    setLoading(true)
    productService.getAll()
      .then((result) => {
        if (mounted) {
          const items = Array.isArray(result)
            ? result
            : Array.isArray((result as { items?: Product[] }).items)
            ? (result as { items: Product[] }).items
            : Array.isArray((result as { products?: Product[] }).products)
            ? (result as { products: Product[] }).products
            : []

          setProducts(items)
          setTopSelling(items.slice(0, 6))
        }
      })
      .catch(() => {/* silent */})
      .finally(() => { if (mounted) setLoading(false) })
    return () => { mounted = false }
  }, [])

  /* ── Stats ── */
  const stats = useMemo(() => {
    const total          = products.length
    const featured       = products.filter(p => p.featured).length
    const outOfStock     = products.filter(p => p.stock <= 0).length
    const lowStock       = products.filter(p => p.stock > 0 && p.stock <= 5).length
    const avgPrice       = total > 0 ? products.reduce((s, p) => s + (p.salePrice ?? p.price), 0) / total : 0
    const inventoryValue = products.reduce((s, p) => s + (p.salePrice ?? p.price) * p.stock, 0)
    const totalStock     = products.reduce((s, p) => s + p.stock, 0)
    return { total, featured, outOfStock, lowStock, avgPrice, inventoryValue, totalStock }
  }, [products])

  /* ── Filtered + sorted ── */
  const filteredProducts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    return products
      .filter(p => {
        if (q) {
          const inName     = p.name.toLowerCase().includes(q)
          const inCategory = p.category?.toLowerCase().includes(q)
          const inTags     = p.tags?.some(t => t.toLowerCase().includes(q))
          if (!inName && !inCategory && !inTags) return false
        }
        if (stockFilter === 'in-stock' && p.stock <= 0)                  return false
        if (stockFilter === 'low'      && (p.stock > 5 || p.stock <= 0)) return false
        if (stockFilter === 'out'      && p.stock > 0)                   return false
        return true
      })
      .sort((a, b) => {
        const pa = a.salePrice ?? a.price
        const pb = b.salePrice ?? b.price
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
    setProducts(prev => [p, ...prev])
    setShowProductForm(false)
  }, [])

  const handleEditProduct = useCallback((p: Product) => {
    setEditingProduct(p)
    setShowProductForm(true)
  }, [])

  const handleProductUpdated = useCallback((updated: Product) => {
    setProducts(prev => prev.map(p => p.id === updated.id ? updated : p))
    setShowProductForm(false)
    setEditingProduct(null)
  }, [])

  const handleDeleteProduct = useCallback(async (p: Product) => {
    if (!confirm(`Delete "${p.name}"? This cannot be undone.`)) return
    try {
      await productService.delete(p.id)
      setProducts(prev => prev.filter(x => x.id !== p.id))
    } catch {
      alert('Failed to delete product. Please try again.')
    }
  }, [])

  const closeSidebar = useCallback(() => setShowSidebar(false), [])
  const openForm     = useCallback(() => setShowProductForm(true), [])
  const closeForm    = useCallback(() => {
    setShowProductForm(false)
    setEditingProduct(null)
  }, [])

  const analyticsMax = useMemo(
    () => Math.max(...analyticsSeries.map(x => x.amount), 1),
    [analyticsSeries]
  )
  const analyticsTotal = useMemo(
    () => analyticsSeries.reduce((s, a) => s + a.amount, 0),
    [analyticsSeries]
  )

  /* ── Access denied ── */
  if (!isAuthenticated || !user || (user.role !== 'admin' && user.role !== 'manager')) {
    return (
      <div className="min-h-[70dvh] flex flex-col items-center justify-center px-4">
        <div className="w-16 h-16 rounded-2xl bg-red-50 flex items-center justify-center mb-5">
          <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-text mb-2">Access Denied</h1>
        <p className="text-sm text-muted-text text-center max-w-xs mb-6">
          Only store managers can access the store dashboard.
        </p>
        <button
          onClick={() => navigate('/profile')}
          className="bg-primary text-white px-8 py-3 rounded-xl font-semibold text-sm hover:bg-primary/90 active:scale-[0.98] transition-all"
        >
          Go to Profile
        </button>
      </div>
    )
  }

  const shopName = user.sellerProfile?.shopName || user.name || 'My Shop'

  return (
    <div className="min-h-[80dvh] animate-fade-in pb-24 lg:pb-10">
      <div className="container mx-auto px-3 sm:px-4 max-w-7xl">

        {/* ── Shop Header ── */}
        <div className="relative mb-6">
          <div className="h-24 sm:h-32 rounded-2xl bg-gradient-to-r from-primary via-primary/80 to-secondary overflow-hidden relative">
            <div
              className="absolute inset-0 opacity-10"
              style={{
                backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`,
                backgroundSize: '24px 24px',
              }}
            />
          </div>

          <div className="flex items-end gap-3 px-2 sm:px-4 mt-3">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-white border-4 border-white shadow-md flex items-center justify-center overflow-hidden -mt-10 sm:-mt-12 shrink-0">
              <img
                src={`https://api.dicebear.com/7.x/initials/svg?seed=${shopName}&backgroundColor=e0f2fe&textColor=0369a1&fontSize=36`}
                alt={shopName}
                className="w-full h-full object-cover"
              />
            </div>

            <div className="flex-1 min-w-0 pb-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-bold text-text truncate">{shopName}</h1>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-green-50 text-green-700 shrink-0">
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd" />
                  </svg>
                  Active
                </span>
              </div>
              <p className="text-xs sm:text-sm text-muted-text mt-0.5 truncate">
                {user.sellerProfile?.shopDescription || 'Manage your products and orders'}
              </p>
            </div>

            <div className="flex items-center gap-1.5 shrink-0 pb-1">
              <Link
                to="/profile"
                className="p-2 rounded-xl border border-border bg-white text-gray-500 hover:bg-gray-50 hover:text-text active:scale-95 transition-all"
                aria-label="Profile"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </Link>

              <button
                onClick={() => setShowSidebar(true)}
                className="lg:hidden p-2 rounded-xl border border-border bg-white text-gray-500 hover:bg-gray-50 hover:text-text active:scale-95 transition-all"
                aria-label="Quick actions"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* ── Nav pills ── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 mb-5">
          {[
            { to: '/admin/store',            label: 'Dashboard' },
            { to: '/admin/store/products',   label: 'Products'  },
            { to: '/admin/store/orders',     label: 'Orders'    },
            { to: '/admin/store/analytics',  label: 'Analytics' },
            { to: '/admin/store/access',     label: 'Access'    },
          ].map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={`rounded-2xl border px-4 py-3 text-sm font-semibold transition-all text-center ${
                location.pathname === item.to
                  ? 'border-primary bg-primary text-white shadow-sm'
                  : 'border-border bg-white text-text hover:border-gray-300'
              }`}
            >
              {item.label}
            </Link>
          ))}
        </div>

        {/* ── Stats ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 mb-5">
          <StatCard
            icon={
              <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            }
            label="Total Products"
            value={stats.total}
            subtext={`${stats.totalStock} units in stock`}
            color="primary"
          />
          <StatCard
            icon={
              <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
            label="Inventory Value"
            value={formatPrice(stats.inventoryValue)}
            color="green"
          />
          <StatCard
            icon={<span className="text-base">⭐</span>}
            label="Featured"
            value={stats.featured}
            subtext={`of ${stats.total} products`}
            color="amber"
          />
          <StatCard
            icon={
              <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            }
            label="Avg. Price"
            value={formatPrice(Math.round(stats.avgPrice))}
            color="blue"
          />
        </div>

        {/* ── Stock alerts ── */}
        {(stats.outOfStock > 0 || stats.lowStock > 0) && (
          <div className="flex flex-col sm:flex-row gap-2.5 mb-5">
            {stats.outOfStock > 0 && (
              <div className="flex items-start gap-3 px-4 py-3 rounded-xl border border-red-200 bg-red-50 flex-1">
                <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center shrink-0 mt-0.5">
                  <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-red-800">
                    {stats.outOfStock} item{stats.outOfStock > 1 ? 's' : ''} out of stock
                  </p>
                  <p className="text-xs text-red-600 mt-0.5">Restock soon to avoid lost sales</p>
                  <button
                    onClick={() => setStockFilter('out')}
                    className="mt-2.5 text-xs rounded-lg px-3 py-1.5 bg-white border border-red-200 text-red-700 font-medium hover:bg-red-50 transition-colors"
                  >
                    View out-of-stock
                  </button>
                </div>
              </div>
            )}
            {stats.lowStock > 0 && (
              <div className="flex items-start gap-3 px-4 py-3 rounded-xl border border-amber-200 bg-amber-50 flex-1">
                <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center shrink-0 mt-0.5">
                  <svg className="w-4 h-4 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-amber-800">
                    {stats.lowStock} item{stats.lowStock > 1 ? 's' : ''} running low
                  </p>
                  <p className="text-xs text-amber-600 mt-0.5">5 units or fewer remaining</p>
                  <button
                    onClick={() => setStockFilter('low')}
                    className="mt-2.5 text-xs rounded-lg px-3 py-1.5 bg-white border border-amber-200 text-amber-700 font-medium hover:bg-amber-50 transition-colors"
                  >
                    View low stock
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Analytics chart ── */}
        {analyticsSeries.length > 0 && (
          <div className="mb-5 rounded-2xl border border-border bg-white p-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-text">Sales (last 30 days)</h3>
                <p className="text-xs text-muted-text mt-0.5">Revenue from completed orders</p>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-text tabular-nums">{formatPrice(analyticsTotal)}</p>
                <p className="text-[10px] text-muted-text">total revenue</p>
              </div>
            </div>
            <div className="flex items-end gap-1 h-16">
              {analyticsSeries.map((pt) => {
                const pct = Math.max((pt.amount / analyticsMax) * 100, 4)
                return (
                  <div key={pt.label} className="flex-1 flex flex-col items-center gap-1">
                    <div
                      className="w-full rounded-t-md bg-primary/70 hover:bg-primary transition-colors"
                      style={{ height: `${pct}%` }}
                      title={`${pt.label}: ${formatPrice(pt.amount)}`}
                    />
                    <span className="text-[8px] text-muted-text">{pt.label}</span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ── Top selling ── */}
        {topSelling.length > 0 && (
          <div className="mb-5 rounded-2xl border border-border bg-white p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-text">Top Products</h3>
              <Link to="/admin/store/products" className="text-xs font-medium text-primary hover:underline underline-offset-2">
                Manage all →
              </Link>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-1 hide-scrollbar">
              {topSelling.slice(0, 6).map(p => {
                const resolved = products.find(x => x.id === p.id) || p
                const img   = (resolved as any).images?.[0]
                const name  = resolved.name || 'Untitled'
                const stock = typeof resolved.stock === 'number' ? resolved.stock : 0
                return (
                  <div key={p.id} className="shrink-0 w-16 text-center">
                    <div className="w-16 h-16 rounded-xl bg-gray-50 overflow-hidden border border-border">
                      {img ? (
                        <img src={img} alt={name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-300 text-xs">No img</div>
                      )}
                    </div>
                    <p className="text-[10px] text-text font-medium mt-1 truncate w-16">{name}</p>
                    <p className={`text-[10px] ${stock <= 0 ? 'text-red-500' : 'text-muted-text'}`}>
                      {stock <= 0 ? 'Out' : `${stock} left`}
                    </p>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ── Main layout ── */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">

          {/* Desktop sidebar */}
          <aside className="hidden lg:block lg:col-span-1">
            <SidebarContent
              onAddProduct={openForm}
              onViewOrders={() => navigate('/admin/store/orders')}
            />
          </aside>

          {/* Mobile sidebar drawer */}
          {showSidebar && (
            <div className="fixed inset-0 z-50 lg:hidden">
              <div
                className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                onClick={closeSidebar}
              />
              <div className="absolute right-0 top-0 bottom-0 w-72 bg-gray-50 shadow-2xl overflow-y-auto animate-slide-left">
                <div className="flex items-center justify-between p-4 border-b border-border bg-white">
                  <h3 className="font-bold text-text">Quick Actions</h3>
                  <button
                    onClick={closeSidebar}
                    className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <div className="p-4">
                  <SidebarContent
                    onAddProduct={() => { openForm(); closeSidebar() }}
                    onViewOrders={() => { navigate('/admin/store/orders'); closeSidebar() }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Products panel */}
          <div className="lg:col-span-3 space-y-4">

            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-text">Your Products</h2>
                <p className="text-xs text-muted-text mt-0.5">
                  {loading ? 'Loading…' : `${filteredProducts.length} of ${stats.total} product${stats.total !== 1 ? 's' : ''}`}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={openForm}
                  className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary/90 active:scale-[0.98] transition-all"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Add Product
                </button>
                <ViewToggle view={view} onChange={setView} />
              </div>
            </div>

            {/* Search */}
            <div className="relative">
              <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none"
                   fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="search"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search by name, category or tag…"
                className="w-full rounded-xl border border-border bg-white pl-10 pr-10 py-2.5 text-sm placeholder:text-gray-400 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>

            {/* Filters */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 hide-scrollbar">
              {stockFilterOptions.map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setStockFilter(key)}
                  className={`shrink-0 px-3 py-1.5 rounded-xl text-xs font-medium border transition-all flex items-center gap-1.5 ${
                    stockFilter === key
                      ? 'bg-primary text-white border-primary'
                      : 'bg-white border-border text-text hover:border-gray-300'
                  }`}
                >
                  {label}
                  {key === 'out' && stats.outOfStock > 0 && (
                    <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-bold">
                      {stats.outOfStock}
                    </span>
                  )}
                  {key === 'low' && stats.lowStock > 0 && (
                    <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-amber-500 text-white text-[9px] font-bold">
                      {stats.lowStock}
                    </span>
                  )}
                </button>
              ))}
              <span className="shrink-0 w-px h-5 bg-border mx-1" />
              <Dropdown
                options={sortOptions}
                value={sortBy}
                onChange={v => setSortBy(v as SortBy)}
                className="shrink-0 min-w-[130px]"
                buttonClassName="px-3 py-1.5 text-xs font-medium rounded-xl"
              />
            </div>

            {/* Active filter chips */}
            {hasFilters && (
              <div className="flex items-center gap-2 flex-wrap animate-fade-in">
                <span className="text-xs text-muted-text">Active:</span>
                {searchQuery && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-primary/5 text-primary text-xs font-medium">
                    "{searchQuery}"
                    <button onClick={() => setSearchQuery('')} className="hover:opacity-70">×</button>
                  </span>
                )}
                {stockFilter !== 'all' && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-primary/5 text-primary text-xs font-medium capitalize">
                    {stockFilter}
                    <button onClick={() => setStockFilter('all')} className="hover:opacity-70">×</button>
                  </span>
                )}
                {sortBy !== 'newest' && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-primary/5 text-primary text-xs font-medium">
                    Sort: {sortOptions.find(o => o.value === sortBy)?.label}
                    <button onClick={() => setSortBy('newest')} className="hover:opacity-70">×</button>
                  </span>
                )}
                <button
                  onClick={clearFilters}
                  className="ml-auto text-xs font-medium text-danger hover:underline underline-offset-2"
                >
                  Clear all
                </button>
              </div>
            )}

            {/* Content */}
            {loading ? (
              <ProductsSkeleton view={view} />
            ) : filteredProducts.length === 0 ? (
              <ProductsEmpty hasFilters={hasFilters} onClearFilters={clearFilters} onAdd={openForm} />
            ) : view === 'grid' ? (
              <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 gap-2.5 sm:gap-4">
                {filteredProducts.map(product => (
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
                {filteredProducts.map(product => (
                  <ProductListItem
                    key={product.id}
                    product={product}
                    onEdit={handleEditProduct}
                    onDelete={handleDeleteProduct}
                  />
                ))}
              </div>
            )}

            {!loading && filteredProducts.length > 0 && (
              <p className="text-center text-xs text-muted-text pt-2">
                Showing {filteredProducts.length} of {stats.total} product{stats.total !== 1 ? 's' : ''}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Product form modal */}
      <ProductForm
        open={showProductForm}
        onClose={closeForm}
        onCreated={handleProductCreated}
        product={editingProduct}
        onUpdated={handleProductUpdated}
      />

      {/* Mobile FAB */}
      <button
        onClick={openForm}
        className="fixed bottom-6 right-4 z-40 flex items-center gap-2 px-4 py-3 rounded-2xl bg-primary text-white font-semibold text-sm shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40 hover:scale-105 active:scale-95 transition-all lg:hidden"
        aria-label="Add new product"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
        </svg>
        Add Product
      </button>
    </div>
  )
}

export default SellerShopPage