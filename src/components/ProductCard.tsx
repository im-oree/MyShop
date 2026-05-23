import { useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { Product } from '@/types'
import { formatPrice } from '@/utils'
import { useCartStore } from '@/store/cartStore'

interface ProductCardProps {
  product: Product
}

const PRODUCT_TYPE_LABEL: Record<string, string> = {
  physical: 'Product',
  service: 'Service',
  downloadable: 'Downloadable',
}

function ProductCard({ product }: ProductCardProps) {
  const addItem = useCartStore((state) => state.addItem)

  const displayPrice = product.salePrice ?? product.price
  const hasDiscount =
    product.salePrice != null && product.salePrice < product.price
  const isOutOfStock = product.stock <= 0
  const isLowStock = product.stock > 0 && product.stock <= 5

  const [imgLoaded, setImgLoaded] = useState(false)
  const [added, setAdded] = useState(false)

  const discountPercent = hasDiscount
    ? Math.round(((product.price - product.salePrice!) / product.price) * 100)
    : 0

  const handleAddToCart = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      e.preventDefault()
      e.stopPropagation()
      if (isOutOfStock) return

      addItem({
        productId: product.id,
        productName: product.name,
        productImage: product.images?.[0],
        quantity: 1,
        price: displayPrice,
      })

      setAdded(true)
      setTimeout(() => setAdded(false), 1200)
    },
    [addItem, product.id, displayPrice, isOutOfStock]
  )

  return (
    <Link
      to={`/products/${product.id}`}
      className="group block bg-white rounded-2xl overflow-hidden border border-border
                 hover:border-gray-200 hover:shadow-md
                 transition-all duration-300"
    >
      {/* Image */}
      <div className="relative overflow-hidden bg-gray-100">
        {!imgLoaded && <div className="skeleton w-full aspect-[4/3]" />}

        <img
          src={product.images?.[0] || 'https://placehold.co/800x600?text=Product'}
          alt={product.name}
          className={`w-full aspect-[4/3] object-cover transition-all duration-500
            ${imgLoaded ? 'opacity-100' : 'opacity-0 absolute inset-0'}
            ${isOutOfStock ? 'grayscale' : 'group-hover:scale-105'}`}
          loading="lazy"
          decoding="async"
          onLoad={() => setImgLoaded(true)}
        />

        {/* Top-left badges */}
        <div className="absolute top-2 left-2 flex flex-col gap-1">
          {hasDiscount && (
            <span className="bg-red-500 text-white text-[10px] font-bold
                             px-2 py-0.5 rounded-full shadow-sm">
              -{discountPercent}%
            </span>
          )}
          {product.featured && (
            <span className="bg-white/90 backdrop-blur text-blue-600 text-[10px]
                             font-bold px-2 py-0.5 rounded-full border border-blue-100">
              Featured
            </span>
          )}
        </div>

        {/* Top-right: stock status — only show when problematic */}
        {isOutOfStock && (
          <span className="absolute top-2 right-2 bg-black/70 text-white text-[10px]
                           font-bold px-2 py-0.5 rounded-full">
            Out of stock
          </span>
        )}
        {isLowStock && (
          <span className="absolute top-2 right-2 bg-amber-500 text-white text-[10px]
                           font-bold px-2 py-0.5 rounded-full shadow-sm">
            Limited item
          </span>
        )}
      </div>

      {/* Content */}
      <div className="p-3">
        <div className="flex items-center gap-1.5 mb-1">
          <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-text truncate">
            {product.category}
          </p>
          <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-primary/10 text-primary whitespace-nowrap">
            {PRODUCT_TYPE_LABEL[product.productType || 'physical'] || 'Product'}
          </span>
        </div>

        <h3 className="text-sm font-semibold text-text leading-snug
                       line-clamp-2 min-h-[2.5rem]">
          {product.name}
        </h3>

        {/* Price */}
        <div className="mt-2 flex items-center gap-1.5 flex-wrap">
          <span className="text-base font-bold text-accent">
            {formatPrice(displayPrice)}
          </span>
          {hasDiscount && (
            <span className="text-xs text-muted-text line-through">
              {formatPrice(product.price)}
            </span>
          )}
        </div>

        {/* CTA */}
        <button
          onClick={handleAddToCart}
          disabled={added || isOutOfStock}
          className={`mt-3 w-full rounded-xl py-2.5 text-sm font-semibold
                      transition-all duration-200 active:scale-[0.98]
                      flex items-center justify-center gap-1.5
            ${isOutOfStock
              ? 'bg-gray-100 text-muted-text border border-border cursor-not-allowed'
              : added
              ? 'bg-green-50 text-green-700 border border-green-200'
              : 'bg-primary text-white hover:bg-primary/90'
            }`}
        >
          {isOutOfStock ? (
            'Unavailable'
          ) : added ? (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round"
                      strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
              Added
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M3 3h2l.4 2M7 13h10l4-8H5.4M7
                     13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17" />
              </svg>
              Add to Cart
            </>
          )}
        </button>
      </div>
    </Link>
  )
}

export default ProductCard