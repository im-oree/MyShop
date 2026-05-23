import apiClient from './api'
import { User, EmployeePermissions, EmployeeRoleTemplate } from '@/types'
import { fetchWithCache, delCache } from './cache'

export const userService = {
  // Deprecated marketplace compatibility: preserved so older UI paths still compile.
  async applyAsSeller(userId: string, shopName: string, shopDescription: string) {
    const { data } = await apiClient.post(
      `/users/${userId}/apply-seller`,
      { shopName, shopDescription }
    )
    return data.data as User
  },

  async getSellerProfile(userId: string) {
    const { data } = await apiClient.get(`/users/${userId}/seller-profile`)
    return data.data
  },

  async getEmployeeRoleTemplates() {
    return fetchWithCache('users:roleTemplates', async () => {
      const { data } = await apiClient.get('/users/employee-role-templates')
      return data.data as Record<string, EmployeePermissions>
    }, 300)
  },

  async getEmployees() {
    return fetchWithCache('users:employees', async () => {
      const { data } = await apiClient.get('/users/employees')
      return data.data as User[]
    }, 60)
  },

  async addEmployee(payload: {
    email: string
    title: string
    template: EmployeeRoleTemplate
    permissions?: EmployeePermissions
  }) {
    const { data } = await apiClient.post('/users/employees', payload)
    // Invalidate employees cache
    delCache('users:employees')
    return data.data as User
  },

  async createEmployeeAccount(payload: {
    name: string
    title?: string
    email?: string
    password?: string
    template: EmployeeRoleTemplate
    permissions?: EmployeePermissions
  }) {
    const { data } = await apiClient.post('/admin/employees/create', payload)
    delCache('users:employees')
    return data.data as User
  },

  async updateEmployeeAccess(employeeUserId: string, payload: {
    title?: string
    template: EmployeeRoleTemplate
    permissions: EmployeePermissions
  }) {
    const { data } = await apiClient.patch(`/users/employees/${employeeUserId}`, payload)
    delCache('users:employees')
    return data.data as User
  },

  async removeEmployee(employeeUserId: string) {
    const { data } = await apiClient.delete(`/users/employees/${employeeUserId}`)
    delCache('users:employees')
    return data.data as User
  },
}
