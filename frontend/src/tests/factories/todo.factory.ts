import { faker } from '@faker-js/faker'
import { Todo } from '../../services/pocketbase'

/**
 * Todo Factory - Generate realistic test todo data
 *
 * @example
 * const todo = createTestTodo()
 * const customTodo = createTestTodo({ title: 'Custom Title', completed: true })
 */

export interface CreateTodoOptions {
  id?: string
  title?: string
  description?: string
  completed?: boolean
  priority?: 'low' | 'medium' | 'high'
  user?: string
  created?: string
  updated?: string
}

/**
 * Creates a test todo with realistic fake data
 * All fields can be overridden via the options parameter
 */
export const createTestTodo = (overrides: CreateTodoOptions = {}): Todo => {
  const now = new Date().toISOString()
  const created = faker.date.past().toISOString()

  return {
    id: faker.string.uuid(),
    title: faker.lorem.sentence({ min: 3, max: 8 }).slice(0, -1), // Remove trailing period
    description: faker.lorem.sentences(2),
    completed: false,
    priority: faker.helpers.arrayElement(['low', 'medium', 'high'] as const),
    user: faker.string.uuid(),
    created,
    updated: now,
    ...overrides,
  }
}

/**
 * Creates multiple test todos
 */
export const createTestTodos = (count: number, overrides: CreateTodoOptions = {}): Todo[] => {
  return Array.from({ length: count }, () => createTestTodo(overrides))
}

/**
 * Creates a completed test todo
 */
export const createCompletedTodo = (overrides: CreateTodoOptions = {}): Todo => {
  return createTestTodo({
    completed: true,
    updated: new Date().toISOString(),
    ...overrides,
  })
}

/**
 * Creates an active (not completed) test todo
 */
export const createActiveTodo = (overrides: CreateTodoOptions = {}): Todo => {
  return createTestTodo({
    completed: false,
    ...overrides,
  })
}

/**
 * Creates a test todo with high priority
 */
export const createHighPriorityTodo = (overrides: CreateTodoOptions = {}): Todo => {
  return createTestTodo({
    priority: 'high',
    title: '🔴 ' + faker.lorem.sentence({ min: 3, max: 6 }).slice(0, -1),
    ...overrides,
  })
}

/**
 * Creates a test todo with low priority
 */
export const createLowPriorityTodo = (overrides: CreateTodoOptions = {}): Todo => {
  return createTestTodo({
    priority: 'low',
    ...overrides,
  })
}

/**
 * Creates a test todo without description (minimal)
 */
export const createTestTodoMinimal = (overrides: CreateTodoOptions = {}): Todo => {
  const now = new Date().toISOString()
  const created = faker.date.past().toISOString()

  return {
    id: faker.string.uuid(),
    title: faker.lorem.sentence({ min: 3, max: 8 }).slice(0, -1),
    completed: false,
    priority: 'medium',
    user: faker.string.uuid(),
    created,
    updated: now,
    ...overrides,
  }
}

/**
 * Creates a test todo with very long title (for edge case testing)
 */
export const createTestTodoLongTitle = (overrides: CreateTodoOptions = {}): Todo => {
  return createTestTodo({
    title: faker.lorem.words(50), // Very long title
    ...overrides,
  })
}

/**
 * Creates a test todo with very long description
 */
export const createTestTodoLongDescription = (overrides: CreateTodoOptions = {}): Todo => {
  return createTestTodo({
    description: faker.lorem.paragraphs(10), // Very long description
    ...overrides,
  })
}

/**
 * Creates a test todo with special characters
 */
export const createTestTodoWithSpecialChars = (overrides: CreateTodoOptions = {}): Todo => {
  return createTestTodo({
    title: "Todo with 'quotes\" <script>alert('xss')</script> & symbols!",
    description: "Description with special chars: <>\"'&\n\t\r",
    ...overrides,
  })
}

/**
 * Creates a test todo with emoji
 */
export const createTestTodoWithEmoji = (overrides: CreateTodoOptions = {}): Todo => {
  return createTestTodo({
    title: '🎉 ' + faker.lorem.sentence({ min: 2, max: 5 }).slice(0, -1) + ' 🚀',
    description: '✨ ' + faker.lorem.sentence() + ' 💪',
    ...overrides,
  })
}

/**
 * Creates a test todo with unicode characters
 */
export const createTestTodoWithUnicode = (overrides: CreateTodoOptions = {}): Todo => {
  return createTestTodo({
    title: '日本語タイトル - Japanese Title',
    description: 'Ñoño 中文 العربية עברית 한국어',
    ...overrides,
  })
}

/**
 * Creates todos for a specific user
 */
export const createTodosForUser = (userId: string, count: number, overrides: CreateTodoOptions = {}): Todo[] => {
  return createTestTodos(count, { user: userId, ...overrides })
}

/**
 * Creates a mixed set of todos (active and completed, various priorities)
 */
export const createMixedTodos = (count: number, userId?: string): Todo[] => {
  const todos: Todo[] = []
  const userIdToUse = userId || faker.string.uuid()

  for (let i = 0; i < count; i++) {
    const isCompleted = i % 3 === 0 // Every 3rd todo is completed
    const priorities: ('low' | 'medium' | 'high')[] = ['low', 'medium', 'high']
    const priority = priorities[i % 3]

    todos.push(
      createTestTodo({
        user: userIdToUse,
        completed: isCompleted,
        priority,
      })
    )
  }

  return todos
}

/**
 * Common test todo presets for consistent testing
 */
export const TEST_TODOS = {
  simple: createTestTodo({
    id: 'test-todo-1',
    title: 'Test Todo 1',
    description: 'This is a test todo',
    completed: false,
    priority: 'medium',
    user: 'test-user-id',
  }),

  completed: createTestTodo({
    id: 'test-todo-2',
    title: 'Completed Todo',
    description: 'This todo is completed',
    completed: true,
    priority: 'low',
    user: 'test-user-id',
  }),

  highPriority: createTestTodo({
    id: 'test-todo-3',
    title: 'High Priority Todo',
    description: 'This is urgent',
    completed: false,
    priority: 'high',
    user: 'test-user-id',
  }),

  minimal: createTestTodoMinimal({
    id: 'test-todo-4',
    title: 'Minimal Todo',
    user: 'test-user-id',
  }),
}

/**
 * Creates a batch of todos with timestamps spread across a date range
 * Useful for testing sorting and date filtering
 */
export const createTodosWithDateRange = (
  count: number,
  startDate: Date,
  endDate: Date,
  overrides: CreateTodoOptions = {}
): Todo[] => {
  return Array.from({ length: count }, () => {
    const created = faker.date.between({ from: startDate, to: endDate }).toISOString()
    const updated = faker.date.between({ from: new Date(created), to: endDate }).toISOString()

    return createTestTodo({
      created,
      updated,
      ...overrides,
    })
  })
}
