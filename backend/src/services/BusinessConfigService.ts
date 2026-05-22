import { getFirestore } from '../config/firebase.js'
import { BusinessConfig } from '../types/index.js'

export class BusinessConfigService {
  private db = getFirestore()
  private collection = 'businessConfig'
  private configId = 'config'

  /**
   * Get business configuration
   */
  async getConfig(): Promise<BusinessConfig | null> {
    const doc = await this.db.collection(this.collection).doc(this.configId).get()
    return doc.exists ? (doc.data() as BusinessConfig) : null
  }

  /**
   * Create or update business configuration
   */
  async upsertConfig(data: Omit<BusinessConfig, 'id' | 'createdAt' | 'updatedAt'>): Promise<BusinessConfig> {
    const existing = await this.getConfig()
    const now = new Date()

    const config: BusinessConfig = {
      id: this.configId,
      ...data,
      createdAt: existing?.createdAt || now,
      updatedAt: now,
    }

    await this.db.collection(this.collection).doc(this.configId).set(config, { merge: false })
    return config
  }

  /**
   * Update specific business config fields
   */
  async updateConfig(data: Partial<Omit<BusinessConfig, 'id' | 'createdAt'>>): Promise<BusinessConfig> {
    const existing = await this.getConfig()
    if (!existing) {
      throw new Error('Business configuration not found. Please create config first.')
    }

    const updated = {
      ...existing,
      ...data,
      updatedAt: new Date(),
    }

    await this.db.collection(this.collection).doc(this.configId).set(updated, { merge: false })
    return updated
  }

  /**
   * Get business name
   */
  async getBusinessName(): Promise<string> {
    const config = await this.getConfig()
    return config?.businessName || 'My Store'
  }

  /**
   * Get business logo URL
   */
  async getBusinessLogo(): Promise<string | undefined> {
    const config = await this.getConfig()
    return config?.businessLogo
  }

  /**
   * Get business colors
   */
  async getBusinessColors(): Promise<BusinessConfig['colors'] | undefined> {
    const config = await this.getConfig()
    return config?.colors
  }

  /**
   * Check if feature is enabled
   */
  async isFeatureEnabled(feature: keyof NonNullable<BusinessConfig['features']>): Promise<boolean> {
    const config = await this.getConfig()
    return config?.features?.[feature] ?? true
  }
}

export default new BusinessConfigService()
