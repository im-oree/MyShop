/**
 * Format price from kobo to human-readable display
 */
export function formatPrice(kobo: number, symbol: string = '₦'): string {
  const naira = (kobo / 100).toFixed(2)
  return `${symbol}${parseFloat(naira).toLocaleString()}`
}

/**
 * Convert display price to kobo
 */
export function toKobo(amount: number): number {
  return Math.round(amount * 100)
}

/**
 * Convert kobo to decimal display
 */
export function fromKobo(kobo: number): number {
  return kobo / 100
}

/**
 * Generate UUID
 */
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

/**
 * Sleep utility
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Retry logic with exponential backoff
 */
export async function retry<T>(
  fn: () => Promise<T>,
  maxAttempts: number = 3,
  backoff: number = 1000,
): Promise<T> {
  let lastError: Error | null = null
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error as Error
      if (attempt < maxAttempts) {
        await sleep(backoff * Math.pow(2, attempt - 1))
      }
    }
  }
  
  throw lastError || new Error('Retry failed')
}
