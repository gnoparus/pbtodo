import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { ThemeProvider, useTheme } from '../contexts/ThemeContext'

// Test component that uses theme context
const TestComponent: React.FC = () => {
  const { theme, toggleTheme, setTheme, systemTheme } = useTheme()

  return (
    <div>
      <div data-testid="current-theme">{theme}</div>
      <div data-testid="system-theme">{systemTheme}</div>
      <button onClick={toggleTheme} data-testid="toggle-theme">
        Toggle Theme
      </button>
      <button onClick={() => setTheme('dark')} data-testid="set-dark">
        Set Dark
      </button>
      <button onClick={() => setTheme('light')} data-testid="set-light">
        Set Light
      </button>
    </div>
  )
}

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {}

  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key]
    }),
    clear: vi.fn(() => {
      store = {}
    })
  }
})()

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
})

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

describe('ThemeContext', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorageMock.clear()
    vi.clearAllMocks()

    // Reset document classes
    document.documentElement.className = ''
  })

  afterEach(() => {
    // Clean up document after each test
    document.documentElement.className = ''
  })

  it('provides theme context values', () => {
    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    )

    expect(screen.getByTestId('current-theme')).toHaveTextContent('light')
    expect(screen.getByTestId('system-theme')).toHaveTextContent('light')
  })

  it('toggles theme between light and dark', () => {
    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    )

    const toggleButton = screen.getByTestId('toggle-theme')

    // Initial state should be light
    expect(screen.getByTestId('current-theme')).toHaveTextContent('light')
    expect(document.documentElement.classList.contains('dark')).toBe(false)

    // Toggle to dark
    fireEvent.click(toggleButton)
    expect(screen.getByTestId('current-theme')).toHaveTextContent('dark')
    expect(document.documentElement.classList.contains('dark')).toBe(true)
    expect(localStorageMock.setItem).toHaveBeenCalledWith('theme', 'dark')

    // Toggle back to light
    fireEvent.click(toggleButton)
    expect(screen.getByTestId('current-theme')).toHaveTextContent('light')
    expect(document.documentElement.classList.contains('dark')).toBe(false)
    expect(localStorageMock.setItem).toHaveBeenCalledWith('theme', 'light')
  })

  it('sets theme explicitly', () => {
    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    )

    const setDarkButton = screen.getByTestId('set-dark')
    const setLightButton = screen.getByTestId('set-light')

    // Set to dark
    fireEvent.click(setDarkButton)
    expect(screen.getByTestId('current-theme')).toHaveTextContent('dark')
    expect(document.documentElement.classList.contains('dark')).toBe(true)

    // Set to light
    fireEvent.click(setLightButton)
    expect(screen.getByTestId('current-theme')).toHaveTextContent('light')
    expect(document.documentElement.classList.contains('dark')).toBe(false)
  })

  it('loads theme from localStorage on initialization', () => {
    // Set theme in localStorage before rendering
    localStorageMock.setItem('theme', 'dark')
    vi.mocked(localStorageMock.getItem).mockReturnValue('dark')

    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    )

    expect(screen.getByTestId('current-theme')).toHaveTextContent('dark')
    expect(document.documentElement.classList.contains('dark')).toBe(true)
  })

  it('respects system preference when no stored theme', () => {
    // Mock system preference to dark
    vi.mocked(window.matchMedia).mockImplementation(query => ({
      matches: query === '(prefers-color-scheme: dark)',
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }))

    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    )

    expect(screen.getByTestId('system-theme')).toHaveTextContent('dark')
    expect(screen.getByTestId('current-theme')).toHaveTextContent('dark')
  })

  it('handles localStorage errors gracefully', () => {
    // Mock localStorage to throw an error
    vi.mocked(localStorageMock.getItem).mockImplementation(() => {
      throw new Error('Storage error')
    })

    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    )

    // Should still render with default theme
    expect(screen.getByTestId('current-theme')).toHaveTextContent('light')
  })

  it('prevents flash of incorrect theme during SSR', async () => {
    const { container } = render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    )

    // The component should be initially hidden during SSR
    expect(container.firstChild).toHaveStyle({ visibility: 'hidden' })

    // After mounting, it should be visible
    await waitFor(() => {
      expect(container.firstChild).not.toHaveStyle({ visibility: 'hidden' })
    })
  })

  it('throws error when useTheme is used outside ThemeProvider', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})

    expect(() => {
      render(<TestComponent />)
    }).toThrow('useTheme must be used within a ThemeProvider')

    consoleError.mockRestore()
  })

  it('ignores invalid theme values in localStorage', () => {
    // Set invalid theme in localStorage
    localStorageMock.setItem('theme', 'invalid')
    vi.mocked(localStorageMock.getItem).mockReturnValue('invalid')

    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    )

    // Should fall back to system theme (light in this case)
    expect(screen.getByTestId('current-theme')).toHaveTextContent('light')
  })
})
