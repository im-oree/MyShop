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

export function getEffectivePermissions(user?: User | null): EmployeePermissions {
  if (!user) {
    return {
      products: 'none',
      orders: 'none',
      analytics: 'none',
      notifications: 'none',
      messages: 'none',
      employees: 'none',
    }
  }

  if (user.role === 'seller' || user.role === 'admin') {
    return {
      products: 'write',
      orders: 'write',
      analytics: 'write',
      notifications: 'write',
      messages: 'write',
      employees: 'write',
    }
  }

  return {
    products: user.employeePermissions?.products || 'none',
    orders: user.employeePermissions?.orders || 'none',
    analytics: user.employeePermissions?.analytics || 'none',
    notifications: user.employeePermissions?.notifications || 'none',
    messages: user.employeePermissions?.messages || 'none',
    employees: user.employeePermissions?.employees || 'none',
  }
}

export function hasAccess(level: AccessLevel, required: 'read' | 'write'): boolean {
  if (required === 'read') {
    return level === 'read' || level === 'write'
  }
  return level === 'write'
}
