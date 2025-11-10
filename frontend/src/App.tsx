
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
