import { create } from 'zustand'
import { User } from '@/types'

interface AuthStore {
  user: User | null
  isAuthenticated: boolean
  loading: boolean
  currentRole: 'user' | 'seller' | 'admin' | 'moderator' | 'employee' | null
  token: string | null
  setUser: (user: User | null) => void
  setToken: (token: string | null) => void
  restoreSession: (user: User, token: string) => void
  logout: () => void
  switchRole: (role: 'user' | 'seller') => void
  resetRole: () => void
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  user: null,
  isAuthenticated: false,
  loading: true,
  currentRole: null,
  token: null,
  
  setUser: (user: User | null) => {
    set({
      user,
      isAuthenticated: !!user,
      loading: false,
      currentRole: user?.role || null,
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
    })
    localStorage.setItem('authToken', token)
  },
  
  logout: () => {
    set({
      user: null,
      isAuthenticated: false,
      currentRole: null,
      token: null,
      loading: false,
    })
    localStorage.removeItem('authToken')
  },

  switchRole: (role: 'user' | 'seller') => {
    const { user } = get()
    if (role === 'seller' && user?.role !== 'seller') return
    set({ currentRole: role })
  },

  resetRole: () => {
    const { user } = get()
    set({ currentRole: user?.role || null })
  },
}))
