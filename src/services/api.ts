import axios, { AxiosInstance } from 'axios'

function normalizeApiBaseUrl(value: string | undefined): string {
  if (!value || !value.trim()) {
    return '/api'
  }

  const trimmed = value.trim()
  const withoutTrailingSlash = trimmed.replace(/\/+$/, '')

  if (withoutTrailingSlash === '' || withoutTrailingSlash === '/') {
    return '/api'
  }

  return withoutTrailingSlash.endsWith('/api')
    ? withoutTrailingSlash
    : `${withoutTrailingSlash}/api`
}

const apiUrl = normalizeApiBaseUrl(import.meta.env.VITE_API_BASE_URL)

const apiClient: AxiosInstance = axios.create({
  baseURL: apiUrl,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Add token to requests
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Handle errors
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('authToken')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export default apiClient

export const auditService = {
  async getLogs(page = 1, limit = 50) {
    const res = await apiClient.get(`/audit?page=${page}&limit=${limit}`)
    return res.data.data
  }
}

