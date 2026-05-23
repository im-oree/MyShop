import { getFirestore } from '../config/firebase.js'
import { Product, Category } from '../types/index.js'
import { generateId } from '../utils/helpers.js'

function removeUndefinedValues<T extends Record<string, unknown>>(value: T): T {
  return Object.fromEntries(
    Object.entries(value).filter(([, item]) => item !== undefined)
  ) as T
}

export class ProductService {
  private db = getFirestore()
  private collection = 'products'
  
  /**
   * Create a new product
   */
  async create(product: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>): Promise<Product> {
    const id = generateId()
    const now = new Date()
    
    const data = removeUndefinedValues({
      ...product,
      id,
      createdAt: now,
      updatedAt: now,
    }) as Product
    
    await this.db.collection(this.collection).doc(id).set(data)
    return data
  }
  
  /**
   * Get product by ID
   */
  async getById(id: string): Promise<Product | null> {
    const doc = await this.db.collection(this.collection).doc(id).get()
    if (doc.exists) {
      const data = doc.data() as Product
      return {
        ...data,
        id: data.id || doc.id,
        productType: data.productType || 'physical',
      }
    }

    // Backward compatibility for records where Firestore doc ID and payload id differ.
    const byPayloadId = await this.db
      .collection(this.collection)
      .where('id', '==', id)
      .limit(1)
      .get()

    if (byPayloadId.empty) return null
    const fallbackDoc = byPayloadId.docs[0]
    const fallbackData = fallbackDoc.data() as Product
    return {
      ...fallbackData,
      id: fallbackData.id || fallbackDoc.id,
      productType: fallbackData.productType || 'physical',
    }
  }
  
  /**
   * Get all products with pagination
   */
  async getAll(page: number = 1, limit: number = 20, filters?: {
    category?: string
    featured?: boolean
    search?: string
    productType?: 'physical' | 'service' | 'downloadable'
  }): Promise<{ products: Product[]; total: number }> {
    let query = this.db.collection(this.collection)
    
    if (filters?.category) {
      query = (query as any).where('category', '==', filters.category)
    }
    
    if (filters?.featured === true) {
      query = (query as any).where('featured', '==', true)
    }

    if (filters?.productType) {
      query = (query as any).where('productType', '==', filters.productType)
    }
    
    const total = (await query.count().get()).data().count
    
    const snapshot = await query
      .orderBy('createdAt', 'desc')
      .offset((page - 1) * limit)
      .limit(limit)
      .get()
    
    const products = snapshot.docs.map(doc => {
      const data = doc.data() as Product
      return {
        ...data,
        id: data.id || doc.id,
        productType: data.productType || 'physical',
      }
    })
    
    // Filter by search if provided
    if (filters?.search) {
      const searchLower = filters.search.toLowerCase()
      return {
        products: products.filter(p =>
          p.name.toLowerCase().includes(searchLower) ||
          p.description.toLowerCase().includes(searchLower) ||
          p.tags.some(tag => tag.toLowerCase().includes(searchLower))
        ),
        total,
      }
    }
    
    return { products, total }
  }
  
  /**
   * Search products
   */
  async search(query: string, limit: number = 20): Promise<Product[]> {
    const queryLower = query.toLowerCase()
    
    const snapshot = await this.db
      .collection(this.collection)
      .limit(limit)
      .get()
    
    const products = snapshot.docs.map(doc => {
      const data = doc.data() as Product
      return {
        ...data,
        id: data.id || doc.id,
        productType: data.productType || 'physical',
      }
    })
    
    return products.filter(p =>
      p.name.toLowerCase().includes(queryLower) ||
      p.description.toLowerCase().includes(queryLower) ||
      p.tags.some(tag => tag.toLowerCase().includes(queryLower))
    )
  }
  
  /**
   * Update product
   */
  async update(id: string, updates: Partial<Product>): Promise<void> {
    await this.db.collection(this.collection).doc(id).update(
      removeUndefinedValues({
        ...updates,
        updatedAt: new Date(),
      })
    )
  }
  
  /**
   * Delete product
   */
  async delete(id: string): Promise<void> {
    await this.db.collection(this.collection).doc(id).delete()
  }
  
  /**
   * Reduce stock
   */
  async reduceStock(id: string, quantity: number): Promise<void> {
    const product = await this.getById(id)
    if (!product) throw new Error('Product not found')
    if (product.stock < quantity) throw new Error('Insufficient stock')
    
    await this.update(id, {
      stock: product.stock - quantity,
    })
  }
  
  /**
   * Get featured products
   */
  async getFeatured(limit: number = 10): Promise<Product[]> {
    const snapshot = await this.db
      .collection(this.collection)
      .where('featured', '==', true)
      .limit(limit)
      .get()
    
    return snapshot.docs.map(doc => {
      const data = doc.data() as Product
      return {
        ...data,
        id: data.id || doc.id,
        productType: data.productType || 'physical',
      }
    })
  }
  
  /**
   * Get products by category
   */
  async getByCategory(category: string, limit: number = 20): Promise<Product[]> {
    const snapshot = await this.db
      .collection(this.collection)
      .where('category', '==', category)
      .limit(limit)
      .get()
    
    return snapshot.docs.map(doc => {
      const data = doc.data() as Product
      return {
        ...data,
        id: data.id || doc.id,
        productType: data.productType || 'physical',
      }
    })
  }

  /**
   * Get products by seller ID (deprecated - keeping for backward compatibility)
   * @deprecated Use getAll() instead - all products belong to single owner
   */
  async getBySellerId(_sellerId: string): Promise<Product[]> {
    return this.getAll(1, Infinity).then(result => result.products)
  }
}

export class CategoryService {
  private db = getFirestore()
  private collection = 'categories'
  
  async create(category: Omit<Category, 'id'>): Promise<Category> {
    const id = generateId()
    const data: Category = { ...category, id }
    
    await this.db.collection(this.collection).doc(id).set(data)
    return data
  }
  
  async getAll(): Promise<Category[]> {
    const snapshot = await this.db.collection(this.collection).get()
    return snapshot.docs.map(doc => doc.data() as Category)
  }
  
  async getById(id: string): Promise<Category | null> {
    const doc = await this.db.collection(this.collection).doc(id).get()
    return doc.exists ? (doc.data() as Category) : null
  }
  
  async delete(id: string): Promise<void> {
    await this.db.collection(this.collection).doc(id).delete()
  }
}
