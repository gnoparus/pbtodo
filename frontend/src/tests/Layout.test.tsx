import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from '../contexts/AuthContext'
import Layout from '../components/Layout'

// Mock the useAuth hook
vi.mock('../contexts/AuthContext', async () => {
  const actual = await vi.importActual('../contexts/AuthContext')
  return {
    ...actual,
    useAuth: vi.fn(),
  }
})

const { useAuth } = await import('../contexts/AuthContext')

const renderLayout = (authOverrides = {}) => {
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
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AuthProvider>
        <Layout>
          <div data-testid="test-children">Test Content</div>
        </Layout>
      </AuthProvider>
    </BrowserRouter>
  )
}

describe('Layout', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render children content', () => {
    renderLayout()

    expect(screen.getByTestId('test-children')).toBeInTheDocument()
    expect(screen.getByText('Test Content')).toBeInTheDocument()
  })

  it('should show navigation header', () => {
    renderLayout()

    expect(screen.getByRole('navigation')).toBeInTheDocument()
    expect(screen.getByText('Todo SaaS')).toBeInTheDocument()
  })

  it('should show login and register links when user is not authenticated', () => {
    renderLayout({
      isAuthenticated: false,
      user: null,
    })

    expect(screen.getByText('Login')).toBeInTheDocument()
    expect(screen.getByText('Register')).toBeInTheDocument()
    expect(screen.queryByText('Logout')).not.toBeInTheDocument()
  })

  it('should show logout button and user info when authenticated', () => {
    const mockUser = {
      id: '1',
      email: 'test@example.com',
      name: 'Test User',
      created: '2023-01-01T00:00:00Z',
      updated: '2023-01-01T00:00:00Z',
    }

    renderLayout({
      isAuthenticated: true,
      user: mockUser,
    })

    expect(screen.queryByText('Login')).not.toBeInTheDocument()
    expect(screen.queryByText('Register')).not.toBeInTheDocument()
    expect(screen.getByText('Logout')).toBeInTheDocument()
    expect(screen.getByText('Welcome, Test User')).toBeInTheDocument()
  })

  it('should show error message when error exists', () => {
    renderLayout({
      error: 'Something went wrong',
    })

    expect(screen.getByText('Something went wrong')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /dismiss/i })).toBeInTheDocument()
  })

  it('should not show error message when no error', () => {
    renderLayout({
      error: null,
    })

    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('should show loading spinner when loading', () => {
    renderLayout({
      loading: true,
    })

    expect(screen.getByText('Loading...')).toBeInTheDocument()
  })

  it('should not show loading when not loading', () => {
    renderLayout({
      loading: false,
    })

    expect(screen.queryByText('Loading...')).not.toBeInTheDocument()
  })

  it('should have correct navigation links', () => {
    renderLayout()

    const homeLink = screen.getByText('Todo SaaS')
    const loginLink = screen.getByText('Login')
    const registerLink = screen.getByText('Register')

    expect(homeLink).toHaveAttribute('href', '/')
    expect(loginLink).toHaveAttribute('href', '/login')
    expect(registerLink).toHaveAttribute('href', '/register')
  })

  it('should show todo link when authenticated', () => {
    const mockUser = {
      id: '1',
      email: 'test@example.com',
      name: 'Test User',
      created: '2023-01-01T00:00:00Z',
      updated: '2023-01-01T00:00:00Z',
    }

    renderLayout({
      isAuthenticated: true,
      user: mockUser,
    })

    const todosLink = screen.getByText('My Todos')
    expect(todosLink).toHaveAttribute('href', '/todos')
  })

  it('should call logout when logout button is clicked', () => {
    const mockLogout = vi.fn()
    const mockUser = {
      id: '1',
      email: 'test@example.com',
      name: 'Test User',
      created: '2023-01-01T00:00:00Z',
      updated: '2023-01-01T00:00:00Z',
    }

    renderLayout({
      isAuthenticated: true,
      user: mockUser,
      logout: mockLogout,
    })

    const logoutButton = screen.getByText('Logout')
    logoutButton.click()

    expect(mockLogout).toHaveBeenCalled()
  })

  it('should call clearError when error dismiss button is clicked', () => {
    const mockClearError = vi.fn()

    renderLayout({
      error: 'Test error',
      clearError: mockClearError,
    })

    const dismissButton = screen.getByRole('button', { name: /dismiss/i })
    dismissButton.click()

    expect(mockClearError).toHaveBeenCalled()
  })

  it('should be responsive', () => {
    renderLayout()

    const nav = screen.getByRole('navigation')
    expect(nav).toHaveClass('flex', 'items-center', 'space-x-4')
  })

  it('should have proper semantic HTML structure', () => {
    renderLayout()

    expect(screen.getByRole('banner')).toBeInTheDocument() // header
    expect(screen.getByRole('navigation')).toBeInTheDocument() // nav
    expect(screen.getByRole('main')).toBeInTheDocument() // main
    expect(screen.getByRole('contentinfo')).toBeInTheDocument() // footer
  })

  it('should have accessibility attributes', () => {
    renderLayout({
      error: 'Test error',
      loading: true,
    })

    const alert = screen.getByRole('alert')
    expect(alert).toHaveAttribute('aria-live', 'polite')

    const loading = screen.getByText('Loading...')
    expect(loading).toHaveAttribute('aria-busy', 'true')
  })
})
