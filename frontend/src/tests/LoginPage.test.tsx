import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from '../contexts/AuthContext'
import LoginPage from '../components/LoginPage'

// Mock the useAuth hook
vi.mock('../contexts/AuthContext', async () => {
  const actual = await vi.importActual('../contexts/AuthContext')
  return {
    ...actual,
    useAuth: vi.fn(),
  }
})

// Mock react-router-dom's Link component
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    Link: ({ children, to, ...props }: any) => (
      <a href={to} {...props}>
        {children}
      </a>
    ),
  }
})

const { useAuth } = await import('../contexts/AuthContext')

const renderLoginPage = (authOverrides = {}) => {
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
        <LoginPage />
      </AuthProvider>
    </BrowserRouter>
  )
}

describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render login form correctly', () => {
    renderLoginPage()

    expect(screen.getByRole('heading', { name: 'Sign in to your account' })).toBeInTheDocument()
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeInTheDocument()
    expect(screen.getByText('Or')).toBeInTheDocument()
    expect(screen.getByText('sign up for a new account')).toBeInTheDocument()
  })

  it('should have correct form inputs with proper attributes', () => {
    renderLoginPage()

    const emailInput = screen.getByLabelText(/email/i)
    const passwordInput = screen.getByLabelText(/password/i)

    expect(emailInput).toHaveAttribute('type', 'email')
    expect(emailInput).toHaveAttribute('required')
    expect(emailInput).toHaveAttribute('autocomplete', 'email')

    expect(passwordInput).toHaveAttribute('type', 'password')
    expect(passwordInput).toHaveAttribute('required')
    expect(passwordInput).toHaveAttribute('autocomplete', 'current-password')
  })

  it('should show validation errors for empty fields', async () => {
    renderLoginPage()

    const submitButton = screen.getByRole('button', { name: 'Sign in' })
    fireEvent.click(submitButton)

    await waitFor(() => {
      const emailInput = screen.getByLabelText(/email/i)
      const passwordInput = screen.getByLabelText(/password/i)

      expect(emailInput).toBeInvalid()
      expect(passwordInput).toBeInvalid()
    })
  })

  it('should show validation error for invalid email', async () => {
    renderLoginPage()

    const emailInput = screen.getByLabelText(/email/i)
    fireEvent.change(emailInput, { target: { value: 'invalid-email' } })
    fireEvent.blur(emailInput)

    await waitFor(() => {
      expect(emailInput).toBeInvalid()
    })
  })

  it('should call login with correct credentials', async () => {
    const mockLogin = vi.fn()
    renderLoginPage({ login: mockLogin })

    const emailInput = screen.getByLabelText(/email/i)
    const passwordInput = screen.getByLabelText(/password/i)
    const submitButton = screen.getByRole('button', { name: 'Sign in' })

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
    fireEvent.change(passwordInput, { target: { value: 'password123' } })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith('test@example.com', 'password123')
    })
  })

  it('should show loading state during login', () => {
    renderLoginPage({ loading: true })

    const submitButton = screen.getByRole('button', { name: 'Signing in...' })
    expect(submitButton).toBeDisabled()
    expect(screen.getByText('Signing in...')).toBeInTheDocument()
  })

  it('should display error message when login fails', () => {
    renderLoginPage({ error: 'Invalid credentials' })

    expect(screen.getByText('Invalid credentials')).toBeInTheDocument()
  })

  it('should clear error when form is submitted', async () => {
    const mockLogin = vi.fn()
    const mockClearError = vi.fn()

    renderLoginPage({
      error: 'Previous error',
      login: mockLogin,
      clearError: mockClearError
    })

    const emailInput = screen.getByLabelText(/email/i)
    const passwordInput = screen.getByLabelText(/password/i)
    const submitButton = screen.getByRole('button', { name: 'Sign in' })

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
    fireEvent.change(passwordInput, { target: { value: 'password123' } })
    fireEvent.click(submitButton)

    expect(mockClearError).toHaveBeenCalled()
  })

  it('should navigate to registration page when clicking Sign up', () => {
    renderLoginPage()

    const signUpLink = screen.getByText('sign up for a new account')
    expect(signUpLink).toHaveAttribute('href', '/register')
  })

  it('should have proper accessibility attributes', () => {
    renderLoginPage()

    const form = screen.getByRole('form')
    expect(form).toHaveAttribute('aria-label', 'Login form')

    const submitButton = screen.getByRole('button', { name: 'Sign in' })
    expect(submitButton).toHaveAttribute('type', 'submit')
  })

  it('should handle form submission with Enter key', async () => {
    const mockLogin = vi.fn()
    renderLoginPage({ login: mockLogin })

    const emailInput = screen.getByLabelText(/email/i)
    const passwordInput = screen.getByLabelText(/password/i)

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
    fireEvent.change(passwordInput, { target: { value: 'password123' } })
    fireEvent.submit(passwordInput)

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith('test@example.com', 'password123')
    })
  })

  it('should have proper semantic HTML structure', () => {
    renderLoginPage()

    expect(screen.getByRole('main')).toBeInTheDocument()
    expect(screen.getByRole('form')).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2 })).toBeInTheDocument()
  })

  it('should show password visibility toggle', () => {
    renderLoginPage()

    const passwordInput = screen.getByLabelText(/password/i)
    expect(passwordInput).toHaveAttribute('type', 'password')
  })

  it('should have responsive design classes', () => {
    renderLoginPage()

    const container = screen.getByRole('form').parentElement
    expect(container).toBeInTheDocument()
    expect(container).toHaveClass('max-w-md', 'w-full', 'space-y-8', 'p-8')
  })

  it('should have proper form validation attributes', () => {
    renderLoginPage()

    const emailInput = screen.getByLabelText(/email/i)
    expect(emailInput).toHaveAttribute('type', 'email')

    const passwordInput = screen.getByLabelText(/password/i)
    expect(passwordInput).toHaveAttribute('minlength', '6')
  })
})
