import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

interface LayoutProps {
  children: React.ReactNode
}

/**
 * Main Layout component providing header, navigation, and footer
 * Features enhanced visual design with gradient background and modern styling
 */
const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { user, isAuthenticated, loading, error, logout, clearError } = useAuth()
  const location = useLocation()

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Loading overlay */}
      {loading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg">
            <div className="flex items-center space-x-3">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              <span className="text-gray-700" aria-busy="true">Loading...</span>
            </div>
          </div>
        </div>
      )}

      {/* Enhanced Header with Gradient Background */}
      <header
        className="bg-gradient-to-r from-blue-600 to-blue-700 shadow-md border-b border-blue-800"
        role="banner"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo with Icon */}
            <Link
              to="/"
              className="flex items-center space-x-2 text-xl font-bold text-white hover:text-blue-100 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-blue-700 focus:ring-white rounded-lg px-2 py-1"
            >
              <span className="text-2xl">🚀</span>
              <span>Todo SaaS</span>
            </Link>

            {/* Navigation */}
            <nav className="flex items-center space-x-6" role="navigation">
              {isAuthenticated ? (
                <>
                  <Link
                    to="/todos"
                    className={`px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                      location.pathname === '/todos'
                        ? 'bg-blue-500 text-white shadow-md'
                        : 'text-blue-50 hover:bg-blue-500 hover:text-white'
                    }`}
                  >
                    My Todos
                  </Link>
                  <div className="flex items-center space-x-3 pl-3 border-l border-blue-500">
                    <span className="text-sm font-medium text-blue-50">Welcome, {user?.name}</span>
                    <button
                      onClick={logout}
                      className="btn btn-secondary text-sm hover:shadow-lg transition-shadow duration-200"
                      aria-label="Logout from your account"
                    >
                      Logout
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <Link
                    to="/login"
                    className={`px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                      location.pathname === '/login'
                        ? 'bg-blue-500 text-white shadow-md'
                        : 'text-blue-50 hover:bg-blue-500 hover:text-white'
                    }`}
                  >
                    Login
                  </Link>
                  <Link
                    to="/register"
                    className="btn btn-primary text-sm shadow-md hover:shadow-lg transition-shadow duration-200"
                  >
                    Register
                  </Link>
                </>
              )}
            </nav>
          </div>
        </div>
      </header>

      {/* Error Alert */}
      {error && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-4">
          <div
            className="bg-red-50 border border-red-200 rounded-md p-4"
            role="alert"
            aria-live="polite"
          >
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="ml-3 flex-1">
                <p className="text-sm text-red-800">{error}</p>
              </div>
              <div className="ml-auto pl-3">
                <div className="-mx-1.5 -my-1.5">
                  <button
                    onClick={clearError}
                    className="inline-flex bg-red-50 rounded-md p-1.5 text-red-500 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-red-50 focus:ring-red-600"
                    aria-label="Dismiss error"
                  >
                    <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path
                        fillRule="evenodd"
                        d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full" role="main">
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-auto" role="contentinfo">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="text-center text-sm text-gray-500">
            <p>&copy; 2024 Todo SaaS. Built with React, Tailwind CSS, and PocketBase.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default Layout
