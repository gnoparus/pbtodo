import { ReactElement } from 'react'
import { render, RenderOptions, RenderResult } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { vi } from 'vitest'
import { AuthProvider } from '../../contexts/AuthContext'
import { TodoProvider } from '../../contexts/TodoContext'

/**
 * Test Utilities - Common helpers for testing
 */

/**
 * Custom render with all providers
 */
interface AllTheProvidersProps {
  children: React.ReactNode
}

export const AllTheProviders = ({ children }: AllTheProvidersProps) => {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AuthProvider>
        <TodoProvider>{children}</TodoProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}

/**
 * Renders a component with all providers
 */
export const renderWithProviders = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
): RenderResult => {
  return render(ui, { wrapper: AllTheProviders, ...options })
}

/**
 * Renders a component with only Router (no Auth/Todo providers)
 */
export const renderWithRouter = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
): RenderResult => {
  const RouterWrapper = ({ children }: { children: React.ReactNode }) => (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      {children}
    </BrowserRouter>
  )

  return render(ui, { wrapper: RouterWrapper, ...options })
}

/**
 * Cleanup utilities
 */

/**
 * Clears all mocks and timers
 */
export const cleanupMocks = () => {
  vi.clearAllMocks()
  vi.clearAllTimers()
}

/**
 * Restores all mocks to their original implementation
 */
export const restoreMocks = () => {
  vi.restoreAllMocks()
}

/**
 * Clears localStorage and sessionStorage
 */
export const cleanupStorage = () => {
  localStorage.clear()
  sessionStorage.clear()
}

/**
 * Complete cleanup - mocks, timers, and storage
 */
export const fullCleanup = () => {
  cleanupMocks()
  cleanupStorage()
}

/**
 * Wait utilities
 */

/**
 * Waits for a specific amount of time
 */
export const wait = (ms: number): Promise<void> => {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Async utilities
 */

/**
 * Flushes all pending promises
 */
export const flushPromises = (): Promise<void> => {
  return new Promise((resolve) => setImmediate(resolve))
}

/**
 * Mock data utilities
 */

/**
 * Creates a mock function that resolves with a value
 */
export const createMockResolve = <T,>(value: T) => {
  return vi.fn().mockResolvedValue(value)
}

/**
 * Creates a mock function that rejects with an error
 */
export const createMockReject = (error: string | Error) => {
  const errorObj = typeof error === 'string' ? new Error(error) : error
  return vi.fn().mockRejectedValue(errorObj)
}

/**
 * Creates a mock function that resolves after a delay
 */
export const createMockResolveDelayed = <T,>(value: T, delay: number) => {
  return vi.fn().mockImplementation(() => {
    return new Promise((resolve) => {
      setTimeout(() => resolve(value), delay)
    })
  })
}

/**
 * Console spy utilities
 */

/**
 * Suppresses console.error for a test
 * Returns a spy that can be inspected
 */
export const suppressConsoleError = () => {
  return vi.spyOn(console, 'error').mockImplementation(() => {})
}

/**
 * Suppresses console.warn for a test
 * Returns a spy that can be inspected
 */
export const suppressConsoleWarn = () => {
  return vi.spyOn(console, 'warn').mockImplementation(() => {})
}

/**
 * Suppresses console.log for a test
 * Returns a spy that can be inspected
 */
export const suppressConsoleLog = () => {
  return vi.spyOn(console, 'log').mockImplementation(() => {})
}

/**
 * Form utilities
 */

/**
 * Fills a form input with a value
 */
export const fillInput = (input: HTMLElement, value: string) => {
  const event = { target: { value } }
  input.dispatchEvent(new Event('change', { bubbles: true }))
  Object.defineProperty(input, 'value', { value, writable: true })
}

/**
 * Test data generation utilities
 */

/**
 * Generates a random email
 */
export const randomEmail = () => {
  const random = Math.random().toString(36).substring(7)
  return `test-${random}@example.com`
}

/**
 * Generates a random string
 */
export const randomString = (length: number = 10): string => {
  return Math.random()
    .toString(36)
    .substring(2, 2 + length)
}

/**
 * Generates a random number within range
 */
export const randomNumber = (min: number, max: number): number => {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

/**
 * Assertion helpers
 */

/**
 * Checks if an element is visible and enabled
 */
export const isInteractive = (element: HTMLElement): boolean => {
  return (
    element.style.display !== 'none' &&
    element.style.visibility !== 'hidden' &&
    !(element as HTMLInputElement).disabled
  )
}

/**
 * Gets all error messages from the document
 */
export const getAllErrorMessages = (): string[] => {
  const errors: string[] = []
  const errorElements = document.querySelectorAll('[role="alert"], .text-red-600, .text-red-800')

  errorElements.forEach((el) => {
    if (el.textContent) {
      errors.push(el.textContent.trim())
    }
  })

  return errors
}

/**
 * Mock context utilities
 */

/**
 * Creates a mock AuthContext value
 */
export const createMockAuthContext = (overrides = {}) => {
  return {
    user: null,
    isAuthenticated: false,
    loading: false,
    error: null,
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
    refreshAuth: vi.fn(),
    clearError: vi.fn(),
    ...overrides,
  }
}

/**
 * Creates a mock TodoContext value
 */
export const createMockTodoContext = (overrides = {}) => {
  return {
    todos: [],
    loading: false,
    error: null,
    loadTodos: vi.fn(),
    createTodo: vi.fn(),
    updateTodo: vi.fn(),
    toggleTodoComplete: vi.fn(),
    deleteTodo: vi.fn(),
    clearError: vi.fn(),
    ...overrides,
  }
}

/**
 * Date utilities
 */

/**
 * Creates an ISO date string from now with offset in days
 */
export const dateFromNow = (daysOffset: number = 0): string => {
  const date = new Date()
  date.setDate(date.getDate() + daysOffset)
  return date.toISOString()
}

/**
 * Creates an ISO date string from a simple date input
 */
export const createISODate = (year: number, month: number, day: number): string => {
  return new Date(year, month - 1, day).toISOString()
}

/**
 * Network utilities
 */

/**
 * Simulates a network delay
 */
export const simulateNetworkDelay = async (ms: number = 100): Promise<void> => {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Creates a mock network error
 */
export const createNetworkError = (message: string = 'Network Error') => {
  const error = new Error(message)
  error.name = 'NetworkError'
  return error
}

/**
 * Creates a mock timeout error
 */
export const createTimeoutError = (message: string = 'Request Timeout') => {
  const error = new Error(message)
  error.name = 'TimeoutError'
  return error
}

/**
 * Re-export commonly used testing library utilities
 */
export { screen, waitFor, within, fireEvent } from '@testing-library/react'
export { default as userEvent } from '@testing-library/user-event'
