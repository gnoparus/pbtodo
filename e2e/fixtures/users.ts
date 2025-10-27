/**
 * User fixtures for E2E tests
 */

export interface UserFixture {
  name: string;
  email: string;
  password: string;
}

/**
 * Pre-defined test users for consistent testing
 */
export const testUsers = {
  alice: {
    name: 'Alice Johnson',
    email: 'alice.test@example.com',
    password: 'AlicePass123!',
  },
  bob: {
    name: 'Bob Smith',
    email: 'bob.test@example.com',
    password: 'BobPass123!',
  },
  charlie: {
    name: 'Charlie Brown',
    email: 'charlie.test@example.com',
    password: 'CharliePass123!',
  },
} as const;

/**
 * Invalid user credentials for negative testing
 */
export const invalidUsers = {
  invalidEmail: {
    name: 'Invalid User',
    email: 'not-an-email',
    password: 'Password123!',
  },
  shortPassword: {
    name: 'Weak Password User',
    email: 'weak@example.com',
    password: '123',
  },
  emptyFields: {
    name: '',
    email: '',
    password: '',
  },
  nonExistent: {
    email: 'doesnotexist@example.com',
    password: 'WrongPassword123!',
  },
} as const;
