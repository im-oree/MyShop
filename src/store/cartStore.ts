import { create } from 'zustand'
import { CartItem } from '@/types'
import apiClient from '@/services/api'

interface CartStore {
  items: CartItem[]
  syncing: boolean
  addItem: (item: CartItem) => Promise<void>
  removeItem: (productId: string) => Promise<void>
  updateQuantity: (productId: string, quantity: number) => Promise<void>
  clearCart: () => Promise<void>
  loadCart: () => Promise<void>
  setItems: (items: CartItem[]) => void
  getTotal: () => number
}

export const useCartStore = create<CartStore>((set, get) => ({
  items: [],
  syncing: false,
  
  setItems: (items: CartItem[]) => {
    set({ items })
  },
  
  addItem: async (item: CartItem) => {
    const current = get().items
    const existing = current.find(i => i.productId === item.productId)
    
    let updated: CartItem[]
    if (existing) {
      updated = current.map(i =>
        i.productId === item.productId
          ? { ...i, quantity: i.quantity + item.quantity }
          : i
      )
    } else {
      updated = [...current, item]
    }
    
    set({ items: updated })
    
    try {
      await apiClient.post('/cart', { items: updated })
    } catch (error) {
      console.error('Failed to save cart:', error)
    }
  },
  
  removeItem: async (productId: string) => {
    const updated = get().items.filter(i => i.productId !== productId)
    set({ items: updated })
    
    try {
      await apiClient.post('/cart', { items: updated })
    } catch (error) {
      console.error('Failed to save cart:', error)
    }
  },
  
  updateQuantity: async (productId: string, quantity: number) => {
    if (quantity <= 0) {
      await get().removeItem(productId)
      return
    }
    
    const updated = get().items.map(i =>
      i.productId === productId
        ? { ...i, quantity }
        : i
    )
    
    set({ items: updated })
    
    try {
      await apiClient.post('/cart', { items: updated })
    } catch (error) {
      console.error('Failed to save cart:', error)
    }
  },
  
  clearCart: async () => {
    set({ items: [] })
    
    try {
      await apiClient.delete('/cart')
    } catch (error) {
      console.error('Failed to clear cart:', error)
    }
  },
  
  loadCart: async () => {
    set({ syncing: true })
    try {
      const { data } = await apiClient.get('/cart')
      set({ items: data.data || [] })
    } catch (error) {
      console.error('Failed to load cart:', error)
    } finally {
      set({ syncing: false })
    }
  },
  
  getTotal: () => {
    return get().items.reduce((sum, item) => sum + (item.price * item.quantity), 0)
  },
}))
