import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from '../contexts/AuthContext'
import RegisterPage from '../components/RegisterPage'

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

const renderRegisterPage = (authOverrides = {}) => {
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
        <RegisterPage />
      </AuthProvider>
    </BrowserRouter>
  )
}

describe('RegisterPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render registration form correctly', () => {
    renderRegisterPage()

    expect(screen.getByRole('heading', { name: 'Create your account' })).toBeInTheDocument()
    expect(screen.getByLabelText(/name/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Sign up' })).toBeInTheDocument()
    expect(screen.getByText('Already have an account?')).toBeInTheDocument()
    expect(screen.getByText('Sign in')).toBeInTheDocument()
  })

  it('should have correct form inputs with proper attributes', () => {
    renderRegisterPage()

    const nameInput = screen.getByLabelText(/name/i)
    const emailInput = screen.getByLabelText(/email/i)
    const passwordInput = screen.getByLabelText(/password/i)
    const confirmPasswordInput = screen.getByLabelText(/confirm password/i)

    expect(nameInput).toHaveAttribute('type', 'text')
    expect(nameInput).toHaveAttribute('required')
    expect(nameInput).toHaveAttribute('autocomplete', 'name')

    expect(emailInput).toHaveAttribute('type', 'email')
    expect(emailInput).toHaveAttribute('required')
    expect(emailInput).toHaveAttribute('autocomplete', 'email')

    expect(passwordInput).toHaveAttribute('type', 'password')
    expect(passwordInput).toHaveAttribute('required')
    expect(passwordInput).toHaveAttribute('autocomplete', 'new-password')
    expect(passwordInput).toHaveAttribute('minlength', '6')

    expect(confirmPasswordInput).toHaveAttribute('type', 'password')
    expect(confirmPasswordInput).toHaveAttribute('required')
    expect(confirmPasswordInput).toHaveAttribute('autocomplete', 'new-password')
    expect(confirmPasswordInput).toHaveAttribute('minlength', '6')
  })

  it('should show validation errors for empty fields', async () => {
    renderRegisterPage()

    const submitButton = screen.getByRole('button', { name: 'Sign up' })
    fireEvent.click(submitButton)

    await waitFor(() => {
      const nameInput = screen.getByLabelText(/name/i)
      const emailInput = screen.getByLabelText(/email/i)
      const passwordInput = screen.getByLabelText(/password/i)
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i)

      expect(nameInput).toBeInvalid()
      expect(emailInput).toBeInvalid()
      expect(passwordInput).toBeInvalid()
      expect(confirmPasswordInput).toBeInvalid()
    })
  })

  it('should show validation error for invalid email', async () => {
    renderRegisterPage()

    const emailInput = screen.getByLabelText(/email/i)
    fireEvent.change(emailInput, { target: { value: 'invalid-email' } })
    fireEvent.blur(emailInput)

    await waitFor(() => {
      expect(emailInput).toBeInvalid()
    })
  })

  it('should show validation error for password mismatch', async () => {
    renderRegisterPage()

    const passwordInput = screen.getByLabelText(/password/i)
    const confirmPasswordInput = screen.getByLabelText(/confirm password/i)

    fireEvent.change(passwordInput, { target: { value: 'password123' } })
    fireEvent.change(confirmPasswordInput, { target: { value: 'different' } })
    fireEvent.blur(confirmPasswordInput)

    await waitFor(() => {
      expect(confirmPasswordInput).toBeInvalid()
    })
  })

  it('should call register with correct data', async () => {
    const mockRegister = vi.fn()
    renderRegisterPage({ register: mockRegister })

    const nameInput = screen.getByLabelText(/name/i)
    const emailInput = screen.getByLabelText(/email/i)
    const passwordInput = screen.getByLabelText(/password/i)
    const confirmPasswordInput = screen.getByLabelText(/confirm password/i)
    const submitButton = screen.getByRole('button', { name: 'Sign up' })

    fireEvent.change(nameInput, { target: { value: 'Test User' } })
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
    fireEvent.change(passwordInput, { target: { value: 'password123' } })
    fireEvent.change(confirmPasswordInput, { target: { value: 'password123' } })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(mockRegister).toHaveBeenCalledWith('test@example.com', 'password123', 'Test User')
    })
  })

  it('should show loading state during registration', () => {
    renderRegisterPage({ loading: true })

    const submitButton = screen.getByRole('button', { name: 'Sign up' })
    expect(submitButton).toBeDisabled()
    expect(screen.getByText('Creating account...')).toBeInTheDocument()
  })

  it('should display error message when registration fails', () => {
    renderRegisterPage({ error: 'Email already exists' })

    expect(screen.getByText('Email already exists')).toBeInTheDocument()
  })

  it('should clear error when form is submitted', async () => {
    const mockRegister = vi.fn()
    const mockClearError = vi.fn()

    renderRegisterPage({
      error: 'Previous error',
      register: mockRegister,
      clearError: mockClearError
    })

    const nameInput = screen.getByLabelText(/name/i)
    const emailInput = screen.getByLabelText(/email/i)
    const passwordInput = screen.getByLabelText(/password/i)
    const confirmPasswordInput = screen.getByLabelText(/confirm password/i)
    const submitButton = screen.getByRole('button', { name: 'Sign up' })

    fireEvent.change(nameInput, { target: { value: 'Test User' } })
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
    fireEvent.change(passwordInput, { target: { value: 'password123' } })
    fireEvent.change(confirmPasswordInput, { target: { value: 'password123' } })
    fireEvent.click(submitButton)

    expect(mockClearError).toHaveBeenCalled()
  })

  it('should navigate to login page when clicking Sign in', () => {
    renderRegisterPage()

    const signInLink = screen.getByText('Sign in')
    expect(signInLink).toHaveAttribute('href', '/login')
  })

  it('should have proper accessibility attributes', () => {
    renderRegisterPage()

    const form = screen.getByRole('form')
    expect(form).toHaveAttribute('aria-label', 'Registration form')

    const submitButton = screen.getByRole('button', { name: 'Sign up' })
    expect(submitButton).toHaveAttribute('type', 'submit')
  })

  it('should handle form submission with Enter key', async () => {
    const mockRegister = vi.fn()
    renderRegisterPage({ register: mockRegister })

    const nameInput = screen.getByLabelText(/name/i)
    const emailInput = screen.getByLabelText(/email/i)
    const passwordInput = screen.getByLabelText(/password/i)
    const confirmPasswordInput = screen.getByLabelText(/confirm password/i)

    fireEvent.change(nameInput, { target: { value: 'Test User' } })
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
    fireEvent.change(passwordInput, { target: { value: 'password123' } })
    fireEvent.change(confirmPasswordInput, { target: { value: 'password123' } })
    fireEvent.submit(confirmPasswordInput)

    await waitFor(() => {
      expect(mockRegister).toHaveBeenCalledWith('test@example.com', 'password123', 'Test User')
    })
  })

  it('should have proper semantic HTML structure', () => {
    renderRegisterPage()

    expect(screen.getByRole('main')).toBeInTheDocument()
    expect(screen.getByRole('form')).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2 })).toBeInTheDocument()
  })

  it('should show password confirmation validation when passwords differ', async () => {
    renderRegisterPage()

    const passwordInput = screen.getByLabelText(/password/i)
    const confirmPasswordInput = screen.getByLabelText(/confirm password/i)

    fireEvent.change(passwordInput, { target: { value: 'password123' } })
    fireEvent.change(confirmPasswordInput, { target: { value: 'different123' } })
    fireEvent.blur(confirmPasswordInput)

    await waitFor(() => {
      expect(screen.getByText('Passwords do not match')).toBeInTheDocument()
    })
  })

  it('should have responsive design classes', () => {
    renderRegisterPage()

    const card = screen.getByText('Create your account').closest('.card')
    expect(card).toBeInTheDocument()
    expect(card).toHaveClass('max-w-md', 'mx-auto')
  })

  it('should have proper form validation attributes', () => {
    renderRegisterPage()

    const nameInput = screen.getByLabelText(/name/i)
    expect(nameInput).toHaveAttribute('minlength', '2')
    expect(nameInput).toHaveAttribute('maxlength', '50')

    const emailInput = screen.getByLabelText(/email/i)
    expect(emailInput).toHaveAttribute('pattern')

    const passwordInput = screen.getByLabelText(/password/i)
    expect(passwordInput).toHaveAttribute('minlength', '6')

    const confirmPasswordInput = screen.getByLabelText(/confirm password/i)
    expect(confirmPasswordInput).toHaveAttribute('minlength', '6')
  })

  it('should clear field errors when user starts typing', async () => {
    renderRegisterPage()

    const emailInput = screen.getByLabelText(/email/i)

    // Trigger validation error
    fireEvent.change(emailInput, { target: { value: 'invalid' } })
    fireEvent.blur(emailInput)

    await waitFor(() => {
      expect(emailInput).toBeInvalid()
    })

    // Clear error by typing valid input
    fireEvent.change(emailInput, { target: { value: 'valid@example.com' } })

    await waitFor(() => {
      expect(screen.queryByText('Email is invalid')).not.toBeInTheDocument()
    })
  })

  it('should handle name length validation', async () => {
    renderRegisterPage()

    const nameInput = screen.getByLabelText(/name/i)

    // Test minimum length
    fireEvent.change(nameInput, { target: { value: 'A' } })
    fireEvent.blur(nameInput)

    await waitFor(() => {
      expect(screen.getByText('Name must be at least 2 characters')).toBeInTheDocument()
    })

    // Test maximum length
    const longName = 'A'.repeat(51)
    fireEvent.change(nameInput, { target: { value: longName } })
    fireEvent.blur(nameInput)

    await waitFor(() => {
      expect(screen.getByText('Name must be less than 50 characters')).toBeInTheDocument()
    })
  })
})
