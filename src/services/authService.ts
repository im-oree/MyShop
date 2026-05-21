import apiClient from './api'
import { User, Address } from '@/types'

export const authService = {
  // Sign up
  async signup(email: string, password: string, name: string) {
    const { data } = await apiClient.post('/auth/signup', {
      email,
      password,
      name,
    })
    if (data.data.token) {
      localStorage.setItem('authToken', data.data.token)
    }
    return data.data
  },
  
  // Login
  async login(email: string, password: string) {
    const { data } = await apiClient.post('/auth/login', {
      email,
      password,
    })
    if (data.data.token) {
      localStorage.setItem('authToken', data.data.token)
    }
    return data.data
  },
  
  // Get current user
  async getCurrentUser() {
    const { data } = await apiClient.get('/auth/me')
    return data.data
  },
  
  // Logout
  logout() {
    localStorage.removeItem('authToken')
  },
  
  // Update profile
  async updateProfile(updates: Partial<User>) {
    const { data } = await apiClient.put('/auth/profile', updates)
    return data.data
  },
}

export const addressService = {
  // Get user addresses
  async getAll() {
    const { data } = await apiClient.get('/addresses')
    return data.data
  },
  
  // Add address
  async add(address: Omit<Address, 'id' | 'userId'>) {
    const { data } = await apiClient.post('/addresses', address)
    return data.data
  },
  
  // Update address
  async update(id: string, updates: Partial<Address>) {
    const { data } = await apiClient.put(`/addresses/${id}`, updates)
    return data.data
  },
  
  // Delete address
  async delete(id: string) {
    await apiClient.delete(`/addresses/${id}`)
  },
}
