/**
 * Format price for display
 */
export function formatPrice(kobo: number, symbol: string = '₦'): string {
  const amount = (kobo / 100).toFixed(2)
  return `${symbol}${parseFloat(amount).toLocaleString()}`
}

type DateInput =
  | Date
  | string
  | number
  | { seconds?: number; nanoseconds?: number; _seconds?: number; _nanoseconds?: number; toDate?: () => Date }
  | null
  | undefined

function normalizeDate(input: DateInput): Date | null {
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

    const seconds =
      typeof input.seconds === 'number'
        ? input.seconds
        : typeof input._seconds === 'number'
          ? input._seconds
          : null

    if (seconds != null) {
      const nanoseconds =
        typeof input.nanoseconds === 'number'
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

/**
 * Format date
 */
export function formatDate(date: DateInput): string {
  const d = normalizeDate(date)
  if (!d) return 'N/A'
  return d.toLocaleDateString('en-NG', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

/**
 * Format datetime
 */
export function formatDateTime(date: DateInput): string {
  const d = normalizeDate(date)
  if (!d) return 'N/A'
  return d.toLocaleString('en-NG', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/**
 * Truncate text
 */
export function truncate(text: string, length: number): string {
  return text.length > length ? `${text.substring(0, length)}...` : text
}

/**
 * Debounce function
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number,
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null
  
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }
}

/**
 * Throttle function
 */
export function throttle<T extends (...args: unknown[]) => unknown>(
  func: T,
  limit: number,
): (...args: Parameters<T>) => void {
  let inThrottle: boolean
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args)
      inThrottle = true
      setTimeout(() => (inThrottle = false), limit)
    }
  }
}
