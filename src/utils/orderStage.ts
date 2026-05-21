export const ORDER_STAGE_SEQUENCE = ['noted', 'processing', 'in_transit', 'completed'] as const
export type OrderStage = (typeof ORDER_STAGE_SEQUENCE)[number]

const LEGACY_STAGE_MAP: Record<string, OrderStage | 'cancelled' | 'refunded'> = {
  pending: 'noted',
  paid: 'noted',
  shipped: 'in_transit',
  delivered: 'completed',
  noted: 'noted',
  processing: 'processing',
  in_transit: 'in_transit',
  completed: 'completed',
  cancelled: 'cancelled',
  refunded: 'refunded',
}

export function normalizeOrderStage(status?: string | null): OrderStage | 'cancelled' | 'refunded' {
  const normalized = String(status || '').toLowerCase()
  return LEGACY_STAGE_MAP[normalized] || 'noted'
}

export function getOrderStageIndex(status?: string | null): number {
  const normalized = normalizeOrderStage(status)
  return ORDER_STAGE_SEQUENCE.indexOf(normalized as OrderStage)
}

export function getOrderStageLabel(status?: string | null): string {
  const normalized = normalizeOrderStage(status)
  switch (normalized) {
    case 'noted':
      return 'Noted'
    case 'processing':
      return 'Processing'
    case 'in_transit':
      return 'In Transit'
    case 'completed':
      return 'Completed'
    case 'cancelled':
      return 'Cancelled'
    case 'refunded':
      return 'Refunded'
    default:
      return 'Noted'
  }
}

export function getOrderStageTone(status?: string | null): 'gray' | 'amber' | 'blue' | 'green' | 'red' | 'slate' {
  const normalized = normalizeOrderStage(status)
  switch (normalized) {
    case 'noted':
      return 'amber'
    case 'processing':
      return 'blue'
    case 'in_transit':
      return 'slate'
    case 'completed':
      return 'green'
    case 'cancelled':
      return 'red'
    case 'refunded':
      return 'gray'
    default:
      return 'amber'
  }
}

function normalizeDate(input: Date | string | number | { seconds?: number; nanoseconds?: number; _seconds?: number; _nanoseconds?: number; toDate?: () => Date } | null | undefined): Date | null {
  if (!input) return null

  if (input instanceof Date) {
    return Number.isNaN(input.getTime()) ? null : input
  }

  if (typeof input === 'string' || typeof input === 'number') {
    const parsed = new Date(input)
    return Number.isNaN(parsed.getTime()) ? null : parsed
  }

  if (typeof input === 'object') {
    if (typeof input.toDate === 'function') {
      const parsed = input.toDate()
      return parsed instanceof Date && !Number.isNaN(parsed.getTime()) ? parsed : null
    }

    const seconds = typeof input.seconds === 'number'
      ? input.seconds
      : typeof input._seconds === 'number'
        ? input._seconds
        : null

    if (seconds != null) {
      const nanoseconds = typeof input.nanoseconds === 'number'
        ? input.nanoseconds
        : typeof input._nanoseconds === 'number'
          ? input._nanoseconds
          : 0

      const parsed = new Date(seconds * 1000 + Math.floor(nanoseconds / 1_000_000))
      return Number.isNaN(parsed.getTime()) ? null : parsed
    }
  }

  return null
}

export function formatRelativeTime(input: Date | string | number | null | undefined): string {
  const date = normalizeDate(input as any)
  if (!date) return 'Unknown time'
  if (Number.isNaN(date.getTime())) return 'Unknown time'

  const diffSeconds = Math.floor((Date.now() - date.getTime()) / 1000)
  if (diffSeconds < 5) return 'just now'
  if (diffSeconds < 60) return `${diffSeconds} second${diffSeconds === 1 ? '' : 's'} ago`

  const diffMinutes = Math.floor(diffSeconds / 60)
  if (diffMinutes < 60) return `${diffMinutes} minute${diffMinutes === 1 ? '' : 's'} ago`

  const diffHours = Math.floor(diffMinutes / 60)
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`

  const diffDays = Math.floor(diffHours / 24)
  if (diffDays < 7) return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`

  const diffWeeks = Math.floor(diffDays / 7)
  if (diffWeeks < 5) return `${diffWeeks} week${diffWeeks === 1 ? '' : 's'} ago`

  const diffMonths = Math.floor(diffDays / 30)
  if (diffMonths < 12) return `${Math.max(1, diffMonths)} month${diffMonths === 1 ? '' : 's'} ago`

  const diffYears = Math.floor(diffDays / 365)
  return `${Math.max(1, diffYears)} year${diffYears === 1 ? '' : 's'} ago`
}

export function isWithinAgeFilter(dateValue: Date | string | number | null | undefined, filter: 'all' | 'today' | '7d' | '30d' | '90d'): boolean {
  if (filter === 'all') return true
  const date = normalizeDate(dateValue as any)
  if (!date) return false

  const now = new Date()
  const diffDays = (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24)

  if (filter === 'today') return date.toDateString() === now.toDateString()
  if (filter === '7d') return diffDays <= 7
  if (filter === '30d') return diffDays <= 30
  return diffDays <= 90
}

export function sortOrdersByDate<T extends { createdAt?: unknown }>(orders: T[], direction: 'newest' | 'oldest' = 'newest'): T[] {
  return [...orders].sort((left, right) => {
    const leftTime = normalizeDate(left.createdAt as any)?.getTime() ?? 0
    const rightTime = normalizeDate(right.createdAt as any)?.getTime() ?? 0
    const safeLeft = Number.isNaN(leftTime) ? 0 : leftTime
    const safeRight = Number.isNaN(rightTime) ? 0 : rightTime
    return direction === 'newest' ? safeRight - safeLeft : safeLeft - safeRight
  })
}
