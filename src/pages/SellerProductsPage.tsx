import { useEffect, useState, useMemo, useCallback } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { Product } from '@/types'
import { formatPrice } from '@/utils'
import { productService } from '@/services/productService'
import ProductForm from '@/components/ProductForm'
import SellerProductCard from '@/components/SellerProductCard'
import Dropdown from '@/components/Dropdown'

const stockOptions = [
  { value: 'all', label: 'All Stock' },
  { value: 'in-stock', label: 'In Stock' },
  { value: 'low', label: 'Low Stock' },
  { value: 'out', label: 'Out of Stock' },
]

const sortOptions = [
  { value: 'newest', label: 'Newest' },
  { value: 'price-asc', label: 'Price (Low to High)' },
  { value: 'price-desc', label: 'Price (High to Low)' },
  { value: 'stock', label: 'Stock Level' },
]

function SellerProductsPage() {
  const navigate = useNavigate()
  const { user, isAuthenticated, currentRole } = useAuthStore()

  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [showProductForm, setShowProductForm] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [stockFilter, setStockFilter] = useState<'all' | 'in-stock' | 'low' | 'out'>('all')
  const [sortBy, setSortBy] = useState<'newest' | 'price-asc' | 'price-desc' | 'stock'>('newest')

  const location = useLocation()

  useEffect(() => {
    if (!isAuthenticated || !user || user.role !== 'seller' || currentRole !== 'seller') {
      navigate('/profile')
      return
    }

    const loadSellerProducts = async () => {
      setLoading(true)
      try {
        const items = await productService.getMine()
        setProducts(items || [])
      } catch (error) {
        console.error('Failed to load seller products:', error)
        setProducts([])
      } finally {
        setLoading(false)
      }
    }

    void loadSellerProducts()

    // read stock filter from URL (e.g. /seller/products?stock=out)
    const params = new URLSearchParams(location.search)
    const stock = params.get('stock')
    if (stock === 'out') setStockFilter('out')
    else if (stock === 'low') setStockFilter('low')
    else if (stock === 'in-stock') setStockFilter('in-stock')
    else setStockFilter('all')
  }, [isAuthenticated, user, currentRole, navigate, location.search])

  const stats = useMemo(() => {
    const total = products.length
    const featured = products.filter((p) => p.featured).length
    const outOfStock = products.filter((p) => p.stock === 0).length
    const lowStock = products.filter((p) => p.stock > 0 && p.stock <= 5).length
    const avgPrice = total > 0 ? products.reduce((sum, p) => sum + (p.salePrice ?? p.price), 0) / total : 0
    const inventoryValue = products.reduce((sum, p) => sum + (p.salePrice ?? p.price) * p.stock, 0)
    const totalStock = products.reduce((sum, p) => sum + p.stock, 0)
    return { total, featured, outOfStock, lowStock, avgPrice, inventoryValue, totalStock }
  }, [products])

  const filteredProducts = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()

    return products
      .filter((p) => {
        if (query) {
          const matches = p.name.toLowerCase().includes(query) || p.category.toLowerCase().includes(query) || p.tags?.some((t) => t.toLowerCase().includes(query))
          if (!matches) return false
        }

        if (stockFilter === 'in-stock' && p.stock <= 0) return false
        if (stockFilter === 'low' && (p.stock > 5 || p.stock <= 0)) return false
        if (stockFilter === 'out' && p.stock > 0) return false

        return true
      })
      .sort((a, b) => {
        const priceA = a.salePrice ?? a.price
        const priceB = b.salePrice ?? b.price
        if (sortBy === 'price-asc') return priceA - priceB
        if (sortBy === 'price-desc') return priceB - priceA
        if (sortBy === 'stock') return a.stock - b.stock
        return 0
      })
  }, [products, searchQuery, stockFilter, sortBy])

  const hasFilters = searchQuery.trim() || stockFilter !== 'all' || sortBy !== 'newest'

  const clearFilters = useCallback(() => {
    setSearchQuery('')
    setStockFilter('all')
    setSortBy('newest')
  }, [])

  const handleProductCreated = useCallback((createdProduct: Product) => {
    setProducts((current) => [createdProduct, ...current])
    setShowProductForm(false)
  }, [])

  const handleEditProduct = useCallback((p: Product) => {
    setEditingProduct(p)
    setShowProductForm(true)
  }, [])

  const handleDeleteProduct = useCallback(
    async (p: Product) => {
      if (!confirm(`Delete product "${p.name}"? This cannot be undone.`)) return
      try {
        await productService.delete(p.id)
        setProducts((curr) => curr.filter((x) => x.id !== p.id))
      } catch (err) {
        console.error('Failed to delete product', err)
        alert('Failed to delete product')
      }
    },
    []
  )

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
        <h1 className="text-3xl font-bold text-text mb-2">Your Products</h1>
        <p className="text-muted-text mb-6">Manage, edit, and delete your products. Search and filter to find what you need.</p>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <div className="bg-white rounded-xl border border-border p-4">
            <p className="text-xs text-muted-text mb-1">Total Products</p>
            <p className="text-2xl font-bold text-text">{stats.total}</p>
            <p className="text-xs text-muted-text mt-1">{stats.totalStock} units</p>
          </div>
          <div className="bg-white rounded-xl border border-border p-4">
            <p className="text-xs text-muted-text mb-1">Inventory Value</p>
            <p className="text-2xl font-bold text-text">{formatPrice(stats.inventoryValue)}</p>
          </div>
          <div className="bg-white rounded-xl border border-border p-4">
            <p className="text-xs text-muted-text mb-1">Avg. Price</p>
            <p className="text-2xl font-bold text-text">{formatPrice(Math.round(stats.avgPrice))}</p>
          </div>
          <div className="bg-white rounded-xl border border-border p-4">
            <p className="text-xs text-muted-text mb-1">Featured</p>
            <p className="text-2xl font-bold text-text">{stats.featured}</p>
          </div>
        </div>

        {/* Alerts */}
        {(stats.outOfStock > 0 || stats.lowStock > 0) && (
          <div className="flex flex-col gap-2 mb-6">
            {stats.outOfStock > 0 && (
              <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-red-200 bg-red-50">
                <span className="text-lg">⚠️</span>
                <div>
                  <p className="text-sm font-semibold text-red-800">{stats.outOfStock} product(s) out of stock</p>
                  <p className="text-xs text-red-600">Restock soon to avoid lost sales</p>
                </div>
              </div>
            )}
            {stats.lowStock > 0 && (
              <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-amber-200 bg-amber-50">
                <span className="text-lg">⏱️</span>
                <div>
                  <p className="text-sm font-semibold text-amber-800">{stats.lowStock} product(s) running low</p>
                  <p className="text-xs text-amber-600">Stock is below 5 units</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Filters & Actions */}
      <div className="bg-white rounded-xl border border-border p-4 mb-6 space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search products..." className="flex-1 rounded-xl border border-border px-4 py-2.5 outline-none focus:border-primary" />

          <Dropdown
            options={stockOptions}
            value={stockFilter}
            onChange={(value) => setStockFilter(value as any)}
            className="w-full sm:w-48"
            buttonClassName="px-4 py-2.5 text-sm"
          />

          <Dropdown
            options={sortOptions}
            value={sortBy}
            onChange={(value) => setSortBy(value as any)}
            className="w-full sm:w-56"
            buttonClassName="px-4 py-2.5 text-sm"
          />

          <button onClick={() => setShowProductForm(true)} className="bg-primary text-white px-4 py-2.5 rounded-xl font-semibold hover:bg-primary/90">
            + Add Product
          </button>
        </div>

        {hasFilters && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-text">Filters active: showing {filteredProducts.length} of {stats.total}</p>
            <button onClick={clearFilters} className="text-sm text-secondary hover:underline">
              Clear Filters
            </button>
          </div>
        )}
      </div>

      {/* Products */}
      {loading ? (
        <div className="text-center py-12">
          <p className="text-muted-text">Loading products...</p>
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-text mb-4">
            {hasFilters ? 'No products match your filters. Try adjusting your search.' : 'No products yet. Add your first product to get started!'}
          </p>
          {!hasFilters && (
            <button onClick={() => setShowProductForm(true)} className="bg-primary text-white px-6 py-2.5 rounded-xl font-semibold">
              Add Product
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredProducts.map((product) => (
              <div key={product.id}>
                <SellerProductCard product={product} onEdit={handleEditProduct} onDelete={handleDeleteProduct} />
              </div>
            ))}
          </div>
          <div className="text-center mt-6 text-sm text-muted-text">
            Showing {filteredProducts.length} of {stats.total} products
          </div>
        </>
      )}

      {/* Product Form Modal */}
      <ProductForm
        open={showProductForm}
        onClose={() => {
          setShowProductForm(false)
          setEditingProduct(null)
        }}
        onCreated={handleProductCreated}
        product={editingProduct}
        onUpdated={(updated) => {
          setProducts((curr) => curr.map((p) => (p.id === updated.id ? updated : p)))
          setShowProductForm(false)
          setEditingProduct(null)
        }}
      />
    </div>
  )
}

export default SellerProductsPage
