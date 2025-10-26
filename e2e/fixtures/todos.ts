/**
 * Todo fixtures for E2E tests
 */

export interface TodoFixture {
  title: string;
  description?: string;
  completed: boolean;
  priority: 'low' | 'medium' | 'high';
}

/**
 * Pre-defined test todos for consistent testing
 */
export const testTodos = {
  buyGroceries: {
    title: 'Buy groceries',
    description: 'Milk, eggs, bread, and vegetables',
    completed: false,
    priority: 'high' as const,
  },
  finishReport: {
    title: 'Finish project report',
    description: 'Complete the Q4 analysis report',
    completed: false,
    priority: 'high' as const,
  },
  callDentist: {
    title: 'Call dentist',
    description: 'Schedule annual checkup appointment',
    completed: false,
    priority: 'medium' as const,
  },
  readBook: {
    title: 'Read book',
    description: 'Finish reading "The Pragmatic Programmer"',
    completed: false,
    priority: 'low' as const,
  },
  exercise: {
    title: 'Exercise',
    description: '30 minutes cardio and stretching',
    completed: false,
    priority: 'medium' as const,
  },
  payBills: {
    title: 'Pay utility bills',
    description: 'Electric, water, and internet',
    completed: true,
    priority: 'high' as const,
  },
  cleanHouse: {
    title: 'Clean house',
    description: 'Vacuum, dust, and organize',
    completed: true,
    priority: 'medium' as const,
  },
  watchTutorial: {
    title: 'Watch coding tutorial',
    description: 'Learn about React hooks',
    completed: true,
    priority: 'low' as const,
  },
} as const;

/**
 * Invalid todo data for negative testing
 */
export const invalidTodos = {
  emptyTitle: {
    title: '',
    description: 'This should fail validation',
    completed: false,
    priority: 'medium' as const,
  },
  tooLongTitle: {
    title: 'A'.repeat(201), // Exceeds 200 character limit
    description: 'This title is too long',
    completed: false,
    priority: 'medium' as const,
  },
  tooLongDescription: {
    title: 'Valid title',
    description: 'D'.repeat(1001), // Exceeds 1000 character limit
    completed: false,
    priority: 'medium' as const,
  },
  invalidPriority: {
    title: 'Invalid priority todo',
    description: 'This has an invalid priority',
    completed: false,
    priority: 'urgent' as any, // Invalid priority value
  },
} as const;

/**
 * Todos organized by priority for filtering tests
 */
export const todosByPriority = {
  high: [
    testTodos.buyGroceries,
    testTodos.finishReport,
    testTodos.payBills,
  ],
  medium: [
    testTodos.callDentist,
    testTodos.exercise,
    testTodos.cleanHouse,
  ],
  low: [
    testTodos.readBook,
    testTodos.watchTutorial,
  ],
} as const;

/**
 * Todos organized by completion status
 */
export const todosByStatus = {
  active: [
    testTodos.buyGroceries,
    testTodos.finishReport,
    testTodos.callDentist,
    testTodos.readBook,
    testTodos.exercise,
  ],
  completed: [
    testTodos.payBills,
    testTodos.cleanHouse,
    testTodos.watchTutorial,
  ],
} as const;

/**
 * Generate a unique test todo
 */
export function generateUniqueTodo(override?: Partial<TodoFixture>): TodoFixture {
  const timestamp = Date.now();
  return {
    title: `Test Todo ${timestamp}`,
    description: override?.description || `Description for test todo ${timestamp}`,
    completed: override?.completed ?? false,
    priority: override?.priority || 'medium',
  };
}
