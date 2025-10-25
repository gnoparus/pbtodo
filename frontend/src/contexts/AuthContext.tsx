import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { api, User } from '../services/pocketbase'

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
    try {
      await api.auth.login(email, password)
      const currentUser = api.auth.getCurrentUser()
      if (currentUser) {
        setUser(currentUser)
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Login failed'
      setError(message)
      throw err
    } finally {
      setLoading(false)
    }
  }

  const register = async (email: string, password: string, name: string) => {
    setLoading(true)
    setError(null)
    try {
      await api.auth.register(email, password, name)
      // After successful registration, log the user in
      await login(email, password)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Registration failed'
      setError(message)
      throw err
    } finally {
      setLoading(false)
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
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
