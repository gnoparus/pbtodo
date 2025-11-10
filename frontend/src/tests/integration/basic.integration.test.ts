import { describe, it, expect, beforeEach, vi } from 'vitest'
import { api } from '../../services/api'
import { TEST_CONFIG, MOCK_TEST_USER, MOCK_AUTH_TOKEN } from './setup'

// Mock the fetch function
global.fetch = vi.fn()

describe('Basic Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    localStorage.setItem('authToken', MOCK_AUTH_TOKEN)
    // Reload token from localStorage after setting it
    api.reloadToken()
  })

  describe('API Client Initialization', () => {
    it('should initialize with token from localStorage', () => {
      const token = localStorage.getItem('authToken')
      expect(token).toBe(MOCK_AUTH_TOKEN)
    })

    it('should recognize authenticated state', () => {
      expect(api.auth.isAuthenticated()).toBe(true)
    })

    it('should decode user from token', () => {
      const user = api.auth.getCurrentUser()
      expect(user).toBeDefined()
      expect(user?.id).toBeDefined()
      expect(user?.email).toBeDefined()
    })
  })

  describe('Authentication Flow', () => {
    it('should handle login with valid credentials', async () => {
      const mockResponse = {
        success: true,
        data: {
          token: MOCK_AUTH_TOKEN,
          user: MOCK_TEST_USER,
        },
      }

      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockResponse,
      })

      const result = await api.auth.login(
        TEST_CONFIG.testUserEmail,
        TEST_CONFIG.testUserPassword
      )

      expect(result).toBeDefined()
      expect(result.user).toBeDefined()
      expect(result.token).toBeDefined()
    })

    it('should reject login with invalid credentials', async () => {
      const mockResponse = {
        success: false,
        error: 'Invalid email or password',
      }

      ;(global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => mockResponse,
      })

      await expect(
        api.auth.login('wrong@example.com', 'wrongpassword')
      ).rejects.toThrow()
    })

    it('should handle logout correctly', () => {
      api.auth.logout()

      expect(localStorage.getItem('authToken')).toBeNull()
      expect(api.auth.isAuthenticated()).toBe(false)
    })

    it('should maintain auth state after login', async () => {
      api.clearToken()
      localStorage.clear()

      const mockResponse = {
        success: true,
        data: {
          token: MOCK_AUTH_TOKEN,
          user: MOCK_TEST_USER,
        },
      }

      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockResponse,
      })

      await api.auth.login(
        TEST_CONFIG.testUserEmail,
        TEST_CONFIG.testUserPassword
      )

      expect(api.auth.isAuthenticated()).toBe(true)
      expect(localStorage.getItem('authToken')).toBeDefined()
    })
  })

  describe('Todo Operations', () => {
    it('should fetch all todos', async () => {
      const mockTodos = [
        {
          id: 'todo-1',
          title: 'Todo 1',
          completed: false,
          priority: 'medium' as const,
          user_id: MOCK_TEST_USER.id,
          created_at: Date.now(),
          updated_at: Date.now(),
        },
      ]

      const mockResponse = {
        success: true,
        data: mockTodos,
      }

      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockResponse,
      })

      const result = await api.todos.getAll()

      expect(Array.isArray(result)).toBe(true)
      expect(result.length).toBeGreaterThanOrEqual(0)
    })

    it('should create a todo', async () => {
      const mockTodo = {
        id: 'todo-new',
        title: 'New Todo',
        completed: false,
        priority: 'medium' as const,
        user_id: MOCK_TEST_USER.id,
        created_at: Date.now(),
        updated_at: Date.now(),
      }

      const mockResponse = {
        success: true,
        data: mockTodo,
      }

      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => mockResponse,
      })

      const result = await api.todos.create({
        title: 'New Todo',
        priority: 'medium',
      })

      expect(result).toBeDefined()
      expect(result.id).toBeDefined()
      expect(result.title).toBe('New Todo')
    })

    it('should update a todo', async () => {
      const mockTodo = {
        id: 'todo-1',
        title: 'Updated Todo',
        completed: true,
        priority: 'high' as const,
        user_id: MOCK_TEST_USER.id,
        created_at: Date.now(),
        updated_at: Date.now(),
      }

      const mockResponse = {
        success: true,
        data: mockTodo,
      }

      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockResponse,
      })

      const result = await api.todos.update('todo-1', {
        title: 'Updated Todo',
        completed: true,
        priority: 'high',
      })

      expect(result).toBeDefined()
      expect(result.title).toBe('Updated Todo')
      expect(result.completed).toBe(true)
    })

    it('should delete a todo', async () => {
      const mockResponse = {
        success: true,
        data: null,
      }

      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 204,
        json: async () => mockResponse,
      })

      const result = await api.todos.delete('todo-1')

      expect(result).toBe(true)
    })
  })

  describe('Error Handling', () => {
    it('should handle network errors', async () => {
      ;(global.fetch as any).mockRejectedValueOnce(
        new Error('Network request failed')
      )

      await expect(api.todos.getAll()).rejects.toThrow()
    })

    it('should handle invalid JSON responses', async () => {
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => {
          throw new Error('Invalid JSON')
        },
      })

      await expect(api.todos.getAll()).rejects.toThrow()
    })

    it('should handle server errors (5xx)', async () => {
      const mockResponse = {
        success: false,
        error: 'Internal server error',
      }

      ;(global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => mockResponse,
      })

      await expect(api.todos.getAll()).rejects.toThrow()
    })

    it('should handle bad request errors (4xx)', async () => {
      const mockResponse = {
        success: false,
        error: 'Bad request',
      }

      ;(global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => mockResponse,
      })

      await expect(api.todos.getAll()).rejects.toThrow()
    })
  })

  describe('Data Validation', () => {
    it('should validate email format on registration', async () => {
      const mockResponse = {
        success: false,
        error: 'Invalid email format',
      }

      ;(global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => mockResponse,
      })

      await expect(
        api.auth.register('invalid-email', 'Password123!', 'User')
      ).rejects.toThrow()
    })

    it('should validate password requirements on registration', async () => {
      const mockResponse = {
        success: false,
        error: 'Password does not meet complexity requirements',
      }

      ;(global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => mockResponse,
      })

      await expect(
        api.auth.register('user@example.com', 'weak', 'User')
      ).rejects.toThrow()
    })

    it('should require title for todo creation', async () => {
      const mockResponse = {
        success: false,
        error: 'Title is required',
      }

      ;(global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => mockResponse,
      })

      await expect(
        api.todos.create({ title: '' })
      ).rejects.toThrow()
    })
  })

  describe('API Response Format', () => {
    it('should handle 204 No Content responses', async () => {
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 204,
        json: async () => null,
      })

      const result = await api.todos.delete('todo-1')

      expect(result).toBe(true)
    })

    it('should extract data from success responses', async () => {
      const mockTodo = {
        id: 'todo-1',
        title: 'Test Todo',
        completed: false,
        priority: 'medium' as const,
        user_id: MOCK_TEST_USER.id,
        created_at: Date.now(),
        updated_at: Date.now(),
      }

      const mockResponse = {
        success: true,
        data: mockTodo,
      }

      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockResponse,
      })

      const result = await api.todos.getById('todo-1')

      expect(result).toEqual(mockTodo)
    })

    it('should include authorization header when authenticated', async () => {
      const mockResponse = {
        success: true,
        data: [],
      }

      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockResponse,
      })

      await api.todos.getAll()

      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: `Bearer ${MOCK_AUTH_TOKEN}`,
          }),
        })
      )
    })
  })
})
