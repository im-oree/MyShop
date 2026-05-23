import { EmployeePermissions, User, AccessLevel, EmployeeRoleTemplate } from '@/types'

export const EMPLOYEE_ROLE_TEMPLATES: Record<Exclude<EmployeeRoleTemplate, 'custom'>, EmployeePermissions> = {
  cashier: {
    products: 'read',
    orders: 'write',
    analytics: 'none',
    notifications: 'read',
    messages: 'write',
    employees: 'none',
  },
  sales_rep: {
    products: 'write',
    orders: 'write',
    analytics: 'read',
    notifications: 'read',
    messages: 'write',
    employees: 'none',
  },
  support_agent: {
    products: 'read',
    orders: 'read',
    analytics: 'none',
    notifications: 'write',
    messages: 'write',
    employees: 'none',
  },
  operations_manager: {
    products: 'write',
    orders: 'write',
    analytics: 'read',
    notifications: 'write',
    messages: 'write',
    employees: 'write',
  },
}

export function getDefaultEmployeePermissions(): EmployeePermissions {
  return {
    products: 'none',
    orders: 'none',
    analytics: 'none',
    notifications: 'none',
    messages: 'none',
    employees: 'none',
  }
}

function normalizePermissions(input?: Partial<EmployeePermissions> | null): EmployeePermissions {
  const defaults = getDefaultEmployeePermissions()
  if (!input) return defaults
  const normalize = (value: unknown): AccessLevel => {
    if (value === 'read' || value === 'write' || value === 'none') return value
    return 'none'
  }
  return {
    products: normalize(input.products),
    orders: normalize(input.orders),
    analytics: normalize(input.analytics),
    notifications: normalize(input.notifications),
    messages: normalize(input.messages),
    employees: normalize(input.employees),
  }
}

export function getEffectivePermissions(user?: User | null): EmployeePermissions {
  if (!user) {
    return getDefaultEmployeePermissions()
  }

  if (user.role === 'admin' || user.role === 'manager') {
    return {
      products: 'write',
      orders: 'write',
      analytics: 'write',
      notifications: 'write',
      messages: 'write',
      employees: 'write',
    }
  }

  if (user.role === 'employee') {
    return normalizePermissions(user.employeePermissions)
  }

  return getDefaultEmployeePermissions()
}

export function hasAccess(level: AccessLevel, required: 'read' | 'write'): boolean {
  if (required === 'read') {
    return level === 'read' || level === 'write'
  }
  return level === 'write'
}
