import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { userService } from '@/services/userService'
import { EmployeePermissions, EmployeeRoleTemplate, User } from '@/types'
import { getEffectivePermissions, hasAccess } from '@/utils/rbac'
import Dropdown from '@/components/Dropdown'

const modules: Array<keyof EmployeePermissions> = ['products', 'orders', 'analytics', 'notifications', 'messages', 'employees']

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
  { value: 'none', label: 'None' },
  { value: 'read', label: 'Read' },
  { value: 'write', label: 'Read & Write' },
]

function AccessManagementPage() {
  const navigate = useNavigate()
  const { isAuthenticated, user } = useAuthStore()
  const [employees, setEmployees] = useState<User[]>([])
  const [templates, setTemplates] = useState<Record<string, EmployeePermissions>>({})
  const [loading, setLoading] = useState(true)
  const [email, setEmail] = useState('')
  const [title, setTitle] = useState('Employee')
  const [template, setTemplate] = useState<EmployeeRoleTemplate>('cashier')
  const [permissions, setPermissions] = useState<EmployeePermissions>(emptyPermissions)
  const [error, setError] = useState('')

  const canManage = useMemo(() => {
    const access = getEffectivePermissions(user)
    return hasAccess(access.employees, 'write')
  }, [user])

  useEffect(() => {
    if (!isAuthenticated || !user) {
      navigate('/login')
      return
    }

    if (user.role !== 'seller' && user.role !== 'employee') {
      navigate('/profile')
      return
    }

    if (!canManage) {
      navigate('/seller/shop')
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
        setPermissions(tpls[template] || emptyPermissions)
      } catch (e: any) {
        setError(e?.response?.data?.message || 'Failed to load access management data')
      } finally {
        setLoading(false)
      }
    })()
  }, [isAuthenticated, user, canManage, navigate])

  const handleTemplateChange = (next: EmployeeRoleTemplate) => {
    setTemplate(next)
    if (next !== 'custom') {
      setPermissions(templates[next] || emptyPermissions)
    }
  }

  const handlePermissionChange = (key: keyof EmployeePermissions, value: EmployeePermissions[keyof EmployeePermissions]) => {
    setTemplate('custom')
    setPermissions((prev) => ({ ...prev, [key]: value }))
  }

  const handleAdd = async () => {
    try {
      setError('')
      const created = await userService.addEmployee({ email, title, template, permissions })
      setEmployees((prev) => [created, ...prev])
      setEmail('')
      setTitle('Employee')
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Failed to add employee')
    }
  }

  const handleSaveEmployee = async (employee: User) => {
    try {
      const updated = await userService.updateEmployeeAccess(employee.id, {
        title: employee.employeeTitle || 'Employee',
        template: (employee.employeeRoleTemplate || 'custom') as EmployeeRoleTemplate,
        permissions: employee.employeePermissions || emptyPermissions,
      })
      setEmployees((prev) => prev.map((item) => (item.id === updated.id ? updated : item)))
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Failed to update employee access')
    }
  }

  if (loading) return <div className="p-6">Loading access management...</div>

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold text-text">Access Management</h1>
        <p className="text-muted-text mt-1">Manage employees, assistants, and permission levels.</p>
      </div>

      {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <div className="rounded-2xl border border-border bg-white p-5 space-y-4">
        <h2 className="text-lg font-bold text-text">Add Employee</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Employee email" className="rounded-xl border border-border px-3 py-2.5" />
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title (e.g. Sales Rep)" className="rounded-xl border border-border px-3 py-2.5" />
          <Dropdown
            options={templateOptions}
            value={template}
            onChange={(value) => handleTemplateChange(value as EmployeeRoleTemplate)}
            className="w-full"
            buttonClassName="px-3 py-2.5"
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          {modules.map((mod) => (
            <div key={mod} className="rounded-xl border border-border p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-text mb-2">{mod}</p>
              <Dropdown
                options={accessOptions}
                value={permissions[mod]}
                onChange={(value) => handlePermissionChange(mod, value as any)}
                className="w-full"
                buttonClassName="px-2 py-2 text-sm rounded-lg"
              />
            </div>
          ))}
        </div>

        <button onClick={handleAdd} className="rounded-xl bg-primary text-white px-4 py-2.5 text-sm font-semibold">Add Employee</button>
      </div>

      <div className="rounded-2xl border border-border bg-white p-5">
        <h2 className="text-lg font-bold text-text mb-4">Current Employees</h2>
        <div className="space-y-3">
          {employees.map((employee) => (
            <div key={employee.id} className="rounded-xl border border-border p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-semibold text-text">{employee.name} <span className="text-xs text-muted-text">({employee.email})</span></p>
                  <p className="text-xs text-muted-text">{employee.employeeTitle || 'Employee'} • Template: {employee.employeeRoleTemplate || 'custom'}</p>
                </div>
                <button
                  onClick={() => handleSaveEmployee(employee)}
                  className="rounded-lg border border-border bg-white px-3 py-1.5 text-xs font-medium hover:bg-gray-50"
                >
                  Save
                </button>
              </div>
              <div className="grid gap-2 sm:grid-cols-3 mt-3">
                {modules.map((mod) => (
                  <div key={mod} className="text-xs text-muted-text">
                    <span className="font-semibold text-text">{mod}:</span>{' '}
                    {employee.employeePermissions?.[mod] || 'none'}
                  </div>
                ))}
              </div>
            </div>
          ))}
          {employees.length === 0 && <p className="text-sm text-muted-text">No employees yet.</p>}
        </div>
      </div>
    </div>
  )
}

export default AccessManagementPage
