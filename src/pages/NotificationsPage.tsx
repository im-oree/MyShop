import { useEffect, useMemo, useState, type ComponentType } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Bell, CheckCheck, Package, BadgeInfo, Truck, CheckCircle2 } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { notificationService } from '@/services/notificationService'
import { formatRelativeTime, isWithinAgeFilter } from '@/utils/orderStage'
import { OrderStageBadge } from '@/components/OrderStageIndicator'
import Dropdown from '@/components/Dropdown'
import type { NotificationItem } from '@/types'

const TYPE_META: Record<string, { icon: ComponentType<{ className?: string }>; tone: string }> = {
  order_created: { icon: Package, tone: 'bg-amber-50 text-amber-700 border-amber-200' },
  payment_confirmed: { icon: CheckCircle2, tone: 'bg-green-50 text-green-700 border-green-200' },
  order_status_updated: { icon: Truck, tone: 'bg-blue-50 text-blue-700 border-blue-200' },
  seller_order_received: { icon: BadgeInfo, tone: 'bg-slate-100 text-slate-700 border-slate-200' },
  general: { icon: Bell, tone: 'bg-gray-100 text-gray-700 border-gray-200' },
}

type AgeFilter = 'all' | 'today' | '7d' | '30d' | '90d'

const filterOptions = [
  { value: 'all', label: 'All' },
  { value: 'unread', label: 'Unread' },
  { value: 'important', label: 'Important' },
]

const ageOptions = [
  { value: 'all', label: 'Any time' },
  { value: 'today', label: 'Today' },
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: '90d', label: 'Last 90 days' },
]

function NotificationsPage() {
  const navigate = useNavigate()
  const { isAuthenticated, user } = useAuthStore()
  const [items, setItems] = useState<NotificationItem[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filter, setFilter] = useState<'all' | 'unread' | 'important'>('all')
  const [ageFilter, setAgeFilter] = useState<AgeFilter>('all')
  const [unreadCount, setUnreadCount] = useState(0)
  const [permissionState, setPermissionState] = useState<NotificationPermission | 'unsupported'>('default')
  const [loadError, setLoadError] = useState('')

  useEffect(() => {
    if (!isAuthenticated || !user) {
      navigate('/login')
      return
    }

    ;(async () => {
      try {
        setLoading(true)
        setLoadError('')
        const [listResult, unread] = await Promise.all([
          notificationService.getNotifications(1, 100),
          notificationService.getUnreadCount(),
        ])
        setItems(listResult.items || [])
        setUnreadCount(unread || 0)
      } catch (error) {
        console.error('Failed to load notifications:', error)
        setLoadError('Could not load notifications right now. Please try again shortly.')
      } finally {
        setLoading(false)
      }
    })()

    if ('Notification' in window) {
      setPermissionState(Notification.permission)
    } else {
      setPermissionState('unsupported')
    }
  }, [isAuthenticated, user, navigate])

  const filteredItems = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    return items
      .filter((notification) => {
        const matchesSearch =
          !query ||
          notification.title.toLowerCase().includes(query) ||
          notification.message.toLowerCase().includes(query)
        const matchesFilter =
          filter === 'all' ||
          (filter === 'unread' ? !notification.readAt : notification.priority === 'important')
        const matchesAge = isWithinAgeFilter(notification.createdAt, ageFilter)
        return matchesSearch && matchesFilter && matchesAge
      })
      .sort((left, right) => new Date(right.createdAt as any).getTime() - new Date(left.createdAt as any).getTime())
  }, [items, searchQuery, filter, ageFilter])

  const handleMarkRead = async (id: string) => {
    try {
      await notificationService.markRead(id)
      setItems((current) => current.map((item) => item.id === id ? { ...item, readAt: new Date() } : item))
      setUnreadCount((count) => Math.max(0, count - 1))
    } catch (error) {
      console.error('Failed to mark notification as read:', error)
    }
  }

  const handleMarkAll = async () => {
    try {
      await notificationService.markAllRead()
      setItems((current) => current.map((item) => ({ ...item, readAt: item.readAt || new Date() })))
      setUnreadCount(0)
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error)
    }
  }

  const handleEnableNotifications = async () => {
    const granted = await notificationService.enableBrowserNotifications()
    if (granted) {
      setPermissionState('granted')
    }
  }

  if (!isAuthenticated || !user) {
    return null
  }

  return (
    <div className="min-h-[80dvh] animate-fade-in pb-8">
      <div className="container mx-auto px-4">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-text">Notifications</h1>
            <p className="text-sm text-muted-text mt-1">Orders, payments, and stage updates in one place</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-white border border-border text-sm text-muted-text">
              <Bell className="w-4 h-4" />
              <span className="font-semibold text-text">{unreadCount}</span> unread
            </div>
            <button
              onClick={handleMarkAll}
              className="rounded-xl border border-border bg-white px-4 py-2 text-sm font-medium text-text hover:bg-gray-50"
            >
              Mark all read
            </button>
          </div>
        </div>

        <div className="grid gap-3 mb-5 lg:grid-cols-[1fr_auto_auto]">
          <div className="relative w-full">
            <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search notifications..."
              className="w-full rounded-xl border border-border bg-white pl-10 pr-4 py-2.5 text-sm text-text placeholder:text-gray-400 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <Dropdown
            options={filterOptions}
            value={filter}
            onChange={(value) => setFilter(value as typeof filter)}
            className="w-full"
            buttonClassName="px-4 py-2.5 text-sm"
          />
          <Dropdown
            options={ageOptions}
            value={ageFilter}
            onChange={(value) => setAgeFilter(value as AgeFilter)}
            className="w-full"
            buttonClassName="px-4 py-2.5 text-sm"
          />
        </div>

        {permissionState !== 'granted' && (
          <div className="mb-6 rounded-2xl border border-dashed border-border bg-white p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <p className="font-semibold text-text">Enable browser notifications</p>
              <p className="text-sm text-muted-text">Get desktop and mobile alerts for important updates.</p>
            </div>
            <button onClick={handleEnableNotifications} className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90">
              Enable
            </button>
          </div>
        )}

        {loadError && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {loadError}
          </div>
        )}

        {loading ? (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => <div key={i} className="rounded-2xl border border-border bg-white p-4 animate-pulse"><div className="skeleton h-4 w-48 rounded mb-2" /><div className="skeleton h-3 w-full rounded mb-2" /><div className="skeleton h-3 w-28 rounded" /></div>)}
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-white px-4 py-16 text-center">
            <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
              <Bell className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-bold text-text mb-1">No notifications</h3>
            <p className="text-sm text-muted-text max-w-sm mx-auto">You’ll see payment confirmations, order creations, and stage updates here.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredItems.map((notification) => {
              const meta = TYPE_META[notification.type] || TYPE_META.general
              const Icon = meta.icon
              const unread = !notification.readAt

              return (
                <div key={notification.id} className={`rounded-2xl border bg-white p-4 transition ${unread ? 'border-primary/30 shadow-sm' : 'border-border'}`}>
                  <div className="flex items-start gap-3">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-xl border ${meta.tone}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="font-semibold text-text">{notification.title}</p>
                          <p className="text-sm text-muted-text mt-0.5">{notification.message}</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <OrderStageBadge status={notification.metadata?.status as string | undefined} />
                          {notification.priority === 'important' && (
                            <span className="rounded-full bg-red-50 text-red-700 px-2 py-1 text-[11px] font-semibold">Important</span>
                          )}
                        </div>
                      </div>

                      <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted-text">
                        <span>{formatRelativeTime(notification.createdAt)}</span>
                        <span>•</span>
                        <span>{notification.readAt ? 'Read' : 'Unread'}</span>
                        {notification.link && <>
                          <span>•</span>
                          <Link to={notification.link} className="text-secondary font-medium hover:underline">Open</Link>
                        </>}
                      </div>
                    </div>

                    {unread && (
                      <button onClick={() => handleMarkRead(notification.id)} className="rounded-full border border-border p-2 text-muted-text hover:bg-gray-50" aria-label="Mark as read">
                        <CheckCheck className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

export default NotificationsPage
