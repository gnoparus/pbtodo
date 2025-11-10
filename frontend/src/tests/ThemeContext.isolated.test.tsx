import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
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

describe('ThemeContext (Isolated)', () => {
  beforeEach(() => {
    // Mock localStorage
    const localStorageMock = {
      getItem: vi.fn((key: string) => null),
      setItem: vi.fn((key: string, value: string) => {}),
      removeItem: vi.fn((key: string) => {}),
      clear: vi.fn(() => {})
    }

    Object.defineProperty(window, 'localStorage', {
      value: localStorageMock,
      writable: true
    })

    // Mock matchMedia
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation(query => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    })

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

    // Toggle back to light
    fireEvent.click(toggleButton)
    expect(screen.getByTestId('current-theme')).toHaveTextContent('light')
    expect(document.documentElement.classList.contains('dark')).toBe(false)
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

  it('throws error when useTheme is used outside ThemeProvider', () => {
    expect(() => {
      render(<TestComponent />)
    }).toThrow('useTheme must be used within a ThemeProvider')
  })
})
