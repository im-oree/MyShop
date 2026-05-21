import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import apiClient from '@/services/api'
import { useAuthStore } from '@/store/authStore'
import type { User } from '@/types'
import Dropdown from '@/components/Dropdown'

type RevenueRange = 'today' | 'week' | 'month'
type AdminSection = 'users' | 'revenue' | 'verification'

const roleOptions = [
  { value: 'user', label: 'User' },
  { value: 'seller', label: 'Seller' },
  { value: 'moderator', label: 'Moderator' },
  { value: 'admin', label: 'Admin' },
]

type AdminOverview = {
  users: {
    totalUsers: number
    activeUsers: number
    sellerCount: number
    users: User[]
  }
  revenue: {
    totalRevenue: number
    today: number
    thisWeek: number
    thisMonth: number
    timeline: Array<{ label: string; date: string; revenue: number; orders: number }>
  }
  products: {
    totalProducts: number
  }
  sellerVerification: {
    pending: User[]
    approved: number
  }
}

type RevenuePayload = {
  range: RevenueRange
  totalRevenue: number
  today: number
  thisWeek: number
  series: Array<{ label: string; amount: number; count: number }>
}

function currency(value: number) {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 0,
  }).format(value / 100)
}

function roleLabel(role: User['role']) {
  if (role === 'admin') return 'Admin'
  if (role === 'moderator') return 'Moderator'
  if (role === 'seller') return 'Seller'
  return 'User'
}

function badgeClass(role: User['role']) {
  if (role === 'admin') return 'bg-slate-900 text-white'
  if (role === 'moderator') return 'bg-amber-100 text-amber-800'
  if (role === 'seller') return 'bg-emerald-100 text-emerald-800'
  return 'bg-gray-100 text-gray-700'
}

function AdminDashboard() {
  const navigate = useNavigate()
  const { user } = useAuthStore()

  const [activeSection, setActiveSection] = useState<AdminSection>('users')
  const [overview, setOverview] = useState<AdminOverview | null>(null)
  const [revenue, setRevenue] = useState<RevenuePayload | null>(null)
  const [loadingOverview, setLoadingOverview] = useState(true)
  const [loadingRevenue, setLoadingRevenue] = useState(false)
  const [timeline, setTimeline] = useState<RevenueRange>('week')
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [mutatingId, setMutatingId] = useState<string | null>(null)

  useEffect(() => {
    if (!user) {
      navigate('/login')
      return
    }

    if (user.role !== 'admin' && user.role !== 'moderator') {
      navigate('/')
      return
    }
  }, [navigate, user])

  useEffect(() => {
    async function loadOverview() {
      setLoadingOverview(true)
      try {
        const { data } = await apiClient.get('/admin/overview')
        setOverview(data.data)
      } catch (error) {
        console.error('Failed to load admin overview:', error)
      } finally {
        setLoadingOverview(false)
      }
    }

    void loadOverview()
  }, [])

  useEffect(() => {
    async function loadRevenue() {
      setLoadingRevenue(true)
      try {
        const { data } = await apiClient.get('/admin/revenue', { params: { range: timeline } })
        setRevenue(data.data)
      } catch (error) {
        console.error('Failed to load revenue:', error)
      } finally {
        setLoadingRevenue(false)
      }
    }

    void loadRevenue()
  }, [timeline])

  const users = overview?.users.users || []
  const pendingApplications = overview?.sellerVerification.pending || []
  const totalUsers = overview?.users.totalUsers || 0
  const activeUsers = overview?.users.activeUsers || 0
  const sellerCount = overview?.users.sellerCount || 0
  const totalProducts = overview?.products.totalProducts || 0
  const totalRevenue = revenue?.totalRevenue ?? overview?.revenue.totalRevenue ?? 0

  const revenueSeries = useMemo(() => revenue?.series || [], [revenue])
  const chartMax = Math.max(...revenueSeries.map((item) => item.amount), 1)

  async function approveSeller(id: string) {
    setMutatingId(id)
    try {
      await apiClient.post(`/users/${id}/approve-seller`)
      await refreshAdminData()
    } catch (error) {
      console.error('Approve seller failed:', error)
    } finally {
      setMutatingId(null)
    }
  }

  async function rejectSeller(id: string) {
    setMutatingId(id)
    try {
      await apiClient.post(`/users/${id}/reject-seller`)
      await refreshAdminData()
    } catch (error) {
      console.error('Reject seller failed:', error)
    } finally {
      setMutatingId(null)
    }
  }

  async function setRole(id: string, role: User['role']) {
    setMutatingId(id)
    try {
      await apiClient.post(`/users/${id}/set-role`, { role })
      await refreshAdminData()
    } catch (error) {
      console.error('Role update failed:', error)
    } finally {
      setMutatingId(null)
    }
  }

  async function refreshAdminData() {
    const [{ data: overviewResponse }, { data: revenueResponse }] = await Promise.all([
      apiClient.get('/admin/overview'),
      apiClient.get('/admin/revenue', { params: { range: timeline } }),
    ])

    setOverview(overviewResponse.data)
    setRevenue(revenueResponse.data)
  }

  const tabs: Array<{ key: AdminSection; label: string; description: string }> = [
    { key: 'users', label: 'Users', description: 'Accounts, roles, and activity' },
    { key: 'revenue', label: 'Revenue', description: 'Totals, trend lines, and timeframes' },
    { key: 'verification', label: 'Seller verification', description: 'Approve, disapprove, and inspect applicants' },
  ]

  if (!user || (user.role !== 'admin' && user.role !== 'moderator')) {
    return null
  }

  return (
    <div className="space-y-8 animate-fade-in pb-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-secondary">Control center</p>
          <h1 className="text-3xl sm:text-4xl font-bold text-text">Admin Dashboard</h1>
          <p className="text-sm text-muted-text mt-2 max-w-2xl">
            Users, revenue, and seller verification are organized into separate views so you can act quickly.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/" className="px-4 py-2 rounded-xl border border-border bg-white text-sm font-medium text-text hover:bg-gray-50">
            Back to store
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-border bg-white p-5 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-muted-text">Users</p>
          <div className="mt-3 flex items-end justify-between gap-3">
            <div>
              <p className="text-3xl font-bold text-text">{loadingOverview ? '...' : totalUsers}</p>
              <p className="text-sm text-muted-text mt-1">Total users</p>
            </div>
            <span className="text-xs font-semibold rounded-full bg-emerald-50 text-emerald-700 px-3 py-1">{activeUsers} active</span>
          </div>
        </div>
        <div className="rounded-2xl border border-border bg-white p-5 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-muted-text">Sellers</p>
          <div className="mt-3 flex items-end justify-between gap-3">
            <div>
              <p className="text-3xl font-bold text-text">{loadingOverview ? '...' : sellerCount}</p>
              <p className="text-sm text-muted-text mt-1">Verified sellers</p>
            </div>
            <span className="text-xs font-semibold rounded-full bg-amber-50 text-amber-700 px-3 py-1">{pendingApplications.length} pending</span>
          </div>
        </div>
        <div className="rounded-2xl border border-border bg-white p-5 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-muted-text">Revenue</p>
          <div className="mt-3 flex items-end justify-between gap-3">
            <div>
              <p className="text-3xl font-bold text-text">{currency(totalRevenue)}</p>
              <p className="text-sm text-muted-text mt-1">Gross collected</p>
            </div>
            <span className="text-xs font-semibold rounded-full bg-slate-100 text-slate-700 px-3 py-1">{timeline}</span>
          </div>
        </div>
        <div className="rounded-2xl border border-border bg-white p-5 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-muted-text">Inventory</p>
          <div className="mt-3 flex items-end justify-between gap-3">
            <div>
              <p className="text-3xl font-bold text-text">{loadingOverview ? '...' : totalProducts}</p>
              <p className="text-sm text-muted-text mt-1">Total products</p>
            </div>
            <span className="text-xs font-semibold rounded-full bg-blue-50 text-blue-700 px-3 py-1">live</span>
          </div>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1 hide-scrollbar">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveSection(tab.key)}
            className={`min-w-[210px] rounded-2xl border px-4 py-3 text-left transition-all ${activeSection === tab.key ? 'border-primary bg-primary/5' : 'border-border bg-white hover:border-gray-300'}`}
          >
            <div className="font-semibold text-text">{tab.label}</div>
            <div className="text-xs text-muted-text mt-1">{tab.description}</div>
          </button>
        ))}
      </div>

      {activeSection === 'users' && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2 rounded-2xl border border-border bg-white shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-border flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-text">All users</h2>
                <p className="text-sm text-muted-text">Name, email, role, and seller status</p>
              </div>
              <span className="text-xs font-semibold rounded-full bg-gray-100 text-gray-700 px-3 py-1">{users.length} loaded</span>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 text-left text-muted-text">
                  <tr>
                    <th className="px-5 py-3 font-medium">Name</th>
                    <th className="px-5 py-3 font-medium">Email</th>
                    <th className="px-5 py-3 font-medium">Role</th>
                    <th className="px-5 py-3 font-medium">Seller</th>
                    <th className="px-5 py-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((item) => (
                    <tr key={item.id} className="border-t border-border/60">
                      <td className="px-5 py-4 font-medium text-text">{item.name}</td>
                      <td className="px-5 py-4 text-muted-text">{item.email}</td>
                      <td className="px-5 py-4">
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${badgeClass(item.role)}`}>
                          {roleLabel(item.role)}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-muted-text">
                        {item.role === 'seller' ? 'Verified seller' : item.appliedAsSeller ? 'Pending verification' : 'Regular user'}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex flex-wrap gap-2">
                          <button onClick={() => setSelectedUser(item)} className="text-secondary hover:underline">View</button>
                          <Dropdown
                            options={roleOptions}
                            value={item.role}
                            onChange={(value) => setRole(item.id, value as User['role'])}
                            className="min-w-[150px]"
                            buttonClassName="rounded-lg px-2 py-1 text-xs"
                            disabled={mutatingId === item.id}
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                  {!loadingOverview && users.length === 0 && (
                    <tr>
                      <td className="px-5 py-8 text-center text-muted-text" colSpan={5}>No users found</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-white shadow-sm p-5">
            <h3 className="text-lg font-bold text-text">User summary</h3>
            <div className="mt-4 space-y-3">
              <div className="rounded-xl bg-gray-50 p-4">
                <p className="text-xs uppercase tracking-wide text-muted-text">Active users</p>
                <p className="text-2xl font-bold text-text mt-1">{activeUsers}</p>
              </div>
              <div className="rounded-xl bg-gray-50 p-4">
                <p className="text-xs uppercase tracking-wide text-muted-text">Seller accounts</p>
                <p className="text-2xl font-bold text-text mt-1">{sellerCount}</p>
              </div>
              <div className="rounded-xl bg-gray-50 p-4">
                <p className="text-xs uppercase tracking-wide text-muted-text">Pending approvals</p>
                <p className="text-2xl font-bold text-text mt-1">{pendingApplications.length}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeSection === 'revenue' && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2 rounded-2xl border border-border bg-white shadow-sm p-5">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-text">Revenue trends</h2>
                <p className="text-sm text-muted-text">Switch timeline to compare today, week, and month.</p>
              </div>
              <div className="inline-flex rounded-xl border border-border bg-gray-50 p-1">
                {(['today', 'week', 'month'] as RevenueRange[]).map((range) => (
                  <button
                    key={range}
                    onClick={() => setTimeline(range)}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg capitalize ${timeline === range ? 'bg-white shadow-sm text-primary' : 'text-muted-text hover:text-text'}`}
                  >
                    {range}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="rounded-xl bg-gray-50 p-4">
                <p className="text-xs uppercase tracking-wide text-muted-text">Today</p>
                <p className="text-xl font-bold text-text mt-1">{currency(revenue?.today ?? overview?.revenue.today ?? 0)}</p>
              </div>
              <div className="rounded-xl bg-gray-50 p-4">
                <p className="text-xs uppercase tracking-wide text-muted-text">This week</p>
                <p className="text-xl font-bold text-text mt-1">{currency(revenue?.thisWeek ?? overview?.revenue.thisWeek ?? 0)}</p>
              </div>
              <div className="rounded-xl bg-gray-50 p-4">
                <p className="text-xs uppercase tracking-wide text-muted-text">This month</p>
                <p className="text-xl font-bold text-text mt-1">{currency(overview?.revenue.thisMonth ?? 0)}</p>
              </div>
            </div>

            <div className="mt-6 h-72 flex items-end gap-3 rounded-2xl bg-gradient-to-b from-white to-gray-50 p-4 overflow-x-auto">
              {loadingRevenue ? (
                <div className="text-muted-text">Loading chart...</div>
              ) : revenueSeries.length === 0 ? (
                <div className="text-muted-text">No revenue data for this period.</div>
              ) : (
                revenueSeries.map((point) => (
                  <div key={`${point.label}-${point.count}`} className="flex w-16 min-w-[64px] flex-col items-center justify-end gap-2">
                    <div className="text-[11px] text-muted-text text-center leading-tight">{currency(point.amount)}</div>
                    <div className="w-full rounded-t-xl bg-secondary/80" style={{ height: `${Math.max((point.amount / chartMax) * 100, 6)}%` }} />
                    <div className="text-xs font-medium text-text">{point.label}</div>
                    <div className="text-[11px] text-muted-text">{point.count} orders</div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-white shadow-sm p-5">
            <h3 className="text-lg font-bold text-text">Revenue breakdown</h3>
            <div className="mt-4 space-y-3">
              <div className="rounded-xl bg-gray-50 p-4">
                <p className="text-xs uppercase tracking-wide text-muted-text">Total revenue</p>
                <p className="text-2xl font-bold text-text mt-1">{currency(totalRevenue)}</p>
              </div>
              <div className="rounded-xl bg-gray-50 p-4">
                <p className="text-xs uppercase tracking-wide text-muted-text">Chart points</p>
                <p className="text-2xl font-bold text-text mt-1">{revenueSeries.length}</p>
              </div>
              <div className="rounded-xl bg-gray-50 p-4">
                <p className="text-xs uppercase tracking-wide text-muted-text">Range</p>
                <p className="text-2xl font-bold text-text mt-1 capitalize">{timeline}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeSection === 'verification' && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2 rounded-2xl border border-border bg-white shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-border flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-text">Seller verification</h2>
                <p className="text-sm text-muted-text">Approve, disapprove, or inspect applications.</p>
              </div>
              <span className="text-xs font-semibold rounded-full bg-amber-50 text-amber-700 px-3 py-1">{pendingApplications.length} waiting</span>
            </div>
            <div className="divide-y divide-border/60">
              {pendingApplications.map((item) => (
                <div key={item.id} className="p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center font-semibold text-primary">
                      {item.name?.[0]?.toUpperCase() || 'U'}
                    </div>
                    <div>
                      <h3 className="font-semibold text-text">{item.name}</h3>
                      <p className="text-sm text-muted-text">{item.email}</p>
                      <p className="text-sm text-muted-text mt-1">Shop: {item.sellerProfile?.shopName || 'No shop name'}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button onClick={() => setSelectedUser(item)} className="px-3 py-2 rounded-xl border border-border bg-white text-sm font-medium text-text hover:bg-gray-50">View</button>
                    <button
                      onClick={() => approveSeller(item.id)}
                      disabled={mutatingId === item.id}
                      className="px-3 py-2 rounded-xl bg-primary text-white text-sm font-medium hover:bg-primary/90 disabled:opacity-60"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => rejectSeller(item.id)}
                      disabled={mutatingId === item.id}
                      className="px-3 py-2 rounded-xl bg-red-50 text-danger text-sm font-medium hover:bg-red-100 disabled:opacity-60"
                    >
                      Disapprove
                    </button>
                  </div>
                </div>
              ))}
              {!loadingOverview && pendingApplications.length === 0 && (
                <div className="p-5 text-muted-text">No pending seller applications</div>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-white shadow-sm p-5">
            <h3 className="text-lg font-bold text-text">Selected application</h3>
            {selectedUser ? (
              <div className="mt-4 space-y-4">
                <div className="rounded-2xl bg-gray-50 p-4">
                  <p className="text-xs uppercase tracking-wide text-muted-text">Name</p>
                  <p className="font-semibold text-text mt-1">{selectedUser.name}</p>
                </div>
                <div className="rounded-2xl bg-gray-50 p-4">
                  <p className="text-xs uppercase tracking-wide text-muted-text">Email</p>
                  <p className="font-semibold text-text mt-1">{selectedUser.email}</p>
                </div>
                <div className="rounded-2xl bg-gray-50 p-4">
                  <p className="text-xs uppercase tracking-wide text-muted-text">Shop</p>
                  <p className="font-semibold text-text mt-1">{selectedUser.sellerProfile?.shopName || 'N/A'}</p>
                  <p className="text-sm text-muted-text mt-2">{selectedUser.sellerProfile?.shopDescription || 'No description available.'}</p>
                </div>
                <div className="rounded-2xl bg-gray-50 p-4">
                  <p className="text-xs uppercase tracking-wide text-muted-text">Current status</p>
                  <p className="font-semibold text-text mt-1">{selectedUser.appliedAsSeller ? 'Applied' : 'Not applied'}</p>
                  <p className="text-sm text-muted-text mt-1">{selectedUser.role === 'seller' ? 'Verified seller' : 'Awaiting verification'}</p>
                </div>
              </div>
            ) : (
              <p className="mt-4 text-sm text-muted-text">Click View on a seller application to inspect it here.</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default AdminDashboard
