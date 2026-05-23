type CacheEntry<T> = {
  expiresAt: number
  value: T
}

const prefix = 'ms_cache_v1:'

function nowMs() { return Date.now() }

// Read Vite env vars. Defaults: enabled=true, default TTL=60s, max TTL=3600s
const _env: any = (typeof import.meta !== 'undefined' && (import.meta as any).env) ? (import.meta as any).env : {}
const CACHE_ENABLED = _env.VITE_CACHE_ENABLED ? String(_env.VITE_CACHE_ENABLED) !== 'false' : true
const DEFAULT_TTL = _env.VITE_CACHE_TTL_DEFAULT ? Number(_env.VITE_CACHE_TTL_DEFAULT) || 60 : 60
const MAX_TTL = _env.VITE_CACHE_TTL_MAX ? Number(_env.VITE_CACHE_TTL_MAX) || 3600 : 3600

export function setCache<T>(key: string, value: T, ttlSeconds = DEFAULT_TTL) {
  if (!CACHE_ENABLED) return
  try {
    const ttl = Math.min(ttlSeconds, MAX_TTL)
    const entry: CacheEntry<T> = { expiresAt: nowMs() + ttl * 1000, value }
    sessionStorage.setItem(prefix + key, JSON.stringify(entry))
  } catch (e) {
    // sessionStorage can throw on quota; ignore silently
    console.warn('setCache failed', e)
  }
}

export function getCache<T>(key: string): T | null {
  if (!CACHE_ENABLED) return null
  try {
    const raw = sessionStorage.getItem(prefix + key)
    if (!raw) return null
    const entry: CacheEntry<T> = JSON.parse(raw)
    if (!entry || typeof entry.expiresAt !== 'number') return null
    if (entry.expiresAt < nowMs()) {
      sessionStorage.removeItem(prefix + key)
      return null
    }
    return entry.value
  } catch (e) {
    console.warn('getCache failed', e)
    return null
  }
}

export function delCache(key: string) {
  if (!CACHE_ENABLED) return
  try { sessionStorage.removeItem(prefix + key) } catch (e) { /* ignore */ }
}

export async function fetchWithCache<T>(key: string, fetcher: () => Promise<T>, ttlSeconds?: number): Promise<T> {
  if (!CACHE_ENABLED) return fetcher()
  const effectiveTtl = typeof ttlSeconds === 'number' ? Math.min(ttlSeconds, MAX_TTL) : DEFAULT_TTL
  const cached = getCache<T>(key)
  if (cached !== null) return cached
  const val = await fetcher()
  try { setCache<T>(key, val, effectiveTtl) } catch (e) { /* ignore */ }
  return val
}

export default { getCache, setCache, delCache, fetchWithCache }
