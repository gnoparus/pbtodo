import { describe, it, expect } from 'vitest'
import {
  createTestUser,
  createTestUsers,
  createTestUserWithDomain,
  createTestUserWithLongName,
  createTestUserWithSpecialChars,
  createTestUserMinimal,
  TEST_USERS,
} from './user.factory'
import {
  createTestTodo,
  createTestTodos,
  createCompletedTodo,
  createActiveTodo,
  createHighPriorityTodo,
  createLowPriorityTodo,
  createTestTodoMinimal,
  createTestTodoLongTitle,
  createTestTodoLongDescription,
  createTestTodoWithSpecialChars,
  createTestTodoWithEmoji,
  createTestTodoWithUnicode,
  createTodosForUser,
  createMixedTodos,
  createTodosWithDateRange,
  TEST_TODOS,
} from './todo.factory'

describe('User Factory', () => {
  describe('createTestUser', () => {
    it('should create a valid user with all required fields', () => {
      const user = createTestUser()

      expect(user).toHaveProperty('id')
      expect(user).toHaveProperty('email')
      expect(user).toHaveProperty('name')
      expect(user).toHaveProperty('created')
      expect(user).toHaveProperty('updated')

      expect(typeof user.id).toBe('string')
      expect(typeof user.email).toBe('string')
      expect(typeof user.name).toBe('string')
      expect(typeof user.created).toBe('string')
      expect(typeof user.updated).toBe('string')

      expect(user.email).toContain('@')
      expect(user.id).toMatch(/^[0-9a-f-]+$/)
    })

    it('should create user with overridden fields', () => {
      const user = createTestUser({
        email: 'custom@example.com',
        name: 'Custom Name',
      })

      expect(user.email).toBe('custom@example.com')
      expect(user.name).toBe('Custom Name')
    })

    it('should create unique users on each call', () => {
      const user1 = createTestUser()
      const user2 = createTestUser()

      expect(user1.id).not.toBe(user2.id)
      expect(user1.email).not.toBe(user2.email)
    })
  })

  describe('createTestUsers', () => {
    it('should create multiple users', () => {
      const users = createTestUsers(5)

      expect(users).toHaveLength(5)
      expect(users[0]).toHaveProperty('id')
      expect(users[0]).toHaveProperty('email')
    })

    it('should create users with shared overrides', () => {
      const users = createTestUsers(3, { name: 'Same Name' })

      expect(users).toHaveLength(3)
      users.forEach(user => {
        expect(user.name).toBe('Same Name')
      })

      // IDs should still be unique
      const ids = users.map(u => u.id)
      expect(new Set(ids).size).toBe(3)
    })
  })

  describe('createTestUserWithDomain', () => {
    it('should create user with specified domain', () => {
      const user = createTestUserWithDomain('company.com')

      expect(user.email).toMatch(/@company\.com$/)
    })
  })

  describe('createTestUserWithLongName', () => {
    it('should create user with very long name', () => {
      const user = createTestUserWithLongName()

      expect(user.name.length).toBeGreaterThan(50)
    })
  })

  describe('createTestUserWithSpecialChars', () => {
    it('should create user with special characters in name', () => {
      const user = createTestUserWithSpecialChars()

      expect(user.name).toContain("'")
      expect(user.name).toContain('"')
      expect(user.name).toContain('<')
      expect(user.name).toContain('>')
    })
  })

  describe('createTestUserMinimal', () => {
    it('should create user without optional avatar field', () => {
      const user = createTestUserMinimal()

      expect(user).toHaveProperty('id')
      expect(user).toHaveProperty('email')
      expect(user).toHaveProperty('name')
      expect(user).not.toHaveProperty('avatar')
    })
  })

  describe('TEST_USERS', () => {
    it('should provide consistent test user presets', () => {
      expect(TEST_USERS.admin.email).toBe('admin@test.com')
      expect(TEST_USERS.admin.name).toBe('Test Admin')
      expect(TEST_USERS.admin.id).toBe('test-admin-id')

      expect(TEST_USERS.regular.email).toBe('user@test.com')
      expect(TEST_USERS.newUser.email).toBe('newuser@test.com')
    })
  })
})

describe('Todo Factory', () => {
  describe('createTestTodo', () => {
    it('should create a valid todo with all required fields', () => {
      const todo = createTestTodo()

      expect(todo).toHaveProperty('id')
      expect(todo).toHaveProperty('title')
      expect(todo).toHaveProperty('completed')
      expect(todo).toHaveProperty('priority')
      expect(todo).toHaveProperty('user')
      expect(todo).toHaveProperty('created')
      expect(todo).toHaveProperty('updated')

      expect(typeof todo.id).toBe('string')
      expect(typeof todo.title).toBe('string')
      expect(typeof todo.completed).toBe('boolean')
      expect(['low', 'medium', 'high']).toContain(todo.priority)
      expect(typeof todo.user).toBe('string')
    })

    it('should create todo with overridden fields', () => {
      const todo = createTestTodo({
        title: 'Custom Todo',
        completed: true,
        priority: 'high',
      })

      expect(todo.title).toBe('Custom Todo')
      expect(todo.completed).toBe(true)
      expect(todo.priority).toBe('high')
    })

    it('should create unique todos on each call', () => {
      const todo1 = createTestTodo()
      const todo2 = createTestTodo()

      expect(todo1.id).not.toBe(todo2.id)
      expect(todo1.title).not.toBe(todo2.title)
    })
  })

  describe('createTestTodos', () => {
    it('should create multiple todos', () => {
      const todos = createTestTodos(10)

      expect(todos).toHaveLength(10)
      todos.forEach(todo => {
        expect(todo).toHaveProperty('id')
        expect(todo).toHaveProperty('title')
      })
    })

    it('should create todos with shared overrides', () => {
      const userId = 'user-123'
      const todos = createTestTodos(5, { user: userId, priority: 'high' })

      expect(todos).toHaveLength(5)
      todos.forEach(todo => {
        expect(todo.user).toBe(userId)
        expect(todo.priority).toBe('high')
      })
    })
  })

  describe('createCompletedTodo', () => {
    it('should create a completed todo', () => {
      const todo = createCompletedTodo()

      expect(todo.completed).toBe(true)
    })
  })

  describe('createActiveTodo', () => {
    it('should create an active (not completed) todo', () => {
      const todo = createActiveTodo()

      expect(todo.completed).toBe(false)
    })
  })

  describe('createHighPriorityTodo', () => {
    it('should create a high priority todo', () => {
      const todo = createHighPriorityTodo()

      expect(todo.priority).toBe('high')
    })
  })

  describe('createLowPriorityTodo', () => {
    it('should create a low priority todo', () => {
      const todo = createLowPriorityTodo()

      expect(todo.priority).toBe('low')
    })
  })

  describe('createTestTodoMinimal', () => {
    it('should create todo without optional description', () => {
      const todo = createTestTodoMinimal()

      expect(todo).toHaveProperty('id')
      expect(todo).toHaveProperty('title')
      expect(todo).not.toHaveProperty('description')
      expect(todo.completed).toBe(false)
      expect(todo.priority).toBe('medium')
    })
  })

  describe('createTestTodoLongTitle', () => {
    it('should create todo with very long title', () => {
      const todo = createTestTodoLongTitle()

      expect(todo.title.length).toBeGreaterThan(100)
    })
  })

  describe('createTestTodoLongDescription', () => {
    it('should create todo with very long description', () => {
      const todo = createTestTodoLongDescription()

      expect(todo.description).toBeDefined()
      expect(todo.description!.length).toBeGreaterThan(500)
    })
  })

  describe('createTestTodoWithSpecialChars', () => {
    it('should create todo with special characters', () => {
      const todo = createTestTodoWithSpecialChars()

      expect(todo.title).toContain('<script>')
      expect(todo.title).toContain("'")
      expect(todo.title).toContain('"')
      expect(todo.description).toContain('<>')
      expect(todo.description).toContain('&')
    })
  })

  describe('createTestTodoWithEmoji', () => {
    it('should create todo with emoji', () => {
      const todo = createTestTodoWithEmoji()

      expect(todo.title).toMatch(/[🎉🚀]/u)
      expect(todo.description).toMatch(/[✨💪]/u)
    })
  })

  describe('createTestTodoWithUnicode', () => {
    it('should create todo with unicode characters', () => {
      const todo = createTestTodoWithUnicode()

      expect(todo.title).toContain('日本語')
      expect(todo.description).toContain('中文')
      expect(todo.description).toContain('العربية')
      expect(todo.description).toContain('עברית')
      expect(todo.description).toContain('한국어')
    })
  })

  describe('createTodosForUser', () => {
    it('should create todos for specific user', () => {
      const userId = 'specific-user-id'
      const todos = createTodosForUser(userId, 5)

      expect(todos).toHaveLength(5)
      todos.forEach(todo => {
        expect(todo.user).toBe(userId)
      })
    })
  })

  describe('createMixedTodos', () => {
    it('should create mix of completed and active todos', () => {
      const todos = createMixedTodos(9)

      const completedTodos = todos.filter(t => t.completed)
      const activeTodos = todos.filter(t => !t.completed)

      expect(completedTodos.length).toBeGreaterThan(0)
      expect(activeTodos.length).toBeGreaterThan(0)
    })

    it('should create todos with various priorities', () => {
      const todos = createMixedTodos(9)

      const priorities = todos.map(t => t.priority)
      const uniquePriorities = new Set(priorities)

      expect(uniquePriorities.size).toBeGreaterThanOrEqual(2)
    })

    it('should assign all todos to same user if provided', () => {
      const userId = 'test-user-123'
      const todos = createMixedTodos(5, userId)

      todos.forEach(todo => {
        expect(todo.user).toBe(userId)
      })
    })
  })

  describe('createTodosWithDateRange', () => {
    it('should create todos with dates within specified range', () => {
      const startDate = new Date('2023-01-01')
      const endDate = new Date('2023-12-31')
      const todos = createTodosWithDateRange(5, startDate, endDate)

      expect(todos).toHaveLength(5)

      todos.forEach(todo => {
        const created = new Date(todo.created)
        const updated = new Date(todo.updated)

        expect(created.getTime()).toBeGreaterThanOrEqual(startDate.getTime())
        expect(created.getTime()).toBeLessThanOrEqual(endDate.getTime())
        expect(updated.getTime()).toBeGreaterThanOrEqual(created.getTime())
        expect(updated.getTime()).toBeLessThanOrEqual(endDate.getTime())
      })
    })
  })

  describe('TEST_TODOS', () => {
    it('should provide consistent test todo presets', () => {
      expect(TEST_TODOS.simple.id).toBe('test-todo-1')
      expect(TEST_TODOS.simple.title).toBe('Test Todo 1')
      expect(TEST_TODOS.simple.completed).toBe(false)
      expect(TEST_TODOS.simple.priority).toBe('medium')

      expect(TEST_TODOS.completed.completed).toBe(true)
      expect(TEST_TODOS.highPriority.priority).toBe('high')
      expect(TEST_TODOS.minimal.description).toBeUndefined()
    })
  })
})
