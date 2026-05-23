import { Router, Request, Response } from 'express'
import { authenticate } from '../middlewares/index.js'
import { sendError, sendSuccess, sendPaginated } from '../utils/response.js'
import { getFirestore } from '../config/firebase.js'
import { generateId } from '../utils/helpers.js'
import { orderService, productService, userService } from '../services/index.js'
import { getEffectivePermissions, hasAccess } from '../utils/rbac.js'

const router = Router()

async function canWriteMessages(userId: string): Promise<boolean> {
  const user = await userService.getById(userId)
  if (!user) return false
  if (user.role === 'user' || user.role === 'admin' || user.role === 'manager') return true
  if (user.role === 'employee') {
    const permissions = getEffectivePermissions(user)
    return hasAccess(permissions.messages, 'write')
  }
  return false
}

async function canReadMessages(userId: string): Promise<boolean> {
  const user = await userService.getById(userId)
  if (!user) return false
  if (user.role === 'user' || user.role === 'admin' || user.role === 'manager') return true
  if (user.role === 'employee') {
    const permissions = getEffectivePermissions(user)
    return hasAccess(permissions.messages, 'read')
  }
  return false
}

async function getAdminUser(): Promise<string | null> {
  const { users } = await userService.getAll(1, 1000)
  const admin = users.find(u => u.role === 'admin' || u.role === 'manager')
  return admin?.id || null
}

/** Mark all messages in a conversation as read for the actor (updates lastReadBy map). */
async function markConversationRead(conversationId: string, userId: string) {
  const db = getFirestore()
  const ref = db.collection('conversations').doc(conversationId)
  await ref.set(
    {
      lastReadBy: { [userId]: new Date() },
      updatedAt: new Date(),
    },
    { merge: true }
  )
}

/* ─────────────────────────────────────────
   START CONVERSATION
───────────────────────────────────────── */
router.post('/conversations/start', authenticate, async (req: Request, res: Response) => {
  try {
    const actorId = req.userId!
    const writable = await canWriteMessages(actorId)
    if (!writable) {
      sendError(res, 'Insufficient message permissions', 403)
      return
    }

    const { targetUserId, productId, orderId } = req.body as {
      targetUserId?: string
      productId?: string
      orderId?: string
    }

    let resolvedTargetUserId = targetUserId
    let contextType: 'general' | 'product' | 'order' = 'general'
    let contextId: string | undefined

    if (!resolvedTargetUserId && productId) {
      const product = await productService.getById(productId)
      if (!product) {
        sendError(res, 'Product not found', 404)
        return
      }
      const admin = await getAdminUser()
      if (!admin) {
        sendError(res, 'Admin user not found', 500)
        return
      }
      resolvedTargetUserId = admin
      contextType = 'product'
      contextId = productId
    }

    if (!resolvedTargetUserId && orderId) {
      const order = await orderService.getById(orderId)
      if (!order || order.items.length === 0) {
        sendError(res, 'Order not found', 404)
        return
      }
      const admin = await getAdminUser()
      if (!admin) {
        sendError(res, 'Admin user not found', 500)
        return
      }
      resolvedTargetUserId = admin
      contextType = 'order'
      contextId = orderId
    }

    if (!resolvedTargetUserId) {
      sendError(res, 'Target user is required', 400)
      return
    }
    if (resolvedTargetUserId === actorId) {
      sendError(res, 'Cannot create conversation with yourself', 400)
      return
    }

    const db = getFirestore()
    const participants = [actorId, resolvedTargetUserId].sort()

    const existing = await db.collection('conversations')
      .where('participants', '==', participants)
      .where('contextType', '==', contextType)
      .where('contextId', '==', contextId || null)
      .limit(1)
      .get()

    if (!existing.empty) {
      sendSuccess(res, existing.docs[0].data(), 'Conversation fetched')
      return
    }

    const actor = await userService.getById(actorId)
    const target = await userService.getById(resolvedTargetUserId)

    const id = generateId()
    const now = new Date()
    const conversation = {
      id,
      participants,
      participantMeta: [
        { userId: actorId, name: actor?.name || 'User', role: actor?.role || 'user' },
        { userId: resolvedTargetUserId, name: target?.name || 'User', role: target?.role || 'admin' },
      ],
      contextType,
      contextId: contextId || null,
      lastMessage: '',
      lastMessageAt: null,
      lastMessageBy: null,
      lastReadBy: { [actorId]: now }, // creator has nothing unread
      createdAt: now,
      updatedAt: now,
    }

    await db.collection('conversations').doc(id).set(conversation)
    sendSuccess(res, conversation, 'Conversation started', 201)
  } catch (error) {
    console.error('Start conversation error:', error)
    sendError(res, String(error), 500, 'Failed to start conversation')
  }
})

/* ─────────────────────────────────────────
   LIST CONVERSATIONS (with per-conversation unreadCount)
───────────────────────────────────────── */
router.get('/conversations', authenticate, async (req: Request, res: Response) => {
  try {
    const actorId = req.userId!
    const readable = await canReadMessages(actorId)
    if (!readable) {
      sendError(res, 'Insufficient message permissions', 403)
      return
    }

    const page = parseInt(req.query.page as string) || 1
    const limit = parseInt(req.query.limit as string) || 30
    const db = getFirestore()

    const snapshot = await db.collection('conversations')
      .where('participants', 'array-contains', actorId)
      .get()

    const all = snapshot.docs.map(doc => doc.data() as any)

    // Compute unreadCount for each conversation
    await Promise.all(all.map(async (c) => {
      const lastReadAt = c.lastReadBy?.[actorId]
        ? new Date(c.lastReadBy[actorId])
        : new Date(0)

      const msgs = await db.collection('messages')
        .where('conversationId', '==', c.id)
        .get()

      c.unreadCount = msgs.docs.filter(d => {
        const m = d.data() as any
        if (m.senderId === actorId) return false
        const created = new Date(m.createdAt)
        return created > lastReadAt
      }).length
    }))

    all.sort((a, b) =>
      new Date(b.updatedAt as any).getTime() - new Date(a.updatedAt as any).getTime()
    )

    const start = (page - 1) * limit
    sendPaginated(res, all.slice(start, start + limit), all.length, page, limit)
  } catch (error) {
    console.error('Get conversations error:', error)
    sendError(res, String(error), 500, 'Failed to fetch conversations')
  }
})

/* ─────────────────────────────────────────
   UNREAD COUNT (total across all conversations)
───────────────────────────────────────── */
router.get('/unread-count', authenticate, async (req: Request, res: Response) => {
  try {
    const actorId = req.userId!
    const readable = await canReadMessages(actorId)
    if (!readable) {
      sendSuccess(res, { count: 0 }, 'OK')
      return
    }

    const db = getFirestore()
    const convoSnap = await db.collection('conversations')
      .where('participants', 'array-contains', actorId)
      .get()

    let total = 0
    await Promise.all(convoSnap.docs.map(async (doc) => {
      const c = doc.data() as any
      const lastReadAt = c.lastReadBy?.[actorId]
        ? new Date(c.lastReadBy[actorId])
        : new Date(0)

      const msgs = await db.collection('messages')
        .where('conversationId', '==', c.id)
        .get()

      total += msgs.docs.filter(d => {
        const m = d.data() as any
        if (m.senderId === actorId) return false
        const created = new Date(m.createdAt)
        return created > lastReadAt
      }).length
    }))

    sendSuccess(res, { count: total }, 'OK')
  } catch (error) {
    console.error('Unread count error:', error)
    sendError(res, String(error), 500, 'Failed to fetch unread count')
  }
})

/* ─────────────────────────────────────────
   GET MESSAGES (auto-marks as read)
───────────────────────────────────────── */
router.get('/conversations/:id/messages', authenticate, async (req: Request, res: Response) => {
  try {
    const actorId = req.userId!
    const readable = await canReadMessages(actorId)
    if (!readable) {
      sendError(res, 'Insufficient message permissions', 403)
      return
    }

    const db = getFirestore()
    const convoDoc = await db.collection('conversations').doc(req.params.id).get()
    if (!convoDoc.exists) {
      sendError(res, 'Conversation not found', 404)
      return
    }

    const convo = convoDoc.data() as any
    if (!(convo.participants || []).includes(actorId)) {
      sendError(res, 'Unauthorized', 403)
      return
    }

    const page = parseInt(req.query.page as string) || 1
    const limit = parseInt(req.query.limit as string) || 50
    const snapshot = await db.collection('messages')
      .where('conversationId', '==', req.params.id)
      .get()

    const all = snapshot.docs.map(doc => doc.data() as any)
      .sort((a, b) =>
        new Date(a.createdAt as any).getTime() - new Date(b.createdAt as any).getTime()
      )

    const start = Math.max(0, all.length - page * limit)
    const end = all.length - (page - 1) * limit

    // Mark as read for actor (fire-and-forget)
    void markConversationRead(req.params.id, actorId)

    sendPaginated(res, all.slice(start, end), all.length, page, limit)
  } catch (error) {
    console.error('Get conversation messages error:', error)
    sendError(res, String(error), 500, 'Failed to fetch messages')
  }
})

/* ─────────────────────────────────────────
   MARK CONVERSATION AS READ (explicit)
───────────────────────────────────────── */
router.post('/conversations/:id/read', authenticate, async (req: Request, res: Response) => {
  try {
    const actorId = req.userId!
    const readable = await canReadMessages(actorId)
    if (!readable) {
      sendError(res, 'Insufficient message permissions', 403)
      return
    }

    const db = getFirestore()
    const convoDoc = await db.collection('conversations').doc(req.params.id).get()
    if (!convoDoc.exists) {
      sendError(res, 'Conversation not found', 404)
      return
    }
    const convo = convoDoc.data() as any
    if (!(convo.participants || []).includes(actorId)) {
      sendError(res, 'Unauthorized', 403)
      return
    }

    await markConversationRead(req.params.id, actorId)
    sendSuccess(res, { ok: true }, 'Marked as read')
  } catch (error) {
    console.error('Mark read error:', error)
    sendError(res, String(error), 500, 'Failed to mark as read')
  }
})

/* ─────────────────────────────────────────
   SEND MESSAGE
───────────────────────────────────────── */
router.post('/conversations/:id/messages', authenticate, async (req: Request, res: Response) => {
  try {
    const actorId = req.userId!
    const writable = await canWriteMessages(actorId)
    if (!writable) {
      sendError(res, 'Insufficient message permissions', 403)
      return
    }

    const { body } = req.body
    if (!body || !String(body).trim()) {
      sendError(res, 'Message body is required', 400)
      return
    }

    const db = getFirestore()
    const convoRef = db.collection('conversations').doc(req.params.id)
    const convoDoc = await convoRef.get()
    if (!convoDoc.exists) {
      sendError(res, 'Conversation not found', 404)
      return
    }

    const convo = convoDoc.data() as any
    if (!(convo.participants || []).includes(actorId)) {
      sendError(res, 'Unauthorized', 403)
      return
    }

    const id = generateId()
    const now = new Date()
    const message = {
      id,
      conversationId: req.params.id,
      senderId: actorId,
      body: String(body).trim(),
      createdAt: now,
      updatedAt: now,
    }

    await db.collection('messages').doc(id).set(message)

    // Sender's own send counts as "read up to now" for themselves
    const lastReadBy = { ...(convo.lastReadBy || {}), [actorId]: now }

    await convoRef.update({
      lastMessage: message.body,
      lastMessageAt: now,
      lastMessageBy: actorId,
      lastReadBy,
      updatedAt: now,
    })

    sendSuccess(res, message, 'Message sent', 201)
  } catch (error) {
    console.error('Send message error:', error)
    sendError(res, String(error), 500, 'Failed to send message')
  }
})

export default router