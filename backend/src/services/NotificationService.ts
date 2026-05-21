import admin from 'firebase-admin'
import { getFirestore } from '../config/firebase.js'
import { generateId } from '../utils/helpers.js'
import { Notification, NotificationPriority, NotificationType } from '../types/index.js'

function isImportant(priority: NotificationPriority): boolean {
  return priority === 'important'
}

export class NotificationService {
  private db = getFirestore()
  private collection = 'notifications'

  async create(notification: Omit<Notification, 'id' | 'createdAt' | 'updatedAt' | 'readAt'> & { readAt?: Date | null }): Promise<Notification> {
    const id = generateId()
    const now = new Date()
    const data: Notification = {
      ...notification,
      id,
      createdAt: now,
      updatedAt: now,
      readAt: notification.readAt ?? null,
    }

    await this.db.collection(this.collection).doc(id).set(data)
    return data
  }

  async listByUser(userId: string, page: number = 1, limit: number = 20, unreadOnly: boolean = false): Promise<{ notifications: Notification[]; total: number }> {
    let query: any = this.db.collection(this.collection).where('userId', '==', userId)

    if (unreadOnly) {
      query = query.where('readAt', '==', null)
    }

    const snapshot = await query.get()
    const notifications = snapshot.docs
      .map((doc: any) => doc.data() as Notification)
      .sort((a: Notification, b: Notification) => new Date(b.createdAt as any).getTime() - new Date(a.createdAt as any).getTime())

    const total = notifications.length
    const start = (page - 1) * limit
    return { notifications: notifications.slice(start, start + limit), total }
  }

  async getUnreadCount(userId: string): Promise<number> {
    const snapshot = await this.db.collection(this.collection)
      .where('userId', '==', userId)
      .where('readAt', '==', null)
      .get()
    return snapshot.size
  }

  async markRead(userId: string, notificationId: string): Promise<void> {
    const doc = await this.db.collection(this.collection).doc(notificationId).get()
    if (!doc.exists) return
    const data = doc.data() as Notification
    if (data.userId !== userId) return
    await this.db.collection(this.collection).doc(notificationId).update({ readAt: new Date(), updatedAt: new Date() })
  }

  async markAllRead(userId: string): Promise<void> {
    const snapshot = await this.db.collection(this.collection)
      .where('userId', '==', userId)
      .where('readAt', '==', null)
      .get()

    const batch = this.db.batch()
    snapshot.docs.forEach(doc => {
      batch.update(doc.ref, { readAt: new Date(), updatedAt: new Date() })
    })
    await batch.commit()
  }

  async createForUser(
    userId: string,
    type: NotificationType,
    title: string,
    message: string,
    link?: string,
    priority: NotificationPriority = 'normal',
    metadata?: Record<string, unknown>,
  ): Promise<Notification> {
    const notification = await this.create({
      userId,
      type,
      title,
      message,
      priority,
      link,
      metadata,
    })

    if (isImportant(priority)) {
      await this.sendPush(userId, title, message, link, metadata)
    }

    return notification
  }

  async createForMany(
    userIds: string[],
    type: NotificationType,
    title: string,
    message: string,
    link?: string,
    priority: NotificationPriority = 'normal',
    metadata?: Record<string, unknown>,
  ): Promise<void> {
    await Promise.all(userIds.map(userId => this.createForUser(userId, type, title, message, link, priority, metadata)))
  }

  private async sendPush(
    userId: string,
    title: string,
    body: string,
    link?: string,
    metadata?: Record<string, unknown>,
  ): Promise<void> {
    try {
      const userDoc = await this.db.collection('users').doc(userId).get()
      if (!userDoc.exists) return
      const user = userDoc.data() as { fcmTokens?: string[] }
      const tokens = (user.fcmTokens || []).filter(Boolean)
      if (tokens.length === 0) return

      await admin.messaging().sendEachForMulticast({
        tokens,
        notification: { title, body },
        data: {
          ...(metadata ? Object.fromEntries(Object.entries(metadata).map(([key, value]) => [key, String(value)])) : {}),
          link: link || '',
        },
      })
    } catch (error) {
      console.error('FCM push failed:', error)
    }
  }
}

export const notificationService = new NotificationService()
