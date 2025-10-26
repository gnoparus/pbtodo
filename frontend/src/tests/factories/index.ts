/**
 * Test Factories and Helpers Index
 *
 * Centralized exports for all test utilities, factories, and helpers.
 * Import from this file to access all testing utilities in one place.
 *
 * @example
 * import { createTestUser, createTestTodo, renderWithProviders } from '../factories'
 */

// User factories
export {
  createTestUser,
  createTestUsers,
  createTestUserWithDomain,
  createTestUserWithLongName,
  createTestUserWithSpecialChars,
  createTestUserMinimal,
  TEST_USERS,
  type CreateUserOptions,
} from './user.factory'

// Todo factories
export {
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
  type CreateTodoOptions,
} from './todo.factory'

// Test utilities and helpers
export {
  // Render helpers
  renderWithProviders,
  renderWithRouter,
  AllTheProviders,

  // Cleanup helpers
  cleanupMocks,
  restoreMocks,
  cleanupStorage,
  fullCleanup,

  // Wait utilities
  wait,
  flushPromises,

  // Mock utilities
  createMockResolve,
  createMockReject,
  createMockResolveDelayed,

  // Console utilities
  suppressConsoleError,
  suppressConsoleWarn,
  suppressConsoleLog,

  // Form utilities
  fillInput,

  // Test data generation
  randomEmail,
  randomString,
  randomNumber,

  // Assertion helpers
  isInteractive,
  getAllErrorMessages,

  // Context mocks
  createMockAuthContext,
  createMockTodoContext,

  // Date utilities
  dateFromNow,
  createISODate,

  // Network utilities
  simulateNetworkDelay,
  createNetworkError,
  createTimeoutError,

  // Re-exported from @testing-library
  screen,
  waitFor,
  within,
  fireEvent,
  userEvent,
} from '../helpers/test-utils'
