import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { productService } from '@/services/productService'
import { Product } from '@/types'
import ProductCard from '@/components/ProductCard'
import { Search, ChevronRight, Package } from 'lucide-react'

function HomePage() {
  const navigate = useNavigate()
  const mountedRef = useRef(true)
  const chipsScrollRef = useRef<HTMLDivElement>(null)

  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchValue, setSearchValue] = useState('')
  const [activeCategory, setActiveCategory] = useState<string>('Recommended')

  /* ── Load products ── */
  const loadProducts = useCallback(async (showLoading = false) => {
    try {
      if (showLoading) setLoading(true)
      setError(null)
      const data = await productService.getAll(1, 100)
      const items = data?.items || (data as any)?.products || []
      if (mountedRef.current) setProducts(items)
    } catch (err) {
      console.error('Failed to load products:', err)
      if (mountedRef.current) setError('Unable to load products right now. Try refreshing the page.')
    } finally {
      if (mountedRef.current && showLoading) setLoading(false)
    }
  }, [])

  useEffect(() => {
    mountedRef.current = true
    void loadProducts(true)
    const intervalId = window.setInterval(() => void loadProducts(false), 15000)
    const handleFocus = () => void loadProducts(false)
    window.addEventListener('focus', handleFocus)
    return () => {
      mountedRef.current = false
      window.clearInterval(intervalId)
      window.removeEventListener('focus', handleFocus)
    }
  }, [loadProducts])

  /* ── Categories with counts ── */
  const categoriesWithCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const p of products) {
      if (!p.category) continue
      counts[p.category] = (counts[p.category] || 0) + 1
    }
    return Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
  }, [products])

  /* ── Filtered products to display ── */
  const visibleProducts = useMemo(() => {
    if (activeCategory === 'Recommended') return products
    return products.filter((p) => p.category === activeCategory)
  }, [products, activeCategory])

  /* ── Search handlers ── */
  const goToSearch = (q?: string) => {
    const query = (q ?? searchValue).trim()
    const params = new URLSearchParams()
    if (query) params.set('q', query)
    if (activeCategory !== 'Recommended') params.set('cat', activeCategory)
    const qs = params.toString()
    navigate(`/products${qs ? `?${qs}` : ''}`)
  }

  const handleSearchKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      goToSearch()
    }
  }

  /* ── Auto-scroll selected chip into view ── */
  useEffect(() => {
    const container = chipsScrollRef.current
    if (!container) return
    const activeBtn = container.querySelector<HTMLButtonElement>('[data-active="true"]')
    if (activeBtn) {
      activeBtn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
    }
  }, [activeCategory])

  /* ── Loading skeleton ── */
  if (loading) {
    return (
      <div className="animate-fade-in">
        <div className="mb-4">
          <div className="skeleton h-10 w-full max-w-2xl rounded-2xl" />
        </div>
        <div className="flex gap-2 mb-4 overflow-hidden">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="skeleton h-8 w-24 rounded-full shrink-0" />
          ))}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-3">
          {[...Array(10)].map((_, i) => (
            <div key={i} className="rounded-2xl overflow-hidden border border-border">
              <div className="skeleton aspect-square" />
              <div className="p-2 space-y-1.5">
                <div className="skeleton h-3 w-full rounded" />
                <div className="skeleton h-4 w-16 rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="animate-fade-in">
      {/* ── Sticky: search + chips ── */}
      <div className="sticky top-16 sm:top-[72px] z-30 -mx-3 sm:mx-0 px-3 sm:px-0 py-3 bg-bg/95 backdrop-blur-md mb-3 space-y-2.5">
        {/* Search bar */}
        <div role="search" className="relative max-w-2xl group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none group-focus-within:text-primary transition-colors" />
          <input
            type="search"
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            onKeyDown={handleSearchKey}
            placeholder="Search products…"
            aria-label="Search products"
            className="w-full rounded-full border border-border bg-white pl-11 pr-12 py-2.5
                       text-sm text-text placeholder:text-gray-400
                       shadow-sm outline-none
                       focus:border-primary focus:ring-2 focus:ring-primary/20
                       transition-all duration-200"
          />
          <button
            onClick={() => goToSearch()}
            aria-label="Search"
            className="absolute right-1.5 top-1/2 -translate-y-1/2 inline-flex items-center justify-center
                       w-8 h-8 rounded-full bg-primary text-white
                       hover:bg-primary/90 active:scale-[0.95] transition-all"
          >
            <Search className="w-4 h-4" />
          </button>
        </div>

        {/* Category chips — minimal pill style */}
        {categoriesWithCounts.length > 0 && (
          <div
            ref={chipsScrollRef}
            className="flex items-center gap-1.5 overflow-x-auto hide-scrollbar -mx-1 px-1 pb-0.5"
          >
            <button
              data-active={activeCategory === 'Recommended'}
              onClick={() => setActiveCategory('Recommended')}
              className={`shrink-0 px-4 py-1.5 rounded-full text-xs sm:text-sm font-semibold border transition-colors ${
                activeCategory === 'Recommended'
                  ? 'bg-text text-white border-text'
                  : 'bg-white text-text border-border hover:border-gray-400'
              }`}
            >
              Recommended
            </button>
            {categoriesWithCounts.map(({ name }) => {
              const active = activeCategory === name
              return (
                <button
                  key={name}
                  data-active={active}
                  onClick={() => setActiveCategory(name)}
                  className={`shrink-0 px-4 py-1.5 rounded-full text-xs sm:text-sm font-semibold border transition-colors ${
                    active
                      ? 'bg-text text-white border-text'
                      : 'bg-white text-text border-border hover:border-gray-400'
                  }`}
                >
                  {name}
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* ── Error banner ── */}
      {error && (
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 flex items-start gap-3 text-sm text-amber-900 animate-slide-down" role="alert">
          <svg className="w-5 h-5 text-amber-500 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <div className="flex-1">
            <p>{error}</p>
            <button
              onClick={() => void loadProducts(true)}
              className="mt-1 text-amber-700 underline underline-offset-2 font-medium hover:text-amber-900 transition-base"
            >
              Try again
            </button>
          </div>
        </div>
      )}

      {/* ── Products grid ── */}
      {visibleProducts.length === 0 ? (
        <div className="text-center py-16 sm:py-24 animate-slide-up">
          <div className="mx-auto w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
            <Package className="w-8 h-8 text-gray-400" />
          </div>
          <p className="text-muted-text font-medium">
            {products.length === 0 ? 'No products available yet' : `No products in ${activeCategory}`}
          </p>
          <p className="text-sm text-muted-text mt-1">
            {products.length === 0 ? 'Check back soon or try refreshing' : 'Try a different category'}
          </p>
          {products.length === 0 ? (
            <button
              onClick={() => void loadProducts(true)}
              className="mt-4 px-5 py-2.5 bg-primary text-white text-sm font-medium rounded-xl hover:bg-primary/90 active:scale-[0.98] transition-base"
            >
              Refresh
            </button>
          ) : (
            <button
              onClick={() => setActiveCategory('Recommended')}
              className="mt-4 px-5 py-2.5 bg-primary text-white text-sm font-medium rounded-xl hover:bg-primary/90 active:scale-[0.98] transition-base"
            >
              See all products
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-3 stagger-children">
            {visibleProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>

          {/* Footer CTA */}
          <div className="mt-8 flex justify-center">
            <Link
              to="/products"
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-white px-6 py-2.5 text-sm font-semibold text-text hover:border-primary/30 hover:text-primary transition-all"
            >
              Explore all products
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </>
      )}
    </div>
  )
}

export default HomePage