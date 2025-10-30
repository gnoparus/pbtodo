import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { api, User } from '../services/pocketbase'
import { validatePassword, validateEmail, validateName } from '../utils/validation'
import { getAuthRateLimiter, getRegistrationRateLimiter, formatTimeRemaining } from '../utils/rateLimiting'

interface AuthContextType {
  user: User | null
  isAuthenticated: boolean
  loading: boolean
  error: string | null
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string, name: string) => Promise<void>
  logout: () => void
  refreshAuth: () => Promise<void>
  clearError: () => void
  // Rate limiting status
  rateLimitStatus: {
    canLogin: boolean
    canRegister: boolean
    loginAttempts: number
    loginRemaining: number
    loginBlocked: boolean
    loginBlockExpires: number
    registrationAttempts: number
    registrationRemaining: number
    registrationBlocked: boolean
    registrationBlockExpires: number
  }
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)
export { AuthContext }

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

interface AuthProviderProps {
  children: ReactNode
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Rate limiters
  const authLimiter = getAuthRateLimiter()
  const registrationLimiter = getRegistrationRateLimiter()

  // Rate limiting state
  const [rateLimitStatus, setRateLimitStatus] = useState({
    canLogin: true,
    canRegister: true,
    loginAttempts: 0,
    loginRemaining: 5,
    loginBlocked: false,
    loginBlockExpires: 0,
    registrationAttempts: 0,
    registrationRemaining: 3,
    registrationBlocked: false,
    registrationBlockExpires: 0
  })

  // Update rate limit status
  const updateRateLimitStatus = () => {
    const authStatus = authLimiter.canAttempt()
    const regStatus = registrationLimiter.canAttempt()

    setRateLimitStatus({
      canLogin: !authStatus.isBlocked,
      canRegister: !regStatus.isBlocked,
      loginAttempts: authStatus.attempts,
      loginRemaining: authStatus.remaining,
      loginBlocked: authStatus.isBlocked,
      loginBlockExpires: authStatus.blockExpires,
      registrationAttempts: regStatus.attempts,
      registrationRemaining: regStatus.remaining,
      registrationBlocked: regStatus.isBlocked,
      registrationBlockExpires: regStatus.blockExpires
    })
  }

  useEffect(() => {
    // Check authentication status on mount
    const checkAuth = async () => {
      try {
        if (api.auth.isAuthenticated()) {
          const currentUser = api.auth.getCurrentUser()
          if (currentUser) {
            setUser(currentUser)
          } else {
            // Try to refresh the session
            await refreshAuth()
          }
        }
      } catch (err) {
        console.error('Auth check failed:', err)
        setError('Failed to check authentication status')
      } finally {
        setLoading(false)
      }
    }

    checkAuth()
  }, [])

  const login = async (email: string, password: string) => {
    setLoading(true)
    setError(null)

    // Check rate limiting
    const authStatus = authLimiter.canAttempt()
    if (authStatus.isBlocked) {
      const message = `Too many login attempts. Try again in ${formatTimeRemaining(authLimiter.getTimeUntilUnblock())}.`
      setError(message)
      setLoading(false)
      updateRateLimitStatus()
      throw new Error(message)
    }

    // Validate inputs
    const emailValidation = validateEmail(email)
    if (!emailValidation.isValid) {
      setError(emailValidation.error || 'Invalid email')
      setLoading(false)
      throw new Error(emailValidation.error)
    }

    const passwordValidation = validatePassword(password)
    if (!passwordValidation.isValid) {
      setError(passwordValidation.errors.join(', '))
      setLoading(false)
      throw new Error(passwordValidation.errors.join(', '))
    }

    try {
      await api.auth.login(email, password)
      const currentUser = api.auth.getCurrentUser()
      if (currentUser) {
        setUser(currentUser)
        // Reset rate limiter on successful login
        authLimiter.recordAttempt(true)
      } else {
        // Record failed attempt
        authLimiter.recordAttempt(false)
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Login failed'
      setError(message)
      // Record failed attempt
      authLimiter.recordAttempt(false)
      throw err
    } finally {
      setLoading(false)
      updateRateLimitStatus()
    }
  }

  const register = async (email: string, password: string, name: string) => {
    setLoading(true)
    setError(null)

    // Check rate limiting
    const regStatus = registrationLimiter.canAttempt()
    if (regStatus.isBlocked) {
      const message = `Too many registration attempts. Try again in ${formatTimeRemaining(registrationLimiter.getTimeUntilUnblock())}.`
      setError(message)
      setLoading(false)
      updateRateLimitStatus()
      throw new Error(message)
    }

    // Validate inputs
    const emailValidation = validateEmail(email)
    if (!emailValidation.isValid) {
      setError(emailValidation.error || 'Invalid email')
      setLoading(false)
      throw new Error(emailValidation.error)
    }

    const passwordValidation = validatePassword(password)
    if (!passwordValidation.isValid) {
      setError(passwordValidation.errors.join(', '))
      setLoading(false)
      throw new Error(passwordValidation.errors.join(', '))
    }

    const nameValidation = validateName(name)
    if (!nameValidation.isValid) {
      setError(nameValidation.error || 'Invalid name')
      setLoading(false)
      throw new Error(nameValidation.error)
    }

    try {
      await api.auth.register(email, password, name)
      // Record successful registration
      registrationLimiter.recordAttempt(true)
      // After successful registration, log the user in
      await login(email, password)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Registration failed'
      setError(message)
      // Record failed registration
      registrationLimiter.recordAttempt(false)
      throw err
    } finally {
      setLoading(false)
      updateRateLimitStatus()
    }
  }

  const logout = () => {
    api.auth.logout()
    setUser(null)
    setError(null)
  }

  const refreshAuth = async () => {
    setLoading(true)
    setError(null)
    try {
      await api.auth.refresh()
      const currentUser = api.auth.getCurrentUser()
      if (currentUser) {
        setUser(currentUser)
      }
    } catch (err) {
      console.error('Token refresh failed:', err)
      const message = err instanceof Error ? err.message : 'Session expired'
      setError(message)
      logout() // Clear invalid session
      throw err
    } finally {
      setLoading(false)
    }
  }

  const clearError = () => {
    setError(null)
  }

  // Update rate limit status periodically
  useEffect(() => {
    updateRateLimitStatus()
    const interval = setInterval(updateRateLimitStatus, 1000) // Update every second
    return () => clearInterval(interval)
  }, [])

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    loading,
    error,
    login,
    register,
    logout,
    refreshAuth,
    clearError,
    rateLimitStatus,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
