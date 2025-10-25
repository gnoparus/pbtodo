import { describe, it, expect, beforeEach } from 'vitest'
import { testPb, dataManager, userManager } from './setup'
import { Todo } from '../../services/pocketbase'

describe('Todos CRUD Integration Tests', () => {
  let userId: string

  beforeEach(async () => {
    await userManager.loginTestUser()
    userId = userManager.getTestId()
  })

  describe('Create Todo', () => {
    it('should create a todo successfully', async () => {
      const todoData = {
        title: 'Test Todo',
        description: 'Test Description',
        completed: false,
        priority: 'medium' as const,
        user: userId,
      }

      const result = await testPb.collection('todos').create<Todo>(todoData)

      expect(result).toBeDefined()
      expect(result.id).toBeDefined()
      expect(result.title).toBe(todoData.title)
      expect(result.description).toBe(todoData.description)
      expect(result.completed).toBe(todoData.completed)
      expect(result.priority).toBe(todoData.priority)
      expect(result.user).toBe(userId)

      await dataManager.recordCreatedId(result.id)
    })

    it('should reject creating todo without title', async () => {
      const todoData = {
        description: 'Test Description',
        completed: false,
        priority: 'medium' as const,
        user: userId,
      }

      const promise = testPb.collection('todos').create<Todo>(todoData)
      await expect(promise).rejects.toThrow()
    })
  })

  describe('Read Todos', () => {
    it('should get all todos for user', async () => {
      // Create test todos
      const todo1 = await testPb.collection('todos').create<Todo>({
        title: 'Test Todo 1',
        user: userId,
        completed: false,
        priority: 'medium',
      })
      const todo2 = await testPb.collection('todos').create<Todo>({
        title: 'Test Todo 2',
        user: userId,
        completed: true,
        priority: 'high',
      })

      await dataManager.recordCreatedId(todo1.id)
      await dataManager.recordCreatedId(todo2.id)

      // Get all todos
      const todos = await testPb.collection('todos').getFullList<Todo>({
        sort: '-created',
      })

      expect(todos).toBeInstanceOf(Array)
      expect(todos.length).toBeGreaterThanOrEqual(2)

      const userTodos = todos.filter(todo => todo.user === userId)
      expect(userTodos.length).toBeGreaterThanOrEqual(2)
    })

    it('should get todo by id', async () => {
      const todo = await testPb.collection('todos').create<Todo>({
        title: 'Test Todo for Get',
        user: userId,
        completed: false,
        priority: 'low',
      })

      await dataManager.recordCreatedId(todo.id)

      const retrievedTodo = await testPb.collection('todos').getOne<Todo>(todo.id)

      expect(retrievedTodo.id).toBe(todo.id)
      expect(retrievedTodo.title).toBe(todo.title)
    })
  })

  describe('Update Todo', () => {
    it('should update todo successfully', async () => {
      const todo = await testPb.collection('todos').create<Todo>({
        title: 'Original Title',
        user: userId,
        completed: false,
        priority: 'low',
      })

      await dataManager.recordCreatedId(todo.id)

      const updatedData = {
        title: 'Updated Title',
        completed: true,
        priority: 'high' as const,
      }

      const updatedTodo = await testPb.collection('todos').update<Todo>(
        todo.id,
        updatedData
      )

      expect(updatedTodo.id).toBe(todo.id)
      expect(updatedTodo.title).toBe(updatedData.title)
      expect(updatedTodo.completed).toBe(updatedData.completed)
      expect(updatedTodo.priority).toBe(updatedData.priority)
    })

    it('should toggle todo completion', async () => {
      const todo = await testPb.collection('todos').create<Todo>({
        title: 'Toggle Test Todo',
        user: userId,
        completed: false,
        priority: 'medium',
      })

      await dataManager.recordCreatedId(todo.id)

      // Toggle to true
      const updatedTodo1 = await testPb.collection('todos').update<Todo>(todo.id, {
        completed: true,
      })
      expect(updatedTodo1.completed).toBe(true)

      // Toggle to false
      const updatedTodo2 = await testPb.collection('todos').update<Todo>(todo.id, {
        completed: false,
      })
      expect(updatedTodo2.completed).toBe(false)
    })
  })

  describe('Delete Todo', () => {
    it('should delete todo successfully', async () => {
      const todo = await testPb.collection('todos').create<Todo>({
        title: 'Todo to Delete',
        user: userId,
        completed: false,
        priority: 'low',
      })

      // Verify todo exists
      const existingTodo = await testPb.collection('todos').getOne<Todo>(todo.id)
      expect(existingTodo.id).toBe(todo.id)

      // Delete todo
      const success = await testPb.collection('todos').delete(todo.id)
      expect(success).toBe(true)

      // Verify todo is deleted
      const promise = testPb.collection('todos').getOne<Todo>(todo.id)
      await expect(promise).rejects.toThrow()
    })
  })
})
