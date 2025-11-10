import { describe, it, expect, beforeEach, vi } from 'vitest'
import { api } from '../../services/api'
import { TEST_CONFIG, MOCK_TEST_USER, MOCK_AUTH_TOKEN } from './setup'

// Mock the fetch function
global.fetch = vi.fn()

describe('Todos CRUD Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    localStorage.setItem('authToken', MOCK_AUTH_TOKEN)
  })

  describe('Create Todo', () => {
    it('should create a todo successfully', async () => {
      const todoData = {
        title: 'Test Todo',
        description: 'Test Description',
        completed: false,
        priority: 'medium' as const,
      }

      const mockTodo = {
        id: 'todo_123',
        ...todoData,
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

      const result = await api.todos.create(todoData)

      expect(result).toBeDefined()
      expect(result.id).toBe(mockTodo.id)
      expect(result.title).toBe(todoData.title)
      expect(result.description).toBe(todoData.description)
      expect(result.completed).toBe(false)
      expect(result.priority).toBe('medium')
    })

    it('should reject creating todo without title', async () => {
      const mockResponse = {
        success: false,
        error: 'Title is required',
      }

      ;(global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => mockResponse,
      })

      await expect(api.todos.create({ title: '' })).rejects.toThrow()
    })

    it('should handle API errors gracefully', async () => {
      ;(global.fetch as any).mockRejectedValueOnce(
        new Error('Network request failed')
      )

      await expect(
        api.todos.create({ title: 'Test Todo' })
      ).rejects.toThrow()
    })
  })

  describe('Read Todos', () => {
    it('should fetch all todos', async () => {
      const mockTodos = [
        {
          id: 'todo_1',
          title: 'Todo 1',
          description: 'Description 1',
          completed: false,
          priority: 'high' as const,
          user_id: MOCK_TEST_USER.id,
          created_at: Date.now(),
          updated_at: Date.now(),
        },
        {
          id: 'todo_2',
          title: 'Todo 2',
          description: 'Description 2',
          completed: true,
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

      const result = await api.todos.getAll()

      expect(result).toBeDefined()
      expect(Array.isArray(result)).toBe(true)
      expect(result.length).toBe(2)
      expect(result[0].title).toBe('Todo 1')
      expect(result[1].completed).toBe(true)
    })

    it('should fetch single todo by ID', async () => {
      const mockTodo = {
        id: 'todo_123',
        title: 'Single Todo',
        description: 'Test Description',
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

      const result = await api.todos.getById('todo_123')

      expect(result).toBeDefined()
      expect(result.id).toBe('todo_123')
      expect(result.title).toBe('Single Todo')
    })

    it('should handle 404 for non-existent todo', async () => {
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
  })

  describe('Update Todo', () => {
    it('should update a todo successfully', async () => {
      const updatedData = {
        title: 'Updated Title',
        completed: true,
      }

      const mockTodo = {
        id: 'todo_123',
        title: 'Updated Title',
        description: 'Test Description',
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

      const result = await api.todos.update('todo_123', updatedData)

      expect(result).toBeDefined()
      expect(result.title).toBe('Updated Title')
      expect(result.completed).toBe(true)
    })

    it('should toggle todo completion', async () => {
      const mockTodo = {
        id: 'todo_123',
        title: 'Test Todo',
        description: 'Test Description',
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

      const result = await api.todos.toggleComplete('todo_123')

      expect(result).toBeDefined()
      expect(result.completed).toBe(true)
    })

    it('should reject update with invalid data', async () => {
      const mockResponse = {
        success: false,
        error: 'Invalid todo data',
      }

      ;(global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => mockResponse,
      })

      await expect(
        api.todos.update('todo_123', { title: '' })
      ).rejects.toThrow()
    })
  })

  describe('Delete Todo', () => {
    it('should delete a todo successfully', async () => {
      const mockResponse = {
        success: true,
        data: null,
      }

      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 204,
        json: async () => mockResponse,
      })

      const result = await api.todos.delete('todo_123')

      expect(result).toBe(true)
    })

    it('should handle 404 when deleting non-existent todo', async () => {
      const mockResponse = {
        success: false,
        error: 'Todo not found',
      }

      ;(global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => mockResponse,
      })

      await expect(api.todos.delete('non-existent')).rejects.toThrow()
    })

    it('should handle authorization errors', async () => {
      const mockResponse = {
        success: false,
        error: 'Not authorized to delete this todo',
      }

      ;(global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 403,
        json: async () => mockResponse,
      })

      await expect(api.todos.delete('someone-elses-todo')).rejects.toThrow()
    })
  })

  describe('Todo Validation', () => {
    it('should validate title is required', async () => {
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
        api.todos.create({ title: '', priority: 'medium' })
      ).rejects.toThrow()
    })

    it('should validate priority value', async () => {
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
})
