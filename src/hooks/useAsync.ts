import { useState, useEffect } from 'react'

/**
 * useFetch hook for data fetching
 */
export function useFetch<T>(
  url: string | null,
  options?: RequestInit
) {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(!!url)
  const [error, setError] = useState<Error | null>(null)
  
  useEffect(() => {
    if (!url) {
      setLoading(false)
      return
    }
    
    const fetchData = async () => {
      try {
        setLoading(true)
        const response = await fetch(url, options)
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }
        
        const result = await response.json()
        setData(result)
        setError(null)
      } catch (err) {
        setError(err instanceof Error ? err : new Error(String(err)))
        setData(null)
      } finally {
        setLoading(false)
      }
    }
    
    fetchData()
  }, [url, options])
  
  return { data, loading, error }
}

/**
 * useAsync hook for async operations
 */
export function useAsync<T, E = string>(
  asyncFunction: () => Promise<T>,
  immediate = true,
) {
  const [status, setStatus] = useState<'idle' | 'pending' | 'success' | 'error'>('idle')
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState<E | null>(null)
  
  // Execute operation
  const execute = async () => {
    setStatus('pending')
    setData(null)
    setError(null)
    
    try {
      const response = await asyncFunction()
      setStatus('success')
      setData(response)
      return response
    } catch (err) {
      setStatus('error')
      setError(err as E)
      throw err
    }
  }
  
  useEffect(() => {
    if (immediate) {
      execute()
    }
  }, [])
  
  return { execute, status, data, error }
}
