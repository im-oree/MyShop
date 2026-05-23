import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { orderService } from '@/services/orderService'
import { productService } from '@/services/productService'
import { formatDate, formatPrice } from '@/utils'
import { OrderStageBadge, OrderStageTimeline } from '@/components/OrderStageIndicator'
import { formatRelativeTime } from '@/utils/orderStage'
import { messageService } from '@/services/messageService'

function OrderDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { isAuthenticated } = useAuthStore()
  const [order, setOrder] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

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
    if (!isAuthenticated) {
      navigate('/login')
      return
    }

    if (!id) {
      setError('Order not found')
      setLoading(false)
      return
    }

    ;(async () => {
      try {
        setLoading(true)
        const data = await orderService.getById(id)
        setOrder(await hydrateOrderItems(data))
      } catch (err) {
        console.error('Failed to load order details:', err)
        setError('Unable to load this order right now.')
      } finally {
        setLoading(false)
      }
    })()
  }, [id, isAuthenticated, navigate])

  if (loading) {
    return <div className="space-y-4 animate-pulse"><div className="skeleton h-12 w-56 rounded" /><div className="skeleton h-64 rounded-2xl" /></div>
  }

  if (error) {
    return (
      <div className="text-center py-16">
        <h1 className="text-2xl font-bold text-text mb-2">Order not available</h1>
        <p className="text-muted-text mb-6">{error}</p>
        <Link to="/orders" className="text-secondary font-medium hover:underline">Back to orders</Link>
      </div>
    )
  }

  if (!order) {
    return <div className="text-center py-16 text-muted-text">Order not found.</div>
  }

  const handleMessageSeller = async () => {
    const firstItem = order.items?.[0]
    if (!firstItem) return
    const conversation = await messageService.startConversation({ orderId: order.id })
    navigate(`/messages?conversationId=${conversation.id}`)
  }

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <button onClick={() => navigate(-1)} className="text-secondary text-sm font-medium hover:underline mb-2">← Back</button>
          <h1 className="text-3xl font-bold text-text">Order {order.id}</h1>
          <p className="text-muted-text mt-1">Placed {formatDate(order.createdAt)} • {formatRelativeTime(order.createdAt)}</p>
        </div>
        <OrderStageBadge status={order.status} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <section className="rounded-2xl border border-border bg-white p-5 sm:p-6">
            <h2 className="text-lg font-bold text-text mb-4">Items</h2>
            <div className="space-y-3">
              {order.items.map((item: any) => (
                <div key={item.productId} className="flex items-center justify-between gap-4 rounded-xl border border-border/70 p-4">
                  <div className="min-w-0">
                    <p className="font-semibold text-text truncate">{item.productName}</p>
                    <p className="text-sm text-muted-text">Qty: {item.quantity}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-semibold text-text">{formatPrice(item.price * item.quantity)}</p>
                    <p className="text-xs text-muted-text">{formatPrice(item.price)} each</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-border bg-white p-5 sm:p-6">
            <h2 className="text-lg font-bold text-text mb-4">Shipping Address</h2>
            <div className="text-sm text-text space-y-1">
              <p className="font-medium">{order.shippingAddress?.street}</p>
              <p>{order.shippingAddress?.city}, {order.shippingAddress?.state} {order.shippingAddress?.zipCode}</p>
              <p className="text-sm">Phone: {order.shippingAddress?.phone}</p>
              {order.shippingAddress?.whatsapp && <p className="text-sm text-muted-text">WhatsApp: {order.shippingAddress?.whatsapp}</p>}
              <p className="text-muted-text">{order.shippingAddress?.country}</p>
            </div>
          </section>
        </div>

        <aside className="space-y-6">
          <section className="rounded-2xl border border-border bg-white p-5 sm:p-6">
            <h2 className="text-lg font-bold text-text mb-4">Summary</h2>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between text-muted-text">
                <span>Payment</span>
                <span className="font-medium text-text">{order.paymentStatus}</span>
              </div>
              <div className="flex justify-between text-muted-text">
                <span>Method</span>
                <span className="font-medium text-text">{order.paymentMethod}</span>
              </div>
              <div className="flex justify-between text-muted-text">
                <span>Items</span>
                <span className="font-medium text-text">{order.items.length}</span>
              </div>
              <div className="flex justify-between text-muted-text">
                <span>Stage</span>
                <span className="font-medium text-text">{order.status}</span>
              </div>
            </div>
            <div className="border-t border-border mt-4 pt-4 flex items-center justify-between">
              <span className="font-bold text-text">Total</span>
              <span className="text-xl font-bold text-accent">{formatPrice(order.totalAmount)}</span>
            </div>
          </section>

          <OrderStageTimeline status={order.status} />

          <button onClick={handleMessageSeller} className="rounded-2xl border border-border bg-white px-5 py-3 font-medium text-text hover:bg-gray-50">
            Message store about this order
          </button>

          <Link
            to="/orders"
            className="block text-center rounded-2xl border border-border bg-white px-5 py-3 font-medium text-text hover:bg-gray-50"
          >
            Back to orders
          </Link>
        </aside>
      </div>
    </div>
  )
}

export default OrderDetailPage