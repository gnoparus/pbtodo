import { beforeAll, afterAll, beforeEach, afterEach, vi } from 'vitest'

// Mock environment variables for integration tests
vi.stubGlobal('import.meta', {
  env: {
    VITE_API_URL: 'http://127.0.0.1:8787/api',
    VITE_HTTPS_ENABLED: 'false',
    VITE_SESSION_TIMEOUT_MINUTES: '1440',
    VITE_MIN_PASSWORD_LENGTH: '8',
    VITE_REQUIRE_PASSWORD_COMPLEXITY: 'true',
    VITE_MAX_LOGIN_ATTEMPTS_PER_MINUTE: '5',
    VITE_DEV_MODE: 'true',
    VITE_ALLOWED_ORIGINS: 'http://localhost:5173,http://127.0.0.1:5173',
    VITE_ENABLE_SECURITY_HEADERS: 'true',
    VITE_ENABLE_CSP: 'true',
    VITE_ENABLE_HSTS: 'true',
  },
})

// Test configuration
export const TEST_CONFIG = {
  testUserEmail: 'test@example.com',
  testUserPassword: 'testpassword123',
  testUserName: 'Test User',
  testPrefix: 'test_',
}

// Mock user data
export const MOCK_TEST_USER = {
  id: 'test-user-123',
  email: TEST_CONFIG.testUserEmail,
  name: TEST_CONFIG.testUserName,
  avatar: undefined,
  created_at: Math.floor(Date.now() / 1000),
  updated_at: Math.floor(Date.now() / 1000),
}

// Mock auth token
export const MOCK_AUTH_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ0ZXN0LXVzZXItMTIzIiwiZW1haWwiOiJ0ZXN0QGV4YW1wbGUuY29tIiwiaWF0IjoxNzAwMDAwMDAwLCJleHAiOjE3MDAxMDAwMDB9.mock'

// Test cleanup utilities
export class TestDataManager {
  private createdIds: string[] = []

  async recordCreatedId(id: string) {
    this.createdIds.push(id)
  }

  async cleanup() {
    // In mock mode, just clear the list
    this.createdIds = []
  }
}

// Test user management
export class TestUserManager {
  private isAuthenticated = false

  async ensureTestUser() {
    // In mock mode, just set authenticated
    this.isAuthenticated = true
  }

  async loginTestUser() {
    this.isAuthenticated = true
    localStorage.setItem('authToken', MOCK_AUTH_TOKEN)
  }

  async logout() {
    this.isAuthenticated = false
    localStorage.removeItem('authToken')
  }

  getTestId(): string {
    return MOCK_TEST_USER.id
  }

  isLoggedIn(): boolean {
    return this.isAuthenticated
  }
}

// Global test setup
let dataManager: TestDataManager
let userManager: TestUserManager

beforeAll(async () => {
  dataManager = new TestDataManager()
  userManager = new TestUserManager()
})

afterAll(async () => {
  if (dataManager && userManager) {
    await dataManager.cleanup()
    await userManager.logout()
  }
})

beforeEach(async () => {
  if (userManager) {
    await userManager.loginTestUser()
  }
})

afterEach(async () => {
  if (dataManager && userManager) {
    await dataManager.cleanup()
    await userManager.logout()
  }
})

// Helper function to handle permission errors gracefully
export function handlePermissionError(error: any, testName: string): boolean {
  if (error?.message?.includes('Only superusers') || error?.message?.includes('403')) {
    console.warn(`⚠️  ${testName}: Collection permissions not configured - skipping test`)
    return true
  }
  return false
}

export { dataManager, userManager }
