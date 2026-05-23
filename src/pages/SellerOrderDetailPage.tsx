import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { orderService } from '@/services/orderService'
import { formatPrice } from '@/utils'
import { useAuthStore } from '@/store/authStore'
import { OrderStageBadge, OrderStageTimeline } from '@/components/OrderStageIndicator'
import { formatRelativeTime, normalizeOrderStage } from '@/utils/orderStage'

const STAGES = ['noted', 'processing', 'in_transit', 'completed'] as const

function nextStage(current?: string) {
  const normalized = normalizeOrderStage(current)
  const idx = STAGES.indexOf(normalized as any)
  if (idx === -1) return STAGES[0]
  return STAGES[Math.min(STAGES.length - 1, idx + 1)]
}

function SellerOrderDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [order, setOrder] = useState<any | null>(null)
  const [loading, setLoading] = useState(false)
  const { user } = useAuthStore()

  useEffect(() => {
    if (!id) return
    ;(async () => {
      try {
        setLoading(true)
        const res = await orderService.getById(id)
        setOrder(res.order || res)
      } catch (err) {
        // ignore
      } finally { setLoading(false) }
    })()
  }, [id])

  const handleAdvance = async () => {
    if (!order) return
    const next = nextStage(order.status)
    try {
      setLoading(true)
      await orderService.updateStatus(order.id, next)
      const updated = await orderService.getById(order.id)
      setOrder(updated.order || updated)
    } catch (err) {
      console.error('Failed to advance stage:', err)
    } finally { setLoading(false) }
  }

  if (loading) return <div className="p-6">Loading…</div>
  if (!order) return <div className="p-6">Order not found</div>

  return (
    <div className="p-6">
      <button onClick={() => navigate(-1)} className="text-secondary mb-4">Back</button>
      <h1 className="text-2xl font-bold mb-3">Order {order.id}</h1>

      <div className="mb-4 flex items-center gap-3">
        <OrderStageBadge status={order.status} />
        <div className="text-sm text-muted-text">Updated {formatRelativeTime(order.updatedAt || order.createdAt)}</div>
        {(user?.role === 'admin' || user?.role === 'manager') && normalizeOrderStage(order.status) !== 'completed' && (
          <button onClick={handleAdvance} className="px-3 py-2 bg-primary text-white rounded-xl">Advance Stage</button>
        )}
      </div>

      <OrderStageTimeline status={order.status} />

      <div className="bg-card p-4 rounded mb-4">
        <h3 className="font-medium">Items</h3>
        <div className="space-y-2 mt-2">
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
      </div>

      <div className="bg-card p-4 rounded mb-4">
        <h3 className="font-medium">Shipping Address</h3>
        <div className="text-sm">{order.shippingAddress?.street}</div>
        <div className="text-sm text-muted-text">{order.shippingAddress?.city}, {order.shippingAddress?.state} {order.shippingAddress?.zipCode}</div>
        <div className="text-sm">Phone: {order.shippingAddress?.phone}</div>
        {order.shippingAddress?.whatsapp && <div className="text-sm text-muted-text">WhatsApp: {order.shippingAddress?.whatsapp}</div>}
      </div>

      <div className="font-bold">Total: {formatPrice(order.totalAmount)}</div>
    </div>
  )
}

export default SellerOrderDetailPage
