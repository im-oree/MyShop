import { create } from 'zustand'
import { User } from '@/types'

function getStoredViewMode(): 'customer' | 'staff' | null {
  const value = localStorage.getItem('viewMode')
  if (value === 'customer' || value === 'staff') return value
  return null
}

function getDefaultViewMode(user: User | null): 'customer' | 'staff' {
  if (user?.role === 'admin' || user?.role === 'manager') {
    return getStoredViewMode() || 'staff'
  }
  return 'customer'
}

interface AuthStore {
  user: User | null
  isAuthenticated: boolean
  loading: boolean
  currentRole: 'user' | 'admin' | 'manager' | 'employee' | null
  viewMode: 'customer' | 'staff'
  token: string | null
  setUser: (user: User | null) => void
  setToken: (token: string | null) => void
  restoreSession: (user: User, token: string) => void
  logout: () => void
  isAdmin: () => boolean
  isManager: () => boolean
  toggleViewMode: () => void
  setViewMode: (mode: 'customer' | 'staff') => void
  isProductFormOpen: boolean
  setProductFormOpen: (open: boolean) => void
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  user: null,
  isAuthenticated: false,
  loading: true,
  currentRole: null,
  viewMode: 'customer',
  token: null,
  isProductFormOpen: false,
  
  setUser: (user: User | null) => {
    set({
      user,
      isAuthenticated: !!user,
      loading: false,
      currentRole: user?.role || null,
      viewMode: getDefaultViewMode(user),
    })
  },

  setToken: (token: string | null) => {
    set({ token })
    if (token) {
      localStorage.setItem('authToken', token)
    } else {
      localStorage.removeItem('authToken')
    }
  },

  restoreSession: (user: User, token: string) => {
    set({
      user,
      token,
      isAuthenticated: true,
      loading: false,
      currentRole: user?.role || null,
      viewMode: getDefaultViewMode(user),
    })
    localStorage.setItem('authToken', token)
  },
  
  logout: () => {
    set({
      user: null,
      isAuthenticated: false,
      currentRole: null,
      viewMode: 'customer',
      token: null,
      loading: false,
    })
    localStorage.removeItem('authToken')
  },

  isAdmin: () => {
    const { user } = get()
    return user?.role === 'admin'
  },

  isManager: () => {
    const { user } = get()
    return user?.role === 'manager' || user?.role === 'admin'
  },

  setViewMode: (mode: 'customer' | 'staff') => {
    set({ viewMode: mode })
    localStorage.setItem('viewMode', mode)
  },

  setProductFormOpen: (open: boolean) => {
    set({ isProductFormOpen: open })
  },

  toggleViewMode: () => {
    const { user, viewMode } = get()
    if (user?.role !== 'admin' && user?.role !== 'manager') return
    const nextMode = viewMode === 'staff' ? 'customer' : 'staff'
    set({ viewMode: nextMode })
    localStorage.setItem('viewMode', nextMode)
  },
}))
