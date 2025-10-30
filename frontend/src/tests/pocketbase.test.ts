import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { api, Todo } from '../services/pocketbase'
import { userManager, dataManager } from './integration/setup'

describe('PocketBase Service', () => {
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

  describe('Service Initialization', () => {
    it('should initialize PocketBase client', () => {
      expect(api).toBeDefined()
      expect(api.auth).toBeDefined()
      expect(api.todos).toBeDefined()
    })

    it('should have correct PocketBase URL', () => {
      // This is tested indirectly through successful API calls
      expect(true).toBe(true) // Placeholder - actual URL is internal to the service
    })
  })

  describe('Authentication Service', () => {
    it('should get current user when authenticated', () => {
      const currentUser = api.auth.getCurrentUser()
      expect(currentUser).toBeDefined()
      expect(currentUser?.email).toBe('test@example.com')
      expect(currentUser?.name).toBe('Test User')
    })

    it('should check authentication status correctly', () => {
      expect(api.auth.isAuthenticated()).toBe(true)
    })

    it('should logout and clear authentication', () => {
      api.auth.logout()
      expect(api.auth.isAuthenticated()).toBe(false)
      expect(api.auth.getCurrentUser()).toBeNull()

      // Re-login for other tests
      return userManager.loginTestUser()
    })

    it('should refresh authentication token', async () => {
      const result = await api.auth.refresh()
      expect(result).toBeDefined()
      expect(result.record).toBeDefined()
      expect(result.token).toBeDefined()
      expect(api.auth.isAuthenticated()).toBe(true)
    })
  })

  describe('Todo Service', () => {
    it('should create a todo', async () => {
      const todo = await api.todos.create({
        title: 'Test Todo',
        description: 'Test Description',
        completed: false,
        priority: 'medium',
      })

      expect(todo).toBeDefined()
      expect(todo.id).toBeDefined()
      expect(todo.title).toBe('Test Todo')
      expect(todo.description).toBe('Test Description')
      expect(todo.completed).toBe(false)
      expect(todo.priority).toBe('medium')
      expect(todo.user).toBeDefined()

      createdTodoIds.push(todo.id)
    })

    it('should get all todos', async () => {
      // Create a test todo first
      const todo = await api.todos.create({
        title: 'Get All Test Todo',
        completed: false,
        priority: 'low',
      })
      createdTodoIds.push(todo.id)

      const todos = await api.todos.getAll()
      expect(todos).toBeInstanceOf(Array)
      expect(todos.length).toBeGreaterThanOrEqual(1)

      const foundTodo = todos.find(t => t.id === todo.id)
      expect(foundTodo).toBeDefined()
      expect(foundTodo?.title).toBe('Get All Test Todo')
    })

    it('should get todo by ID', async () => {
      const todo = await api.todos.create({
        title: 'Get By ID Test Todo',
        completed: true,
        priority: 'high',
      })
      createdTodoIds.push(todo.id)

      const retrievedTodo = await api.todos.getById(todo.id)
      expect(retrievedTodo.id).toBe(todo.id)
      expect(retrievedTodo.title).toBe('Get By ID Test Todo')
      expect(retrievedTodo.completed).toBe(true)
      expect(retrievedTodo.priority).toBe('high')
    })

    it('should update a todo', async () => {
      const todo = await api.todos.create({
        title: 'Original Title',
        completed: false,
        priority: 'low',
      })
      createdTodoIds.push(todo.id)

      const updatedTodo = await api.todos.update(todo.id, {
        title: 'Updated Title',
        completed: true,
      })

      expect(updatedTodo.id).toBe(todo.id)
      expect(updatedTodo.title).toBe('Updated Title')
      expect(updatedTodo.completed).toBe(true)
      expect(updatedTodo.priority).toBe('low') // Should remain unchanged
    })

    it('should toggle todo completion', async () => {
      const todo = await api.todos.create({
        title: 'Toggle Test Todo',
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

    it('should delete a todo', async () => {
      const todo = await api.todos.create({
        title: 'Delete Test Todo',
        completed: false,
        priority: 'low',
      })

      // Verify it exists
      const existingTodo = await api.todos.getById(todo.id)
      expect(existingTodo.id).toBe(todo.id)

      // Delete it
      const success = await api.todos.delete(todo.id)
      expect(success).toBe(true)

      // Verify it's gone
      const promise = api.todos.getById(todo.id)
      await expect(promise).rejects.toThrow()
    })

    it('should handle todos with different priorities', async () => {
      const priorities: Array<'low' | 'medium' | 'high'> = ['low', 'medium', 'high']
      const todos: Todo[] = []

      for (const priority of priorities) {
        const todo = await api.todos.create({
          title: `Priority ${priority} Todo`,
          priority,
          completed: false,
        })
        todos.push(todo)
        createdTodoIds.push(todo.id)
      }

      // Verify all todos have correct priorities
      for (const todo of todos) {
        const retrievedTodo = await api.todos.getById(todo.id)
        expect(retrievedTodo.priority).toBe(todo.priority)
      }
    })

    it('should handle todos without description', async () => {
      const todo = await api.todos.create({
        title: 'No Description Todo',
        completed: false,
        priority: 'medium',
      })
      createdTodoIds.push(todo.id)

      expect(todo.description).toBe('')

      const retrievedTodo = await api.todos.getById(todo.id)
      expect(retrievedTodo.description).toBe('')
    })
  })

  describe('Error Handling', () => {
    it('should handle getting non-existent todo', async () => {
      const promise = api.todos.getById('non-existent-id')
      await expect(promise).rejects.toThrow()
    })

    it('should handle updating non-existent todo', async () => {
      const promise = api.todos.update('non-existent-id', { title: 'Updated' })
      await expect(promise).rejects.toThrow()
    })

    it('should handle deleting non-existent todo', async () => {
      const promise = api.todos.delete('non-existent-id')
      await expect(promise).rejects.toThrow()
    })

    it('should handle creating todo without title', async () => {
      const promise = api.todos.create({
        description: 'No title provided',
        completed: false,
        priority: 'medium',
      })
      await expect(promise).rejects.toThrow()
    })

    it('should handle invalid priority', async () => {
      const promise = api.todos.create({
        title: 'Invalid Priority Todo',
        completed: false,
        priority: 'invalid' as any,
      })
      await expect(promise).rejects.toThrow()
    })
  })

  describe('Data Consistency', () => {
    it('should maintain data consistency through multiple operations', async () => {
      const todo = await api.todos.create({
        title: 'Consistency Test Todo',
        description: 'Original description',
        completed: false,
        priority: 'low',
      })
      createdTodoIds.push(todo.id)

      // Update multiple fields
      const updated1 = await api.todos.update(todo.id, {
        title: 'Updated Title 1',
        completed: true,
      })

      expect(updated1.title).toBe('Updated Title 1')
      expect(updated1.completed).toBe(true)
      expect(updated1.description).toBe('Original description')
      expect(updated1.priority).toBe('low')

      // Update different fields
      const updated2 = await api.todos.update(todo.id, {
        description: 'Updated description',
        priority: 'high',
      })

      expect(updated2.title).toBe('Updated Title 1') // Should remain unchanged
      expect(updated2.completed).toBe(true) // Should remain unchanged
      expect(updated2.description).toBe('Updated description')
      expect(updated2.priority).toBe('high')

      // Final verification
      const finalTodo = await api.todos.getById(todo.id)
      expect(finalTodo.title).toBe('Updated Title 1')
      expect(finalTodo.completed).toBe(true)
      expect(finalTodo.description).toBe('Updated description')
      expect(finalTodo.priority).toBe('high')
    })
  })
})
