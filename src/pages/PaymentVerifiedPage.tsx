import { useEffect, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { paymentService } from '@/services/orderService'
import { productService } from '@/services/productService'
import { useCartStore } from '@/store/cartStore'
import { useAuthStore } from '@/store/authStore'
import { formatPrice } from '@/utils'

function PaymentVerifiedPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const clearCart = useCartStore((state) => state.clearCart)
  const { currentRole, switchRole } = useAuthStore()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [order, setOrder] = useState<any | null>(null)

  const hydrateOrderItems = async (sourceOrder: any) => {
    if (!sourceOrder?.items?.length) return sourceOrder

    const needsHydration = sourceOrder.items.some(
      (item: any) => !item.productName || item.productName === `Product ${item.productId}`
    )

    if (!needsHydration) return sourceOrder

    const products = await Promise.all(
      sourceOrder.items.map(async (item: any) => {
        if (item.productName && item.productName !== `Product ${item.productId}`) {
          return null
        }

        try {
          return await productService.getById(item.productId)
        } catch {
          return null
        }
      })
    )

    const productMap = new Map(
      products.filter(Boolean).map((product: any) => [product.id, product])
    )

    return {
      ...sourceOrder,
      items: sourceOrder.items.map((item: any) => ({
        ...item,
        productName: productMap.get(item.productId)?.name || item.productName,
      })),
    }
  }

  useEffect(() => {
    if (currentRole === 'seller') {
      switchRole('user')
    }

    const ref = searchParams.get('reference') || ''
    const pendingOrderId = sessionStorage.getItem('pendingOrderId') || undefined
    if (!ref) {
      setError('Missing payment reference')
      setLoading(false)
      return
    }

    ;(async () => {
      try {
        setLoading(true)
        const res = await paymentService.verifyPayment(ref, pendingOrderId)
        if (!res || !res.result || !res.result.success) {
          setError(res?.result?.message || 'Payment verification failed')
          setLoading(false)
          return
        }

        // backend returns updated order under res.order
        if (res.order) {
          const hydratedOrder = await hydrateOrderItems(res.order)
          setOrder(hydratedOrder)
        }
        try {
          sessionStorage.removeItem('pendingOrderId')
        } catch {}
        try {
          await clearCart()
        } catch {}
        setLoading(false)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Verification error')
        setLoading(false)
      }
    })()
  }, [searchParams, currentRole, switchRole])

  if (loading) return <div className="p-6">Verifying payment...</div>
  if (error) return (
    <div className="p-6">
      <div className="text-red-600">{error}</div>
      <button onClick={() => navigate('/orders')} className="mt-4 text-secondary">View orders</button>
    </div>
  )

  if (!order) return (
    <div className="p-6">Payment verified, but order details unavailable.</div>
  )

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-3">Payment verified</h1>
      <p className="mb-4">Your payment was successful. Your order is being processed — you will receive an email with tracking details.</p>

      <div className="bg-card p-4 rounded mb-4">
        <h2 className="font-medium">Order Summary</h2>
        <div className="text-sm text-muted-text mb-2">Order ID: {order.id}</div>
        <div className="space-y-2">
          {order.items.map((it: any) => (
            <div key={it.productId} className="flex justify-between">
              <div>
                <div className="font-medium">{it.productName}</div>
                <div className="text-sm text-muted-text">Qty: {it.quantity}</div>
              </div>
              <div>{formatPrice(it.price * it.quantity)}</div>
            </div>
          ))}
        </div>
        <div className="border-t pt-3 mt-3 flex justify-between font-bold">
          <div>Total</div>
          <div>{formatPrice(order.totalAmount)}</div>
        </div>
      </div>

      <div className="bg-card p-4 rounded mb-4">
        <h3 className="font-medium">Shipping Address</h3>
        <div className="text-sm text-muted-text">{order.shippingAddress?.street}</div>
        <div className="text-sm text-muted-text">{order.shippingAddress?.city}, {order.shippingAddress?.state} {order.shippingAddress?.zipCode}</div>
        <div className="text-sm">Phone: {order.shippingAddress?.phone}</div>
        {order.shippingAddress?.whatsapp && <div className="text-sm text-muted-text">WhatsApp: {order.shippingAddress?.whatsapp}</div>}
      </div>

      <div className="bg-green-50 border border-green-200 p-4 rounded">
        <div className="font-medium">Order is being processed</div>
        <div className="text-sm text-muted-text">Kindly be patient — you will receive confirmation and tracking information soon.</div>
      </div>
    </div>
  )
}

export default PaymentVerifiedPage
