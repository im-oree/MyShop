import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { useCartStore } from '@/store/cartStore'
import { orderService, paymentService } from '@/services/orderService'
import { productService } from '@/services/productService'
import { formatPrice } from '@/utils'
import { addressService } from '@/services/authService'

function CheckoutPage() {
  const navigate = useNavigate()
  const { isAuthenticated, user } = useAuthStore()
  const { items, getTotal } = useCartStore()
  
  const [selectedAddress, setSelectedAddress] = useState<string>('')
  const [addresses, setAddresses] = useState<any[]>([])
  const [redirecting, setRedirecting] = useState(false)
  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const data = await addressService.getAll()
        if (!mounted) return
        setAddresses(data || [])
        const defaultAddr = (data || []).find((a: any) => a.isDefault) || (data || [])[0]
        if (defaultAddr) setSelectedAddress(defaultAddr.id)
      } catch (err) {
        // ignore; user can manage addresses
      }
    })()
    return () => { mounted = false }
  }, [])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  
  const total = getTotal()
  
  if (!isAuthenticated) {
    navigate('/login')
    return null
  }
  
  if (items.length === 0) {
    navigate('/cart')
    return null
  }
  
  const handleCreateOrder = async () => {
    try {
      setLoading(true)
      setError('')
      
      if (!selectedAddress) {
        setError('Please select a shipping address')
        return
      }
      const addr = addresses.find(a => a.id === selectedAddress)
      if (!addr?.phone) {
        setError('Selected address must include a phone number')
        return
      }
      
      const productLookup = await Promise.all(
        items.map(async (item) => {
          try {
            return await productService.getById(item.productId)
          } catch {
            return null
          }
        })
      )
      const productMap = new Map(
        productLookup
          .filter(Boolean)
          .map((product) => [product!.id, product!])
      )

      // Create order
      const order = await orderService.create({
        userId: user?.id || '',
        items: items.map(item => ({
          productId: item.productId,
          productName: productMap.get(item.productId)?.name || `Product ${item.productId}`,
          price: item.price,
          quantity: item.quantity,
        })),
        totalAmount: total,
        currency: 'NGN',
        shippingAddress: addresses.find(a => a.id === selectedAddress),
        paymentMethod: 'paystack',
        status: 'pending',
        paymentStatus: 'pending',
      })
      
      // Initialize payment
      const payment = await paymentService.initializePayment(order.id)
      
      if (payment.authorizationUrl) {
        // Store a small marker so we can show a friendly message later if needed
        try {
          sessionStorage.setItem('pendingOrderId', order.id)
        } catch {}

        setRedirecting(true)
        window.setTimeout(() => {
          window.location.href = payment.authorizationUrl
        }, 300)
      } else {
        setError('Payment initialization failed')
        setRedirecting(false)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Checkout failed')
      setRedirecting(false)
    } finally {
      setLoading(false)
    }
  }
  
  return (
    <div>
      {redirecting && (
        <div className="fixed inset-0 z-[80] bg-white/95 backdrop-blur-sm flex items-center justify-center px-4">
          <div className="max-w-sm w-full rounded-3xl border border-border bg-white shadow-2xl p-6 text-center animate-fade-in">
            <div className="mx-auto mb-4 h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center">
              <svg className="h-7 w-7 text-primary animate-spin" fill="none" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-20" />
                <path fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-text mb-2">Redirecting to Paystack</h2>
            <p className="text-sm text-muted-text">
              Please wait while we open the secure payment page.
            </p>
          </div>
        </div>
      )}

      <h1 className="text-3xl font-bold mb-6 text-primary">Checkout</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Checkout Form */}
        <div className="lg:col-span-2">
          {error && (
            <div className="bg-red-50 border border-danger rounded mb-4 p-3 text-danger text-sm">
              {error}
            </div>
          )}
          
          {/* Shipping Address Section */}
          <div className="bg-card border border-border rounded-lg p-6 mb-6">
            <h2 className="text-xl font-bold mb-4 text-primary">Shipping Address</h2>
            
            {addresses.length === 0 ? (
              <>
                <p className="text-muted-text mb-4">No addresses found.</p>
                <button
                  onClick={() => navigate('/addresses')}
                  className="text-secondary hover:underline"
                >
                  Add an Address
                </button>
              </>
            ) : (
              <>
                <div className="space-y-3 mb-4">
                  {addresses.map(addr => (
                    <label key={addr.id} className="flex items-start space-x-3 p-3 border rounded cursor-pointer hover:bg-background" style={{
                      borderColor: selectedAddress === addr.id ? '#16A34A' : '#e5e7eb'
                    }}>
                      <input
                        type="radio"
                        name="address"
                        value={addr.id}
                        checked={selectedAddress === addr.id}
                        onChange={() => setSelectedAddress(addr.id)}
                        className="mt-1"
                      />
                      <div>
                        <div className="font-medium">{addr.street}</div>
                        <div className="text-sm text-muted-text">{addr.city}, {addr.state} {addr.zipCode}</div>
                        <div className="text-sm">Phone: {addr.phone}</div>
                        {addr.whatsapp && <div className="text-sm text-muted-text">WhatsApp: {addr.whatsapp}</div>}
                      </div>
                    </label>
                  ))}
                </div>
                <button
                  onClick={() => navigate('/addresses')}
                  className="text-secondary hover:underline text-sm"
                >
                  Manage Addresses
                </button>
              </>
            )}
          </div>
          
          {/* Payment Method Section */}
          <div className="bg-card border border-border rounded-lg p-6">
            <h2 className="text-xl font-bold mb-4 text-primary">Payment Method</h2>
            
            <div className="space-y-3">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="payment"
                  value="paystack"
                  defaultChecked
                  className="mr-3"
                />
                <span>Paystack (Credit/Debit Card)</span>
              </label>
            </div>
          </div>
        </div>
        
        {/* Order Summary */}
        <div className="bg-background rounded-lg p-6 h-fit sticky top-24">
          <h2 className="text-xl font-bold mb-4 text-primary">Order Summary</h2>
          
          <div className="space-y-2 mb-4 max-h-48 overflow-y-auto">
            {items.map((item) => (
              <div key={item.productId} className="flex justify-between text-sm">
                <span className="text-muted-text">Product × {item.quantity}</span>
                <span>{formatPrice(item.price * item.quantity)}</span>
              </div>
            ))}
          </div>
          
          <div className="border-t border-border pt-4 mb-4 space-y-2">
            <div className="flex justify-between text-muted-text text-sm">
              <span>Subtotal</span>
              <span>{formatPrice(total)}</span>
            </div>
            <div className="flex justify-between text-muted-text text-sm">
              <span>Shipping</span>
              <span>₦500</span>
            </div>
          </div>
          
          <div className="border-t border-border pt-4">
            <div className="flex justify-between font-bold text-lg">
              <span>Total</span>
              <span className="text-accent">{formatPrice(total + 50000)}</span>
            </div>
          </div>
          
          <button
            onClick={handleCreateOrder}
            disabled={loading || redirecting || !selectedAddress}
            className="w-full bg-primary text-white py-3 rounded font-medium hover:bg-opacity-90 disabled:opacity-50 transition mt-6"
          >
            {redirecting ? 'Opening Paystack...' : loading ? 'Processing...' : 'Pay Now'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default CheckoutPage
