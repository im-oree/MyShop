import { Outlet, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import { useAuthStore } from '@/store/authStore'
import { useCartStore } from '@/store/cartStore'
import { authService } from '@/services/authService'
import Header from './Header'
import Footer from './Footer'

function Layout() {
  const { pathname } = useLocation()
  const { loading, restoreSession, setUser, isAuthenticated } = useAuthStore()
  const { loadCart } = useCartStore()

  // Restore session on app mount
  useEffect(() => {
    const restoreSavedSession = async () => {
      const token = localStorage.getItem('authToken')
      
      if (token) {
        try {
          // Verify token by fetching current user
          const user = await authService.getCurrentUser()
          if (user) {
            restoreSession(user, token)
          } else {
            // Token invalid, clear it
            localStorage.removeItem('authToken')
          }
        } catch (error) {
          console.error('Failed to restore session:', error)
          // Clear invalid token
          localStorage.removeItem('authToken')
        }
      } else {
        // No token saved, mark as not loading
        setUser(null)
      }
    }

    void restoreSavedSession()
  }, [restoreSession, setUser])

  // Load cart when user is authenticated
  useEffect(() => {
    if (isAuthenticated) {
      void loadCart()
    }
  }, [isAuthenticated, loadCart])

  // Scroll to top on route change
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior })
  }, [pathname])

  // Don't show content while checking for saved session
  if (loading) {
    return <div className="flex flex-col min-h-screen min-h-[100dvh] bg-background" />
  }

  return (
    <div className="flex flex-col min-h-screen min-h-[100dvh] bg-background">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-6 sm:py-8 pb-24 md:pb-8 animate-fade-in">
        <Outlet />
      </main>
      <Footer />
    </div>
  )
}

export default Layout