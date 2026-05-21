import apiClient from './api'
import { User, EmployeePermissions, EmployeeRoleTemplate } from '@/types'

export const userService = {
  // Apply to become a seller
  async applyAsSeller(userId: string, shopName: string, shopDescription: string) {
    const { data } = await apiClient.post(
      `/users/${userId}/apply-seller`,
      { shopName, shopDescription }
    )
    return data.data as User
  },

  // Get seller profile
  async getSellerProfile(userId: string) {
    const { data } = await apiClient.get(`/users/${userId}/seller-profile`)
    return data.data
  },

  async getEmployeeRoleTemplates() {
    const { data } = await apiClient.get('/users/employee-role-templates')
    return data.data as Record<string, EmployeePermissions>
  },

  async getEmployees() {
    const { data } = await apiClient.get('/users/employees')
    return data.data as User[]
  },

  async addEmployee(payload: {
    email: string
    title: string
    template: EmployeeRoleTemplate
    permissions?: EmployeePermissions
  }) {
    const { data } = await apiClient.post('/users/employees', payload)
    return data.data as User
  },

  async updateEmployeeAccess(employeeUserId: string, payload: {
    title?: string
    template: EmployeeRoleTemplate
    permissions: EmployeePermissions
  }) {
    const { data } = await apiClient.patch(`/users/employees/${employeeUserId}`, payload)
    return data.data as User
  },
}
