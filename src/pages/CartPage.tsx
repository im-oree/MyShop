import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { useCartStore } from '@/store/cartStore'
import { formatPrice } from '@/utils'

function CartPage() {
  const navigate          = useNavigate()
  const { isAuthenticated } = useAuthStore()
  const { items, removeItem, updateQuantity, getTotal } = useCartStore()
  const [removingId, setRemovingId] = useState<string | null>(null)

  useEffect(() => {
    if (!isAuthenticated) navigate('/login')
  }, [isAuthenticated, navigate])

  const total    = getTotal()
  const shipping = total > 50 ? 0 : 4.99
  const grandTotal = total + shipping

  const handleRemove = (id: string) => {
    setRemovingId(id)
    setTimeout(() => {
      removeItem(id)
      setRemovingId(null)
    }, 250)
  }

  /* ── Empty state ── */
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24
                      text-center px-4 animate-fade-in">
        <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center
                        justify-center mb-6">
          <svg className="w-10 h-10 text-gray-400" fill="none"
               stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293
                 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100
                 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-text mb-2">Your cart is empty</h1>
        <p className="text-muted-text mb-8 max-w-xs">
          Looks like you haven't added anything yet. Start shopping!
        </p>
        <Link
          to="/products"
          className="bg-primary text-white px-8 py-3 rounded-xl font-semibold
                     hover:bg-primary/90 active:scale-[0.98] transition-all duration-200"
        >
          Browse Products
        </Link>
      </div>
    )
  }

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 sm:mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-text tracking-tight">
            Shopping Cart
          </h1>
          <p className="text-sm text-muted-text mt-1">
            {items.length} item{items.length !== 1 ? 's' : ''} in your cart
          </p>
        </div>
        <Link
          to="/products"
          className="text-sm font-medium text-secondary hover:text-green-700
                     hover:underline underline-offset-2 transition-colors duration-200
                     hidden sm:block"
        >
          ← Continue shopping
        </Link>
      </div>

      {/* Free shipping banner */}
      {total < 50 && (
        <div className="mb-5 rounded-xl border border-blue-200 bg-blue-50
                        px-4 py-3 text-sm text-blue-800 flex items-center gap-2 animate-slide-down">
          <svg className="h-4 w-4 text-blue-500 shrink-0" fill="none"
               stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Add{' '}
          <span className="font-semibold">{formatPrice(50 - total)}</span>
          {' '}more for free shipping!
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Items list */}
        <div className="lg:col-span-2 space-y-3">
          {items.map((item) => (
            <div
              key={item.productId}
              className={`bg-card border border-border rounded-2xl p-4
                          transition-all duration-250
                          ${removingId === item.productId
                            ? 'opacity-0 scale-95'
                            : 'opacity-100 scale-100'}`}
            >
              <div className="flex gap-4">
                {/* Product image placeholder */}
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl bg-background
                                border border-border shrink-0 overflow-hidden flex
                                items-center justify-center">
                  <svg className="w-8 h-8 text-gray-300" fill="none"
                       stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                      d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2
                         2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2
                         0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold text-text text-sm sm:text-base truncate">
                        Product #{item.productId.slice(0, 8)}
                      </p>
                      <p className="text-xs text-muted-text mt-0.5">
                        {formatPrice(item.price)} each
                      </p>
                    </div>
                    <p className="font-bold text-accent shrink-0">
                      {formatPrice(item.price * item.quantity)}
                    </p>
                  </div>

                  {/* Quantity + remove */}
                  <div className="flex items-center justify-between mt-3">
                    <div className="inline-flex items-center rounded-xl border border-border
                                    overflow-hidden bg-white text-sm">
                      <button
                        onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                        disabled={item.quantity <= 1}
                        className="px-3 py-2 text-text hover:bg-background
                                   active:bg-gray-100 disabled:opacity-30
                                   transition-colors duration-150"
                        aria-label="Decrease quantity"
                      >
                        −
                      </button>
                      <span className="min-w-[2.5rem] text-center font-semibold py-2">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                        className="px-3 py-2 text-text hover:bg-background
                                   active:bg-gray-100 transition-colors duration-150"
                        aria-label="Increase quantity"
                      >
                        +
                      </button>
                    </div>

                    <button
                      onClick={() => handleRemove(item.productId)}
                      className="flex items-center gap-1.5 text-xs font-medium text-danger
                                 hover:text-red-700 hover:bg-red-50 px-3 py-2 rounded-lg
                                 transition-all duration-200"
                    >
                      <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round"
                              strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138
                              21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1
                              1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}

          {/* Continue shopping - mobile */}
          <Link
            to="/products"
            className="flex items-center justify-center gap-2 w-full py-3 rounded-xl
                       border border-border text-sm font-medium text-text
                       hover:bg-background active:bg-gray-100 transition-all duration-200
                       sm:hidden"
          >
            ← Continue shopping
          </Link>
        </div>

        {/* Order summary */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-2xl border border-border p-5 sm:p-6
                          sticky top-24 space-y-4">
            <h2 className="text-lg font-bold text-text">Order Summary</h2>

            <div className="space-y-3 text-sm">
              <div className="flex justify-between text-muted-text">
                <span>
                  Subtotal ({items.reduce((acc, i) => acc + i.quantity, 0)} items)
                </span>
                <span className="font-medium text-text">{formatPrice(total)}</span>
              </div>
              <div className="flex justify-between text-muted-text">
                <span>Shipping</span>
                <span className={`font-medium ${shipping === 0 ? 'text-secondary' : 'text-text'}`}>
                  {shipping === 0 ? 'Free 🎉' : formatPrice(shipping)}
                </span>
              </div>
            </div>

            <div className="border-t border-border pt-4">
              <div className="flex justify-between">
                <span className="font-bold text-text">Total</span>
                <span className="text-xl font-bold text-accent">
                  {formatPrice(grandTotal)}
                </span>
              </div>
              {shipping > 0 && (
                <p className="text-xs text-muted-text mt-1">
                  Free shipping on orders over $50
                </p>
              )}
            </div>

            {/* Promo code field */}
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Promo code"
                className="flex-1 rounded-xl border border-border px-3 py-2.5 text-sm
                           outline-none focus:border-primary focus:ring-2 focus:ring-primary/20
                           transition-all duration-200"
              />
              <button className="px-4 py-2.5 rounded-xl border border-border text-sm font-medium
                                 text-text hover:bg-background active:scale-[0.98]
                                 transition-all duration-200">
                Apply
              </button>
            </div>

            <button
              onClick={() => navigate('/checkout')}
              className="w-full bg-primary text-white py-3.5 rounded-xl font-semibold text-sm
                         hover:bg-primary/90 hover:shadow-md
                         active:scale-[0.98]
                         transition-all duration-200 flex items-center justify-center gap-2"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0
                     00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              Proceed to Checkout
            </button>

            {/* Trust badges */}
            <div className="flex items-center justify-center gap-4 pt-1">
              {[
                { icon: '🔒', label: 'Secure checkout' },
                { icon: '↩️', label: 'Easy returns'    },
              ].map(({ icon, label }) => (
                <div key={label} className="flex items-center gap-1.5 text-xs text-muted-text">
                  <span>{icon}</span>
                  <span>{label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default CartPage