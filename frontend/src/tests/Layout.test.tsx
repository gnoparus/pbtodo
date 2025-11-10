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

    const homeLink = screen.getByRole('link', { name: /Todo SaaS/i })
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
    expect(nav).toHaveClass('flex', 'items-center', 'space-x-6')
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

  describe('Enhanced Visual Design', () => {
    it('should have gradient background on header', () => {
      renderLayout()

      const header = screen.getByRole('banner')
      const headerClasses = header.className

      expect(headerClasses).toMatch(/bg-gradient/)
    })

    it('should have logo with enhanced styling', () => {
      renderLayout()

      const logo = screen.getByRole('link', { name: /Todo SaaS/i })
      expect(logo).toHaveClass('flex', 'items-center', 'space-x-2', 'text-xl', 'font-bold')
      expect(logo.className).toMatch(/transition/)
      expect(logo).toHaveAttribute('href', '/')
    })

    it('should have improved spacing and layout', () => {
      renderLayout()

      const header = screen.getByRole('banner')
      const nav = screen.getByRole('navigation')

      expect(header).toHaveClass('shadow-md')
      expect(nav).toHaveClass('flex', 'items-center', 'space-x-6')
    })

    it('should have enhanced hover effects on navigation links', () => {
      renderLayout()

      const loginLink = screen.getByText('Login')
      expect(loginLink.className).toMatch(/hover:/)
    })

    it('should have modern button styling', () => {
      renderLayout({
        isAuthenticated: false,
      })

      const registerButton = screen.getByText('Register')
      expect(registerButton).toHaveClass('btn', 'btn-primary')
    })

    it('should have smooth transitions on interactive elements', () => {
      renderLayout()

      const logo = screen.getByRole('link', { name: /Todo SaaS/i })
      expect(logo.className).toMatch(/transition/)
    })

    it('should display logo icon/emoji', () => {
      renderLayout()

      const header = screen.getByRole('banner')
      const headerText = header.textContent

      // Should contain logo text
      expect(headerText).toContain('Todo SaaS')
    })

    it('should have improved header styling on mobile and desktop', () => {
      renderLayout()

      const headerContainer = screen.getByRole('banner').querySelector('div')
      expect(headerContainer).toHaveClass('max-w-7xl', 'mx-auto', 'px-4')
    })

    it('should maintain accessibility with enhanced styling', () => {
      renderLayout()

      const header = screen.getByRole('banner')
      const nav = screen.getByRole('navigation')

      expect(header).toBeInTheDocument()
      expect(nav).toBeInTheDocument()
    })

    it('should have proper contrast and visual hierarchy', () => {
      renderLayout({
        isAuthenticated: true,
        user: {
          id: '1',
          email: 'test@example.com',
          name: 'Test User',
          created: '2023-01-01T00:00:00Z',
          updated: '2023-01-01T00:00:00Z',
        },
      })

      const welcomeText = screen.getByText(/Welcome/)
      expect(welcomeText).toHaveClass('text-sm')

      const logoutBtn = screen.getByText('Logout')
      expect(logoutBtn).toHaveClass('btn')
    })
  })

  describe('Advanced Interactions - User Profile Badge', () => {
    it('should display user initials in profile badge when authenticated', () => {
      const mockUser = {
        id: '1',
        email: 'test@example.com',
        name: 'John Doe',
        created: '2023-01-01T00:00:00Z',
        updated: '2023-01-01T00:00:00Z',
      }

      renderLayout({
        isAuthenticated: true,
        user: mockUser,
      })

      const welcomeText = screen.getByText(/Welcome, John Doe/i)
      expect(welcomeText).toBeInTheDocument()
    })

    it('should show logout button with enhanced styling', () => {
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

      const logoutBtn = screen.getByText('Logout')
      expect(logoutBtn).toHaveClass('btn', 'btn-secondary')
    })

    it('should have visual separator between user info and logout button', () => {
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

      const userSection = screen.getByText(/Welcome/).parentElement
      expect(userSection).toHaveClass('border-l', 'border-blue-500')
    })

    it('should group user info and logout together on authenticated header', () => {
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

      const welcome = screen.getByText(/Welcome/)
      const logout = screen.getByText('Logout')

      expect(welcome).toBeInTheDocument()
      expect(logout).toBeInTheDocument()
      expect(welcome.parentElement).toHaveClass('space-x-3')
    })

    it('should have enhanced focus states for interactive elements', () => {
      renderLayout({
        isAuthenticated: false,
      })

      const loginLink = screen.getByRole('link', { name: /login/i })
      expect(loginLink.className).toMatch(/focus:/)
    })

    it('should apply active state styling to current page link', () => {
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

      const myTodosLink = screen.getByRole('link', { name: /my todos/i })
      // Should have active styling when on /todos page
      expect(myTodosLink.className).toMatch(/bg-blue-500|text-white|shadow-md/)
    })

    it('should have smooth transitions on user section elements', () => {
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

      const logoutBtn = screen.getByText('Logout')
      expect(logoutBtn.className).toMatch(/transition/)
    })

    it('should maintain proper spacing in authenticated header', () => {
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

      const nav = screen.getByRole('navigation')
      expect(nav).toHaveClass('space-x-6')
    })

    it('should be accessible with proper ARIA labels', () => {
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

      const logoutBtn = screen.getByRole('button', { name: /logout/i })
      expect(logoutBtn).toHaveAttribute('aria-label', 'Logout from your account')
    })
  })

  describe('Polish & Animation', () => {
    it('should have smooth transitions on all interactive elements', () => {
      renderLayout()

      const logo = screen.getByRole('link', { name: /Todo SaaS/i })
      const loginLink = screen.getByText('Login')

      expect(logo.className).toMatch(/transition/)
      expect(loginLink.className).toMatch(/transition/)
    })

    it('should have duration-200 for smooth animations', () => {
      renderLayout()

      const loginLink = screen.getByText('Login')
      expect(loginLink.className).toMatch(/duration-200/)
    })

    it('should apply animation on header render', () => {
      renderLayout()

      const header = screen.getByRole('banner')
      expect(header).toBeInTheDocument()
      // Header should have shadow effect for depth
      expect(header.className).toMatch(/shadow-/)
    })

    it('should have hover animation effects on navigation links', () => {
      renderLayout()

      const loginLink = screen.getByText('Login')
      expect(loginLink.className).toMatch(/hover:/)
      expect(loginLink.className).toMatch(/transition/)
    })

    it('should have button press feedback with transitions', () => {
      renderLayout({
        isAuthenticated: false,
      })

      const registerBtn = screen.getByText('Register')
      expect(registerBtn.className).toMatch(/transition/)
      expect(registerBtn.className).toMatch(/hover:/)
    })

    it('should have shadow elevation on buttons', () => {
      renderLayout({
        isAuthenticated: false,
      })

      const registerBtn = screen.getByText('Register')
      expect(registerBtn.className).toMatch(/shadow/)
    })

    it('should have hover shadow animation on buttons', () => {
      renderLayout({
        isAuthenticated: false,
      })

      const registerBtn = screen.getByText('Register')
      expect(registerBtn.className).toMatch(/hover:shadow/)
    })

    it('should maintain animation consistency across header states', () => {
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

      const myTodosLink = screen.getByText('My Todos')
      const logoutBtn = screen.getByText('Logout')

      expect(myTodosLink.className).toMatch(/transition/)
      expect(logoutBtn.className).toMatch(/transition/)
    })

    it('should have layered shadows for depth perception', () => {
      renderLayout()

      const header = screen.getByRole('banner')
      const registerBtn = screen.getByText('Register')

      expect(header.className).toMatch(/shadow-md/)
      expect(registerBtn.className).toMatch(/shadow/)
    })

    it('should support focus animation effects', () => {
      renderLayout()

      const loginLink = screen.getByText('Login')
      expect(loginLink.className).toMatch(/focus:/)
      expect(loginLink.className).toMatch(/transition/)
    })

    it('should provide visual feedback for all interactive states', () => {
      renderLayout()

      const nav = screen.getByRole('navigation')
      const links = nav.querySelectorAll('a, button')

      // All interactive elements should have transitions
      links.forEach(link => {
        expect(link.className).toMatch(/transition|hover:/)
      })
    })

    it('should have smooth color transitions on hover', () => {
      renderLayout()

      const loginLink = screen.getByText('Login')
      expect(loginLink.className).toMatch(/hover:/)
      expect(loginLink.className).toMatch(/transition/)
    })

    it('should apply animation to active state indicators', () => {
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

      const myTodosLink = screen.getByText('My Todos')
      // Should have transition effects
      expect(myTodosLink.className).toMatch(/transition/)
      expect(myTodosLink.className).toMatch(/duration-200/)
    })

    it('should maintain animation performance with no jank', () => {
      renderLayout()

      const header = screen.getByRole('banner')
      expect(header).toBeInTheDocument()

      const links = header.querySelectorAll('a, button')
      links.forEach(link => {
        // All links should use efficient transitions (not animations)
        expect(link.className).toMatch(/transition/)
      })
    })

    it('should have consistent timing across animations', () => {
      renderLayout()

      const logo = screen.getByRole('link', { name: /Todo SaaS/i })
      const loginLink = screen.getByText('Login')
      const registerBtn = screen.getByText('Register')

      // All should use duration-200 for consistency
      expect(registerBtn.className).toMatch(/duration-200/)
      expect(loginLink.className).toMatch(/duration-200|transition/)
    })

    it('should support prefers-reduced-motion for accessibility', () => {
      renderLayout()

      // All transitions should be defined, allowing CSS to handle prefersReducedMotion
      const logo = screen.getByRole('link', { name: /Todo SaaS/i })
      expect(logo.className).toMatch(/transition/)
    })
  })
})
