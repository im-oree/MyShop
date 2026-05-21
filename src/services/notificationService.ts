import apiClient from './api'
import { NotificationItem } from '@/types'

export const notificationService = {
  async getNotifications(page: number = 1, limit: number = 20, unreadOnly: boolean = false) {
    const { data } = await apiClient.get('/notifications', {
      params: { page, limit, unreadOnly },
    })
    const payload = data.data || {}
    return {
      items: payload.items || [],
      total: payload.total || 0,
      page: payload.page || page,
      limit: payload.limit || limit,
      pages: payload.pages || 0,
    }
  },

  async getUnreadCount() {
    const { data } = await apiClient.get('/notifications/unread-count')
    return data.data?.count || 0
  },

  async markRead(id: string) {
    const { data } = await apiClient.patch(`/notifications/${id}/read`)
    return data.data
  },

  async markAllRead() {
    const { data } = await apiClient.patch('/notifications/read-all')
    return data.data
  },

  async registerDeviceToken(token: string) {
    const { data } = await apiClient.post('/notifications/register-device', { token })
    return data.data
  },

  async enableBrowserNotifications(): Promise<boolean> {
    if (!('Notification' in window)) return false

    const permission = await Notification.requestPermission()
    return permission === 'granted'
  },
}

export type { NotificationItem }
