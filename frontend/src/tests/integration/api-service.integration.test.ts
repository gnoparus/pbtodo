import { describe, it, expect, beforeEach, vi } from 'vitest'
import { api } from '../../services/api'
import { TEST_CONFIG, MOCK_TEST_USER, MOCK_AUTH_TOKEN } from './setup'

// Mock the fetch function
global.fetch = vi.fn()

describe('API Service Integration Tests', () => {
  let createdTodoIds: string[] = []

  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    localStorage.setItem('authToken', MOCK_AUTH_TOKEN)
    api.reloadToken()
    createdTodoIds = []
  })

  describe('Auth API', () => {
    it('should get current user', () => {
      const currentUser = api.auth.getCurrentUser()
      expect(currentUser).toBeDefined()
      expect(currentUser?.id).toBeDefined()
    })

    it('should check authentication status', () => {
      const isAuthenticated = api.auth.isAuthenticated()
      expect(isAuthenticated).toBe(true)
    })

    it('should logout successfully', () => {
      api.auth.logout()
      expect(api.auth.isAuthenticated()).toBe(false)
      expect(api.auth.getCurrentUser()).toBeNull()
    })

    it('should refresh authentication token', async () => {
      const newToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.new.token'
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

      const result = await api.auth.refresh()
      expect(result).toBeDefined()
      expect(result.token).toBe(newToken)
      expect(api.auth.isAuthenticated()).toBe(true)
    })

    it('should request password reset', async () => {
      const mockResponse = {
        success: true,
        data: null,
      }

      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockResponse,
      })

      const promise = api.auth.requestPasswordReset('test@example.com')
      await expect(promise).resolves.toBeDefined()
    })
  })

  describe('Todos API', () => {
    it('should create todo via API service', async () => {
      const mockTodo = {
        id: 'todo-new',
        title: 'API Test Todo',
        description: 'Created via API service',
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

      const todo = await api.todos.create({
        title: 'API Test Todo',
        description: 'Created via API service',
        completed: false,
        priority: 'medium',
      })

      expect(todo).toBeDefined()
      expect(todo.title).toBe('API Test Todo')
      expect(todo.description).toBe('Created via API service')
      expect(todo.completed).toBe(false)
      expect(todo.priority).toBe('medium')

      createdTodoIds.push(todo.id)
    })

    it('should get all todos via API service', async () => {
      const mockTodos = [
        {
          id: 'todo-1',
          title: 'API Test Todo for GetAll',
          completed: false,
          priority: 'low' as const,
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

      const todos = await api.todos.getAll()
      expect(todos).toBeInstanceOf(Array)
      expect(todos.length).toBeGreaterThanOrEqual(0)
    })

    it('should get todo by id via API service', async () => {
      const mockTodo = {
        id: 'todo-123',
        title: 'API Test Todo for GetById',
        description: 'Test description',
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

      const retrievedTodo = await api.todos.getById('todo-123')

      expect(retrievedTodo.id).toBe('todo-123')
      expect(retrievedTodo.title).toBe('API Test Todo for GetById')
      expect(retrievedTodo.description).toBe('Test description')
      expect(retrievedTodo.completed).toBe(true)
      expect(retrievedTodo.priority).toBe('high')
    })

    it('should update todo via API service', async () => {
      const mockTodo = {
        id: 'todo-456',
        title: 'Updated Title',
        description: 'Updated description',
        completed: true,
        priority: 'low' as const,
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

      const updatedTodo = await api.todos.update('todo-456', {
        title: 'Updated Title',
        description: 'Updated description',
        completed: true,
      })

      expect(updatedTodo.id).toBe('todo-456')
      expect(updatedTodo.title).toBe('Updated Title')
      expect(updatedTodo.description).toBe('Updated description')
      expect(updatedTodo.completed).toBe(true)
      expect(updatedTodo.priority).toBe('low')
    })

    it('should toggle todo completion via API service', async () => {
      const mockTodo = {
        id: 'todo-789',
        title: 'Toggle Test Todo',
        completed: true,
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

      const updatedTodo = await api.todos.toggleComplete('todo-789')
      expect(updatedTodo.completed).toBe(true)
    })

    it('should delete todo via API service', async () => {
      const mockResponse = {
        success: true,
        data: null,
      }

      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 204,
        json: async () => mockResponse,
      })

      const success = await api.todos.delete('todo-to-delete')
      expect(success).toBe(true)
    })

    it('should handle creating todos with different priorities', async () => {
      const priorities: Array<'low' | 'medium' | 'high'> = ['low', 'medium', 'high']

      for (const priority of priorities) {
        const mockTodo = {
          id: `todo-${priority}`,
          title: `Todo with ${priority} priority`,
          priority,
          completed: false,
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

        const todo = await api.todos.create({
          title: `Todo with ${priority} priority`,
          priority,
          completed: false,
        })

        expect(todo.priority).toBe(priority)
        createdTodoIds.push(todo.id)
      }
    })

    it('should handle todos with optional description', async () => {
      // Todo without description
      const mockTodoWithoutDesc = {
        id: 'todo-no-desc',
        title: 'Todo without description',
        completed: false,
        priority: 'low' as const,
        user_id: MOCK_TEST_USER.id,
        created_at: Date.now(),
        updated_at: Date.now(),
      }

      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => ({ success: true, data: mockTodoWithoutDesc }),
      })

      const todoWithoutDesc = await api.todos.create({
        title: 'Todo without description',
        completed: false,
        priority: 'low',
      })

      expect(todoWithoutDesc.description).toBeUndefined()
      createdTodoIds.push(todoWithoutDesc.id)

      // Todo with description
      const mockTodoWithDesc = {
        id: 'todo-with-desc',
        title: 'Todo with description',
        description: 'This is a description',
        completed: false,
        priority: 'medium' as const,
        user_id: MOCK_TEST_USER.id,
        created_at: Date.now(),
        updated_at: Date.now(),
      }

      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => ({ success: true, data: mockTodoWithDesc }),
      })

      const todoWithDesc = await api.todos.create({
        title: 'Todo with description',
        description: 'This is a description',
        completed: false,
        priority: 'medium',
      })

      expect(todoWithDesc.description).toBe('This is a description')
      createdTodoIds.push(todoWithDesc.id)
    })
  })
})
