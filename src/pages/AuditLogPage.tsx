import { useEffect, useState } from 'react'
import { auditService } from '@/services/api'
import { useAuthStore } from '@/store/authStore'

function SkeletonRow() {
  return (
    <div className="flex items-center justify-between p-3 bg-white rounded border border-border animate-pulse">
      <div className="h-4 bg-gray-100 w-1/3 rounded" />
      <div className="h-4 bg-gray-100 w-1/3 rounded" />
      <div className="h-4 bg-gray-100 w-1/6 rounded" />
    </div>
  )
}

export default function AuditLogPage() {
  const { user, isAuthenticated } = useAuthStore()
  const [loading, setLoading] = useState(true)
  const [items, setItems] = useState<any[]>([])

  useEffect(() => {
    if (!isAuthenticated || !user || (user.role !== 'admin' && user.role !== 'manager')) return
    const load = async () => {
      setLoading(true)
      try {
        const res = await auditService.getLogs()
        setItems(res.items || [])
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [isAuthenticated, user])

  if (!isAuthenticated || !user || (user.role !== 'admin' && user.role !== 'manager')) {
    return <div className="p-4">Access denied</div>
  }

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Audit Log</h2>
      <div className="space-y-2">
        {loading ? (
          <>
            <SkeletonRow />
            <SkeletonRow />
            <SkeletonRow />
          </>
        ) : (
          items.map(item => (
            <div key={item.id} className="p-3 bg-white rounded border border-border">
              <div className="flex justify-between items-start">
                <div>
                  <div className="text-sm font-semibold">{item.action}</div>
                  <div className="text-xs text-muted-text">{item.actorName || item.actorId} • {item.actorRole}</div>
                </div>
                <div className="text-xs text-gray-500">{new Date(item.createdAt).toLocaleString()}</div>
              </div>
              {item.meta && <pre className="text-xs mt-2 text-muted-text overflow-auto">{JSON.stringify(item.meta, null, 2)}</pre>}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
