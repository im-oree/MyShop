import { getFirestore } from '../config/firebase.js'
import { Order, OrderStatus, PaymentStatus } from '../types/index.js'
import { generateId } from '../utils/helpers.js'

export class OrderService {
  private db = getFirestore()
  private collection = 'orders'
  
  /**
   * Create a new order
   */
  async create(order: Omit<Order, 'id' | 'createdAt' | 'updatedAt'>): Promise<Order> {
    const id = generateId()
    const now = new Date()
    
    const data: Order = {
      ...order,
      id,
      createdAt: now,
      updatedAt: now,
    }
    
    await this.db.collection(this.collection).doc(id).set(data)
    return data
  }
  
  /**
   * Get order by ID
   */
  async getById(id: string): Promise<Order | null> {
    const doc = await this.db.collection(this.collection).doc(id).get()
    return doc.exists ? (doc.data() as Order) : null
  }
  
  /**
   * Get orders by user ID
   */
  async getByUserId(userId: string, page: number = 1, limit: number = 10): Promise<{
    orders: Order[]
    total: number
  }> {
    const snapshot = await this.db
      .collection(this.collection)
      .where('userId', '==', userId)
      .get()

    const allOrders = snapshot.docs.map(doc => doc.data() as Order)
    allOrders.sort((a, b) => {
      const aTime = new Date(a.createdAt as any).getTime()
      const bTime = new Date(b.createdAt as any).getTime()
      return bTime - aTime
    })

    const total = allOrders.length
    const start = (page - 1) * limit
    const orders = allOrders.slice(start, start + limit)
    return { orders, total }
  }
  
  /**
   * Update order status
   */
  async updateStatus(id: string, status: OrderStatus): Promise<void> {
    await this.db.collection(this.collection).doc(id).update({
      status,
      updatedAt: new Date(),
    })
  }
  
  /**
   * Update payment status
   */
  async updatePaymentStatus(id: string, paymentStatus: PaymentStatus, paymentRef?: string): Promise<void> {
    const update: Partial<Order> = {
      paymentStatus,
      updatedAt: new Date(),
    }
    
    if (paymentRef) {
      update.paymentRef = paymentRef
    }
    
    if (paymentStatus === PaymentStatus.COMPLETED) {
      // When payment completes, move order into initial "noted" stage
      update.status = OrderStatus.NOTED
    }
    
    await this.db.collection(this.collection).doc(id).update(update)
  }
  
  /**
   * Get all orders (admin)
   */
  async getAll(page: number = 1, limit: number = 20): Promise<{
    orders: Order[]
    total: number
  }> {
    const query = this.db.collection(this.collection)
    const total = (await query.count().get()).data().count
    
    const snapshot = await query
      .orderBy('createdAt', 'desc')
      .offset((page - 1) * limit)
      .limit(limit)
      .get()
    
    const orders = snapshot.docs.map(doc => doc.data() as Order)
    return { orders, total }
  }

  /**
   * Get all orders without pagination.
   */
  async getAllRecords(): Promise<Order[]> {
    const snapshot = await this.db.collection(this.collection).get()
    return snapshot.docs.map(doc => doc.data() as Order)
  }
  
  /**
   * Get orders by status
   */
  async getByStatus(status: OrderStatus, page: number = 1, limit: number = 20): Promise<{
    orders: Order[]
    total: number
  }> {
    const query = this.db.collection(this.collection).where('status', '==', status)
    const total = (await query.count().get()).data().count
    
    const snapshot = await query
      .orderBy('createdAt', 'desc')
      .offset((page - 1) * limit)
      .limit(limit)
      .get()
    
    const orders = snapshot.docs.map(doc => doc.data() as Order)
    return { orders, total }
  }
  
  /**
   * Get order by payment reference
   */
  async getByPaymentRef(paymentRef: string): Promise<Order | null> {
    const snapshot = await this.db
      .collection(this.collection)
      .where('paymentRef', '==', paymentRef)
      .limit(1)
      .get()
    
    if (snapshot.empty) return null
    return snapshot.docs[0].data() as Order
  }
}
