import { useEffect, useMemo, useState, useCallback, useRef } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import ProductCard from '@/components/ProductCard'
import { productService } from '@/services/productService'
import { useCartStore } from '@/store/cartStore'
import { Product } from '@/types'
import { formatPrice } from '@/utils'
import { messageService } from '@/services/messageService'
import Dropdown from '@/components/Dropdown'

/* ─── Star Rating Component ─── */
function StarRating({
  rating,
  size = 'sm',
  interactive = false,
  onChange,
}: {
  rating: number
  size?: 'sm' | 'md' | 'lg'
  interactive?: boolean
  onChange?: (val: number) => void
}) {
  const [hovered, setHovered] = useState(0)
  const sizeMap = { sm: 'w-4 h-4', md: 'w-5 h-5', lg: 'w-6 h-6' }
  const cls = sizeMap[size]

  return (
    <div className="inline-flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => {
        const filled = interactive ? star <= (hovered || rating) : star <= Math.round(rating)
        return (
          <button
            key={star}
            type="button"
            disabled={!interactive}
            onClick={() => onChange?.(star)}
            onMouseEnter={() => interactive && setHovered(star)}
            onMouseLeave={() => interactive && setHovered(0)}
            className={`${interactive ? 'cursor-pointer hover:scale-110' : 'cursor-default'}
                        transition-transform duration-150 disabled:opacity-100`}
            aria-label={`${star} star${star > 1 ? 's' : ''}`}
          >
            <svg
              className={`${cls} ${filled ? 'text-amber-400' : 'text-gray-200'} transition-colors duration-150`}
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
          </button>
        )
      })}
    </div>
  )
}

const reviewSortOptions = [
  { value: 'helpful', label: 'Most Helpful' },
  { value: 'recent', label: 'Most Recent' },
  { value: 'highest', label: 'Highest Rated' },
]

/* ─── Image Lightbox ─── */
function ImageLightbox({
  images,
  startIndex,
  onClose,
}: {
  images: string[]
  startIndex: number
  onClose: () => void
}) {
  const [current, setCurrent] = useState(startIndex)
  const [zoom, setZoom] = useState(false)
  const touchStartX = useRef(0)
  const touchDeltaX = useRef(0)

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowRight') setCurrent((c) => Math.min(images.length - 1, c + 1))
      if (e.key === 'ArrowLeft') setCurrent((c) => Math.max(0, c - 1))
    }
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', handleKey)
    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', handleKey)
    }
  }, [images.length, onClose])

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    touchDeltaX.current = e.touches[0].clientX - touchStartX.current
  }

  const handleTouchEnd = () => {
    if (Math.abs(touchDeltaX.current) > 60) {
      if (touchDeltaX.current < 0 && current < images.length - 1) {
        setCurrent((c) => c + 1)
      } else if (touchDeltaX.current > 0 && current > 0) {
        setCurrent((c) => c - 1)
      }
    }
    touchDeltaX.current = 0
  }

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/95 flex flex-col animate-fade-in"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3 text-white/80">
        <span className="text-sm font-medium">
          {current + 1} / {images.length}
        </span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setZoom((z) => !z)}
            className="p-2 rounded-full hover:bg-white/10 transition-colors"
            aria-label={zoom ? 'Zoom out' : 'Zoom in'}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {zoom ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
              )}
            </svg>
          </button>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-white/10 transition-colors"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Image area */}
      <div
        className="flex-1 flex items-center justify-center px-4 relative overflow-hidden"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Prev */}
        {current > 0 && (
          <button
            onClick={() => setCurrent((c) => c - 1)}
            className="absolute left-2 sm:left-6 z-10 p-3 rounded-full bg-white/10
                       backdrop-blur-sm hover:bg-white/20 transition-all duration-200
                       text-white hidden sm:flex"
            aria-label="Previous image"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        )}

        <img
          key={current}
          src={images[current]}
          alt={`Image ${current + 1}`}
          className={`max-h-[80vh] max-w-full object-contain select-none animate-scale-in
                      transition-transform duration-300
                      ${zoom ? 'scale-150 cursor-zoom-out' : 'cursor-zoom-in'}`}
          onClick={() => setZoom((z) => !z)}
          draggable={false}
        />

        {/* Next */}
        {current < images.length - 1 && (
          <button
            onClick={() => setCurrent((c) => c + 1)}
            className="absolute right-2 sm:right-6 z-10 p-3 rounded-full bg-white/10
                       backdrop-blur-sm hover:bg-white/20 transition-all duration-200
                       text-white hidden sm:flex"
            aria-label="Next image"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        )}
      </div>

      {/* Thumbnail strip */}
      {images.length > 1 && (
        <div className="flex items-center justify-center gap-2 px-4 py-3
                        overflow-x-auto hide-scrollbar">
          {images.map((img, idx) => (
            <button
              key={idx}
              onClick={() => { setCurrent(idx); setZoom(false) }}
              className={`shrink-0 w-12 h-12 sm:w-14 sm:h-14 rounded-lg overflow-hidden
                          border-2 transition-all duration-200
                          ${current === idx
                            ? 'border-white opacity-100 scale-105'
                            : 'border-transparent opacity-50 hover:opacity-80'}`}
            >
              <img src={img} alt="" className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

/* ─── Reviews ─── */
interface Review {
  id: string
  userName: string
  avatar: string
  rating: number
  date: string
  title: string
  body: string
  helpful: number
  verified: boolean
}

/* ─── Main Page Component ─── */
function ProductDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const addItem = useCartStore((state) => state.addItem)

  const [product, setProduct] = useState<Product | null>(null)
  const [related, setRelated] = useState<Product[]>([])
  const [selectedImage, setSelectedImage] = useState('')
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [quantity, setQuantity] = useState(1)
  const [loading, setLoading] = useState(true)
  const [added, setAdded] = useState(false)
  const [imgLoaded, setImgLoaded] = useState(false)

  // UI state
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [descExpanded, setDescExpanded] = useState(false)
  const [activeTab, setActiveTab] = useState<'description' | 'reviews' | 'shipping'>('description')
  const [reviewSort, setReviewSort] = useState<'recent' | 'helpful' | 'highest'>('helpful')
  const [showReviewForm, setShowReviewForm] = useState(false)
  const [userRating, setUserRating] = useState(0)
  const [userReviewTitle, setUserReviewTitle] = useState('')
  const [userReviewBody, setUserReviewBody] = useState('')
  const [wishlist, setWishlist] = useState(false)

  // Image slider (mobile)
  const sliderRef = useRef<HTMLDivElement>(null)
  const touchStartX = useRef(0)

  const loadProduct = useCallback(async (productId: string) => {
    try {
      setLoading(true)
      setImgLoaded(false)
      setDescExpanded(false)
      setActiveTab('description')
      const data = await productService.getById(productId)
      setProduct(data)
      setQuantity(1)
      setSelectedImage(data?.images?.[0] || 'https://placehold.co/1000x750?text=Product')
      setCurrentImageIndex(0)

      if (data?.category) {
        const byCategory = await productService.getByCategory(data.category)
        setRelated(
          (byCategory.items || [])
            .filter((item: Product) => item.id !== data.id)
            .slice(0, 4)
        )
      }
    } catch (err) {
      console.error('Failed to load product:', err)
      setProduct(null)
      setRelated([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (id) void loadProduct(id)
  }, [id, loadProduct])

  const displayPrice = useMemo(
    () => (product ? (product.salePrice ?? product.price) : 0),
    [product]
  )

  const hasDiscount = product?.salePrice != null && product.salePrice < product.price
  const discountPct = hasDiscount
    ? Math.round(((product!.price - product!.salePrice!) / product!.price) * 100)
    : 0

  const reviews = useMemo<Review[]>(() => [], [])

  const handleMessageSeller = async () => {
    if (!product?.sellerId) return
    const conversation = await messageService.startConversation({ productId: product.id, targetUserId: product.sellerId })
    navigate(`/messages?conversationId=${conversation.id}`)
  }

  const avgRating = useMemo(
    () => reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length || 0,
    [reviews]
  )

  const ratingDistribution = useMemo(() => {
    const dist = [0, 0, 0, 0, 0]
    reviews.forEach((r) => { dist[r.rating - 1]++ })
    return dist.reverse()
  }, [reviews])

  const sortedReviews = useMemo(() => {
    return [...reviews].sort((a, b) => {
      if (reviewSort === 'helpful') return b.helpful - a.helpful
      if (reviewSort === 'highest') return b.rating - a.rating
      return new Date(b.date).getTime() - new Date(a.date).getTime()
    })
  }, [reviews, reviewSort])

  const handleAddToCart = useCallback(() => {
    if (!product) return
    addItem({ productId: product.id, quantity, price: displayPrice })
    setAdded(true)
    setTimeout(() => setAdded(false), 1500)
  }, [addItem, product, quantity, displayPrice])

  const handleBuyNow = () => {
    if (!product) return
    addItem({ productId: product.id, quantity, price: displayPrice })
    navigate('/cart')
  }

  const handleImageSelect = (img: string, idx: number) => {
    setSelectedImage(img)
    setCurrentImageIndex(idx)
    setImgLoaded(false)
  }

  const handleMobileSwipe = (direction: 'left' | 'right') => {
    if (!product) return
    const imgs = product.images?.length ? product.images : ['https://placehold.co/1000x750?text=Product']
    if (direction === 'left' && currentImageIndex < imgs.length - 1) {
      handleImageSelect(imgs[currentImageIndex + 1], currentImageIndex + 1)
    } else if (direction === 'right' && currentImageIndex > 0) {
      handleImageSelect(imgs[currentImageIndex - 1], currentImageIndex - 1)
    }
  }

  /* ── Loading ── */
  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="skeleton h-5 w-56 rounded-lg" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-3">
            <div className="skeleton aspect-[4/3] rounded-2xl" />
            <div className="grid grid-cols-4 gap-2">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="skeleton aspect-square rounded-xl" />
              ))}
            </div>
          </div>
          <div className="space-y-4 pt-2">
            <div className="skeleton h-4 w-24 rounded" />
            <div className="skeleton h-9 w-3/4 rounded-lg" />
            <div className="flex items-center gap-3">
              <div className="skeleton h-10 w-10 rounded-full" />
              <div className="skeleton h-4 w-32 rounded" />
            </div>
            <div className="skeleton h-10 w-36 rounded-lg" />
            <div className="skeleton h-24 rounded-xl" />
            <div className="grid grid-cols-2 gap-3">
              <div className="skeleton h-16 rounded-xl" />
              <div className="skeleton h-16 rounded-xl" />
            </div>
            <div className="flex gap-3">
              <div className="skeleton h-12 w-32 rounded-xl" />
              <div className="skeleton h-12 flex-1 rounded-xl" />
              <div className="skeleton h-12 flex-1 rounded-xl" />
            </div>
          </div>
        </div>
      </div>
    )
  }

  /* ── Not found ── */
  if (!product) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center animate-fade-in px-4">
        <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-5">
          <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-text mb-2">Product not found</h1>
        <p className="text-muted-text mb-6 max-w-xs">
          The product you're looking for doesn't exist or has been removed.
        </p>
        <Link to="/products"
          className="bg-primary text-white px-6 py-3 rounded-xl font-medium
                     hover:bg-primary/90 active:scale-[0.98] transition-all duration-200">
          Browse products
        </Link>
      </div>
    )
  }

  const images = product.images?.length
    ? product.images
    : ['https://placehold.co/1000x750?text=Product']

  return (
    <>
      <div className="space-y-8 sm:space-y-12 animate-fade-in">

        {/* ── Breadcrumb ── */}
        <nav className="flex items-center gap-1.5 text-sm text-muted-text flex-wrap">
          {[
            { to: '/', label: 'Home' },
            { to: '/products', label: 'Products' },
            { to: `/products?category=${product.category}`, label: product.category },
          ].map(({ to, label }) => (
            <span key={to} className="flex items-center gap-1.5">
              <Link to={to} className="hover:text-secondary transition-colors duration-200">
                {label}
              </Link>
              <svg className="h-3.5 w-3.5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </span>
          ))}
          <span className="text-text font-medium truncate max-w-[180px] sm:max-w-[300px]">
            {product.name}
          </span>
        </nav>

        {/* ── Main Grid ── */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-12">

          {/* ─ Images Column ─ */}
          <div className="space-y-3">
            {/* Main image with swipe */}
            <div
              className="relative rounded-2xl overflow-hidden border border-border
                         bg-white cursor-pointer group"
              ref={sliderRef}
              onClick={() => setLightboxOpen(true)}
              onTouchStart={(e) => { touchStartX.current = e.touches[0].clientX }}
              onTouchEnd={(e) => {
                const delta = e.changedTouches[0].clientX - touchStartX.current
                if (Math.abs(delta) > 60) {
                  handleMobileSwipe(delta < 0 ? 'left' : 'right')
                }
              }}
            >
              {!imgLoaded && <div className="skeleton aspect-[4/3] w-full" />}
              <img
                key={selectedImage}
                src={selectedImage}
                alt={product.name}
                onLoad={() => setImgLoaded(true)}
                className={`w-full aspect-[4/3] object-cover transition-all duration-300
                  ${imgLoaded ? 'opacity-100' : 'opacity-0 absolute inset-0'}
                  group-hover:scale-[1.02]`}
                draggable={false}
              />

              {/* Expand icon overlay */}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5
                              transition-colors duration-300 flex items-center justify-center">
                <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300
                                bg-white/90 backdrop-blur-sm rounded-full p-3 shadow-lg">
                  <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                  </svg>
                </div>
              </div>

              {/* Discount badge */}
              {hasDiscount && (
                <span className="absolute top-3 left-3 bg-danger text-white text-xs
                                 font-bold px-2.5 py-1 rounded-full shadow-sm">
                  -{discountPct}%
                </span>
              )}

              {/* Wishlist button */}
              <button
                onClick={(e) => { e.stopPropagation(); setWishlist(!wishlist) }}
                className={`absolute top-3 right-3 p-2.5 rounded-full shadow-md
                            transition-all duration-200 active:scale-90
                            ${wishlist
                              ? 'bg-red-500 text-white'
                              : 'bg-white/90 backdrop-blur-sm text-gray-600 hover:text-red-500'}`}
                aria-label={wishlist ? 'Remove from wishlist' : 'Add to wishlist'}
              >
                <svg className="w-5 h-5" fill={wishlist ? 'currentColor' : 'none'}
                     stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5
                       4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
              </button>

              {/* Mobile image indicators */}
              {images.length > 1 && (
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5
                                sm:hidden">
                  {images.map((_, idx) => (
                    <div
                      key={idx}
                      className={`rounded-full transition-all duration-200
                        ${idx === currentImageIndex
                          ? 'w-6 h-2 bg-white'
                          : 'w-2 h-2 bg-white/50'}`}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Thumbnail grid - desktop */}
            {images.length > 1 && (
              <div className="hidden sm:grid grid-cols-4 lg:grid-cols-5 gap-2">
                {images.map((img, idx) => (
                  <button
                    key={`${img}-${idx}`}
                    onClick={() => handleImageSelect(img, idx)}
                    className={`rounded-xl overflow-hidden border-2 transition-all duration-200
                      ${currentImageIndex === idx
                        ? 'border-secondary shadow-sm ring-2 ring-secondary/20'
                        : 'border-transparent hover:border-border opacity-70 hover:opacity-100'}`}
                  >
                    <img src={img} alt={`${product.name} view ${idx + 1}`}
                         className="w-full aspect-square object-cover" />
                  </button>
                ))}
              </div>
            )}

            {/* Mobile thumbnail strip */}
            {images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto hide-scrollbar sm:hidden pb-1">
                {images.map((img, idx) => (
                  <button
                    key={`m-${img}-${idx}`}
                    onClick={() => handleImageSelect(img, idx)}
                    className={`shrink-0 w-16 h-16 rounded-xl overflow-hidden border-2
                                transition-all duration-200
                      ${currentImageIndex === idx
                        ? 'border-secondary'
                        : 'border-transparent opacity-60'}`}
                  >
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* ─ Info Column ─ */}
          <div className="flex flex-col gap-5">

            {/* Category */}
            <div className="flex items-center gap-2">
              <Link
                to={`/products?category=${product.category}`}
                className="text-xs font-semibold uppercase tracking-widest text-secondary
                           bg-green-50 px-2.5 py-1 rounded-full
                           hover:bg-green-100 transition-colors duration-200"
              >
                {product.category}
              </Link>
            </div>

            {/* Name */}
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-text leading-tight">
              {product.name}
            </h1>

            {/* Rating summary */}
            <div className="flex items-center gap-3 flex-wrap">
              <StarRating rating={avgRating} size="md" />
              <span className="text-sm font-semibold text-text">{avgRating.toFixed(1)}</span>
              <button
                onClick={() => setActiveTab('reviews')}
                className="text-sm text-secondary hover:underline underline-offset-2
                           transition-colors duration-200"
              >
                {reviews.length} review{reviews.length !== 1 ? 's' : ''}
              </button>
              <span className="w-px h-4 bg-border" />
              <span className="text-sm text-muted-text">100+ sold</span>
            </div>

            {/* Seller info */}
            <div className="flex items-center gap-3 p-3 rounded-xl bg-background border border-border">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center
                              justify-center overflow-hidden shrink-0">
                <img
                  src={`https://api.dicebear.com/7.x/initials/svg?seed=${product.sellerName || 'eShop'}&backgroundColor=dbeafe&textColor=1e40af`}
                  alt={product.sellerName || 'eShop Official'}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-text truncate">
                  {product.sellerName || 'eShop Official'}
                </p>
                <div className="flex items-center gap-1.5">
                  <span className="inline-flex items-center gap-1 text-xs text-muted-text">
                    <svg className="w-3 h-3 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0
                           00-1.414-1.414L9 10.586 7.707 9.293a1 1 0
                           00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                        clipRule="evenodd" />
                    </svg>
                    Verified Seller
                  </span>
                  <span className="text-gray-300">•</span>
                  <span className="text-xs text-muted-text">98% positive</span>
                </div>
              </div>
              <Link to="#" className="ml-auto text-xs font-medium text-secondary
                                     hover:underline underline-offset-2 shrink-0">
                Visit Store →
              </Link>
            </div>

            {/* Price */}
            <div className="flex items-baseline gap-3 flex-wrap">
              <span className="text-3xl sm:text-4xl font-bold text-accent">
                {formatPrice(displayPrice)}
              </span>
              {hasDiscount && (
                <>
                  <span className="text-lg text-muted-text line-through">
                    {formatPrice(product.price)}
                  </span>
                  <span className="text-sm font-semibold bg-green-100 text-green-700
                                   px-3 py-1 rounded-full">
                    Save {formatPrice(product.price - product.salePrice!)} ({discountPct}%)
                  </span>
                </>
              )}
            </div>

            {/* Info tiles */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
              <div className="rounded-xl border border-border bg-white p-3.5">
                <p className="text-muted-text text-xs mb-1">Availability</p>
                <p className={`font-semibold ${product.stock > 0 ? 'text-secondary' : 'text-danger'}`}>
                  {product.stock > 0 ? `In stock (${product.stock})` : 'Out of stock'}
                </p>
              </div>
              <div className="rounded-xl border border-border bg-white p-3.5">
                <p className="text-muted-text text-xs mb-1">Delivery</p>
                <p className="font-semibold text-text">1–3 business days</p>
              </div>
              <div className="rounded-xl border border-border bg-white p-3.5 col-span-2 sm:col-span-1">
                <p className="text-muted-text text-xs mb-1">Returns</p>
                <p className="font-semibold text-text">30-day free returns</p>
              </div>
            </div>

            {/* Quantity + CTA */}
            <div className="space-y-3">
              <div className="flex items-center gap-3 flex-wrap">
                {/* Quantity */}
                <div className="inline-flex items-center rounded-xl border border-border
                                overflow-hidden bg-white">
                  <button
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    disabled={quantity <= 1}
                    className="px-4 py-3 text-lg font-medium text-text
                               hover:bg-background active:bg-gray-100
                               disabled:opacity-30 transition-colors duration-150"
                    aria-label="Decrease quantity"
                  >
                    −
                  </button>
                  <span className="min-w-[3rem] text-center font-semibold text-text
                                   tabular-nums">
                    {quantity}
                  </span>
                  <button
                    onClick={() => setQuantity((q) => Math.min(product.stock || 99, q + 1))}
                    disabled={product.stock === 0 || quantity >= product.stock}
                    className="px-4 py-3 text-lg font-medium text-text
                               hover:bg-background active:bg-gray-100
                               disabled:opacity-30 transition-colors duration-150"
                    aria-label="Increase quantity"
                  >
                    +
                  </button>
                </div>

                {/* Add to cart */}
                <button
                  onClick={handleAddToCart}
                  disabled={product.stock === 0}
                  className={`flex-1 min-w-[140px] flex items-center justify-center gap-2
                              py-3.5 px-4 rounded-xl font-semibold text-sm
                              active:scale-[0.98] transition-all duration-200
                              disabled:opacity-40 disabled:cursor-not-allowed
                              ${added
                                ? 'bg-green-100 text-green-700 border border-green-200'
                                : 'bg-primary text-white hover:bg-primary/90 hover:shadow-lg'}`}
                >
                  {added ? (
                    <>
                      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                      Added to Cart!
                    </>
                  ) : (
                    <>
                      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                      Add to Cart
                    </>
                  )}
                </button>
              </div>

              {/* Buy now - full width */}
              <button
                onClick={handleBuyNow}
                disabled={product.stock === 0}
                className="w-full py-3.5 px-4 rounded-xl bg-secondary text-white
                           font-semibold text-sm flex items-center justify-center gap-2
                           hover:bg-secondary/90 hover:shadow-lg
                           active:scale-[0.98]
                           disabled:opacity-40 disabled:cursor-not-allowed
                           transition-all duration-200"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Buy Now · {formatPrice(displayPrice * quantity)}
              </button>

              {product.sellerId && (
                <button
                  onClick={handleMessageSeller}
                  className="w-full py-3.5 px-4 rounded-xl border border-border bg-white
                             text-text font-semibold text-sm flex items-center justify-center gap-2
                             hover:bg-gray-50 hover:border-gray-300
                             active:scale-[0.98]
                             transition-all duration-200"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M7 8h10M7 12h6m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                  </svg>
                  Message seller
                </button>
              )}

              {product.stock === 0 && (
                <p className="text-xs text-danger font-medium animate-fade-in flex items-center gap-1.5">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                  This item is currently out of stock. Save it to your wishlist!
                </p>
              )}
            </div>

            {/* Trust badges */}
            <div className="flex items-center gap-4 sm:gap-6 py-2 flex-wrap">
              {[
                { icon: '🔒', text: 'Secure Payment' },
                { icon: '🚚', text: 'Fast Shipping' },
                { icon: '↩️', text: '30-Day Returns' },
                { icon: '✅', text: 'Genuine Product' },
              ].map(({ icon, text }) => (
                <div key={text} className="flex items-center gap-1.5 text-xs text-muted-text">
                  <span className="text-sm">{icon}</span>
                  <span>{text}</span>
                </div>
              ))}
            </div>

            {/* Tags */}
            {product.tags?.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {product.tags.map((tag) => (
                  <Link
                    key={tag}
                    to={`/products?search=${tag}`}
                    className="text-xs bg-background border border-border rounded-full
                               px-3 py-1.5 text-muted-text
                               hover:bg-secondary/10 hover:text-secondary hover:border-secondary/30
                               transition-all duration-200"
                  >
                    #{tag}
                  </Link>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* ── Tabs Section ── */}
        <section>
          {/* Tab headers */}
          <div className="flex border-b border-border overflow-x-auto hide-scrollbar">
            {(['description', 'reviews', 'shipping'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`shrink-0 px-5 sm:px-6 py-3.5 text-sm font-medium
                            border-b-2 transition-all duration-200
                            ${activeTab === tab
                              ? 'border-secondary text-secondary'
                              : 'border-transparent text-muted-text hover:text-text hover:border-gray-200'}`}
              >
                {tab === 'reviews'
                  ? `Reviews (${reviews.length})`
                  : tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="pt-6 animate-fade-in" key={activeTab}>

            {/* Description Tab */}
            {activeTab === 'description' && (
              <div className="max-w-3xl">
                <div className={`relative ${!descExpanded ? 'max-h-48 overflow-hidden' : ''}`}>
                  <div className="prose prose-sm text-muted-text leading-relaxed space-y-4">
                    <p>{product.description}</p>
                    <p>
                      Our products undergo rigorous quality testing to ensure they meet
                      the highest standards. Each item is carefully inspected before
                      shipping to guarantee your complete satisfaction.
                    </p>
                    <h3 className="text-text font-semibold text-base mt-6">Key Features</h3>
                    <ul className="space-y-2">
                      {(product.features || ['Premium quality materials', 'Designed for durability and long-lasting use',
                        'Tested and certified for safety', 'Eco-friendly packaging',
                        'Compatible with a wide range of devices']).map((feature) => (
                        <li key={feature} className="flex items-start gap-2">
                          <svg className="w-4 h-4 text-secondary mt-0.5 shrink-0"
                               fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd"
                              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0
                                 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0
                                 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                              clipRule="evenodd" />
                          </svg>
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                    <h3 className="text-text font-semibold text-base mt-6">Specifications</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {Object.entries(product.specs || {
                        'Brand': product.sellerName || 'eShop',
                        'Category': product.category,
                        'SKU': product.id.slice(0, 8).toUpperCase(),
                        'Weight': '0.5 kg',
                        'Warranty': '12 months',
                        'Origin': 'Imported',
                      }).map(([label, value]) => (
                        <div key={label} className="flex justify-between py-2 border-b border-border/50">
                          <span className="text-muted-text">{label}</span>
                          <span className="font-medium text-text">{value}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Fade overlay when collapsed */}
                  {!descExpanded && (
                    <div className="absolute bottom-0 left-0 right-0 h-20
                                    bg-gradient-to-t from-background to-transparent" />
                  )}
                </div>

                <button
                  onClick={() => setDescExpanded(!descExpanded)}
                  className="mt-3 text-sm font-medium text-secondary flex items-center gap-1.5
                             hover:underline underline-offset-2 transition-colors duration-200"
                >
                  {descExpanded ? 'Show less' : 'Read more'}
                  <svg className={`w-4 h-4 transition-transform duration-200
                    ${descExpanded ? 'rotate-180' : ''}`}
                    fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round"
                          strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              </div>
            )}

            {/* Reviews Tab */}
            {activeTab === 'reviews' && (
              <div className="space-y-8">

                {/* Rating overview */}
                <div className="flex flex-col sm:flex-row gap-8 p-5 sm:p-6 rounded-2xl
                                bg-white border border-border">
                  {/* Left: overall score */}
                  <div className="flex flex-col items-center justify-center sm:min-w-[160px]">
                    <span className="text-5xl font-bold text-text">{avgRating.toFixed(1)}</span>
                    <StarRating rating={avgRating} size="lg" />
                    <span className="text-sm text-muted-text mt-1.5">
                      {reviews.length} review{reviews.length !== 1 ? 's' : ''}
                    </span>
                  </div>

                  {/* Right: distribution bars */}
                  <div className="flex-1 space-y-2">
                    {ratingDistribution.map((count, idx) => {
                      const star = 5 - idx
                      const pct = reviews.length > 0 ? (count / reviews.length) * 100 : 0
                      return (
                        <div key={star} className="flex items-center gap-3">
                          <span className="text-sm text-muted-text w-8 text-right shrink-0">
                            {star}★
                          </span>
                          <div className="flex-1 h-2.5 rounded-full bg-gray-100 overflow-hidden">
                            <div
                              className="h-full bg-amber-400 rounded-full transition-all duration-500"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="text-xs text-muted-text w-8 shrink-0">{count}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {sortedReviews.length > 0 ? (
                  <>
                    <div className="flex items-center justify-between flex-wrap gap-3">
                      <button
                        onClick={() => setShowReviewForm(!showReviewForm)}
                        className="px-5 py-2.5 rounded-xl bg-primary text-white text-sm
                                   font-semibold hover:bg-primary/90 active:scale-[0.98]
                                   transition-all duration-200 flex items-center gap-2"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        Write a Review
                      </button>

                      <Dropdown
                        options={reviewSortOptions}
                        value={reviewSort}
                        onChange={(value) => setReviewSort(value as typeof reviewSort)}
                        className="w-full sm:w-56"
                        buttonClassName="px-3 py-2 text-sm"
                      />
                    </div>

                    {showReviewForm && (
                      <div className="p-5 sm:p-6 rounded-2xl border border-border bg-white
                                      animate-slide-up space-y-4">
                        <h3 className="font-bold text-text">Write your review</h3>

                        <div>
                          <p className="text-sm text-muted-text mb-2">Your rating</p>
                          <StarRating rating={userRating} size="lg" interactive onChange={setUserRating} />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-text mb-1.5">
                            Review title
                          </label>
                          <input
                            type="text"
                            value={userReviewTitle}
                            onChange={(e) => setUserReviewTitle(e.target.value)}
                            placeholder="Summarize your experience"
                            className="w-full rounded-xl border border-border bg-white px-4 py-2.5
                                       text-sm outline-none focus:border-primary focus:ring-2
                                       focus:ring-primary/20 transition-all duration-200"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-text mb-1.5">
                            Your review
                          </label>
                          <textarea
                            value={userReviewBody}
                            onChange={(e) => setUserReviewBody(e.target.value)}
                            placeholder="What did you like or dislike about this product?"
                            rows={4}
                            className="w-full rounded-xl border border-border bg-white px-4 py-2.5
                                       text-sm outline-none focus:border-primary focus:ring-2
                                       focus:ring-primary/20 transition-all duration-200 resize-none"
                          />
                        </div>

                        <div className="flex gap-2 justify-end">
                          <button
                            onClick={() => setShowReviewForm(false)}
                            className="px-4 py-2.5 rounded-xl border border-border text-sm
                                       font-medium hover:bg-background transition-all duration-200"
                          >
                            Cancel
                          </button>
                          <button
                            disabled={!userRating || !userReviewBody.trim()}
                            className="px-5 py-2.5 rounded-xl bg-primary text-white text-sm
                                       font-semibold hover:bg-primary/90 disabled:opacity-50
                                       disabled:cursor-not-allowed active:scale-[0.98]
                                       transition-all duration-200"
                          >
                            Submit Review
                          </button>
                        </div>
                      </div>
                    )}

                    <div className="space-y-4">
                      {sortedReviews.map((review, idx) => (
                    <article
                      key={review.id}
                      className="p-5 rounded-2xl border border-border bg-white
                                 hover:border-gray-200 transition-colors duration-200"
                      style={{ animationDelay: `${idx * 50}ms` }}
                    >
                      <div className="flex items-start gap-3">
                        <img
                          src={review.avatar}
                          alt={review.userName}
                          className="w-10 h-10 rounded-full bg-gray-100 shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-sm text-text">
                              {review.userName}
                            </span>
                            {review.verified && (
                              <span className="inline-flex items-center gap-0.5 text-[10px]
                                               font-semibold text-green-700 bg-green-50
                                               px-2 py-0.5 rounded-full">
                                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd"
                                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0
                                       00-1.414-1.414L9 10.586 7.707 9.293a1 1 0
                                       00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                                    clipRule="evenodd" />
                                </svg>
                                Verified
                              </span>
                            )}
                            <span className="text-xs text-muted-text">{review.date}</span>
                          </div>
                          <div className="mt-1">
                            <StarRating rating={review.rating} size="sm" />
                          </div>
                          <h4 className="mt-2 font-semibold text-sm text-text">
                            {review.title}
                          </h4>
                          <p className="mt-1 text-sm text-muted-text leading-relaxed">
                            {review.body}
                          </p>

                          {/* Helpful button */}
                          <div className="mt-3 flex items-center gap-4">
                            <button className="flex items-center gap-1.5 text-xs text-muted-text
                                               hover:text-text transition-colors duration-200 group">
                              <svg className="w-4 h-4 group-hover:text-secondary transition-colors"
                                   fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                  d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263
                                     21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0
                                     00-2-2h-.095c-.5 0-.905.405-.905.905 0
                                     .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2
                                     0 01-2-2v-6a2 2 0 012-2h2.5" />
                              </svg>
                              Helpful ({review.helpful})
                            </button>
                            <button className="text-xs text-muted-text hover:text-text
                                               transition-colors duration-200">
                              Report
                            </button>
                          </div>
                        </div>
                      </div>
                      </article>
                    ))}
                    </div>
                  </>
                ) : (
                  <div className="p-6 rounded-2xl border border-dashed border-border bg-white text-center">
                    <p className="font-semibold text-text">No reviews yet</p>
                    <p className="text-sm text-muted-text mt-2">
                      Reviews will appear here after customers submit them and they are stored in the backend.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Shipping Tab */}
            {activeTab === 'shipping' && (
              <div className="max-w-3xl space-y-6">
                {[
                  {
                    icon: '🚚',
                    title: 'Standard Shipping',
                    desc: 'Delivered in 3–5 business days. Free for orders over $50.',
                    price: '$4.99',
                  },
                  {
                    icon: '⚡',
                    title: 'Express Shipping',
                    desc: 'Delivered in 1–2 business days.',
                    price: '$12.99',
                  },
                  {
                    icon: '🏪',
                    title: 'Store Pickup',
                    desc: 'Ready for pickup within 24 hours at your nearest store.',
                    price: 'Free',
                  },
                ].map(({ icon, title, desc, price }) => (
                  <div key={title}
                    className="flex items-start gap-4 p-4 rounded-xl border border-border bg-white">
                    <span className="text-2xl">{icon}</span>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-text">{title}</h3>
                        <span className={`text-sm font-bold
                          ${price === 'Free' ? 'text-secondary' : 'text-text'}`}>
                          {price}
                        </span>
                      </div>
                      <p className="text-sm text-muted-text mt-1">{desc}</p>
                    </div>
                  </div>
                ))}

                <div className="p-4 rounded-xl border border-border bg-white">
                  <h3 className="font-semibold text-text mb-3 flex items-center gap-2">
                    <span>↩️</span> Return Policy
                  </h3>
                  <ul className="space-y-2 text-sm text-muted-text">
                    {[
                      '30-day return window from date of delivery',
                      'Items must be in original condition and packaging',
                      'Free return shipping on defective items',
                      'Refund processed within 5–7 business days',
                    ].map((item) => (
                      <li key={item} className="flex items-start gap-2">
                        <svg className="w-4 h-4 text-secondary mt-0.5 shrink-0"
                             fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd"
                            d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1
                               0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0
                               00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                            clipRule="evenodd" />
                        </svg>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* ── Related Products ── */}
        {related.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xl sm:text-2xl font-bold text-text">
                You may also like
              </h2>
              <Link to="/products"
                className="text-sm font-medium text-secondary hover:underline
                           underline-offset-2 transition-colors duration-200">
                View all →
              </Link>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4
                            gap-3 sm:gap-5 stagger-children">
              {related.map((item) => (
                <ProductCard key={item.id} product={item} />
              ))}
            </div>
          </section>
        )}
      </div>

      {/* ── Mobile Sticky Bottom Bar ── */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t
                      border-border p-3 flex items-center gap-3 z-40 safe-bottom
                      lg:hidden animate-slide-up">
        <div className="min-w-0">
          <p className="text-lg font-bold text-accent">{formatPrice(displayPrice * quantity)}</p>
          {hasDiscount && (
            <p className="text-xs text-muted-text line-through">{formatPrice(product.price * quantity)}</p>
          )}
        </div>
        <button
          onClick={handleAddToCart}
          disabled={product.stock === 0}
          className={`flex-1 py-3 rounded-xl font-semibold text-sm flex items-center
                      justify-center gap-2 active:scale-[0.98] transition-all duration-200
                      disabled:opacity-40
                      ${added
                        ? 'bg-green-100 text-green-700 border border-green-200'
                        : 'bg-primary text-white'}`}
        >
          {added ? '✓ Added' : 'Add to Cart'}
        </button>
        <button
          onClick={handleBuyNow}
          disabled={product.stock === 0}
          className="flex-1 py-3 rounded-xl bg-secondary text-white font-semibold text-sm
                     active:scale-[0.98] transition-all duration-200 disabled:opacity-40"
        >
          Buy Now
        </button>
      </div>

      {/* Extra padding on mobile for sticky bar */}
      <div className="h-20 lg:hidden" />

      {/* ── Lightbox ── */}
      {lightboxOpen && (
        <ImageLightbox
          images={images}
          startIndex={currentImageIndex}
          onClose={() => setLightboxOpen(false)}
        />
      )}
    </>
  )
}

export default ProductDetailPage