import { getFirestore } from '../config/firebase.js'
import { generateId } from '../utils/helpers.js'

export type AuditRecord = {
  id: string
  actorId?: string
  actorName?: string
  actorRole?: string
  action: string
  resourceType?: string
  resourceId?: string
  meta?: Record<string, unknown>
  ip?: string
  userAgent?: string
  createdAt: Date
}

export class AuditService {
  private db = getFirestore()
  private collection = 'auditLogs'

  async log(record: Omit<Partial<AuditRecord>, 'id' | 'createdAt'> & { action: string }) {
    const id = generateId()
    const entry: AuditRecord = {
      id,
      actorId: record.actorId,
      actorName: record.actorName,
      actorRole: record.actorRole,
      action: record.action,
      resourceType: record.resourceType,
      resourceId: record.resourceId,
      meta: record.meta,
      ip: record.ip,
      userAgent: record.userAgent,
      createdAt: new Date(),
    }

    try {
      await this.db.collection(this.collection).doc(id).set(entry)
    } catch (err) {
      console.error('Failed to write audit log:', err)
    }
    return entry
  }

  async query(page = 1, limit = 50) {
    const snapshot = await this.db.collection(this.collection)
      .orderBy('createdAt', 'desc')
      .offset((page - 1) * limit)
      .limit(limit)
      .get()

    const items = snapshot.docs.map(doc => doc.data() as AuditRecord)
    const total = (await this.db.collection(this.collection).count().get()).data().count
    return { items, total }
  }
}

export const auditService = new AuditService()
