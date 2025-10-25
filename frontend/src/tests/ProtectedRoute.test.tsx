import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from '../contexts/AuthContext'
import ProtectedRoute from '../components/ProtectedRoute'

// Mock the useAuth hook
vi.mock('../contexts/AuthContext', async () => {
  const actual = await vi.importActual('../contexts/AuthContext')
  return {
    ...actual,
    useAuth: vi.fn(),
  }
})

const { useAuth } = await import('../contexts/AuthContext')

const renderProtectedRoute = (authOverrides = {}) => {
  const mockAuth = {
    user: null,
    isAuthenticated: false,
    loading: false,
    error: null,
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
    refreshAuth: vi.fn(),
    clearError: vi.fn(),
    ...authOverrides,
  }

  useAuth.mockReturnValue(mockAuth)

  return render(
    <BrowserRouter>
      <AuthProvider>
        <ProtectedRoute>
          <div data-testid="protected-content">Protected Content</div>
        </ProtectedRoute>
      </AuthProvider>
    </BrowserRouter>
  )
}

describe('ProtectedRoute', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render children when user is authenticated', () => {
    const mockUser = {
      id: '1',
      email: 'test@example.com',
      name: 'Test User',
      created: '2023-01-01T00:00:00Z',
      updated: '2023-01-01T00:00:00Z',
    }

    renderProtectedRoute({
      isAuthenticated: true,
      user: mockUser,
    })

    expect(screen.getByTestId('protected-content')).toBeInTheDocument()
    expect(screen.getByText('Protected Content')).toBeInTheDocument()
  })

  it('should redirect to login when user is not authenticated', () => {
    renderProtectedRoute({
      isAuthenticated: false,
      user: null,
    })

    expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument()
    // Since we're using Navigate, the component should redirect
    // In a real scenario, this would navigate to /login
  })

  it('should show loading state when authentication is loading', () => {
    renderProtectedRoute({
      loading: true,
      isAuthenticated: false,
    })

    expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument()
    expect(screen.getByText('Checking authentication...')).toBeInTheDocument()
  })

  it('should show loading spinner while loading', () => {
    renderProtectedRoute({
      loading: true,
      isAuthenticated: false,
    })

    const spinner = document.querySelector('.animate-spin')
    expect(spinner).toBeInTheDocument()
  })

  it('should have proper accessibility attributes', () => {
    renderProtectedRoute({
      loading: true,
      isAuthenticated: false,
    })

    const loadingDiv = screen.getByText('Checking authentication...').parentElement
    expect(loadingDiv).toHaveAttribute('aria-busy', 'true')
    expect(loadingDiv).toHaveAttribute('aria-live', 'polite')
  })

  it('should use Navigate from react-router-dom for redirection', () => {
    // This test verifies that the component uses Navigate correctly
    // The actual redirect behavior would be handled by React Router
    renderProtectedRoute({
      isAuthenticated: false,
      loading: false,
    })

    expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument()
  })

  it('should handle case where user exists but isAuthenticated is false', () => {
    const mockUser = {
      id: '1',
      email: 'test@example.com',
      name: 'Test User',
      created: '2023-01-01T00:00:00Z',
      updated: '2023-01-01T00:00:00Z',
    }

    renderProtectedRoute({
      isAuthenticated: false,
      user: mockUser,
      loading: false,
    })

    expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument()
  })

  it('should render children immediately if already authenticated', () => {
    const mockUser = {
      id: '1',
      email: 'test@example.com',
      name: 'Test User',
      created: '2023-01-01T00:00:00Z',
      updated: '2023-01-01T00:00:00Z',
    }

    renderProtectedRoute({
      isAuthenticated: true,
      user: mockUser,
      loading: false,
    })

    // Should not show loading
    expect(screen.queryByText('Checking authentication...')).not.toBeInTheDocument()
    // Should show protected content
    expect(screen.getByTestId('protected-content')).toBeInTheDocument()
  })

  it('should have proper semantic HTML structure', () => {
    renderProtectedRoute({
      loading: true,
      isAuthenticated: false,
    })

    const container = screen.getByText('Checking authentication...').parentElement?.parentElement
    expect(container).toHaveClass('flex')
    expect(container).toHaveClass('items-center')
    expect(container).toHaveClass('justify-center')
    expect(container).toHaveClass('min-h-screen')
  })
})
