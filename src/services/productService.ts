import apiClient from './api'
import { Product } from '@/types'

export const productService = {
  // Get all products with pagination and filters
  async getAll(page: number = 1, limit: number = 20, filters?: {
    category?: string
    featured?: boolean
    search?: string
  }) {
    const { data } = await apiClient.get('/products', {
      params: { page, limit, ...filters },
    })
    return data.data
  },
  
  // Get product by ID
  async getById(id: string) {
    const { data } = await apiClient.get(`/products/${id}`)
    return data.data
  },
  
  // Search products
  async search(query: string) {
    const { data } = await apiClient.get('/products/search', {
      params: { q: query },
    })
    return data.data
  },
  
  // Get featured products
  async getFeatured(limit: number = 10) {
    const { data } = await apiClient.get('/products/featured', {
      params: { limit },
    })
    return data.data
  },
  
  // Get products by category
  async getByCategory(category: string) {
    const { data } = await apiClient.get('/products', {
      params: { page: 1, limit: 20, category },
    })
    return data.data
  },

  // Get current seller products
  async getMine() {
    const { data } = await apiClient.get('/products/mine')
    return data.data
  },

  // Get current seller analytics
  async getMineAnalytics(range: '7day' | '30day' | '90day' = '30day') {
    const { data } = await apiClient.get('/products/mine/analytics', {
      params: { range },
    })
    return data.data
  },
  
  // Create product (admin)
  async create(product: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>) {
    const { data } = await apiClient.post('/products', product)
    return data.data
  },
  
  // Update product (admin)
  async update(id: string, updates: Partial<Product>) {
    const { data } = await apiClient.put(`/products/${id}`, updates)
    return data.data
  },
  
  // Delete product (admin)
  async delete(id: string) {
    await apiClient.delete(`/products/${id}`)
  },
}

export const categoryService = {
  // Get all categories
  async getAll() {
    const { data } = await apiClient.get('/categories')
    return data.data
  },
}
