import apiClient from './api'

export interface ConversationItem {
  id: string
  participants: string[]
  participantMeta?: Array<{ userId: string; name: string; role: string }>
  sellerId?: string
  contextType: 'general' | 'product' | 'order'
  contextId?: string
  lastMessage?: string
  lastMessageAt?: unknown
  lastMessageBy?: string
  createdAt: unknown
  updatedAt: unknown
}

export interface MessageItem {
  id: string
  conversationId: string
  senderId: string
  body: string
  createdAt: unknown
  updatedAt: unknown
}

export const messageService = {
  async startConversation(payload: { targetUserId?: string; productId?: string; orderId?: string }) {
    const { data } = await apiClient.post('/messages/conversations/start', payload)
    return data.data as ConversationItem
  },

  async getConversations(page: number = 1, limit: number = 30) {
    const { data } = await apiClient.get('/messages/conversations', { params: { page, limit } })
    return data.data as { items: ConversationItem[]; total: number; page: number; limit: number; pages: number }
  },

  async getMessages(conversationId: string, page: number = 1, limit: number = 50) {
    const { data } = await apiClient.get(`/messages/conversations/${conversationId}/messages`, { params: { page, limit } })
    return data.data as { items: MessageItem[]; total: number; page: number; limit: number; pages: number }
  },

  async sendMessage(conversationId: string, body: string) {
    const { data } = await apiClient.post(`/messages/conversations/${conversationId}/messages`, { body })
    return data.data as MessageItem
  },
}
