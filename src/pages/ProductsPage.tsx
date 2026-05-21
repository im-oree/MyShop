import { useEffect, useMemo, useState, useCallback } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import ProductCard from '@/components/ProductCard'
import Dropdown, { type DropdownOption } from '@/components/Dropdown'
import { PRODUCT_CATEGORIES } from '@/constants/categories'
import { Product } from '@/types'
import { productService } from '@/services/productService'

type SortOption = 'default' | 'price-asc' | 'price-desc' | 'name-asc'

const SORT_OPTIONS: DropdownOption[] = [
  { value: 'default',    label: 'Default'        },
  { value: 'price-asc',  label: 'Price: Low–High' },
  { value: 'price-desc', label: 'Price: High–Low' },
  { value: 'name-asc',   label: 'Name: A–Z'       },
]

const STOCK_OPTIONS: DropdownOption[] = [
  { value: 'all', label: 'All stock' },
  { value: 'low-stock', label: 'Low stock (<=5)' },
  { value: 'out-of-stock', label: 'Out of stock' },
]

function ProductsPage() {
  const [products, setProducts]           = useState<Product[]>([])
  const [loading, setLoading]             = useState(true)
  const [error, setError]                 = useState<string | null>(null)
  const [query, setQuery]                 = useState('')
  const [activeCategory, setActiveCategory] = useState('All')
  const [sort, setSort]                   = useState<SortOption>('default')
  const [stockFilter, setStockFilter]     = useState<'all' | 'low-stock' | 'out-of-stock'>('all')

  const location = useLocation()
  const navigate = useNavigate()

  const loadProducts = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await productService.getAll(1, 100)
      setProducts(data.items || [])
    } catch (err) {
      console.error('Failed to load products:', err)
      setError('Failed to load products. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadProducts()
    // read stock filter from URL (e.g. /products?stock=out-of-stock)
    const params = new URLSearchParams(location.search)
    const stock = params.get('stock')
    if (stock === 'out-of-stock') setStockFilter('out-of-stock')
    else if (stock === 'low-stock') setStockFilter('low-stock')
    else setStockFilter('all')
  }, [loadProducts])

  const categories = useMemo(() => {
    return ['All', ...PRODUCT_CATEGORIES]
  }, [])

  const categoryOptions: DropdownOption[] = useMemo(
    () => categories.map((cat) => ({ value: cat, label: cat })),
    [categories]
  )

  const filteredProducts = useMemo(() => {
    const normalized = query.trim().toLowerCase()

    const filtered = products.filter((product) => {
      const matchesCategory =
        activeCategory === 'All' || product.category === activeCategory
      const matchesSearch =
        !normalized ||
        product.name.toLowerCase().includes(normalized) ||
        product.description.toLowerCase().includes(normalized) ||
        product.tags.some((tag) => tag.toLowerCase().includes(normalized))
      // apply stock filter
      const passesStock =
        stockFilter === 'all' ||
        (stockFilter === 'out-of-stock' && product.stock <= 0) ||
        (stockFilter === 'low-stock' && product.stock > 0 && product.stock <= 5)

      return matchesCategory && matchesSearch && passesStock
    })

    return [...filtered].sort((a, b) => {
      const priceA = a.salePrice ?? a.price
      const priceB = b.salePrice ?? b.price
      if (sort === 'price-asc')  return priceA - priceB
      if (sort === 'price-desc') return priceB - priceA
      if (sort === 'name-asc')   return a.name.localeCompare(b.name)
      return 0
    })
  }, [products, query, activeCategory, sort, stockFilter])

  const hasActiveFilters = Boolean(query.trim()) || activeCategory !== 'All' || sort !== 'default' || stockFilter !== 'all'

  const clearFilters = () => {
    setQuery('')
    setActiveCategory('All')
    setSort('default')
    setStockFilter('all')
    // remove stock param from url
    const params = new URLSearchParams(location.search)
    params.delete('stock')
    navigate(`${location.pathname}${params.toString() ? `?${params.toString()}` : ''}`, { replace: true })
  }

  return (
    <section className="animate-fade-in">

      {/* Header */}
      <div className="mb-6 sm:mb-8">
        <h1 className="text-3xl sm:text-4xl font-bold text-text tracking-tight">
          All <span className="text-secondary">Products</span>
        </h1>
        <p className="mt-1.5 text-sm text-muted-text">
          Explore batteries, chargers, backup power and accessories
        </p>
      </div>

      {/* Search + Sort bar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        {/* Search */}
        <div className="relative flex-1">
          <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none"
               fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search products, tags, descriptions…"
            className="w-full rounded-xl border border-border bg-white
                       pl-10 pr-4 py-2.5 text-sm text-text placeholder:text-gray-400
                       outline-none focus:border-primary focus:ring-2 focus:ring-primary/20
                       transition-all duration-200"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded
                         text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="Clear search"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round"
                      strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Sort */}
        <Dropdown
          options={SORT_OPTIONS}
          value={sort}
          onChange={(val) => setSort(val as SortOption)}
          placeholder="Sort by"
        />
        {/* Stock filter */}
        <Dropdown
          options={STOCK_OPTIONS}
          value={stockFilter}
          onChange={(val) => {
            const sf = val as 'all' | 'low-stock' | 'out-of-stock'
            setStockFilter(sf)
            const params = new URLSearchParams(location.search)
            if (sf === 'all') params.delete('stock')
            else params.set('stock', sf)
            navigate(`${location.pathname}${params.toString() ? `?${params.toString()}` : ''}`, { replace: true })
          }}
          placeholder="Stock"
        />
      </div>

      {/* Category dropdown */}
      {!loading && categories.length > 1 && (
        <div className="mb-6 max-w-xs">
          <Dropdown
            options={categoryOptions}
            value={activeCategory}
            onChange={setActiveCategory}
            placeholder="Filter by category"
          />
        </div>
      )}

      {/* Results bar */}
      {!loading && (
        <div className="flex items-center justify-between mb-4 min-h-[24px]">
          <p className="text-sm text-muted-text">
            {filteredProducts.length === 0
              ? 'No products found'
              : <>
                  Showing{' '}
                  <span className="font-semibold text-text">{filteredProducts.length}</span>
                  {' '}product{filteredProducts.length !== 1 ? 's' : ''}
                </>
            }
          </p>
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="text-xs text-secondary hover:text-green-700 font-medium
                         hover:underline underline-offset-2 transition-colors"
            >
              Clear filters
            </button>
          )}
        </div>
      )}

      {/* Error */}
      {error && (
        <div role="alert"
             className="mb-6 flex items-start gap-3 rounded-xl border border-red-200
                        bg-red-50 px-4 py-3 text-sm text-red-700 animate-slide-down">
          <svg className="mt-0.5 h-4 w-4 shrink-0 text-red-500" fill="none"
               stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732
                 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <div>
            <span>{error}</span>
            <button onClick={loadProducts}
                    className="ml-2 underline underline-offset-2 font-medium hover:text-red-900">
              Retry
            </button>
          </div>
        </div>
      )}

      {/* Loading skeleton */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-5">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="rounded-2xl overflow-hidden border border-border">
              <div className="skeleton aspect-[4/3]" />
              <div className="p-4 space-y-3">
                <div className="skeleton h-3 w-16 rounded" />
                <div className="skeleton h-4 w-full rounded" />
                <div className="skeleton h-5 w-20 rounded" />
                <div className="flex gap-2 pt-1">
                  <div className="skeleton h-10 flex-1 rounded-xl" />
                  <div className="skeleton h-10 flex-1 rounded-xl" />
                </div>
              </div>
            </div>
          ))}
        </div>

      /* Empty state */
      ) : filteredProducts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20
                        rounded-2xl border border-dashed border-border bg-white
                        animate-fade-in text-center px-4">
          <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center
                          justify-center mb-4">
            <svg className="w-7 h-7 text-gray-400" fill="none"
                 stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <p className="font-semibold text-text">No products found</p>
          <p className="mt-1 text-sm text-muted-text max-w-xs">
            Try adjusting your search or filter to find what you're looking for.
          </p>
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="mt-4 px-5 py-2.5 rounded-xl bg-primary text-white text-sm
                         font-medium hover:bg-primary/90 active:scale-[0.98] transition-all duration-200"
            >
              Clear all filters
            </button>
          )}
        </div>

      /* Grid */
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4
                        gap-3 sm:gap-5 stagger-children">
          {filteredProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </section>
  )
}

export default ProductsPage