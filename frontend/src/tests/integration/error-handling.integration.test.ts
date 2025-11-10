import { describe, it, expect, beforeEach, vi } from 'vitest'
import { api } from '../../services/api'
import { TEST_CONFIG, MOCK_TEST_USER, MOCK_AUTH_TOKEN } from './setup'

// Mock the fetch function
global.fetch = vi.fn()

describe('Error Handling Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    localStorage.setItem('authToken', MOCK_AUTH_TOKEN)
    api.reloadToken()
  })

  describe('Network Errors', () => {
    it('should handle connection refused errors', async () => {
      ;(global.fetch as any).mockRejectedValueOnce(
        new Error('connect ECONNREFUSED')
      )

      await expect(api.todos.getAll()).rejects.toThrow()
    })

    it('should handle timeout errors', async () => {
      ;(global.fetch as any).mockRejectedValueOnce(
        new Error('Request timeout')
      )

      await expect(api.todos.getAll()).rejects.toThrow()
    })

    it('should handle DNS resolution errors', async () => {
      ;(global.fetch as any).mockRejectedValueOnce(
        new Error('getaddrinfo ENOTFOUND')
      )

      await expect(api.todos.getAll()).rejects.toThrow()
    })

    it('should handle network unreachable errors', async () => {
      ;(global.fetch as any).mockRejectedValueOnce(
        new Error('Network is unreachable')
      )

      await expect(api.todos.getAll()).rejects.toThrow()
    })
  })

  describe('HTTP Status Errors', () => {
    it('should handle 400 Bad Request', async () => {
      const mockResponse = {
        success: false,
        error: 'Invalid request parameters',
      }

      ;(global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => mockResponse,
      })

      await expect(
        api.todos.create({ title: '', priority: 'invalid' as any })
      ).rejects.toThrow()
    })

    it('should handle 401 Unauthorized', async () => {
      const mockResponse = {
        success: false,
        error: 'Unauthorized',
      }

      ;(global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => mockResponse,
      })

      localStorage.removeItem('authToken')

      await expect(api.todos.getAll()).rejects.toThrow()
    })

    it('should handle 403 Forbidden', async () => {
      const mockResponse = {
        success: false,
        error: 'Access denied',
      }

      ;(global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 403,
        json: async () => mockResponse,
      })

      await expect(api.todos.getById('restricted-todo')).rejects.toThrow()
    })

    it('should handle 404 Not Found', async () => {
      const mockResponse = {
        success: false,
        error: 'Todo not found',
      }

      ;(global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => mockResponse,
      })

      await expect(api.todos.getById('non-existent')).rejects.toThrow()
    })

    it('should handle 409 Conflict', async () => {
      const mockResponse = {
        success: false,
        error: 'Resource conflict',
      }

      ;(global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 409,
        json: async () => mockResponse,
      })

      await expect(
        api.todos.create({ title: 'Duplicate', priority: 'medium' })
      ).rejects.toThrow()
    })

    it('should handle 429 Too Many Requests', async () => {
      const mockResponse = {
        success: false,
        error: 'Rate limit exceeded',
      }

      ;(global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 429,
        json: async () => mockResponse,
      })

      await expect(api.todos.getAll()).rejects.toThrow()
    })

    it('should handle 500 Internal Server Error', async () => {
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

    it('should handle 502 Bad Gateway', async () => {
      const mockResponse = {
        success: false,
        error: 'Bad gateway',
      }

      ;(global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 502,
        json: async () => mockResponse,
      })

      await expect(api.todos.getAll()).rejects.toThrow()
    })

    it('should handle 503 Service Unavailable', async () => {
      const mockResponse = {
        success: false,
        error: 'Service unavailable',
      }

      ;(global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 503,
        json: async () => mockResponse,
      })

      await expect(api.todos.getAll()).rejects.toThrow()
    })
  })

  describe('Response Format Errors', () => {
    it('should handle malformed JSON responses', async () => {
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => {
          throw new Error('Invalid JSON')
        },
      })

      await expect(api.todos.getAll()).rejects.toThrow()
    })

    it('should handle missing error field in error response', async () => {
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({}),
      })

      await expect(api.todos.getAll()).rejects.toThrow()
    })

    it('should handle null response', async () => {
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => null,
      })

      const result = await api.todos.getAll()
      expect(result).toBeNull()
    })

    it('should handle unexpected response structure', async () => {
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ unexpected: 'structure' }),
      })

      const result = await api.todos.getAll()
      expect(result).toBeDefined()
    })
  })

  describe('Validation Errors', () => {
    it('should handle invalid email format', async () => {
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

    it('should handle password too weak', async () => {
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

    it('should handle missing required fields', async () => {
      const mockResponse = {
        success: false,
        error: 'Required field missing: title',
      }

      ;(global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => mockResponse,
      })

      await expect(
        api.todos.create({ title: '', priority: 'medium' })
      ).rejects.toThrow()
    })

    it('should handle invalid enum values', async () => {
      const mockResponse = {
        success: false,
        error: 'Invalid priority value',
      }

      ;(global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => mockResponse,
      })

      await expect(
        api.todos.create({ title: 'Test', priority: 'invalid' as any })
      ).rejects.toThrow()
    })
  })

  describe('Authentication Errors', () => {
    it('should handle invalid credentials', async () => {
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

    it('should handle expired tokens', async () => {
      const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ0ZXN0IiwiZXhwIjoxNjAwMDAwMDAwfQ.mock'
      localStorage.setItem('authToken', expiredToken)

      expect(api.auth.isAuthenticated()).toBe(false)
    })

    it('should handle missing authentication token', async () => {
      localStorage.removeItem('authToken')

      expect(api.auth.isAuthenticated()).toBe(false)
      expect(api.auth.getCurrentUser()).toBeNull()
    })

    it('should handle malformed tokens', async () => {
      localStorage.setItem('authToken', 'invalid.token')

      expect(api.auth.isAuthenticated()).toBe(false)
    })
  })

  describe('Concurrent Error Handling', () => {
    it('should handle errors in concurrent requests', async () => {
      const promises = []

      for (let i = 0; i < 5; i++) {
        if (i % 2 === 0) {
          const mockTodo = {
            id: `todo-${i}`,
            title: `Todo ${i}`,
            completed: false,
            priority: 'medium' as const,
            user_id: MOCK_TEST_USER.id,
            created_at: Date.now(),
            updated_at: Date.now(),
          }

          ;(global.fetch as any).mockResolvedValueOnce({
            ok: true,
            status: 200,
            json: async () => ({ success: true, data: mockTodo }),
          })
        } else {
          ;(global.fetch as any).mockResolvedValueOnce({
            ok: false,
            status: 404,
            json: async () => ({ success: false, error: 'Not found' }),
          })
        }

        promises.push(
          api.todos.getById(`todo-${i}`).catch(err => ({ error: err.message }))
        )
      }

      const results = await Promise.all(promises)

      expect(results.length).toBe(5)
    })

    it('should handle network errors during concurrent operations', async () => {
      const promises = []

      for (let i = 0; i < 3; i++) {
        ;(global.fetch as any).mockRejectedValueOnce(
          new Error('Network error')
        )

        promises.push(
          api.todos.getAll().catch(err => ({ error: err.message }))
        )
      }

      const results = await Promise.all(promises)

      results.forEach(result => {
        expect(result.error).toBeDefined()
      })
    })
  })

  describe('Recovery Scenarios', () => {
    it('should recover from temporary network errors', async () => {
      ;(global.fetch as any).mockRejectedValueOnce(
        new Error('Network error')
      )

      await expect(api.todos.getAll()).rejects.toThrow()

      const mockResponse = {
        success: true,
        data: [],
      }

      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockResponse,
      })

      const result = await api.todos.getAll()
      expect(result).toBeDefined()
    })

    it('should recover from authentication timeout', async () => {
      ;(global.fetch as any).mockRejectedValueOnce(
        new Error('Request timeout')
      )

      await expect(api.auth.refresh()).rejects.toThrow()

      expect(api.auth.isAuthenticated()).toBe(true)
    })
  })
})
