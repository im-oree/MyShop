import { useEffect, useMemo, useState, useCallback, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import ProductCard from '@/components/ProductCard'
import Dropdown, { type DropdownOption } from '@/components/Dropdown'
import { PRODUCT_CATEGORIES, getCategoriesForProductType } from '@/constants/categories'
import { Product, ProductType } from '@/types'
import { productService } from '@/services/productService'
import { formatPrice } from '@/utils'
import {
  Search,
  SlidersHorizontal,
  X,
  Check,
  Star,
  Sparkles,
  TrendingDown,
  Package,
} from 'lucide-react'

type SortOption =
  | 'relevance'
  | 'newest'
  | 'price-asc'
  | 'price-desc'
  | 'name-asc'
  | 'discount'

const SORT_OPTIONS: DropdownOption[] = [
  { value: 'relevance',  label: 'Relevance'        },
  { value: 'newest',     label: 'Newest first'     },
  { value: 'price-asc',  label: 'Price: Low → High' },
  { value: 'price-desc', label: 'Price: High → Low' },
  { value: 'name-asc',   label: 'Name: A → Z'      },
  { value: 'discount',   label: 'Biggest discount' },
]

type StockFilter = 'all' | 'in-stock' | 'low-stock' | 'out-of-stock'
type ProductTypeFilter = 'all' | ProductType

const PRODUCT_TYPE_LABEL: Record<ProductTypeFilter, string> = {
  all: 'All types',
  physical: 'Products',
  service: 'Services',
  downloadable: 'Downloadables',
}

function ProductsPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const searchInputRef = useRef<HTMLInputElement>(null)

  /* ── URL params ── */
  const urlParams = useMemo(() => new URLSearchParams(location.search), [location.search])

  /* ── State ── */
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState<string | null>(null)

  const [query, setQuery]                     = useState(urlParams.get('q') || '')
  const [debouncedQuery, setDebouncedQuery]   = useState(query)
  const [selectedCategories, setSelectedCategories] = useState<string[]>(
    urlParams.get('cat') ? urlParams.get('cat')!.split(',').filter(Boolean) : []
  )
  const [productTypeFilter, setProductTypeFilter] = useState<ProductTypeFilter>((urlParams.get('type') as ProductTypeFilter) || 'all')
  const [sort, setSort]                       = useState<SortOption>((urlParams.get('sort') as SortOption) || 'relevance')
  const [stockFilter, setStockFilter]         = useState<StockFilter>((urlParams.get('stock') as StockFilter) || 'all')
  const [minPrice, setMinPrice]               = useState(urlParams.get('min') || '')
  const [maxPrice, setMaxPrice]               = useState(urlParams.get('max') || '')
  const [featuredOnly, setFeaturedOnly]       = useState(urlParams.get('featured') === '1')
  const [onSaleOnly, setOnSaleOnly]           = useState(urlParams.get('sale') === '1')

  const [filtersOpen, setFiltersOpen] = useState(false)

  const categoryOptions = useMemo(() => {
    if (productTypeFilter === 'all') return PRODUCT_CATEGORIES
    return getCategoriesForProductType(productTypeFilter)
  }, [productTypeFilter])

  useEffect(() => {
    setSelectedCategories((current) => current.filter((cat) => categoryOptions.includes(cat)))
  }, [categoryOptions])

  /* ── Autofocus search on mount ── */
  useEffect(() => {
    searchInputRef.current?.focus()
  }, [])

  /* ── Debounce search input ── */
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 250)
    return () => clearTimeout(t)
  }, [query])

  /* ── Load products ── */
  const loadProducts = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await productService.getAll(1, 500)
      setProducts(data.items || [])
    } catch (err) {
      console.error('Failed to load products:', err)
      setError('Failed to load products. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void loadProducts() }, [loadProducts])

  /* ── Sync URL with filters ── */
  useEffect(() => {
    const params = new URLSearchParams()
    if (debouncedQuery.trim())      params.set('q', debouncedQuery.trim())
    if (selectedCategories.length)  params.set('cat', selectedCategories.join(','))
    if (productTypeFilter !== 'all') params.set('type', productTypeFilter)
    if (sort !== 'relevance')       params.set('sort', sort)
    if (stockFilter !== 'all')      params.set('stock', stockFilter)
    if (minPrice)                   params.set('min', minPrice)
    if (maxPrice)                   params.set('max', maxPrice)
    if (featuredOnly)               params.set('featured', '1')
    if (onSaleOnly)                 params.set('sale', '1')

    const next = params.toString()
    const target = `${location.pathname}${next ? `?${next}` : ''}`
    if (location.search !== (next ? `?${next}` : '')) {
      navigate(target, { replace: true })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedQuery, selectedCategories, productTypeFilter, sort, stockFilter, minPrice, maxPrice, featuredOnly, onSaleOnly])

  /* ── Derived: price bounds for slider helpers ── */
  const priceBounds = useMemo(() => {
    if (!products.length) return { min: 0, max: 0 }
    let min = Infinity, max = 0
    for (const p of products) {
      const price = (p.salePrice ?? p.price) / 100
      if (price < min) min = price
      if (price > max) max = price
    }
    return { min: Math.floor(min), max: Math.ceil(max) }
  }, [products])

  /* ── Filtered + sorted ── */
  const filteredProducts = useMemo(() => {
    const q = debouncedQuery.trim().toLowerCase()
    const minP = minPrice ? Number(minPrice) * 100 : 0
    const maxP = maxPrice ? Number(maxPrice) * 100 : Infinity

    const filtered = products.filter((p) => {
      // Search across name, description, tags, category
      if (q) {
        const inName     = p.name.toLowerCase().includes(q)
        const inDesc     = p.description?.toLowerCase().includes(q)
        const inTags     = p.tags?.some(t => t.toLowerCase().includes(q))
        const inCategory = p.category?.toLowerCase().includes(q)
        const inType = (p.productType || 'physical').toLowerCase().includes(q)
        if (!inName && !inDesc && !inTags && !inCategory && !inType) return false
      }

      if (productTypeFilter !== 'all' && (p.productType || 'physical') !== productTypeFilter) return false

      // Categories (multi-select)
      if (selectedCategories.length && !selectedCategories.includes(p.category)) return false

      // Stock
      if (stockFilter === 'in-stock'     && p.stock <= 0)                       return false
      if (stockFilter === 'low-stock'    && (p.stock <= 0 || p.stock > 5))      return false
      if (stockFilter === 'out-of-stock' && p.stock > 0)                        return false

      // Price range
      const effective = p.salePrice ?? p.price
      if (effective < minP || effective > maxP) return false

      // Featured
      if (featuredOnly && !p.featured) return false

      // On sale
      if (onSaleOnly && !(p.salePrice && p.salePrice < p.price)) return false

      return true
    })

    return [...filtered].sort((a, b) => {
      const priceA = a.salePrice ?? a.price
      const priceB = b.salePrice ?? b.price

      if (sort === 'price-asc')  return priceA - priceB
      if (sort === 'price-desc') return priceB - priceA
      if (sort === 'name-asc')   return a.name.localeCompare(b.name)
      if (sort === 'newest') {
        const da = new Date(a.createdAt as any).getTime()
        const db = new Date(b.createdAt as any).getTime()
        return db - da
      }
      if (sort === 'discount') {
        const da = a.salePrice ? (a.price - a.salePrice) / a.price : 0
        const db = b.salePrice ? (b.price - b.salePrice) / b.price : 0
        return db - da
      }
      // Relevance: if there's a query, name-match-first; else default order
      if (sort === 'relevance' && q) {
        const aMatch = a.name.toLowerCase().includes(q) ? 0 : 1
        const bMatch = b.name.toLowerCase().includes(q) ? 0 : 1
        return aMatch - bMatch
      }
      return 0
    })
  }, [products, debouncedQuery, selectedCategories, productTypeFilter, sort, stockFilter, minPrice, maxPrice, featuredOnly, onSaleOnly])

  /* ── Active filter count ── */
  const activeFilterCount = useMemo(() => {
    let n = 0
    if (selectedCategories.length) n += 1
    if (productTypeFilter !== 'all') n += 1
    if (stockFilter !== 'all')     n += 1
    if (minPrice || maxPrice)      n += 1
    if (featuredOnly)              n += 1
    if (onSaleOnly)                n += 1
    return n
  }, [selectedCategories, productTypeFilter, stockFilter, minPrice, maxPrice, featuredOnly, onSaleOnly])

  const hasActiveFilters = activeFilterCount > 0 || !!debouncedQuery.trim() || sort !== 'relevance'

  const clearAll = () => {
    setQuery('')
    setSelectedCategories([])
    setProductTypeFilter('all')
    setSort('relevance')
    setStockFilter('all')
    setMinPrice('')
    setMaxPrice('')
    setFeaturedOnly(false)
    setOnSaleOnly(false)
  }

  const toggleCategory = (cat: string) => {
    setSelectedCategories(prev =>
      prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
    )
  }

  /* ── Filters panel content (used in both sidebar + drawer) ── */
  const FiltersPanel = () => (
    <div className="space-y-6">
      {/* Categories */}
      <div>
        <h4 className="text-xs font-bold text-text uppercase tracking-wider mb-3">
          Type
        </h4>
        <div className="space-y-1 mb-4">
          {(['all', 'physical', 'service', 'downloadable'] as ProductTypeFilter[]).map((type) => {
            const checked = productTypeFilter === type
            return (
              <label
                key={type}
                className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-gray-50 cursor-pointer"
              >
                <span
                  className={`flex items-center justify-center w-4 h-4 rounded-full border-2 transition-colors shrink-0 ${
                    checked ? 'border-primary' : 'border-gray-300'
                  }`}
                >
                  {checked && <span className="w-2 h-2 rounded-full bg-primary" />}
                </span>
                <input
                  type="radio"
                  checked={checked}
                  onChange={() => setProductTypeFilter(type)}
                  className="sr-only"
                />
                <span className="text-sm text-text">{PRODUCT_TYPE_LABEL[type]}</span>
              </label>
            )
          })}
        </div>

        <h4 className="text-xs font-bold text-text uppercase tracking-wider mb-3">
          Categories
        </h4>
        <div className="space-y-1 max-h-64 overflow-y-auto pr-1 hide-scrollbar">
          {categoryOptions.map((cat) => {
            const checked = selectedCategories.includes(cat)
            return (
              <label
                key={cat}
                className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-gray-50 cursor-pointer"
              >
                <span
                  className={`flex items-center justify-center w-4 h-4 rounded border-2 transition-colors shrink-0 ${
                    checked ? 'bg-primary border-primary' : 'bg-white border-gray-300'
                  }`}
                >
                  {checked && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                </span>
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggleCategory(cat)}
                  className="sr-only"
                />
                <span className="text-sm text-text flex-1 truncate">{cat}</span>
              </label>
            )
          })}
        </div>
      </div>

      {/* Price range */}
      <div>
        <h4 className="text-xs font-bold text-text uppercase tracking-wider mb-3">
          Price (NGN)
        </h4>
        <div className="flex items-center gap-2">
          <div className="flex-1">
            <input
              type="number"
              min="0"
              value={minPrice}
              onChange={e => setMinPrice(e.target.value)}
              placeholder="Min"
              className="w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <span className="text-muted-text text-xs">—</span>
          <div className="flex-1">
            <input
              type="number"
              min="0"
              value={maxPrice}
              onChange={e => setMaxPrice(e.target.value)}
              placeholder="Max"
              className="w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </div>
        </div>
        {priceBounds.max > 0 && (
          <p className="text-[11px] text-muted-text mt-1.5">
            Range: {formatPrice(priceBounds.min * 100)} – {formatPrice(priceBounds.max * 100)}
          </p>
        )}
        {/* Quick price chips */}
        <div className="flex flex-wrap gap-1.5 mt-2">
          {[
            { label: 'Under ₦5k',    min: '', max: '5000' },
            { label: '₦5k – ₦20k',  min: '5000', max: '20000' },
            { label: '₦20k – ₦50k', min: '20000', max: '50000' },
            { label: 'Over ₦50k',    min: '50000', max: '' },
          ].map(p => (
            <button
              key={p.label}
              onClick={() => { setMinPrice(p.min); setMaxPrice(p.max) }}
              className={`text-[11px] px-2 py-1 rounded-full border transition-colors ${
                minPrice === p.min && maxPrice === p.max
                  ? 'bg-primary text-white border-primary'
                  : 'bg-white text-muted-text border-border hover:border-primary/30'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Availability */}
      <div>
        <h4 className="text-xs font-bold text-text uppercase tracking-wider mb-3">
          Availability
        </h4>
        <div className="space-y-1">
          {([
            { value: 'all',           label: 'All products' },
            { value: 'in-stock',      label: 'In stock' },
            { value: 'low-stock',     label: 'Low stock (≤ 5)' },
            { value: 'out-of-stock',  label: 'Out of stock' },
          ] as { value: StockFilter; label: string }[]).map(o => {
            const checked = stockFilter === o.value
            return (
              <label
                key={o.value}
                className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-gray-50 cursor-pointer"
              >
                <span
                  className={`flex items-center justify-center w-4 h-4 rounded-full border-2 transition-colors shrink-0 ${
                    checked ? 'border-primary' : 'border-gray-300'
                  }`}
                >
                  {checked && <span className="w-2 h-2 rounded-full bg-primary" />}
                </span>
                <input
                  type="radio"
                  checked={checked}
                  onChange={() => setStockFilter(o.value)}
                  className="sr-only"
                />
                <span className="text-sm text-text">{o.label}</span>
              </label>
            )
          })}
        </div>
      </div>

      {/* Toggles */}
      <div>
        <h4 className="text-xs font-bold text-text uppercase tracking-wider mb-3">
          Quick filters
        </h4>
        <div className="space-y-2">
          <label className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-border cursor-pointer hover:border-primary/40 transition-colors">
            <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
            <span className="text-sm text-text flex-1">Featured only</span>
            <input
              type="checkbox"
              checked={featuredOnly}
              onChange={e => setFeaturedOnly(e.target.checked)}
              className="h-4 w-4 accent-primary"
            />
          </label>
          <label className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-border cursor-pointer hover:border-primary/40 transition-colors">
            <TrendingDown className="w-4 h-4 text-red-500 shrink-0" />
            <span className="text-sm text-text flex-1">On sale</span>
            <input
              type="checkbox"
              checked={onSaleOnly}
              onChange={e => setOnSaleOnly(e.target.checked)}
              className="h-4 w-4 accent-primary"
            />
          </label>
        </div>
      </div>

      {hasActiveFilters && (
        <button
          onClick={clearAll}
          className="w-full text-center text-xs font-semibold text-danger hover:underline underline-offset-2 py-1"
        >
          Clear all filters
        </button>
      )}
    </div>
  )

  return (
    <section className="animate-fade-in pb-24 lg:pb-10">
      {/* ── Header ── */}
      <div className="mb-5">
        <h1 className="text-2xl sm:text-3xl font-bold text-text tracking-tight">
          Search <span className="text-secondary">Products</span>
        </h1>
        <p className="mt-1 text-sm text-muted-text">
          Find exactly what you need with filters, categories and sorting
        </p>
      </div>

      {/* ── Search bar ── */}
      <div className="sticky top-16 sm:top-[72px] z-30 -mx-3 px-3 sm:mx-0 sm:px-0 py-3 bg-bg/95 backdrop-blur-md">
        <div className="flex items-stretch gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
            <input
              ref={searchInputRef}
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search products, tags, descriptions…"
              className="w-full rounded-xl border border-border bg-white pl-10 pr-10 py-2.5 text-sm text-text placeholder:text-gray-400 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded text-gray-400 hover:text-gray-600 transition-colors"
                aria-label="Clear search"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Filters toggle (mobile + desktop) */}
          <button
            onClick={() => setFiltersOpen(true)}
            className="lg:hidden relative inline-flex items-center gap-1.5 rounded-xl border border-border bg-white px-3 py-2 text-sm font-semibold text-text hover:border-primary/30"
          >
            <SlidersHorizontal className="w-4 h-4" />
            <span className="hidden sm:inline">Filters</span>
            {activeFilterCount > 0 && (
              <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] rounded-full bg-primary text-white text-[10px] font-bold px-1">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>

        {/* Sort + count row */}
        <div className="flex items-center justify-between gap-3 mt-2.5">
          <p className="text-xs text-muted-text">
            {loading
              ? 'Loading…'
              : filteredProducts.length === 0
              ? 'No products found'
              : (
                <>
                  <span className="font-semibold text-text">{filteredProducts.length}</span> result{filteredProducts.length !== 1 ? 's' : ''}
                  {debouncedQuery && (
                    <> for <span className="font-semibold text-text">"{debouncedQuery}"</span></>
                  )}
                </>
              )}
          </p>

          <Dropdown
            options={SORT_OPTIONS}
            value={sort}
            onChange={(val) => setSort(val as SortOption)}
            placeholder="Sort"
            className="min-w-[160px]"
            buttonClassName="px-3 py-1.5 text-xs"
          />
        </div>
      </div>

      {/* ── Active filter chips ── */}
      {hasActiveFilters && (
        <div className="flex items-center gap-2 flex-wrap mb-4 mt-3">
          {selectedCategories.map(c => (
            <button
              key={c}
              onClick={() => toggleCategory(c)}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20"
            >
              {c} <X className="w-3 h-3" />
            </button>
          ))}
          {productTypeFilter !== 'all' && (
            <button
              onClick={() => setProductTypeFilter('all')}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20"
            >
              {PRODUCT_TYPE_LABEL[productTypeFilter]} <X className="w-3 h-3" />
            </button>
          )}
          {stockFilter !== 'all' && (
            <button
              onClick={() => setStockFilter('all')}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20"
            >
              {stockFilter.replace('-', ' ')} <X className="w-3 h-3" />
            </button>
          )}
          {(minPrice || maxPrice) && (
            <button
              onClick={() => { setMinPrice(''); setMaxPrice('') }}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20"
            >
              ₦{minPrice || '0'} – ₦{maxPrice || '∞'} <X className="w-3 h-3" />
            </button>
          )}
          {featuredOnly && (
            <button
              onClick={() => setFeaturedOnly(false)}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20"
            >
              <Star className="w-3 h-3" /> Featured <X className="w-3 h-3" />
            </button>
          )}
          {onSaleOnly && (
            <button
              onClick={() => setOnSaleOnly(false)}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20"
            >
              <TrendingDown className="w-3 h-3" /> On sale <X className="w-3 h-3" />
            </button>
          )}
          <button
            onClick={clearAll}
            className="text-xs font-semibold text-danger hover:underline underline-offset-2 ml-1"
          >
            Clear all
          </button>
        </div>
      )}

      {/* ── Error ── */}
      {error && (
        <div role="alert" className="mb-6 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 animate-slide-down">
          <Package className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
          <div>
            <span>{error}</span>
            <button onClick={loadProducts} className="ml-2 underline underline-offset-2 font-medium hover:text-red-900">
              Retry
            </button>
          </div>
        </div>
      )}

      {/* ── Main: sidebar + grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-6">
        {/* Desktop filters sidebar */}
        <aside className="hidden lg:block">
          <div className="sticky top-[180px] rounded-2xl border border-border bg-white p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-text">Filters</h3>
              {activeFilterCount > 0 && (
                <span className="text-[10px] font-bold bg-primary text-white rounded-full px-2 py-0.5">
                  {activeFilterCount} active
                </span>
              )}
            </div>
            <FiltersPanel />
          </div>
        </aside>

        {/* Grid */}
        <div>
          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-5">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="rounded-2xl overflow-hidden border border-border">
                  <div className="skeleton aspect-[4/3]" />
                  <div className="p-4 space-y-3">
                    <div className="skeleton h-3 w-16 rounded" />
                    <div className="skeleton h-4 w-full rounded" />
                    <div className="skeleton h-5 w-20 rounded" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 rounded-2xl border border-dashed border-border bg-white text-center px-4">
              <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                <Search className="w-7 h-7 text-gray-400" />
              </div>
              <p className="font-semibold text-text">No products found</p>
              <p className="mt-1 text-sm text-muted-text max-w-xs">
                {debouncedQuery
                  ? <>We couldn't find anything matching <strong>"{debouncedQuery}"</strong>.</>
                  : 'Try adjusting your filters to see more results.'}
              </p>
              {hasActiveFilters && (
                <button
                  onClick={clearAll}
                  className="mt-4 px-5 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary/90 active:scale-[0.98] transition-all"
                >
                  Clear all filters
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-5 stagger-children">
              {filteredProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
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
          <div className="absolute right-0 top-0 bottom-0 w-[88%] max-w-sm bg-white shadow-2xl overflow-y-auto animate-slide-left">
            <div className="sticky top-0 z-10 flex items-center justify-between p-4 border-b border-border bg-white">
              <div>
                <h3 className="font-bold text-text">Filters</h3>
                {activeFilterCount > 0 && (
                  <p className="text-xs text-muted-text mt-0.5">{activeFilterCount} active</p>
                )}
              </div>
              <button
                onClick={() => setFiltersOpen(false)}
                className="p-2 rounded-lg hover:bg-gray-100 text-gray-500"
                aria-label="Close filters"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4">
              <FiltersPanel />
            </div>

            <div className="sticky bottom-0 z-10 flex items-center gap-2 p-4 border-t border-border bg-white">
              <button
                onClick={clearAll}
                className="flex-1 rounded-xl border border-border bg-white px-4 py-2.5 text-sm font-semibold text-text"
              >
                Reset
              </button>
              <button
                onClick={() => setFiltersOpen(false)}
                className="flex-1 rounded-xl bg-primary text-white px-4 py-2.5 text-sm font-semibold"
              >
                Show {filteredProducts.length} results
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}

export default ProductsPage