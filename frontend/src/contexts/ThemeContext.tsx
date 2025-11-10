import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react'

type Theme = 'light' | 'dark'

interface ThemeContextType {
  theme: Theme
  toggleTheme: () => void
  setTheme: (theme: Theme) => void
  systemTheme: Theme
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

interface ThemeProviderProps {
  children: ReactNode
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [theme, setThemeState] = useState<Theme>('light')
  const [systemTheme, setSystemTheme] = useState<Theme>('light')
  const [mounted, setMounted] = useState(false)

  // Detect system theme preference
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    setSystemTheme(mediaQuery.matches ? 'dark' : 'light')

    const handleChange = (e: MediaQueryListEvent) => {
      setSystemTheme(e.matches ? 'dark' : 'light')
    }

    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [])

  // Initialize theme from localStorage or system preference
  useEffect(() => {
    setMounted(true)
    const storedTheme = localStorage.getItem('theme') as Theme | null

    if (storedTheme) {
      setThemeState(storedTheme)
    } else {
      // Use system preference as default
      setThemeState(systemTheme)
    }
  }, [systemTheme])

  // Apply theme to document and save to localStorage
  useEffect(() => {
    if (!mounted) return

    const root = document.documentElement
    if (theme === 'dark') {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }

    localStorage.setItem('theme', theme)
  }, [theme, mounted])

  const toggleTheme = () => {
    setThemeState(prev => prev === 'light' ? 'dark' : 'light')
  }

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme)
  }

  // Prevent flash of incorrect theme on initial load
  if (!mounted) {
    return <div style={{ visibility: 'hidden' }}>{children}</div>
  }

  const value: ThemeContextType = {
    theme,
    toggleTheme,
    setTheme,
    systemTheme
  }

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext)
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}
```

## Step 4: Create Theme Toggle Component

Now let me create the theme toggle component:
```typescript
import React from 'react'
import { useTheme } from '../contexts/ThemeContext'

const ThemeToggle: React.FC = () => {
  const { theme, toggleTheme } = useTheme()

  return (
    <button
      onClick={toggleTheme}
      className="p-2 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-700 dark:focus:ring-offset-gray-900 transition-colors duration-200"
      aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
      title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
    >
      {theme === 'light' ? (
        // Moon icon for dark mode
        <svg
          className="h-5 w-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
          />
        </svg>
      ) : (
        // Sun icon for light mode
        <svg
          className="h-5 w-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
          />
        </svg>
      )}
    </button>
  )
}

export default ThemeToggle
```

## Step 5: Update App.tsx to Include ThemeProvider

```typescript
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { TodoProvider } from './contexts/TodoContext'
import { ThemeProvider } from './contexts/ThemeContext'
import LoginPage from './components/LoginPage'
import RegisterPage from './components/RegisterPage'
import TodoPage from './components/TodoPage'
import Layout from './components/Layout'
import ProtectedRoute from './components/ProtectedRoute'

// Export contexts for tests
export { AuthContext } from './contexts/AuthContext'
export { TodoContext } from './contexts/TodoContext'
export { ThemeContext } from './contexts/ThemeContext'

function App() {
  return (
    <ThemeProvider>
      <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <AuthProvider>
          <TodoProvider>
            <Layout>
              <Routes>
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
                <Route
                  path="/todos"
                  element={
                    <ProtectedRoute>
                      <TodoPage />
                    </ProtectedRoute>
                  }
                />
                <Route path="/" element={<Navigate to="/todos" replace />} />
              </Routes>
            </Layout>
          </TodoProvider>
        </AuthProvider>
      </Router>
    </ThemeProvider>
  )
}

export default App
```

Let me commit these changes first before continuing with the component updates:
```bash
git add .
git commit -m "feat: implement theme infrastructure

- Configure Tailwind for dark mode with custom color palette
- Add CSS custom properties for smooth theme transitions
- Create ThemeContext for theme state management
- Add ThemeToggle component with accessible sun/moon icons
- Update App.tsx to include ThemeProvider
- Add theme-aware utility classes and component styles

Next: Update existing components to use theme-aware classes"
