import apiClient from './api'
import { Order } from '@/types'

export const orderService = {
  // Create order
  async create(order: Omit<Order, 'id' | 'createdAt' | 'updatedAt'>) {
    const { data } = await apiClient.post('/orders', order)
    return data.data
  },
  
  // Get user orders
  async getAll(page: number = 1, limit: number = 10) {
    const { data } = await apiClient.get('/orders', {
      params: { page, limit },
    })
    return data.data
  },
  
  // Get order by ID
  async getById(id: string) {
    const { data } = await apiClient.get(`/orders/${id}`)
    return data.data
  },

  // Get seller orders (for sellers)
  async getSellerOrders(page: number = 1, limit: number = 20, query: string = '') {
    const { data } = await apiClient.get('/orders/seller', {
      params: { page, limit, q: query },
    })
    // Normalize paginated response to { orders, total, page, limit, pages }
    const payload = data.data || {}
    return {
      orders: payload.items || [],
      total: payload.total || 0,
      page: payload.page || page,
      limit: payload.limit || limit,
      pages: payload.pages || 0,
    }
  },

  async getSellerOrderById(id: string) {
    const { data } = await apiClient.get(`/orders/seller/${id}`)
    return data.data
  },
  
  // Update order status (admin)
  async updateStatus(id: string, status: string) {
    const { data } = await apiClient.patch(`/orders/${id}/status`, { status })
    return data.data
  },
}

export const paymentService = {
  // Initialize payment
  async initializePayment(orderId: string) {
    const { data } = await apiClient.post('/payments/initialize', {
      orderId,
    })
    return data.data
  },
  
  // Verify payment
  async verifyPayment(reference: string, orderId?: string) {
    const { data } = await apiClient.post('/payments/verify', {
      reference,
      orderId,
    })
    return data.data
  },
}
