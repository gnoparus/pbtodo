
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { TodoProvider } from './contexts/TodoContext'
import LoginPage from './components/LoginPage'
import RegisterPage from './components/RegisterPage'
import TodoPage from './components/TodoPage'
import Layout from './components/Layout'
import ProtectedRoute from './components/ProtectedRoute'

// Export AuthContext for tests


function App() {
  return (
    <Router>
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
  )
}

export default App
