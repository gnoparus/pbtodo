import { faker } from '@faker-js/faker'
import { User } from '../../services/pocketbase'

/**
 * User Factory - Generate realistic test user data
 *
 * @example
 * const user = createTestUser()
 * const customUser = createTestUser({ email: 'specific@example.com' })
 */

export interface CreateUserOptions {
  id?: string
  email?: string
  name?: string
  avatar?: string
  created?: string
  updated?: string
}

/**
 * Creates a test user with realistic fake data
 * All fields can be overridden via the options parameter
 */
export const createTestUser = (overrides: CreateUserOptions = {}): User => {
  const now = new Date().toISOString()

  return {
    id: faker.string.uuid(),
    email: faker.internet.email().toLowerCase(),
    name: faker.person.fullName(),
    avatar: faker.image.avatar(),
    created: faker.date.past().toISOString(),
    updated: now,
    ...overrides,
  }
}

/**
 * Creates multiple test users
 */
export const createTestUsers = (count: number, overrides: CreateUserOptions = {}): User[] => {
  return Array.from({ length: count }, () => createTestUser(overrides))
}

/**
 * Creates a test user with specific email domain
 */
export const createTestUserWithDomain = (domain: string, overrides: CreateUserOptions = {}): User => {
  const username = faker.internet.displayName().toLowerCase().replace(/\s+/g, '')
  return createTestUser({
    email: `${username}@${domain}`,
    ...overrides,
  })
}

/**
 * Creates a test user with a very long name (for edge case testing)
 */
export const createTestUserWithLongName = (overrides: CreateUserOptions = {}): User => {
  return createTestUser({
    name: faker.lorem.words(20), // Very long name
    ...overrides,
  })
}

/**
 * Creates a test user with special characters in name
 */
export const createTestUserWithSpecialChars = (overrides: CreateUserOptions = {}): User => {
  return createTestUser({
    name: "Test User with 'quotes\" and <special> chars & symbols!",
    ...overrides,
  })
}

/**
 * Creates a test user without optional fields
 */
export const createTestUserMinimal = (overrides: CreateUserOptions = {}): User => {
  const now = new Date().toISOString()

  return {
    id: faker.string.uuid(),
    email: faker.internet.email().toLowerCase(),
    name: faker.person.fullName(),
    created: faker.date.past().toISOString(),
    updated: now,
    ...overrides,
  }
}

/**
 * Common test user presets for consistent testing
 */
export const TEST_USERS = {
  admin: createTestUser({
    id: 'test-admin-id',
    email: 'admin@test.com',
    name: 'Test Admin',
  }),

  regular: createTestUser({
    id: 'test-user-id',
    email: 'user@test.com',
    name: 'Test User',
  }),

  newUser: createTestUser({
    id: 'test-new-user-id',
    email: 'newuser@test.com',
    name: 'New User',
  }),
}
