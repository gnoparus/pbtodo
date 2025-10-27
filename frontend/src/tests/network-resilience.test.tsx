import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TodoProvider, useTodos } from '../contexts/TodoContext'
import { AuthProvider, useAuth } from '../contexts/AuthContext'
import { api, Todo } from '../services/pocketbase'

// Mock the PocketBase API
vi.mock('../services/pocketbase', () => ({
  api: {
    auth: {
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      refresh: vi.fn(),
      getCurrentUser: vi.fn(),
      isAuthenticated: vi.fn(),
    },
    todos: {
      getAll: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      toggleComplete: vi.fn(),
      delete: vi.fn(),
    },
  },
}))

// Test component for TodoContext
const TodoTestComponent = () => {
  const { todos, loading, error, loadTodos, createTodo, deleteTodo, clearError } = useTodos()

  const handleLoadTodos = async () => {
    try {
      await loadTodos()
    } catch {
      // Error handled by context
    }
  }

  const handleCreateTodo = async () => {
    try {
      await createTodo('Test Todo', 'Description', 'medium')
    } catch {
      // Error handled by context
    }
  }

  const handleDeleteTodo = async (id: string) => {
    try {
      await deleteTodo(id)
    } catch {
      // Error handled by context
    }
  }

  return (
    <div>
      <div data-testid="loading">{loading ? 'Loading' : 'Not Loading'}</div>
      <div data-testid="error">{error || 'No Error'}</div>
      <div data-testid="todo-count">{todos.length}</div>
      <button onClick={handleLoadTodos}>Load Todos</button>
      <button onClick={handleCreateTodo}>Create Todo</button>
      <button onClick={clearError}>Clear Error</button>
      <ul data-testid="todo-list">
        {todos.map(todo => (
          <li key={todo.id} data-testid={`todo-${todo.id}`}>
            <span>{todo.title}</span>
            <button onClick={() => handleDeleteTodo(todo.id)} data-testid={`delete-${todo.id}`}>
              Delete
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}

// Test component for AuthContext
const AuthTestComponent = () => {
  const { user, loading, error, login, register, logout, clearError } = useAuth()

  const handleLogin = async () => {
    try {
      await login('test@example.com', 'password123')
    } catch {
      // Error handled by context
    }
  }

  const handleRegister = async () => {
    try {
      await register('new@example.com', 'password123', 'New User')
    } catch {
      // Error handled by context
    }
  }

  return (
    <div>
      <div data-testid="loading">{loading ? 'Loading' : 'Not Loading'}</div>
      <div data-testid="error">{error || 'No Error'}</div>
      <div data-testid="user">{user ? user.name : 'No User'}</div>
      <button onClick={handleLogin}>Login</button>
      <button onClick={handleRegister}>Register</button>
      <button onClick={logout}>Logout</button>
      <button onClick={clearError}>Clear Error</button>
    </div>
  )
}

const renderTodoProvider = () => {
  return render(
    <TodoProvider>
      <TodoTestComponent />
    </TodoProvider>
  )
}

const renderAuthProvider = () => {
  return render(
    <AuthProvider>
      <AuthTestComponent />
    </AuthProvider>
  )
}

const createMockTodo = (overrides: Partial<Todo> = {}): Todo => ({
  id: Math.random().toString(36).substring(7),
  title: 'Test Todo',
  description: 'Test Description',
  completed: false,
  priority: 'medium',
  user: 'user123',
  created: new Date().toISOString(),
  updated: new Date().toISOString(),
  ...overrides,
})

describe('Network Resilience - Current Behavior', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(api.todos.getAll).mockResolvedValue([])
    vi.mocked(api.auth.getCurrentUser).mockReturnValue(null)
    vi.mocked(api.auth.isAuthenticated).mockReturnValue(false)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Timeout Handling - Current Behavior', () => {
    it('should handle extremely slow API responses', async () => {
      const user = userEvent.setup()

      // Simulate 10 second delay
      vi.mocked(api.todos.getAll).mockImplementation(() =>
        new Promise(resolve =>
          setTimeout(() => resolve([createMockTodo()]), 10000)
        )
      )

      renderTodoProvider()

      await user.click(screen.getByText('Load Todos'))

      // Should show loading state
      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('Loading')
      })

      // Note: Current implementation does NOT have timeout - will wait indefinitely
      // This test documents current behavior
      expect(screen.getByTestId('loading')).toHaveTextContent('Loading')
    }, 15000)

    it('should handle API calls that never resolve', async () => {
      const user = userEvent.setup()

      // Promise that never resolves
      vi.mocked(api.todos.create).mockImplementation(() => new Promise(() => {}))

      renderTodoProvider()

      await user.click(screen.getByText('Create Todo'))

      // Should show loading indefinitely (no timeout)
      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('Loading')
      })

      // Wait a bit to verify it stays loading
      await new Promise(resolve => setTimeout(resolve, 100))
      expect(screen.getByTestId('loading')).toHaveTextContent('Loading')
    })
  })

  describe('Network Error Handling - Current Behavior', () => {
    it('should handle network connection errors', async () => {
      const user = userEvent.setup()

      vi.mocked(api.todos.getAll).mockRejectedValue(new Error('Network request failed'))

      renderTodoProvider()

      await user.click(screen.getByText('Load Todos'))

      await waitFor(() => {
        expect(screen.getByTestId('error')).toHaveTextContent('Network request failed')
      })

      // No automatic retry - error persists
      await new Promise(resolve => setTimeout(resolve, 100))
      expect(screen.getByTestId('error')).toHaveTextContent('Network request failed')
    })

    it('should handle DNS resolution failures', async () => {
      const user = userEvent.setup()

      vi.mocked(api.auth.login).mockRejectedValue(
        new Error('getaddrinfo ENOTFOUND')
      )

      renderAuthProvider()

      await user.click(screen.getByText('Login'))

      await waitFor(() => {
        expect(screen.getByTestId('error')).toHaveTextContent('getaddrinfo ENOTFOUND')
      })
    })

    it('should handle connection refused errors', async () => {
      const user = userEvent.setup()

      vi.mocked(api.todos.create).mockRejectedValue(
        new Error('connect ECONNREFUSED 127.0.0.1:8090')
      )

      renderTodoProvider()

      await user.click(screen.getByText('Create Todo'))

      await waitFor(() => {
        expect(screen.getByTestId('error')).toHaveTextContent('connect ECONNREFUSED')
      })
    })

    it('should handle connection timeout errors', async () => {
      const user = userEvent.setup()

      vi.mocked(api.todos.getAll).mockRejectedValue(
        new Error('ETIMEDOUT')
      )

      renderTodoProvider()

      await user.click(screen.getByText('Load Todos'))

      await waitFor(() => {
        expect(screen.getByTestId('error')).toHaveTextContent('ETIMEDOUT')
      })
    })
  })

  describe('HTTP Error Status Codes - Current Behavior', () => {
    it('should handle 429 Too Many Requests', async () => {
      const user = userEvent.setup()

      const error = new Error('Rate limit exceeded')
      ;(error as any).status = 429
      vi.mocked(api.todos.create).mockRejectedValue(error)

      renderTodoProvider()

      await user.click(screen.getByText('Create Todo'))

      await waitFor(() => {
        expect(screen.getByTestId('error')).toHaveTextContent('Rate limit exceeded')
      })

      // No automatic retry with backoff
      expect(api.todos.create).toHaveBeenCalledTimes(1)
    })

    it('should handle 503 Service Unavailable', async () => {
      const user = userEvent.setup()

      const error = new Error('Service temporarily unavailable')
      ;(error as any).status = 503
      vi.mocked(api.todos.getAll).mockRejectedValue(error)

      renderTodoProvider()

      await user.click(screen.getByText('Load Todos'))

      await waitFor(() => {
        expect(screen.getByTestId('error')).toHaveTextContent('Service temporarily unavailable')
      })

      // No automatic retry
      expect(api.todos.getAll).toHaveBeenCalledTimes(1)
    })

    it('should handle 500 Internal Server Error', async () => {
      const user = userEvent.setup()

      const error = new Error('Internal server error')
      ;(error as any).status = 500
      vi.mocked(api.auth.login).mockRejectedValue(error)

      renderAuthProvider()

      await user.click(screen.getByText('Login'))

      await waitFor(() => {
        expect(screen.getByTestId('error')).toHaveTextContent('Internal server error')
      })
    })

    it('should handle 502 Bad Gateway', async () => {
      const user = userEvent.setup()

      const error = new Error('Bad gateway')
      ;(error as any).status = 502
      vi.mocked(api.todos.getAll).mockRejectedValue(error)

      renderTodoProvider()

      await user.click(screen.getByText('Load Todos'))

      await waitFor(() => {
        expect(screen.getByTestId('error')).toHaveTextContent('Bad gateway')
      })
    })

    it('should handle 504 Gateway Timeout', async () => {
      const user = userEvent.setup()

      const error = new Error('Gateway timeout')
      ;(error as any).status = 504
      vi.mocked(api.todos.create).mockRejectedValue(error)

      renderTodoProvider()

      await user.click(screen.getByText('Create Todo'))

      await waitFor(() => {
        expect(screen.getByTestId('error')).toHaveTextContent('Gateway timeout')
      })
    })
  })

  describe('Intermittent Network Issues - Current Behavior', () => {
    it('should handle flaky network (fails then succeeds)', async () => {
      const user = userEvent.setup()
      let callCount = 0

      vi.mocked(api.todos.getAll).mockImplementation(() => {
        callCount++
        if (callCount === 1) {
          return Promise.reject(new Error('Network error'))
        }
        return Promise.resolve([createMockTodo()])
      })

      renderTodoProvider()

      // First attempt fails
      await user.click(screen.getByText('Load Todos'))
      await waitFor(() => {
        expect(screen.getByTestId('error')).toHaveTextContent('Network error')
      })

      // User must manually retry
      await user.click(screen.getByText('Clear Error'))
      await user.click(screen.getByText('Load Todos'))

      await waitFor(() => {
        expect(screen.getByTestId('todo-count')).toHaveTextContent('1')
        expect(screen.getByTestId('error')).toHaveTextContent('No Error')
      })

      // Verify no automatic retry - user triggered both calls
      expect(api.todos.getAll).toHaveBeenCalledTimes(2)
    })

    it('should handle partial data transfer failures', async () => {
      const user = userEvent.setup()

      vi.mocked(api.todos.getAll).mockRejectedValue(
        new Error('Unexpected end of JSON input')
      )

      renderTodoProvider()

      await user.click(screen.getByText('Load Todos'))

      await waitFor(() => {
        expect(screen.getByTestId('error')).toHaveTextContent('Unexpected end of JSON input')
      })
    })
  })

  describe('Concurrent Request Handling - Current Behavior', () => {
    it('should handle multiple simultaneous requests', async () => {
      const user = userEvent.setup()
      const todos = [
        createMockTodo({ id: 'todo-1' }),
        createMockTodo({ id: 'todo-2' }),
        createMockTodo({ id: 'todo-3' }),
      ]

      vi.mocked(api.todos.getAll).mockResolvedValue(todos)
      vi.mocked(api.todos.delete).mockResolvedValue(true)

      renderTodoProvider()

      await user.click(screen.getByText('Load Todos'))
      await waitFor(() => {
        expect(screen.getByTestId('todo-count')).toHaveTextContent('3')
      })

      // Trigger multiple deletes rapidly
      await user.click(screen.getByTestId('delete-todo-1'))
      await user.click(screen.getByTestId('delete-todo-2'))
      await user.click(screen.getByTestId('delete-todo-3'))

      // All requests should be sent (no queuing)
      await waitFor(() => {
        expect(api.todos.delete).toHaveBeenCalledTimes(3)
      })
    })

    it('should handle request racing correctly', async () => {
      const user = userEvent.setup()

      vi.mocked(api.todos.create)
        .mockImplementationOnce(() =>
          new Promise(resolve =>
            setTimeout(() => resolve(createMockTodo({ id: 'todo-1' })), 200)
          )
        )
        .mockImplementationOnce(() =>
          new Promise(resolve =>
            setTimeout(() => resolve(createMockTodo({ id: 'todo-2' })), 50)
          )
        )

      renderTodoProvider()

      // Fire two creates quickly
      await user.click(screen.getByText('Create Todo'))
      await user.click(screen.getByText('Create Todo'))

      // Wait for both to complete (second finishes first due to shorter delay)
      await waitFor(() => {
        expect(screen.getByTestId('todo-count')).toHaveTextContent('2')
      }, { timeout: 500 })

      // Both todos should be in the list
      expect(screen.getByTestId('todo-todo-1')).toBeInTheDocument()
      expect(screen.getByTestId('todo-todo-2')).toBeInTheDocument()
    })
  })

  describe('Error Recovery - Current Behavior', () => {
    it('should allow user to clear error and retry', async () => {
      const user = userEvent.setup()

      vi.mocked(api.todos.getAll)
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce([createMockTodo()])

      renderTodoProvider()

      // First attempt fails
      await user.click(screen.getByText('Load Todos'))
      await waitFor(() => {
        expect(screen.getByTestId('error')).toHaveTextContent('Network error')
      })

      // User clears error
      await user.click(screen.getByText('Clear Error'))
      expect(screen.getByTestId('error')).toHaveTextContent('No Error')

      // User retries manually
      await user.click(screen.getByText('Load Todos'))
      await waitFor(() => {
        expect(screen.getByTestId('todo-count')).toHaveTextContent('1')
      })
    })

    it('should persist error state until explicitly cleared', async () => {
      const user = userEvent.setup()

      vi.mocked(api.todos.create).mockRejectedValue(new Error('Create failed'))

      renderTodoProvider()

      await user.click(screen.getByText('Create Todo'))
      await waitFor(() => {
        expect(screen.getByTestId('error')).toHaveTextContent('Create failed')
      })

      // Error persists even after waiting
      await new Promise(resolve => setTimeout(resolve, 100))
      expect(screen.getByTestId('error')).toHaveTextContent('Create failed')

      // Only cleared when user explicitly clears it
      await user.click(screen.getByText('Clear Error'))
      expect(screen.getByTestId('error')).toHaveTextContent('No Error')
    })
  })

  describe('Large Data Handling - Current Behavior', () => {
    it('should handle large response payloads', async () => {
      const user = userEvent.setup()

      // Generate 1000 todos
      const largeTodoList = Array.from({ length: 1000 }, (_, i) =>
        createMockTodo({ id: `todo-${i}`, title: `Todo ${i}` })
      )

      vi.mocked(api.todos.getAll).mockResolvedValue(largeTodoList)

      renderTodoProvider()

      await user.click(screen.getByText('Load Todos'))

      await waitFor(() => {
        expect(screen.getByTestId('todo-count')).toHaveTextContent('1000')
      })
    })

    it('should handle empty response payloads', async () => {
      const user = userEvent.setup()

      vi.mocked(api.todos.getAll).mockResolvedValue([])

      renderTodoProvider()

      await user.click(screen.getByText('Load Todos'))

      await waitFor(() => {
        expect(screen.getByTestId('todo-count')).toHaveTextContent('0')
        expect(screen.getByTestId('error')).toHaveTextContent('No Error')
      })
    })
  })
})

describe('Network Resilience - Desired Future Behavior (TODO)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  // NOTE: These tests are SKIPPED because automatic retry/timeout is not implemented.
  // They serve as specification for desired behavior.

  describe.skip('Automatic Retry with Exponential Backoff (TODO)', () => {
    it('should retry failed requests automatically', async () => {
      const user = userEvent.setup()
      let attempts = 0

      vi.mocked(api.todos.getAll).mockImplementation(() => {
        attempts++
        if (attempts < 3) {
          return Promise.reject(new Error('Network error'))
        }
        return Promise.resolve([createMockTodo()])
      })

      renderTodoProvider()

      await user.click(screen.getByText('Load Todos'))

      // Should retry automatically and eventually succeed
      await waitFor(() => {
        expect(screen.getByTestId('todo-count')).toHaveTextContent('1')
      }, { timeout: 5000 })

      // Should have retried 3 times
      expect(api.todos.getAll).toHaveBeenCalledTimes(3)
    })

    it('should use exponential backoff between retries', async () => {
      const user = userEvent.setup()
      const retryTimes: number[] = []

      vi.mocked(api.todos.create).mockImplementation(() => {
        retryTimes.push(Date.now())
        if (retryTimes.length < 4) {
          return Promise.reject(new Error('Network error'))
        }
        return Promise.resolve(createMockTodo())
      })

      renderTodoProvider()

      await user.click(screen.getByText('Create Todo'))

      await waitFor(() => {
        expect(screen.getByTestId('todo-count')).toHaveTextContent('1')
      }, { timeout: 10000 })

      // Verify exponential backoff: ~1s, ~2s, ~4s between retries
      const delays = retryTimes.slice(1).map((time, i) => time - retryTimes[i])
      expect(delays[1]).toBeGreaterThan(delays[0] * 1.5)
      expect(delays[2]).toBeGreaterThan(delays[1] * 1.5)
    })

    it('should give up after maximum retry attempts', async () => {
      const user = userEvent.setup()

      vi.mocked(api.todos.getAll).mockRejectedValue(new Error('Persistent error'))

      renderTodoProvider()

      await user.click(screen.getByText('Load Todos'))

      // Should retry max 3 times then show error
      await waitFor(() => {
        expect(screen.getByTestId('error')).toHaveTextContent('Persistent error')
      }, { timeout: 10000 })

      expect(api.todos.getAll).toHaveBeenCalledTimes(4) // Initial + 3 retries
    })

    it('should only retry on retriable errors (5xx, network)', async () => {
      const user = userEvent.setup()

      // 400 Bad Request - should NOT retry
      const error = new Error('Validation failed')
      ;(error as any).status = 400
      vi.mocked(api.todos.create).mockRejectedValue(error)

      renderTodoProvider()

      await user.click(screen.getByText('Create Todo'))

      await waitFor(() => {
        expect(screen.getByTestId('error')).toHaveTextContent('Validation failed')
      })

      // Should NOT retry for 4xx errors
      expect(api.todos.create).toHaveBeenCalledTimes(1)
    })
  })

  describe.skip('Request Timeout Implementation (TODO)', () => {
    it('should timeout requests after configured duration', async () => {
      const user = userEvent.setup()

      vi.mocked(api.todos.getAll).mockImplementation(() =>
        new Promise(resolve => setTimeout(() => resolve([]), 35000)) // 35 seconds
      )

      renderTodoProvider()

      await user.click(screen.getByText('Load Todos'))

      // Should timeout after 30 seconds
      await waitFor(() => {
        expect(screen.getByTestId('error')).toHaveTextContent(/timeout/i)
      }, { timeout: 35000 })
    })

    it('should have different timeouts for different operations', async () => {
      const user = userEvent.setup()

      // Read operations: 10s timeout
      // Write operations: 30s timeout

      vi.mocked(api.todos.getAll).mockImplementation(() =>
        new Promise(resolve => setTimeout(() => resolve([]), 15000))
      )

      renderTodoProvider()

      await user.click(screen.getByText('Load Todos'))

      // Should timeout after 10s for read
      await waitFor(() => {
        expect(screen.getByTestId('error')).toHaveTextContent(/timeout/i)
      }, { timeout: 12000 })
    })
  })

  describe.skip('Request Cancellation (TODO)', () => {
    it('should cancel in-flight requests on component unmount', async () => {
      const user = userEvent.setup()

      let cancelled = false
      vi.mocked(api.todos.getAll).mockImplementation(() =>
        new Promise((resolve, reject) => {
          const timeout = setTimeout(() => resolve([createMockTodo()]), 1000)
          // AbortSignal would trigger this
          return () => {
            cancelled = true
            clearTimeout(timeout)
            reject(new Error('Request cancelled'))
          }
        })
      )

      const { unmount } = renderTodoProvider()

      await user.click(screen.getByText('Load Todos'))

      // Unmount before request completes
      await new Promise(resolve => setTimeout(resolve, 100))
      unmount()

      // Verify cancellation
      await new Promise(resolve => setTimeout(resolve, 100))
      expect(cancelled).toBe(true)
    })

    it('should cancel previous request when new request is made', async () => {
      const user = userEvent.setup()
      let firstRequestCancelled = false

      vi.mocked(api.todos.getAll)
        .mockImplementationOnce(() =>
          new Promise((resolve, reject) => {
            setTimeout(() => {
              if (!firstRequestCancelled) {
                resolve([createMockTodo({ id: 'first' })])
              } else {
                reject(new Error('Cancelled'))
              }
            }, 500)
          })
        )
        .mockImplementationOnce(() =>
          Promise.resolve([createMockTodo({ id: 'second' })])
        )

      renderTodoProvider()

      // Start first request
      await user.click(screen.getByText('Load Todos'))

      // Start second request before first completes
      await new Promise(resolve => setTimeout(resolve, 100))
      firstRequestCancelled = true
      await user.click(screen.getByText('Load Todos'))

      // Should only show second request result
      await waitFor(() => {
        expect(screen.getByTestId('todo-second')).toBeInTheDocument()
        expect(screen.queryByTestId('todo-first')).not.toBeInTheDocument()
      })
    })
  })

  describe.skip('Rate Limiting Handling (TODO)', () => {
    it('should respect Retry-After header on 429 responses', async () => {
      const user = userEvent.setup()

      const error = new Error('Rate limit exceeded')
      ;(error as any).status = 429
      ;(error as any).headers = { 'Retry-After': '60' }

      vi.mocked(api.todos.create)
        .mockRejectedValueOnce(error)
        .mockResolvedValueOnce(createMockTodo())

      renderTodoProvider()

      await user.click(screen.getByText('Create Todo'))

      // Should wait 60 seconds before retry
      // (In test, we'd mock timers)
      await waitFor(() => {
        expect(screen.getByTestId('todo-count')).toHaveTextContent('1')
      }, { timeout: 65000 })
    })

    it('should implement client-side rate limiting', async () => {
      const user = userEvent.setup()

      vi.mocked(api.todos.create).mockResolvedValue(createMockTodo())

      renderTodoProvider()

      // Rapid fire 10 requests
      for (let i = 0; i < 10; i++) {
        await user.click(screen.getByText('Create Todo'))
      }

      // Should throttle to max 5 requests per second
      await new Promise(resolve => setTimeout(resolve, 1000))
      expect(api.todos.create).toHaveBeenCalledTimes(5)

      // Rest should be queued and sent after rate limit window
      await waitFor(() => {
        expect(api.todos.create).toHaveBeenCalledTimes(10)
      }, { timeout: 3000 })
    })
  })

  describe.skip('Offline Detection and Queue (TODO)', () => {
    it('should detect when browser goes offline', async () => {
      const user = userEvent.setup()

      // Simulate offline event
      window.dispatchEvent(new Event('offline'))

      renderTodoProvider()

      await user.click(screen.getByText('Create Todo'))

      // Should show offline message instead of trying request
      await waitFor(() => {
        expect(screen.getByTestId('error')).toHaveTextContent(/offline/i)
      })

      expect(api.todos.create).not.toHaveBeenCalled()
    })

    it('should queue operations when offline and sync when back online', async () => {
      const user = userEvent.setup()

      vi.mocked(api.todos.create).mockResolvedValue(createMockTodo())

      renderTodoProvider()

      // Go offline
      window.dispatchEvent(new Event('offline'))

      // Try to create todos while offline
      await user.click(screen.getByText('Create Todo'))
      await user.click(screen.getByText('Create Todo'))

      // Should be queued, not sent
      expect(api.todos.create).not.toHaveBeenCalled()

      // Go back online
      window.dispatchEvent(new Event('online'))

      // Should sync queued operations
      await waitFor(() => {
        expect(api.todos.create).toHaveBeenCalledTimes(2)
      })
    })
  })
})

describe('Network Resilience - Edge Cases', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(api.todos.getAll).mockResolvedValue([])
    vi.mocked(api.auth.getCurrentUser).mockReturnValue(null)
    vi.mocked(api.auth.isAuthenticated).mockReturnValue(false)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should handle AbortError from cancelled requests', async () => {
    const user = userEvent.setup()

    const abortError = new Error('The operation was aborted')
    abortError.name = 'AbortError'
    vi.mocked(api.todos.getAll).mockRejectedValue(abortError)

    renderTodoProvider()

    await user.click(screen.getByText('Load Todos'))

    await waitFor(() => {
      expect(screen.getByTestId('error')).toHaveTextContent('The operation was aborted')
    })
  })

  it('should handle malformed JSON responses', async () => {
    const user = userEvent.setup()

    vi.mocked(api.todos.getAll).mockRejectedValue(
      new SyntaxError('Unexpected token < in JSON at position 0')
    )

    renderTodoProvider()

    await user.click(screen.getByText('Load Todos'))

    await waitFor(() => {
      expect(screen.getByTestId('error')).toHaveTextContent('Unexpected token')
    })
  })

  it('should handle CORS errors', async () => {
    const user = userEvent.setup()

    vi.mocked(api.auth.login).mockRejectedValue(
      new Error('CORS policy: No \'Access-Control-Allow-Origin\' header')
    )

    renderAuthProvider()

    await user.click(screen.getByText('Login'))

    await waitFor(() => {
      expect(screen.getByTestId('error')).toHaveTextContent('CORS policy')
    })
  })

  it('should handle SSL/TLS certificate errors', async () => {
    const user = userEvent.setup()

    vi.mocked(api.todos.getAll).mockRejectedValue(
      new Error('certificate has expired')
    )

    renderTodoProvider()

    await user.click(screen.getByText('Load Todos'))

    await waitFor(() => {
      expect(screen.getByTestId('error')).toHaveTextContent('certificate has expired')
    })
  })

  it('should handle unexpected server responses', async () => {
    const user = userEvent.setup()

    // Server returns HTML instead of JSON
    vi.mocked(api.todos.getAll).mockRejectedValue(
      new Error('Unexpected token < (HTML page)')
    )

    renderTodoProvider()

    await user.click(screen.getByText('Load Todos'))

    await waitFor(() => {
      expect(screen.getByTestId('error')).toHaveTextContent('Unexpected token')
    })
  })
})
