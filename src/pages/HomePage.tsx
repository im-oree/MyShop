import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { productService } from '@/services/productService'
import { Product } from '@/types'
import ProductCard from '@/components/ProductCard'

function HomePage() {
  const navigate = useNavigate()
  const { currentRole } = useAuthStore()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const mountedRef = useRef(true)

  const loadProducts = useCallback(async (showLoading = false) => {
    try {
      if (showLoading) setLoading(true)
      setError(null)

      const data = await productService.getAll(1, 20)
      const items = data?.items || data?.products || []

      if (mountedRef.current) {
        setProducts(items)
      }
    } catch (err) {
      console.error('Failed to load products:', err)
      if (mountedRef.current) {
        setError('Unable to load products right now. Try refreshing the page.')
      }
    } finally {
      if (mountedRef.current && showLoading) {
        setLoading(false)
      }
    }
  }, [])

  // Redirect sellers to dashboard
  useEffect(() => {
    if (currentRole === 'seller') {
      navigate('/seller/shop', { replace: true })
    }
  }, [currentRole, navigate])

  useEffect(() => {
    mountedRef.current = true
    void loadProducts(true)

    const intervalId = window.setInterval(() => {
      void loadProducts(false)
    }, 15000)

    const handleFocus = () => void loadProducts(false)
    window.addEventListener('focus', handleFocus)

    return () => {
      mountedRef.current = false
      window.clearInterval(intervalId)
      window.removeEventListener('focus', handleFocus)
    }
  }, [loadProducts])

  // Skeleton loading state
  if (loading) {
    return (
      <div className="animate-fade-in">
        {/* Hero skeleton */}
        <div className="mb-8 sm:mb-10">
          <div className="skeleton h-8 sm:h-10 w-64 mb-3 rounded-lg" />
          <div className="skeleton h-4 w-80 max-w-full rounded-lg" />
        </div>

        {/* Grid skeleton */}
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-5">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="flex flex-col rounded-2xl overflow-hidden border border-border">
              <div className="skeleton aspect-[4/3]" />
              <div className="p-4 space-y-3">
                <div className="skeleton h-3 w-16 rounded" />
                <div className="skeleton h-4 w-full rounded" />
                <div className="skeleton h-5 w-20 rounded" />
                <div className="flex gap-2 pt-2">
                  <div className="skeleton h-10 flex-1 rounded-xl" />
                  <div className="skeleton h-10 flex-1 rounded-xl" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="animate-fade-in">
      {/* Hero section */}
      <div className="mb-8 sm:mb-10">
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-text tracking-tight">
          Welcome to{' '}
          <span className="text-secondary">eShop</span>
        </h1>
        <p className="mt-2 text-muted-text text-sm sm:text-base max-w-lg">
          Browse our curated collection of quality products at unbeatable prices
        </p>
      </div>

      {/* Error banner */}
      {error && (
        <div
          className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3
                      flex items-start gap-3 text-sm text-amber-900 animate-slide-down"
          role="alert"
        >
          <svg className="w-5 h-5 text-amber-500 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z"
            />
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

      {/* Empty state */}
      {products.length === 0 ? (
        <div className="text-center py-16 sm:py-24 animate-slide-up">
          <div className="mx-auto w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
              />
            </svg>
          </div>
          <p className="text-muted-text font-medium">No products available yet</p>
          <p className="text-sm text-muted-text mt-1">
            Check back soon or try refreshing the page
          </p>
          <button
            onClick={() => void loadProducts(true)}
            className="mt-4 px-5 py-2.5 bg-primary text-white text-sm font-medium rounded-xl
                       hover:bg-primary/90 active:scale-[0.98] transition-base"
          >
            Refresh
          </button>
        </div>
      ) : (
        <>
          {/* Product count */}
          <div className="flex items-center justify-between mb-4 sm:mb-6">
            <p className="text-sm text-muted-text">
              Showing <span className="font-semibold text-text">{products.length}</span> products
            </p>
          </div>

          {/* Product grid */}
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-5 stagger-children">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </>
      )}
    </div>
  )
}

export default HomePage