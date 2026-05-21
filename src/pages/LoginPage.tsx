import { useState, useId } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { authService } from '@/services/authService'
import { useAuthStore } from '@/store/authStore'

function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const navigate = useNavigate()
  const { setUser, setToken } = useAuthStore()
  const emailId = useId()
  const passwordId = useId()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const result = await authService.login(email, password)
      setUser(result.user)
      setToken(result.token)
      navigate('/')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center bg-background px-4 py-12">
      {/* Card */}
      <div className="w-full max-w-md animate-slide-up">
        {/* Logo / Brand */}
        <div className="text-center mb-8">
          <Link
            to="/"
            className="inline-block text-3xl font-bold text-primary hover:opacity-80 transition-opacity duration-200"
          >
            eShop
          </Link>
          <h1 className="mt-3 text-2xl font-bold text-text tracking-tight">
            Welcome back
          </h1>
          <p className="mt-1.5 text-sm text-muted-text">
            Sign in to your account to continue
          </p>
        </div>

        {/* Form card */}
        <div className="bg-card rounded-2xl border border-border shadow-sm p-6 sm:p-8">
          {/* Error alert */}
          {error && (
            <div
              role="alert"
              className="mb-5 flex items-start gap-3 rounded-xl border border-red-200
                         bg-red-50 px-4 py-3 text-sm text-red-700 animate-slide-down"
            >
              <svg
                className="mt-0.5 h-4 w-4 shrink-0 text-red-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667
                     1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732
                     0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z"
                />
              </svg>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate className="space-y-5">
            {/* Email */}
            <div className="space-y-1.5">
              <label
                htmlFor={emailId}
                className="block text-sm font-medium text-text"
              >
                Email address
              </label>
              <input
                id={emailId}
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                autoCapitalize="none"
                spellCheck={false}
                required
                placeholder="you@example.com"
                className="w-full rounded-xl border border-border bg-white px-4 py-2.5
                           text-sm text-text placeholder:text-gray-400
                           outline-none
                           focus:border-primary focus:ring-2 focus:ring-primary/20
                           disabled:opacity-50 disabled:cursor-not-allowed
                           transition-all duration-200"
                disabled={loading}
              />
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label
                  htmlFor={passwordId}
                  className="block text-sm font-medium text-text"
                >
                  Password
                </label>
                <a
                  href="#"
                  className="text-xs font-medium text-secondary hover:text-green-700
                             hover:underline underline-offset-2 transition-colors duration-200"
                >
                  Forgot password?
                </a>
              </div>

              {/* Password input with toggle */}
              <div className="relative">
                <input
                  id={passwordId}
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-border bg-white px-4 py-2.5 pr-11
                             text-sm text-text placeholder:text-gray-400
                             outline-none
                             focus:border-primary focus:ring-2 focus:ring-primary/20
                             disabled:opacity-50 disabled:cursor-not-allowed
                             transition-all duration-200"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-3 top-1/2 -translate-y-1/2
                             text-gray-400 hover:text-gray-600
                             p-0.5 rounded transition-colors duration-200"
                >
                  {showPassword ? (
                    /* Eye-off icon */
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478
                           0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3
                           3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88
                           9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59
                           3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943
                           9.543 7a10.025 10.025 0 01-4.132 5.411m0
                           0L21 21"
                      />
                    </svg>
                  ) : (
                    /* Eye icon */
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478
                           0 8.268 2.943 9.542 7-1.274 4.057-5.064
                           7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                      />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Submit button */}
            <button
              type="submit"
              disabled={loading || !email || !password}
              className="relative w-full rounded-xl bg-primary py-3 text-sm font-semibold
                         text-white shadow-sm
                         hover:bg-primary/90 hover:shadow-md
                         active:scale-[0.98]
                         disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-none
                         transition-all duration-200
                         mt-1"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg
                    className="h-4 w-4 animate-spin"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                  </svg>
                  Signing in…
                </span>
              ) : (
                'Sign in'
              )}
            </button>
          </form>
        </div>

        {/* Sign up link */}
        <p className="mt-6 text-center text-sm text-muted-text">
          Don't have an account?{' '}
          <Link
            to="/signup"
            className="font-semibold text-secondary hover:text-green-700
                       hover:underline underline-offset-2 transition-colors duration-200"
          >
            Create one
          </Link>
        </p>
      </div>
    </div>
  )
}

export default LoginPage