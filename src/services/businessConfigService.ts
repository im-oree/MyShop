import axios from 'axios'
import { BusinessConfig } from '../types/models'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'
const api = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
})

export const businessConfigService = {
  /**
   * Get business configuration
   */
  async getConfig(): Promise<BusinessConfig | null> {
    try {
      const response = await api.get<{ data: BusinessConfig }>('/admin/config')
      return response.data.data
    } catch (error) {
      console.error('Failed to fetch business config:', error)
      return null
    }
  },

  /**
   * Create or update business configuration
   */
  async updateConfig(config: Omit<BusinessConfig, 'id' | 'createdAt' | 'updatedAt'>): Promise<BusinessConfig | null> {
    try {
      const response = await api.post<{ data: BusinessConfig }>('/admin/config', config)
      return response.data.data
    } catch (error) {
      console.error('Failed to update business config:', error)
      return null
    }
  },

  /**
   * Partially update business configuration
   */
  async patchConfig(updates: Partial<Omit<BusinessConfig, 'id' | 'createdAt' | 'updatedAt'>>): Promise<BusinessConfig | null> {
    try {
      const response = await api.patch<{ data: BusinessConfig }>('/admin/config', updates)
      return response.data.data
    } catch (error) {
      console.error('Failed to patch business config:', error)
      return null
    }
  },

  /**
   * Get business name
   */
  async getBusinessName(): Promise<string> {
    const config = await this.getConfig()
    return config?.businessName || 'My Store'
  },

  /**
   * Get business logo
   */
  async getBusinessLogo(): Promise<string | undefined> {
    const config = await this.getConfig()
    return config?.businessLogo
  },

  /**
   * Get business colors
   */
  async getBusinessColors(): Promise<BusinessConfig['colors'] | undefined> {
    const config = await this.getConfig()
    return config?.colors
  },
}

export default businessConfigService
