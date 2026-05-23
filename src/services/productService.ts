import apiClient from './api'
import { Product, ProductType } from '@/types'
import { fetchWithCache } from './cache'

export const productService = {
  // Get all products with pagination and filters
  async getAll(page: number = 1, limit: number = 20, filters?: {
    category?: string
    featured?: boolean
    search?: string
    productType?: ProductType
  }) {
    const key = `products:page=${page}:limit=${limit}:f=${JSON.stringify(filters||{})}`
    return fetchWithCache(key, async () => {
      const { data } = await apiClient.get('/products', {
        params: { page, limit, ...filters },
      })
      return data.data
    }, 30) // short cache for lists
  },
  
  // Get product by ID
  async getById(id: string) {
    const key = `product:${id}`
    return fetchWithCache(key, async () => {
      const { data } = await apiClient.get(`/products/${id}`)
      return data.data
    }, 120)
  },
  
  // Search products
  async search(query: string) {
    const key = `products:search:${query}`
    return fetchWithCache(key, async () => {
      const { data } = await apiClient.get('/products/search', {
        params: { q: query },
      })
      return data.data
    }, 20)
  },
  
  // Get featured products
  async getFeatured(limit: number = 10) {
    const key = `products:featured:limit=${limit}`
    return fetchWithCache(key, async () => {
      const { data } = await apiClient.get('/products/featured', {
        params: { limit },
      })
      return data.data
    }, 300) // featured changes rarely
  },
  
  // Get products by category
  async getByCategory(category: string) {
    const key = `products:category:${category}`
    return fetchWithCache(key, async () => {
      const { data } = await apiClient.get('/products', {
        params: { page: 1, limit: 20, category },
      })
      return data.data
    }, 120)
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
    return fetchWithCache('categories:all', async () => {
      const { data } = await apiClient.get('/categories')
      return data.data
    }, 300)
  },
}
