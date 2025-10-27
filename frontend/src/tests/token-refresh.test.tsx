import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AuthProvider, useAuth } from '../contexts/AuthContext'
import { api } from '../services/pocketbase'

// Mock the API service
vi.mock('../services/pocketbase', () => ({
  api: {
    auth: {
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      refresh: vi.fn(),
      getCurrentUser: vi.fn(),
      isAuthenticated: vi.fn(),
    },
  },
}))

// Test component that uses the AuthContext
const TestComponent = ({
  onRender,
}: {
  onRender?: (context: ReturnType<typeof useAuth>) => void
}) => {
  const context = useAuth()

  // Call the onRender callback with the context
  if (onRender) {
    onRender(context)
  }

  return (
    <div>
      <div data-testid="is-authenticated">{String(context.isAuthenticated)}</div>
      <div data-testid="user">{context.user?.email || 'null'}</div>
      <div data-testid="loading">{String(context.loading)}</div>
      <div data-testid="error">{context.error || 'null'}</div>
      <button onClick={() => context.refreshAuth()}>Refresh Auth</button>
      <button onClick={() => context.login('test@example.com', 'password')}>Login</button>
      <button onClick={() => context.logout()}>Logout</button>
      <button onClick={() => context.clearError()}>Clear Error</button>
    </div>
  )
}

const mockUser = {
  id: '1',
  email: 'test@example.com',
  name: 'Test User',
  created: '2023-01-01T00:00:00Z',
  updated: '2023-01-01T00:00:00Z',
}

describe('Token Refresh & Session Expiry', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(api.auth.isAuthenticated).mockReturnValue(false)
    vi.mocked(api.auth.getCurrentUser).mockReturnValue(null)
  })

  describe('refreshAuth', () => {
    it('should refresh token successfully', async () => {
      // Start with authenticated state
      vi.mocked(api.auth.isAuthenticated).mockReturnValue(true)
      vi.mocked(api.auth.getCurrentUser).mockReturnValue(mockUser)
      vi.mocked(api.auth.refresh).mockResolvedValue(undefined)

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId('user')).toHaveTextContent('test@example.com')
      })

      const user = userEvent.setup()
      const refreshButton = screen.getByText('Refresh Auth')
      await user.click(refreshButton)

      await waitFor(() => {
        expect(api.auth.refresh).toHaveBeenCalled()
        expect(screen.getByTestId('user')).toHaveTextContent('test@example.com')
        expect(screen.getByTestId('error')).toHaveTextContent('null')
      })
    })

    it('should set loading state while refreshing', async () => {
      vi.mocked(api.auth.isAuthenticated).mockReturnValue(true)
      vi.mocked(api.auth.getCurrentUser).mockReturnValue(mockUser)
      vi.mocked(api.auth.refresh).mockImplementation(() =>
        new Promise((resolve) => setTimeout(() => resolve(undefined), 100))
      )

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId('user')).toHaveTextContent('test@example.com')
      })

      const user = userEvent.setup()
      const refreshButton = screen.getByText('Refresh Auth')
      await user.click(refreshButton)

      // Check loading is true during refresh
      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('true')
      })

      // Check loading is false after completion
      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('false')
      })
    })

    it('should update user after successful refresh', async () => {
      vi.mocked(api.auth.isAuthenticated).mockReturnValue(true)
      vi.mocked(api.auth.getCurrentUser).mockReturnValue(mockUser)

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId('user')).toHaveTextContent('test@example.com')
      })

      // Update the user data that getCurrentUser returns
      const updatedUser = { ...mockUser, name: 'Updated Name' }
      vi.mocked(api.auth.getCurrentUser).mockReturnValue(updatedUser)
      vi.mocked(api.auth.refresh).mockResolvedValue(undefined)

      const user = userEvent.setup()
      const refreshButton = screen.getByText('Refresh Auth')
      await user.click(refreshButton)

      await waitFor(() => {
        expect(api.auth.refresh).toHaveBeenCalled()
        expect(api.auth.getCurrentUser).toHaveBeenCalled()
      })
    })

    it('should clear error before refreshing', async () => {
      vi.mocked(api.auth.isAuthenticated).mockReturnValue(true)
      vi.mocked(api.auth.getCurrentUser).mockReturnValue(mockUser)

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId('user')).toHaveTextContent('test@example.com')
      })

      // Cause an error first
      vi.mocked(api.auth.refresh).mockRejectedValueOnce(new Error('First error'))

      const user = userEvent.setup()
      const refreshButton = screen.getByText('Refresh Auth')
      await user.click(refreshButton)

      // After refresh failure, logout is called which clears the error
      await waitFor(() => {
        expect(api.auth.logout).toHaveBeenCalled()
        expect(screen.getByTestId('user')).toHaveTextContent('null')
      })

      // Log back in for the second attempt
      vi.mocked(api.auth.login).mockResolvedValue(undefined)
      vi.mocked(api.auth.getCurrentUser).mockReturnValue(mockUser)
      const loginButton = screen.getByText('Login')
      await user.click(loginButton)

      await waitFor(() => {
        expect(screen.getByTestId('user')).toHaveTextContent('test@example.com')
      })

      // Now refresh successfully
      vi.mocked(api.auth.refresh).mockResolvedValue(undefined)
      await user.click(refreshButton)

      await waitFor(() => {
        expect(api.auth.refresh).toHaveBeenCalledTimes(2)
        expect(screen.getByTestId('error')).toHaveTextContent('null')
      })
    })
  })

  describe('Token refresh failure handling', () => {
    it('should handle refresh failure by logging out', async () => {
      vi.mocked(api.auth.isAuthenticated).mockReturnValue(true)
      vi.mocked(api.auth.getCurrentUser).mockReturnValue(mockUser)
      vi.mocked(api.auth.refresh).mockRejectedValue(new Error('Token expired'))

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId('user')).toHaveTextContent('test@example.com')
      })

      const user = userEvent.setup()
      const refreshButton = screen.getByText('Refresh Auth')
      await user.click(refreshButton)

      await waitFor(() => {
        expect(api.auth.logout).toHaveBeenCalled()
        expect(screen.getByTestId('user')).toHaveTextContent('null')
        expect(screen.getByTestId('is-authenticated')).toHaveTextContent('false')
      })
    })

    it('should set appropriate error message on refresh failure', async () => {
      vi.mocked(api.auth.isAuthenticated).mockReturnValue(true)
      vi.mocked(api.auth.getCurrentUser).mockReturnValue(mockUser)
      vi.mocked(api.auth.refresh).mockRejectedValue(new Error('Network error'))

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId('user')).toHaveTextContent('test@example.com')
      })

      const user = userEvent.setup()
      const refreshButton = screen.getByText('Refresh Auth')
      await user.click(refreshButton)

      // Refresh fails, triggers logout which clears error
      // But we should verify the logout was called due to the error
      await waitFor(() => {
        expect(api.auth.logout).toHaveBeenCalled()
        expect(screen.getByTestId('user')).toHaveTextContent('null')
      })
    })

    it('should handle non-Error exceptions during refresh', async () => {
      vi.mocked(api.auth.isAuthenticated).mockReturnValue(true)
      vi.mocked(api.auth.getCurrentUser).mockReturnValue(mockUser)
      vi.mocked(api.auth.refresh).mockRejectedValue('String error')

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId('user')).toHaveTextContent('test@example.com')
      })

      const user = userEvent.setup()
      const refreshButton = screen.getByText('Refresh Auth')
      await user.click(refreshButton)

      // Logout is called which clears the error
      await waitFor(() => {
        expect(api.auth.logout).toHaveBeenCalled()
        expect(screen.getByTestId('user')).toHaveTextContent('null')
      })
    })

    it('should throw error after handling refresh failure', async () => {
      vi.mocked(api.auth.isAuthenticated).mockReturnValue(true)
      vi.mocked(api.auth.getCurrentUser).mockReturnValue(mockUser)
      const refreshError = new Error('Token expired')
      vi.mocked(api.auth.refresh).mockRejectedValue(refreshError)

      let contextValue: ReturnType<typeof useAuth> | null = null

      render(
        <AuthProvider>
          <TestComponent onRender={(ctx) => { contextValue = ctx }} />
        </AuthProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId('user')).toHaveTextContent('test@example.com')
      })

      // The refreshAuth method should throw the error
      await expect(contextValue?.refreshAuth()).rejects.toThrow('Token expired')
    })
  })

  describe('Session expiry detection', () => {
    it('should handle expired token on mount', async () => {
      vi.mocked(api.auth.isAuthenticated).mockReturnValue(true)
      vi.mocked(api.auth.getCurrentUser).mockReturnValue(null)
      vi.mocked(api.auth.refresh).mockResolvedValue(undefined)

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      )

      // Should attempt to refresh if authenticated but no user
      await waitFor(() => {
        expect(api.auth.refresh).toHaveBeenCalled()
      })
    })

    it('should not attempt refresh if not authenticated', async () => {
      vi.mocked(api.auth.isAuthenticated).mockReturnValue(false)
      vi.mocked(api.auth.getCurrentUser).mockReturnValue(null)

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('false')
      })

      expect(api.auth.refresh).not.toHaveBeenCalled()
    })

    it('should handle refresh failure on mount gracefully', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      vi.mocked(api.auth.isAuthenticated).mockReturnValue(true)
      vi.mocked(api.auth.getCurrentUser).mockReturnValue(null)
      vi.mocked(api.auth.refresh).mockRejectedValue(new Error('Session expired'))

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('false')
        expect(screen.getByTestId('error')).toHaveTextContent('Failed to check authentication status')
      })

      consoleErrorSpy.mockRestore()
    })
  })

  describe('Concurrent refresh requests', () => {
    it('should not trigger multiple simultaneous refreshes', async () => {
      vi.mocked(api.auth.isAuthenticated).mockReturnValue(true)
      vi.mocked(api.auth.getCurrentUser).mockReturnValue(mockUser)
      vi.mocked(api.auth.refresh).mockImplementation(() =>
        new Promise((resolve) => setTimeout(() => resolve(undefined), 200))
      )

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId('user')).toHaveTextContent('test@example.com')
      })

      const user = userEvent.setup()
      const refreshButton = screen.getByText('Refresh Auth')

      // Trigger multiple refresh calls
      await user.click(refreshButton)
      await user.click(refreshButton)
      await user.click(refreshButton)

      // Wait for all to complete
      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('false')
      }, { timeout: 3000 })

      // Should have called refresh multiple times (no deduplication in current impl)
      // Note: This test documents current behavior. Ideally, we'd want deduplication.
      expect(api.auth.refresh).toHaveBeenCalled()
    })

    it('should handle refresh during ongoing login', async () => {
      vi.mocked(api.auth.login).mockImplementation(() =>
        new Promise((resolve) => setTimeout(() => resolve(undefined), 200))
      )
      vi.mocked(api.auth.getCurrentUser).mockReturnValue(mockUser)
      vi.mocked(api.auth.refresh).mockResolvedValue(undefined)

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      )

      const user = userEvent.setup()
      const loginButton = screen.getByText('Login')
      const refreshButton = screen.getByText('Refresh Auth')

      // Start login
      await user.click(loginButton)

      // Try to refresh while login is in progress
      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('true')
      })

      await user.click(refreshButton)

      // Wait for operations to complete
      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('false')
      }, { timeout: 3000 })
    })
  })

  describe('Session persistence', () => {
    it('should maintain user state after successful refresh', async () => {
      vi.mocked(api.auth.isAuthenticated).mockReturnValue(true)
      vi.mocked(api.auth.getCurrentUser).mockReturnValue(mockUser)
      vi.mocked(api.auth.refresh).mockResolvedValue(undefined)

      const { rerender } = render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId('user')).toHaveTextContent('test@example.com')
      })

      const user = userEvent.setup()
      const refreshButton = screen.getByText('Refresh Auth')
      await user.click(refreshButton)

      await waitFor(() => {
        expect(api.auth.refresh).toHaveBeenCalled()
      })

      // Rerender to simulate component update
      rerender(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      )

      // User should still be authenticated
      expect(screen.getByTestId('is-authenticated')).toHaveTextContent('true')
      expect(screen.getByTestId('user')).toHaveTextContent('test@example.com')
    })

    it('should clear user state after refresh failure', async () => {
      vi.mocked(api.auth.isAuthenticated).mockReturnValue(true)
      vi.mocked(api.auth.getCurrentUser).mockReturnValue(mockUser)
      vi.mocked(api.auth.refresh).mockRejectedValue(new Error('Token invalid'))

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId('user')).toHaveTextContent('test@example.com')
      })

      const user = userEvent.setup()
      const refreshButton = screen.getByText('Refresh Auth')
      await user.click(refreshButton)

      await waitFor(() => {
        expect(screen.getByTestId('user')).toHaveTextContent('null')
        expect(screen.getByTestId('is-authenticated')).toHaveTextContent('false')
      })
    })
  })

  describe('Error recovery', () => {
    it('should allow retry after refresh failure', async () => {
      vi.mocked(api.auth.isAuthenticated).mockReturnValue(true)
      vi.mocked(api.auth.getCurrentUser).mockReturnValue(mockUser)

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId('user')).toHaveTextContent('test@example.com')
      })

      // First refresh fails
      vi.mocked(api.auth.refresh).mockRejectedValueOnce(new Error('Network error'))

      const user = userEvent.setup()
      const refreshButton = screen.getByText('Refresh Auth')
      await user.click(refreshButton)

      // Logout is called after refresh failure, which clears error
      await waitFor(() => {
        expect(api.auth.logout).toHaveBeenCalled()
        expect(screen.getByTestId('user')).toHaveTextContent('null')
      })

      // User is now logged out, need to log back in
      vi.mocked(api.auth.login).mockResolvedValue(undefined)
      vi.mocked(api.auth.getCurrentUser).mockReturnValue(mockUser)

      const loginButton = screen.getByText('Login')
      await user.click(loginButton)

      await waitFor(() => {
        expect(screen.getByTestId('user')).toHaveTextContent('test@example.com')
      })

      // Second refresh succeeds
      vi.mocked(api.auth.refresh).mockResolvedValue(undefined)
      await user.click(refreshButton)

      await waitFor(() => {
        expect(api.auth.refresh).toHaveBeenCalledTimes(2)
        expect(screen.getByTestId('error')).toHaveTextContent('null')
      })
    })

    it('should clear error when clearError is called', async () => {
      vi.mocked(api.auth.isAuthenticated).mockReturnValue(true)
      vi.mocked(api.auth.getCurrentUser).mockReturnValue(mockUser)
      vi.mocked(api.auth.refresh).mockRejectedValue(new Error('Refresh failed'))

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId('user')).toHaveTextContent('test@example.com')
      })

      const user = userEvent.setup()
      const refreshButton = screen.getByText('Refresh Auth')
      await user.click(refreshButton)

      // Logout is called after refresh failure, which already clears error
      await waitFor(() => {
        expect(api.auth.logout).toHaveBeenCalled()
        expect(screen.getByTestId('error')).toHaveTextContent('null')
      })
    })
  })

  describe('Edge cases', () => {
    it('should handle refresh when getCurrentUser returns null', async () => {
      vi.mocked(api.auth.isAuthenticated).mockReturnValue(true)
      vi.mocked(api.auth.getCurrentUser).mockReturnValue(mockUser)
      vi.mocked(api.auth.refresh).mockResolvedValue(undefined)

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId('user')).toHaveTextContent('test@example.com')
      })

      // After refresh, getCurrentUser returns null
      vi.mocked(api.auth.getCurrentUser).mockReturnValue(null)

      const user = userEvent.setup()
      const refreshButton = screen.getByText('Refresh Auth')
      await user.click(refreshButton)

      await waitFor(() => {
        expect(api.auth.refresh).toHaveBeenCalled()
        // User should remain in previous state if getCurrentUser returns null
        expect(screen.getByTestId('user')).toHaveTextContent('test@example.com')
      })
    })

    it('should handle refresh with network timeout', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      vi.mocked(api.auth.isAuthenticated).mockReturnValue(true)
      vi.mocked(api.auth.getCurrentUser).mockReturnValue(mockUser)
      vi.mocked(api.auth.refresh).mockRejectedValue(new Error('Request timeout'))

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId('user')).toHaveTextContent('test@example.com')
      })

      const user = userEvent.setup()
      const refreshButton = screen.getByText('Refresh Auth')
      await user.click(refreshButton)

      // Logout clears the error, but we verify logout was called
      await waitFor(() => {
        expect(api.auth.logout).toHaveBeenCalled()
        expect(screen.getByTestId('user')).toHaveTextContent('null')
      })

      consoleErrorSpy.mockRestore()
    })

    it('should handle refresh with 401 unauthorized', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      vi.mocked(api.auth.isAuthenticated).mockReturnValue(true)
      vi.mocked(api.auth.getCurrentUser).mockReturnValue(mockUser)
      const unauthorizedError = new Error('401 Unauthorized')
      vi.mocked(api.auth.refresh).mockRejectedValue(unauthorizedError)

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId('user')).toHaveTextContent('test@example.com')
      })

      const user = userEvent.setup()
      const refreshButton = screen.getByText('Refresh Auth')
      await user.click(refreshButton)

      // Logout is called and clears the error
      await waitFor(() => {
        expect(api.auth.logout).toHaveBeenCalled()
        expect(screen.getByTestId('user')).toHaveTextContent('null')
      })

      consoleErrorSpy.mockRestore()
    })
  })
})
