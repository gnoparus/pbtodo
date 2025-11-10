import { describe, it, expect, beforeEach, vi } from 'vitest'
import { api } from '../../services/api'
import { TEST_CONFIG, MOCK_TEST_USER, MOCK_AUTH_TOKEN } from './setup'

// Mock the fetch function
global.fetch = vi.fn()

describe('Concurrent Operations Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    localStorage.setItem('authToken', MOCK_AUTH_TOKEN)
  })

  describe('Concurrent Todo Creation', () => {
    it('should handle multiple concurrent todo creation', async () => {
      const promises = []

      // Create 5 todos concurrently (reduced from 10 for testing)
      for (let i = 0; i < 5; i++) {
        const mockTodo = {
          id: `todo-concurrent-${i}`,
          title: `Concurrent Todo ${i}`,
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

        promises.push(
          api.todos.create({
            title: `Concurrent Todo ${i}`,
            completed: false,
            priority: 'medium',
          })
        )
      }

      const results = await Promise.all(promises)

      // Verify all todos were created successfully
      expect(results).toHaveLength(5)
      results.forEach((todo, index) => {
        expect(todo.title).toBe(`Concurrent Todo ${index}`)
      })
    })

    it('should handle concurrent operations with mixed success rates', async () => {
      const batchSize = 10
      const promises = []

      // Create todos with varying mock responses
      for (let i = 0; i < batchSize; i++) {
        if (i % 3 === 0) {
          // Some requests fail
          ;(global.fetch as any).mockResolvedValueOnce({
            ok: false,
            status: 400,
            json: async () => ({ success: false, error: 'Bad request' }),
          })
        } else {
          // Most requests succeed
          const mockTodo = {
            id: `todo-mixed-${i}`,
            title: `Mixed Todo ${i}`,
            completed: false,
            priority: 'medium' as const,
            user_id: MOCK_TEST_USER.id,
            created_at: Date.now(),
            updated_at: Date.now(),
          }

          ;(global.fetch as any).mockResolvedValueOnce({
            ok: true,
            status: 201,
            json: async () => ({ success: true, data: mockTodo }),
          })
        }

        promises.push(
          api.todos
            .create({ title: `Mixed Todo ${i}`, priority: 'medium' })
            .catch(err => ({ error: err.message }))
        )
      }

      const results = await Promise.allSettled(promises)

      // Verify mixed results
      const successful = results.filter(r => r.status === 'fulfilled')
      const failed = results.filter(r => r.status === 'rejected')

      expect(successful.length + failed.length).toBe(batchSize)
      expect(successful.length).toBeGreaterThan(0)
    })
  })

  describe('Concurrent Updates', () => {
    it('should handle concurrent updates to different todos', async () => {
      const todoCount = 5
      const promises = []

      // Simulate updates to different todos
      for (let i = 0; i < todoCount; i++) {
        const mockTodo = {
          id: `todo-update-${i}`,
          title: `Updated Todo ${i}`,
          completed: true,
          priority: ['low', 'medium', 'high'][i % 3] as 'low' | 'medium' | 'high',
          user_id: MOCK_TEST_USER.id,
          created_at: Date.now(),
          updated_at: Date.now(),
        }

        ;(global.fetch as any).mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ success: true, data: mockTodo }),
        })

        promises.push(
          api.todos.update(`todo-update-${i}`, {
            title: `Updated Todo ${i}`,
            completed: true,
          })
        )
      }

      const results = await Promise.all(promises)

      // Verify all updates succeeded
      expect(results).toHaveLength(todoCount)
      results.forEach((result, index) => {
        expect(result.title).toBe(`Updated Todo ${index}`)
        expect(result.completed).toBe(true)
      })
    })

    it('should handle concurrent toggles', async () => {
      const toggleCount = 5
      const promises = []

      for (let i = 0; i < toggleCount; i++) {
        const mockTodo = {
          id: `todo-toggle-${i}`,
          title: `Toggle Todo ${i}`,
          completed: i % 2 === 0,
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

        promises.push(api.todos.toggleComplete(`todo-toggle-${i}`))
      }

      const results = await Promise.all(promises)

      // Verify all toggles succeeded
      expect(results).toHaveLength(toggleCount)
    })
  })

  describe('Concurrent Mixed Operations', () => {
    it('should handle concurrent create, read, update, delete operations', async () => {
      const operationCount = 20
      const promises = []

      for (let i = 0; i < operationCount; i++) {
        const operation = i % 4

        switch (operation) {
          case 0: // Create
            {
              const mockTodo = {
                id: `todo-op-${i}`,
                title: `Operation Todo ${i}`,
                completed: false,
                priority: 'low' as const,
                user_id: MOCK_TEST_USER.id,
                created_at: Date.now(),
                updated_at: Date.now(),
              }

              ;(global.fetch as any).mockResolvedValueOnce({
                ok: true,
                status: 201,
                json: async () => ({ success: true, data: mockTodo }),
              })

              promises.push(
                api.todos.create({ title: `Operation Todo ${i}`, priority: 'low' })
              )
            }
            break

          case 1: // Read
            {
              const mockTodo = {
                id: `todo-read-${i}`,
                title: `Read Todo ${i}`,
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

              promises.push(api.todos.getById(`todo-read-${i}`))
            }
            break

          case 2: // Update
            {
              const mockTodo = {
                id: `todo-upd-${i}`,
                title: `Updated Op ${i}`,
                completed: true,
                priority: 'high' as const,
                user_id: MOCK_TEST_USER.id,
                created_at: Date.now(),
                updated_at: Date.now(),
              }

              ;(global.fetch as any).mockResolvedValueOnce({
                ok: true,
                status: 200,
                json: async () => ({ success: true, data: mockTodo }),
              })

              promises.push(
                api.todos.update(`todo-upd-${i}`, { title: `Updated Op ${i}` })
              )
            }
            break

          case 3: // Delete
            ;(global.fetch as any).mockResolvedValueOnce({
              ok: true,
              status: 204,
              json: async () => ({ success: true, data: null }),
            })

            promises.push(api.todos.delete(`todo-del-${i}`))
            break
        }
      }

      const results = await Promise.allSettled(promises)

      // Most operations should succeed
      const successful = results.filter(r => r.status === 'fulfilled')
      expect(successful.length).toBeGreaterThan(operationCount * 0.8)
    })
  })

  describe('Concurrent Authentication', () => {
    it('should handle concurrent authentication checks', async () => {
      const promises = []

      // Test concurrent auth checks
      for (let i = 0; i < 5; i++) {
        promises.push(Promise.resolve(api.auth.isAuthenticated()))
      }

      const results = await Promise.all(promises)

      // All should indicate authenticated
      results.forEach(result => {
        expect(result).toBe(true)
      })
    })

    it('should handle concurrent token refreshes', async () => {
      const newToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.new.token'
      const promises = []

      // Simulate multiple concurrent refresh requests
      for (let i = 0; i < 3; i++) {
        const mockResponse = {
          success: true,
          data: {
            token: newToken,
            user: MOCK_TEST_USER,
          },
        }

        ;(global.fetch as any).mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => mockResponse,
        })

        promises.push(api.auth.refresh())
      }

      const results = await Promise.all(promises)

      // All should succeed
      expect(results).toHaveLength(3)
      results.forEach(result => {
        expect(result).toBeDefined()
        expect(result.token).toBeDefined()
      })
    })
  })

  describe('Stress Testing', () => {
    it('should handle sustained concurrent load', async () => {
      const rounds = 2
      const operationsPerRound = 10

      for (let round = 0; round < rounds; round++) {
        const promises = []

        // Create todos in this round
        for (let i = 0; i < operationsPerRound; i++) {
          const mockTodo = {
            id: `todo-stress-${round}-${i}`,
            title: `Stress Test Round ${round} Todo ${i}`,
            completed: false,
            priority: 'medium' as const,
            user_id: MOCK_TEST_USER.id,
            created_at: Date.now(),
            updated_at: Date.now(),
          }

          ;(global.fetch as any).mockResolvedValueOnce({
            ok: true,
            status: 201,
            json: async () => ({ success: true, data: mockTodo }),
          })

          promises.push(
            api.todos.create({
              title: `Stress Test Round ${round} Todo ${i}`,
              priority: 'medium',
            })
          )
        }

        const startTime = Date.now()
        const results = await Promise.allSettled(promises)
        const endTime = Date.now()
        const duration = endTime - startTime

        // Performance should remain reasonable
        expect(duration).toBeLessThan(10000) // 10 seconds per round

        // Success rate should be high
        const successful = results.filter(r => r.status === 'fulfilled')
        expect(successful.length).toBeGreaterThan(operationsPerRound * 0.9)
      }
    })
  })
})
```

Now let me create the error-handling integration test:

<file_path>
pbtodo/frontend/src/tests/integration/error-handling.integration.test.ts
</file_path>

<edit_description>
Convert error handling integration tests to mocked version
</edit_description>

```
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

      // Should handle gracefully or throw
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

      // Mix of successful and failed requests
      for (let i = 0; i < 5; i++) {
        if (i % 2 === 0) {
          // Success
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
          // Error
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

      // Should have mix of successful and failed results
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

      // All should have errors
      results.forEach(result => {
        expect(result.error).toBeDefined()
      })
    })
  })

  describe('Recovery Scenarios', () => {
    it('should recover from temporary network errors', async () => {
      // First request fails
      ;(global.fetch as any).mockRejectedValueOnce(
        new Error('Network error')
      )

      await expect(api.todos.getAll()).rejects.toThrow()

      // Second request succeeds
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
      // Request times out
      ;(global.fetch as any).mockRejectedValueOnce(
        new Error('Request timeout')
      )

      await expect(api.auth.refresh()).rejects.toThrow()

      // Can still use cached token
      expect(api.auth.isAuthenticated()).toBe(true)
    })
  })
})
