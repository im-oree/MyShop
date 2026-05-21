import { getFirestore } from '../config/firebase.js'
import { CartItem } from '../types/index.js'

export class CartService {
  private db = getFirestore()
  private collection = 'carts'
  
  /**
   * Get current user's cart
   */
  async getCart(userId: string): Promise<CartItem[]> {
    const doc = await this.db.collection(this.collection).doc(userId).get()
    if (!doc.exists) return []
    
    const data = doc.data()
    return Array.isArray(data?.items) ? data.items : []
  }
  
  /**
   * Save user's cart
   */
  async saveCart(userId: string, items: CartItem[]): Promise<void> {
    await this.db.collection(this.collection).doc(userId).set({
      items: items || [],
      updatedAt: new Date(),
    }, { merge: true })
  }
  
  /**
   * Add item to cart
   */
  async addItem(userId: string, item: CartItem): Promise<CartItem[]> {
    const current = await this.getCart(userId)
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
    
    await this.saveCart(userId, updated)
    return updated
  }
  
  /**
   * Remove item from cart
   */
  async removeItem(userId: string, productId: string): Promise<CartItem[]> {
    const current = await this.getCart(userId)
    const updated = current.filter(i => i.productId !== productId)
    await this.saveCart(userId, updated)
    return updated
  }
  
  /**
   * Update item quantity
   */
  async updateQuantity(userId: string, productId: string, quantity: number): Promise<CartItem[]> {
    if (quantity <= 0) {
      return this.removeItem(userId, productId)
    }
    
    const current = await this.getCart(userId)
    const updated = current.map(i =>
      i.productId === productId
        ? { ...i, quantity }
        : i
    )
    
    await this.saveCart(userId, updated)
    return updated
  }
  
  /**
   * Clear user's cart
   */
  async clearCart(userId: string): Promise<void> {
    await this.saveCart(userId, [])
  }
}
