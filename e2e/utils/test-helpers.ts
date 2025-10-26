import { Page } from '@playwright/test';
import PocketBase from 'pocketbase';

const pb = new PocketBase('http://localhost:8090');

export interface TestUser {
  name: string;
  email: string;
  password: string;
}

export interface TestTodo {
  title: string;
  description?: string;
  completed: boolean;
  priority: 'low' | 'medium' | 'high';
}

/**
 * Generate a unique test user with timestamp to avoid collisions
 */
export function generateTestUser(): TestUser {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000);
  return {
    name: `Test User ${timestamp}`,
    email: `test${timestamp}${random}@example.com`,
    password: 'Password123!',
  };
}

/**
 * Create a test user in PocketBase
 */
export async function createTestUser(user?: Partial<TestUser>): Promise<TestUser> {
  const testUser = user ? { ...generateTestUser(), ...user } : generateTestUser();

  try {
    await pb.collection('users').create({
      name: testUser.name,
      email: testUser.email,
      password: testUser.password,
      passwordConfirm: testUser.password,
      emailVisibility: false,
    });
  } catch (error) {
    console.error('Failed to create test user:', error);
    throw error;
  }

  return testUser;
}

/**
 * Delete a test user by email
 */
export async function deleteTestUser(email: string): Promise<void> {
  try {
    const users = await pb.collection('users').getFullList({
      filter: `email = "${email}"`,
    });

    for (const user of users) {
      // First delete all todos for this user
      const todos = await pb.collection('todos').getFullList({
        filter: `user = "${user.id}"`,
      });

      for (const todo of todos) {
        await pb.collection('todos').delete(todo.id);
      }

      // Then delete the user
      await pb.collection('users').delete(user.id);
    }
  } catch (error) {
    // User might not exist, ignore
    console.log('User not found or already deleted:', email);
  }
}

/**
 * Delete all test users (those with email starting with "test")
 */
export async function cleanupAllTestUsers(): Promise<void> {
  try {
    const testUsers = await pb.collection('users').getFullList({
      filter: 'email ~ "test%@example.com"',
    });

    for (const user of testUsers) {
      await deleteTestUser(user.email);
    }
  } catch (error) {
    console.error('Failed to cleanup test users:', error);
  }
}

/**
 * Login as a test user and return the auth token
 */
export async function loginTestUser(email: string, password: string): Promise<string> {
  try {
    const authData = await pb.collection('users').authWithPassword(email, password);
    return authData.token;
  } catch (error) {
    console.error('Failed to login test user:', error);
    throw error;
  }
}

/**
 * Create a test todo for a user
 */
export async function createTestTodo(
  userId: string,
  todo?: Partial<TestTodo>
): Promise<any> {
  const testTodo: TestTodo = {
    title: todo?.title || `Test Todo ${Date.now()}`,
    description: todo?.description || '',
    completed: todo?.completed ?? false,
    priority: todo?.priority || 'medium',
  };

  try {
    return await pb.collection('todos').create({
      ...testTodo,
      user: userId,
    });
  } catch (error) {
    console.error('Failed to create test todo:', error);
    throw error;
  }
}

/**
 * Generate sample todos for testing
 */
export function generateSampleTodos(): Partial<TestTodo>[] {
  return [
    {
      title: 'Buy groceries',
      description: 'Milk, eggs, bread',
      completed: false,
      priority: 'high',
    },
    {
      title: 'Finish project report',
      description: 'Due by end of week',
      completed: false,
      priority: 'high',
    },
    {
      title: 'Call dentist',
      description: 'Schedule checkup',
      completed: false,
      priority: 'medium',
    },
    {
      title: 'Read book',
      description: 'Chapter 5-10',
      completed: true,
      priority: 'low',
    },
    {
      title: 'Exercise',
      description: '30 minutes cardio',
      completed: true,
      priority: 'medium',
    },
  ];
}

/**
 * Wait for a specific condition with timeout
 */
export async function waitForCondition(
  condition: () => Promise<boolean>,
  timeout: number = 5000,
  interval: number = 100
): Promise<void> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    if (await condition()) {
      return;
    }
    await new Promise(resolve => setTimeout(resolve, interval));
  }

  throw new Error('Condition not met within timeout');
}

/**
 * Get the PocketBase client instance
 */
export function getPocketBaseClient(): PocketBase {
  return pb;
}
