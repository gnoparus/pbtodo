import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { api } from '../../services/pocketbase'
import { userManager } from './setup'

describe('API Service Integration Tests', () => {
  let createdTodoIds: string[] = []

  beforeEach(async () => {
    await userManager.loginTestUser()
  })

  afterEach(async () => {
    // Clean up created todos
    for (const id of createdTodoIds) {
      try {
        await api.todos.delete(id)
      } catch (error) {
        console.warn('Failed to cleanup todo:', id, error)
      }
    }
    createdTodoIds = []
  })

  describe('Auth API', () => {
    it('should get current user', () => {
      const currentUser = api.auth.getCurrentUser()
      expect(currentUser).toBeDefined()
      expect(currentUser?.email).toBe('test@example.com')
    })

    it('should check authentication status', () => {
      const isAuthenticated = api.auth.isAuthenticated()
      expect(isAuthenticated).toBe(true)
    })

    it('should logout successfully', () => {
      api.auth.logout()
      expect(api.auth.isAuthenticated()).toBe(false)
      expect(api.auth.getCurrentUser()).toBeNull()

      // Login again for other tests
      return userManager.loginTestUser()
    })

    it('should refresh authentication token', async () => {
      const result = await api.auth.refresh()
      expect(result).toBeDefined()
      expect(result.record).toBeDefined()
      expect(result.token).toBeDefined()
      expect(api.auth.isAuthenticated()).toBe(true)
    })

    it('should request password reset', async () => {
      const promise = api.auth.requestPasswordReset('test@example.com')
      await expect(promise).resolves.toBeDefined()
    })
  })

  describe('Todos API', () => {
    it('should create todo via API service', async () => {
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
      expect(todo.user).toBeDefined()

      createdTodoIds.push(todo.id)
    })

    it('should get all todos via API service', async () => {
      // Create a test todo
      const todo = await api.todos.create({
        title: 'API Test Todo for GetAll',
        completed: false,
        priority: 'low',
      })
      createdTodoIds.push(todo.id)

      // Get all todos
      const todos = await api.todos.getAll()
      expect(todos).toBeInstanceOf(Array)

      const createdTodo = todos.find(t => t.id === todo.id)
      expect(createdTodo).toBeDefined()
      expect(createdTodo?.title).toBe('API Test Todo for GetAll')
    })

    it('should get todo by id via API service', async () => {
      const todo = await api.todos.create({
        title: 'API Test Todo for GetById',
        description: 'Test description',
        completed: true,
        priority: 'high',
      })
      createdTodoIds.push(todo.id)

      const retrievedTodo = await api.todos.getById(todo.id)

      expect(retrievedTodo.id).toBe(todo.id)
      expect(retrievedTodo.title).toBe('API Test Todo for GetById')
      expect(retrievedTodo.description).toBe('Test description')
      expect(retrievedTodo.completed).toBe(true)
      expect(retrievedTodo.priority).toBe('high')
    })

    it('should update todo via API service', async () => {
      const todo = await api.todos.create({
        title: 'Original Title',
        description: 'Original description',
        completed: false,
        priority: 'low',
      })
      createdTodoIds.push(todo.id)

      const updatedTodo = await api.todos.update(todo.id, {
        title: 'Updated Title',
        description: 'Updated description',
        completed: true,
      })

      expect(updatedTodo.id).toBe(todo.id)
      expect(updatedTodo.title).toBe('Updated Title')
      expect(updatedTodo.description).toBe('Updated description')
      expect(updatedTodo.completed).toBe(true)
      expect(updatedTodo.priority).toBe('low') // Should remain unchanged
    })

    it('should toggle todo completion via API service', async () => {
      const todo = await api.todos.create({
        title: 'Toggle Test',
        completed: false,
        priority: 'medium',
      })
      createdTodoIds.push(todo.id)

      // Toggle to true
      const updatedTodo1 = await api.todos.toggleComplete(todo.id, true)
      expect(updatedTodo1.completed).toBe(true)

      // Toggle to false
      const updatedTodo2 = await api.todos.toggleComplete(todo.id, false)
      expect(updatedTodo2.completed).toBe(false)
    })

    it('should delete todo via API service', async () => {
      const todo = await api.todos.create({
        title: 'Todo to Delete',
        completed: false,
        priority: 'low',
      })

      // Delete todo
      const success = await api.todos.delete(todo.id)
      expect(success).toBe(true)

      // Verify todo is deleted
      const promise = api.todos.getById(todo.id)
      await expect(promise).rejects.toThrow()
    })

    it('should handle creating todos with different priorities', async () => {
      const priorities: Array<'low' | 'medium' | 'high'> = ['low', 'medium', 'high']
      const createdTodos = []

      for (const priority of priorities) {
        const todo = await api.todos.create({
          title: `Todo with ${priority} priority`,
          priority,
          completed: false,
        })
        createdTodos.push(todo)
        createdTodoIds.push(todo.id)
      }

      // Verify all todos were created with correct priorities
      const todos = await api.todos.getAll()
      for (const createdTodo of createdTodos) {
        const foundTodo = todos.find(t => t.id === createdTodo.id)
        expect(foundTodo).toBeDefined()
        expect(foundTodo?.priority).toBe(createdTodo.priority)
      }
    })

    it('should handle todos with optional description', async () => {
      // Create todo without description
      const todoWithoutDesc = await api.todos.create({
        title: 'Todo without description',
        completed: false,
        priority: 'low',
      })
      createdTodoIds.push(todoWithoutDesc.id)
      expect(todoWithoutDesc.description).toBeUndefined()

      // Create todo with description
      const todoWithDesc = await api.todos.create({
        title: 'Todo with description',
        description: 'This is a description',
        completed: false,
        priority: 'medium',
      })
      createdTodoIds.push(todoWithDesc.id)
      expect(todoWithDesc.description).toBe('This is a description')
    })
  })
})
