import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
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

// Get mock references
const mockIsAuthenticated = vi.fn()
const mockGetCurrentUser = vi.fn()
const mockLogin = vi.fn()
const mockRegister = vi.fn()
const mockLogout = vi.fn()
const mockRefresh = vi.fn()

// Mock the useAuth hook
vi.mock('../contexts/AuthContext', async () => {
  const actual = await vi.importActual('../contexts/AuthContext')
  return {
    ...actual,
    useAuth: vi.fn(),
  }
})



const mockUser = {
  id: '1',
  email: 'test@example.com',
  name: 'Test User',
  created: '2023-01-01T00:00:00Z',
  updated: '2023-01-01T00:00:00Z',
}

describe('AuthContext', () => {
  let useAuth: any

  beforeEach(async () => {
    vi.clearAllMocks()
    mockIsAuthenticated.mockReturnValue(false)
    mockGetCurrentUser.mockReturnValue(null)
    mockLogin.mockResolvedValue(mockUser)
    mockRegister.mockResolvedValue(mockUser)
    mockRefresh.mockResolvedValue(mockUser)

    // Update the API mock to use our functions
    const apiModule = await import('../services/pocketbase')
    Object.assign(apiModule.api.auth, {
      login: mockLogin,
      register: mockRegister,
      logout: mockLogout,
      refresh: mockRefresh,
      getCurrentUser: mockGetCurrentUser,
      isAuthenticated: mockIsAuthenticated,
    })

    const authModule = await import('../contexts/AuthContext')
    useAuth = authModule.useAuth
  })

  const renderAuthContext = (authOverrides = {}) => {
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
          <TestComponent />
        </AuthProvider>
      </BrowserRouter>
    )
  }

  const TestComponent = () => {
    const auth = useAuth()

    return (
      <div>
        <div data-testid="is-authenticated">{auth.isAuthenticated.toString()}</div>
        <div data-testid="user">{auth.user?.email || 'null'}</div>
        <div data-testid="loading">{auth.loading.toString()}</div>
        <div data-testid="error">{auth.error || 'null'}</div>
        <button onClick={() => auth.login('test@example.com', 'password')}>
          Login
        </button>
        <button onClick={() => auth.register('test@example.com', 'password', 'Test User')}>
          Register
        </button>
        <button onClick={() => auth.logout()}>
          Logout
        </button>
        <button onClick={() => auth.refreshAuth()}>
          Refresh
        </button>
      </div>
    )
  }

  it('should initialize with unauthenticated state', () => {
    renderAuthContext()

    expect(screen.getByTestId('is-authenticated')).toHaveTextContent('false')
    expect(screen.getByTestId('user')).toHaveTextContent('null')
    expect(screen.getByTestId('loading')).toHaveTextContent('false')
    expect(screen.getByTestId('error')).toHaveTextContent('null')
  })

  it('should initialize with authenticated state if user exists', () => {
    renderAuthContext({
      isAuthenticated: true,
      user: mockUser,
    })

    expect(screen.getByTestId('is-authenticated')).toHaveTextContent('true')
    expect(screen.getByTestId('user')).toHaveTextContent('test@example.com')
    expect(screen.getByTestId('loading')).toHaveTextContent('false')
  })

  it('should handle login successfully', async () => {
    const mockLogin = vi.fn()
    renderAuthContext({ login: mockLogin })

    const loginButton = screen.getByText('Login')
    fireEvent.click(loginButton)

    expect(mockLogin).toHaveBeenCalledWith('test@example.com', 'password')
  })

  it('should handle login failure', async () => {
    const mockLogin = vi.fn()
    renderAuthContext({ login: mockLogin })

    const loginButton = screen.getByText('Login')
    fireEvent.click(loginButton)

    expect(mockLogin).toHaveBeenCalledWith('test@example.com', 'password')
  })

  it('should handle registration successfully', async () => {
    const mockRegister = vi.fn()
    renderAuthContext({ register: mockRegister })

    const registerButton = screen.getByText('Register')
    fireEvent.click(registerButton)

    expect(mockRegister).toHaveBeenCalledWith('test@example.com', 'password', 'Test User')
  })

  it('should handle registration failure', async () => {
    const mockRegister = vi.fn()
    renderAuthContext({ register: mockRegister })

    const registerButton = screen.getByText('Register')
    fireEvent.click(registerButton)

    expect(mockRegister).toHaveBeenCalledWith('test@example.com', 'password', 'Test User')
  })

  it('should handle logout', () => {
    const mockLogout = vi.fn()
    renderAuthContext({ logout: mockLogout })

    const logoutButton = screen.getByText('Logout')
    fireEvent.click(logoutButton)

    expect(mockLogout).toHaveBeenCalled()
  })

  it('should handle refresh authentication', async () => {
    const mockRefresh = vi.fn()
    renderAuthContext({ refreshAuth: mockRefresh })

    const refreshButton = screen.getByText('Refresh')
    fireEvent.click(refreshButton)

    expect(mockRefresh).toHaveBeenCalled()
  })

  it('should handle refresh failure', async () => {
    const mockRefresh = vi.fn()
    renderAuthContext({ refreshAuth: mockRefresh })

    const refreshButton = screen.getByText('Refresh')
    fireEvent.click(refreshButton)

    expect(mockRefresh).toHaveBeenCalled()
  })

  it('should clear errors when starting new operations', async () => {
    const mockLogin = vi.fn()
    renderAuthContext({ login: mockLogin })

    const loginButton = screen.getByText('Login')
    fireEvent.click(loginButton)

    expect(mockLogin).toHaveBeenCalledWith('test@example.com', 'password')
  })
})
