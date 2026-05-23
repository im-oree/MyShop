// AccessManagementPage.tsx
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { userService } from '@/services/userService'
import { EmployeePermissions, EmployeeRoleTemplate, User } from '@/types'
import { getEffectivePermissions, hasAccess } from '@/utils/rbac'
import Dropdown from '@/components/Dropdown'

const modules: Array<keyof EmployeePermissions> = [
  'products',
  'orders',
  'analytics',
  'notifications',
  'messages',
  'employees',
]

const moduleIcons: Record<keyof EmployeePermissions, string> = {
  products: '📦',
  orders: '🛒',
  analytics: '📊',
  notifications: '🔔',
  messages: '💬',
  employees: '👥',
}

const moduleDescriptions: Record<keyof EmployeePermissions, string> = {
  products: 'Manage product listings and inventory',
  orders: 'View and process customer orders',
  analytics: 'Access sales and performance data',
  notifications: 'Manage notification settings',
  messages: 'Handle customer conversations',
  employees: 'Manage team members and access',
}

const emptyPermissions: EmployeePermissions = {
  products: 'none',
  orders: 'none',
  analytics: 'none',
  notifications: 'none',
  messages: 'none',
  employees: 'none',
}

const templateOptions = [
  { value: 'cashier', label: 'Cashier' },
  { value: 'sales_rep', label: 'Sales Rep' },
  { value: 'support_agent', label: 'Support Agent' },
  { value: 'operations_manager', label: 'Operations Manager' },
  { value: 'custom', label: 'Custom' },
]

const accessOptions = [
  { value: 'none', label: 'No Access' },
  { value: 'read', label: 'View Only' },
  { value: 'write', label: 'Full Access' },
]

const accessBadgeStyles: Record<string, string> = {
  none: 'bg-gray-100 text-gray-500',
  read: 'bg-blue-50 text-blue-600',
  write: 'bg-green-50 text-green-600',
}

const accessBadgeLabels: Record<string, string> = {
  none: 'No Access',
  read: 'View Only',
  write: 'Full Access',
}

const templateDescriptions: Record<string, string> = {
  cashier: 'Can view orders and products. Ideal for point-of-sale staff.',
  sales_rep: 'Can manage products and orders. Great for sales team members.',
  support_agent: 'Can view orders and handle messages. Perfect for customer support.',
  operations_manager: 'Broad access to orders, products, and analytics.',
  custom: 'Set each permission individually.',
}

function AccessManagementPage() {
  const navigate = useNavigate()
  const { isAuthenticated, user } = useAuthStore()
  const [employees, setEmployees] = useState<User[]>([])
  const [templates, setTemplates] = useState<Record<string, EmployeePermissions>>({})
  const [loading, setLoading] = useState(true)

  // Add form state
  const [showAddForm, setShowAddForm] = useState(false)
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [title, setTitle] = useState('Employee')
  const [template, setTemplate] = useState<EmployeeRoleTemplate>('cashier')
  const [permissions, setPermissions] = useState<EmployeePermissions>(emptyPermissions)
  const [showCustomPerms, setShowCustomPerms] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [addingEmployee, setAddingEmployee] = useState(false)

  // Edit state for existing employees
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editTemplate, setEditTemplate] = useState<EmployeeRoleTemplate>('custom')
  const [editPermissions, setEditPermissions] = useState<EmployeePermissions>(emptyPermissions)
  const [editTitle, setEditTitle] = useState('')
  const [showEditCustomPerms, setShowEditCustomPerms] = useState(false)
  const [savingId, setSavingId] = useState<string | null>(null)

  const canManage = useMemo(() => {
    const access = getEffectivePermissions(user)
    return hasAccess(access.employees, 'write')
  }, [user])

  useEffect(() => {
    if (!isAuthenticated || !user) {
      navigate('/login')
      return
    }

    if (user.role !== 'admin' && user.role !== 'manager' && user.role !== 'employee') {
      navigate('/profile')
      return
    }

    if (!canManage) {
      navigate('/admin/store')
      return
    }

    ;(async () => {
      try {
        setLoading(true)
        const [tpls, emps] = await Promise.all([
          userService.getEmployeeRoleTemplates(),
          userService.getEmployees(),
        ])
        setTemplates(tpls)
        setEmployees(emps)
        setPermissions(tpls['cashier'] || emptyPermissions)
      } catch (e: any) {
        setError(e?.response?.data?.message || 'Failed to load data')
      } finally {
        setLoading(false)
      }
    })()
  }, [isAuthenticated, user, canManage, navigate])

  // Auto-dismiss success message
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(''), 4000)
      return () => clearTimeout(timer)
    }
  }, [success])

  const handleTemplateChange = (next: EmployeeRoleTemplate) => {
    setTemplate(next)
    if (next !== 'custom') {
      setPermissions(templates[next] || emptyPermissions)
      setShowCustomPerms(false)
    } else {
      setShowCustomPerms(true)
    }
  }

  const handlePermissionChange = (
    key: keyof EmployeePermissions,
    value: EmployeePermissions[keyof EmployeePermissions]
  ) => {
    setTemplate('custom')
    setShowCustomPerms(true)
    setPermissions((prev) => ({ ...prev, [key]: value }))
  }

  const handleAdd = async () => {
    if (!fullName.trim()) {
      setError('Please enter a name for the staff account')
      return
    }
    if (!email.trim()) {
      setError('Please enter an email address for the staff account')
      return
    }
    try {
      setError('')
      setAddingEmployee(true)
      const created = await userService.createEmployeeAccount({
        name: fullName.trim(),
        email: email.trim(),
        password: password.trim() || undefined,
        title,
        template,
        permissions,
      })
      setEmployees((prev) => [created, ...prev])
      setFullName('')
      setEmail('')
      setPassword('')
      setTitle('Employee')
      setTemplate('cashier')
      setPermissions(templates['cashier'] || emptyPermissions)
      setShowCustomPerms(false)
      setShowAddForm(false)
      setSuccess(`${created.name || fullName} has been created as staff`)
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Failed to create staff account')
    } finally {
      setAddingEmployee(false)
    }
  }

  const startEditing = (employee: User) => {
    const empTemplate = (employee.employeeRoleTemplate || 'custom') as EmployeeRoleTemplate
    setEditingId(employee.id)
    setEditTemplate(empTemplate)
    setEditPermissions(employee.employeePermissions || emptyPermissions)
    setEditTitle(employee.employeeTitle || 'Employee')
    setShowEditCustomPerms(empTemplate === 'custom')
  }

  const cancelEditing = () => {
    setEditingId(null)
    setShowEditCustomPerms(false)
  }

  const handleEditTemplateChange = (next: EmployeeRoleTemplate) => {
    setEditTemplate(next)
    if (next !== 'custom') {
      setEditPermissions(templates[next] || emptyPermissions)
      setShowEditCustomPerms(false)
    } else {
      setShowEditCustomPerms(true)
    }
  }

  const handleEditPermissionChange = (
    key: keyof EmployeePermissions,
    value: EmployeePermissions[keyof EmployeePermissions]
  ) => {
    setEditTemplate('custom')
    setShowEditCustomPerms(true)
    setEditPermissions((prev) => ({ ...prev, [key]: value }))
  }

  const handleSaveEmployee = async (employee: User) => {
    try {
      setError('')
      setSavingId(employee.id)
      const updated = await userService.updateEmployeeAccess(employee.id, {
        title: editTitle,
        template: editTemplate,
        permissions: editPermissions,
      })
      setEmployees((prev) => prev.map((item) => (item.id === updated.id ? updated : item)))
      setEditingId(null)
      setShowEditCustomPerms(false)
      setSuccess(`${employee.name}'s access has been updated`)
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Failed to update employee access')
    } finally {
      setSavingId(null)
    }
  }

  const handleRemoveEmployee = async (employee: User) => {
    if (!confirm(`Remove ${employee.name} from your team? They will lose all access.`)) return
    try {
      setError('')
      await userService.removeEmployee(employee.id)
      setEmployees((prev) => prev.filter((e) => e.id !== employee.id))
      setSuccess(`${employee.name} has been removed`)
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Failed to remove employee')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-3 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-muted-text">Loading team access...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text">Team Access</h1>
          <p className="text-sm text-muted-text mt-1">
            Manage who can access your shop and what they can do.
          </p>
        </div>
        {!showAddForm && (
          <button
            onClick={() => setShowAddForm(true)}
            className="shrink-0 inline-flex items-center gap-2 rounded-xl bg-primary text-white px-4 py-2.5 text-sm font-semibold hover:bg-primary/90 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span className="hidden sm:inline">Add Member</span>
            <span className="sm:hidden">Add</span>
          </button>
        )}
      </div>

      {/* Alerts */}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 flex items-center gap-2">
          <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
              clipRule="evenodd"
            />
          </svg>
          <span>{error}</span>
          <button onClick={() => setError('')} className="ml-auto text-red-500 hover:text-red-700">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {success && (
        <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700 flex items-center gap-2">
          <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
              clipRule="evenodd"
            />
          </svg>
          <span>{success}</span>
        </div>
      )}

      {/* Add Employee Form (hidden by default) */}
      {showAddForm && (
        <div className="rounded-2xl border border-border bg-white overflow-hidden animate-fade-in">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-gray-50/50">
            <h2 className="text-base font-bold text-text">Add Team Member</h2>
            <button
              onClick={() => {
                setShowAddForm(false)
                setShowCustomPerms(false)
                setError('')
              }}
              className="text-muted-text hover:text-text transition-colors p-1"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="p-5 space-y-5">
            {/* Basic info */}
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-text mb-1.5">Full Name</label>
                <input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Ada Okafor"
                  className="w-full rounded-xl border border-border px-4 py-2.5 text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text mb-1.5">Email Address</label>
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="colleague@example.com"
                  type="email"
                  className="w-full rounded-xl border border-border px-4 py-2.5 text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text mb-1.5">Password <span className="text-muted-text font-normal">(optional)</span></label>
                <input
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Set a temporary password"
                  type="password"
                  className="w-full rounded-xl border border-border px-4 py-2.5 text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text mb-1.5">Job Title</label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Sales Representative"
                  className="w-full rounded-xl border border-border px-4 py-2.5 text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                />
              </div>
            </div>

            {/* Role Template Selection */}
            <div>
              <label className="block text-sm font-medium text-text mb-3">Role</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {templateOptions
                  .filter((t) => t.value !== 'custom')
                  .map((t) => (
                    <button
                      key={t.value}
                      onClick={() => handleTemplateChange(t.value as EmployeeRoleTemplate)}
                      className={`text-left rounded-xl border-2 p-3 transition-all ${
                        template === t.value
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-gray-300'
                      }`}
                    >
                      <p className="text-sm font-semibold text-text">{t.label}</p>
                      <p className="text-xs text-muted-text mt-0.5">
                        {templateDescriptions[t.value]}
                      </p>
                    </button>
                  ))}
              </div>

              {/* Use Template / Customize toggle */}
              <div className="flex items-center gap-2 mt-3">
                {template !== 'custom' && (
                  <button
                    onClick={() => {
                      setShowCustomPerms(true)
                      setTemplate('custom')
                    }}
                    className="text-sm text-primary font-medium hover:underline"
                  >
                    Customize permissions
                  </button>
                )}
                {template === 'custom' && !showCustomPerms && (
                  <button
                    onClick={() => setShowCustomPerms(true)}
                    className="text-sm text-primary font-medium hover:underline"
                  >
                    Set permissions
                  </button>
                )}
              </div>
            </div>

            {/* Template preview (when not custom) */}
            {template !== 'custom' && !showCustomPerms && (
              <div className="rounded-xl bg-gray-50 border border-border p-4">
                <p className="text-xs font-semibold text-muted-text uppercase tracking-wide mb-3">
                  Permissions Preview
                </p>
                <div className="flex flex-wrap gap-2">
                  {modules.map((mod) => {
                    const level = permissions[mod] || 'none'
                    return (
                      <span
                        key={mod}
                        className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium ${accessBadgeStyles[level]}`}
                      >
                        <span>{moduleIcons[mod]}</span>
                        <span className="capitalize">{mod}</span>
                        <span className="opacity-70">• {accessBadgeLabels[level]}</span>
                      </span>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Custom Permissions Grid */}
            {showCustomPerms && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-text uppercase tracking-wide">
                  Custom Permissions
                </p>
                <div className="space-y-2">
                  {modules.map((mod) => (
                    <div
                      key={mod}
                      className="flex items-center justify-between gap-3 rounded-xl border border-border p-3"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="text-lg">{moduleIcons[mod]}</span>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-text capitalize">{mod}</p>
                          <p className="text-xs text-muted-text truncate">
                            {moduleDescriptions[mod]}
                          </p>
                        </div>
                      </div>
                      <Dropdown
                        options={accessOptions}
                        value={permissions[mod]}
                        onChange={(value) => handlePermissionChange(mod, value as any)}
                        className="w-32 shrink-0"
                        buttonClassName="px-3 py-2 text-xs rounded-lg"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center gap-3 pt-2 border-t border-border">
              <button
                onClick={handleAdd}
                disabled={addingEmployee || !fullName.trim() || !email.trim()}
                className="inline-flex items-center gap-2 rounded-xl bg-primary text-white px-5 py-2.5 text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {addingEmployee ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Adding...
                  </>
                ) : (
                  'Create Staff Account'
                )}
              </button>
              <button
                onClick={() => {
                  setShowAddForm(false)
                  setShowCustomPerms(false)
                  setError('')
                }}
                className="rounded-xl border border-border px-5 py-2.5 text-sm font-medium text-muted-text hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Employees List */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-text">
            Team Members
            {employees.length > 0 && (
              <span className="ml-2 text-sm font-normal text-muted-text">
                ({employees.length})
              </span>
            )}
          </h2>
        </div>

        {employees.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-border bg-gray-50/50 py-12 text-center">
            <div className="text-4xl mb-3">👥</div>
            <p className="text-base font-semibold text-text">No team members yet</p>
            <p className="text-sm text-muted-text mt-1 mb-4">
              Create your first staff account to start managing access
            </p>
            {!showAddForm && (
              <button
                onClick={() => setShowAddForm(true)}
                className="inline-flex items-center gap-2 rounded-xl bg-primary text-white px-4 py-2.5 text-sm font-semibold hover:bg-primary/90 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4v16m8-8H4"
                  />
                </svg>
                Add First Member
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {employees.map((employee) => {
              const isEditing = editingId === employee.id
              const isSaving = savingId === employee.id
              const empPermissions = employee.employeePermissions || emptyPermissions

              return (
                <div
                  key={employee.id}
                  className={`rounded-2xl border bg-white overflow-hidden transition-all ${
                    isEditing ? 'border-primary shadow-sm' : 'border-border'
                  }`}
                >
                  {/* Employee header */}
                  <div className="flex items-center justify-between gap-3 p-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-bold shrink-0">
                        {(employee.name || employee.email || '?').charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-text truncate">
                          {employee.name || 'Unnamed'}
                        </p>
                        <p className="text-xs text-muted-text truncate">{employee.email}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="hidden sm:inline-block rounded-lg bg-gray-100 px-2.5 py-1 text-xs font-medium text-muted-text capitalize">
                        {employee.employeeRoleTemplate || 'custom'}
                      </span>
                      {!isEditing ? (
                        <button
                          onClick={() => startEditing(employee)}
                          className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-text hover:bg-gray-50 transition-colors"
                        >
                          Edit
                        </button>
                      ) : (
                        <button
                          onClick={cancelEditing}
                          className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-text hover:bg-gray-50 transition-colors"
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Permission badges (view mode) */}
                  {!isEditing && (
                    <div className="px-4 pb-4">
                      <div className="flex flex-wrap gap-1.5">
                        {modules.map((mod) => {
                          const level = empPermissions[mod] || 'none'
                          if (level === 'none') return null
                          return (
                            <span
                              key={mod}
                              className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium ${accessBadgeStyles[level]}`}
                            >
                              <span>{moduleIcons[mod]}</span>
                              <span className="capitalize">{mod}</span>
                            </span>
                          )
                        })}
                        {modules.every((mod) => (empPermissions[mod] || 'none') === 'none') && (
                          <span className="text-xs text-muted-text italic">No permissions set</span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Edit mode */}
                  {isEditing && (
                    <div className="border-t border-border p-4 space-y-4 bg-gray-50/30 animate-fade-in">
                      {/* Title */}
                      <div>
                        <label className="block text-xs font-medium text-text mb-1.5">
                          Job Title
                        </label>
                        <input
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          className="w-full rounded-xl border border-border px-3 py-2 text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all bg-white"
                        />
                      </div>

                      {/* Template buttons */}
                      <div>
                        <label className="block text-xs font-medium text-text mb-2">Role</label>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                          {templateOptions
                            .filter((t) => t.value !== 'custom')
                            .map((t) => (
                              <button
                                key={t.value}
                                onClick={() =>
                                  handleEditTemplateChange(t.value as EmployeeRoleTemplate)
                                }
                                className={`rounded-lg border-2 px-3 py-2 text-xs font-medium text-left transition-all ${
                                  editTemplate === t.value
                                    ? 'border-primary bg-primary/5 text-primary'
                                    : 'border-border text-text hover:border-gray-300'
                                }`}
                              >
                                {t.label}
                              </button>
                            ))}
                        </div>

                        {editTemplate !== 'custom' && !showEditCustomPerms && (
                          <button
                            onClick={() => {
                              setShowEditCustomPerms(true)
                              setEditTemplate('custom')
                            }}
                            className="mt-2 text-xs text-primary font-medium hover:underline"
                          >
                            Customize permissions
                          </button>
                        )}
                      </div>

                      {/* Preview for template */}
                      {editTemplate !== 'custom' && !showEditCustomPerms && (
                        <div className="flex flex-wrap gap-1.5">
                          {modules.map((mod) => {
                            const level = editPermissions[mod] || 'none'
                            return (
                              <span
                                key={mod}
                                className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium ${accessBadgeStyles[level]}`}
                              >
                                <span>{moduleIcons[mod]}</span>
                                <span className="capitalize">{mod}</span>
                                <span className="opacity-70">• {accessBadgeLabels[level]}</span>
                              </span>
                            )
                          })}
                        </div>
                      )}

                      {/* Custom permissions */}
                      {showEditCustomPerms && (
                        <div className="space-y-2">
                          {modules.map((mod) => (
                            <div
                              key={mod}
                              className="flex items-center justify-between gap-3 rounded-xl border border-border bg-white p-3"
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="text-base">{moduleIcons[mod]}</span>
                                <span className="text-sm font-medium text-text capitalize">
                                  {mod}
                                </span>
                              </div>
                              <Dropdown
                                options={accessOptions}
                                value={editPermissions[mod]}
                                onChange={(value) =>
                                  handleEditPermissionChange(mod, value as any)
                                }
                                className="w-32 shrink-0"
                                buttonClassName="px-3 py-2 text-xs rounded-lg"
                              />
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Save / Remove actions */}
                      <div className="flex items-center justify-between gap-3 pt-3 border-t border-border">
                        <button
                          onClick={() => handleRemoveEmployee(employee)}
                          className="text-xs text-red-500 font-medium hover:text-red-700 transition-colors"
                        >
                          Remove from team
                        </button>
                        <button
                          onClick={() => handleSaveEmployee(employee)}
                          disabled={isSaving}
                          className="inline-flex items-center gap-2 rounded-xl bg-primary text-white px-4 py-2 text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50"
                        >
                          {isSaving ? (
                            <>
                              <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                              Saving...
                            </>
                          ) : (
                            'Save Changes'
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

export default AccessManagementPage