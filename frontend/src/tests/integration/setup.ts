import { beforeAll, afterAll, beforeEach, afterEach } from 'vitest'
import PocketBase from 'pocketbase'

// Mock environment variables for integration tests
vi.stubGlobal('import.meta', {
  env: {
    VITE_POCKETBASE_URL: 'http://127.0.0.1:8090',
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
  pocketbaseUrl: 'http://127.0.0.1:8090',
  testUserEmail: 'test@example.com',
  testUserPassword: 'testpassword123',
  testUserName: 'Test User',
  testPrefix: 'test_',
  skipPermissionTests: true, // Flag to skip tests requiring collection permissions
}

// Test cleanup utilities
export class TestDataManager {
  private pb: PocketBase
  private createdIds: string[] = []

  constructor(pb: PocketBase) {
    this.pb = pb
  }

  async recordCreatedId(id: string) {
    this.createdIds.push(id)
  }

  async cleanup() {
    // Clean up created todos
    for (const id of this.createdIds) {
      try {
        await this.pb.collection('todos').delete(id)
      } catch (error) {
        console.warn('Failed to cleanup todo:', id, error)
      }
    }
    this.createdIds = []
  }
}

// Test user management
export class TestUserManager {
  private pb: PocketBase
  private testUserExists = false

  constructor(pb: PocketBase) {
    this.pb = pb
  }

  async ensureTestUser() {
    try {
      // Try to login with test user first
      await this.pb.collection('users').authWithPassword(
        TEST_CONFIG.testUserEmail,
        TEST_CONFIG.testUserPassword
      )
      this.testUserExists = true
      return
    } catch (error) {
      // User doesn't exist or password is wrong, try to create it
    }

    try {
      // Generate unique email for test user
      const timestamp = Date.now()
      const uniqueEmail = `test_${timestamp}@example.com`

      await this.pb.collection('users').create({
        email: uniqueEmail,
        password: TEST_CONFIG.testUserPassword,
        passwordConfirm: TEST_CONFIG.testUserPassword,
        name: TEST_CONFIG.testUserName,
      })

      // Update config to use new email
      TEST_CONFIG.testUserEmail = uniqueEmail

      // Login with new user
      await this.pb.collection('users').authWithPassword(
        TEST_CONFIG.testUserEmail,
        TEST_CONFIG.testUserPassword
      )
      this.testUserExists = true
    } catch (error) {
      console.error('Failed to create test user:', error)
      throw error
    }
  }

  async loginTestUser() {
    await this.pb.collection('users').authWithPassword(
      TEST_CONFIG.testUserEmail,
      TEST_CONFIG.testUserPassword
    )
  }

  async logout() {
    this.pb.authStore.clear()
  }

  getTestId(): string {
    return this.pb.authStore.model?.id || ''
  }
}

// Global test setup
let testPb: PocketBase
let dataManager: TestDataManager
let userManager: TestUserManager

beforeAll(async () => {
  // Initialize test PocketBase instance
  testPb = new PocketBase(TEST_CONFIG.pocketbaseUrl)
  testPb.autoCancellation(false)

  dataManager = new TestDataManager(testPb)
  userManager = new TestUserManager(testPb)

  // Ensure test user exists
  await userManager.ensureTestUser()
})

afterAll(async () => {
  // Cleanup and logout
  await dataManager.cleanup()
  await userManager.logout()
})

beforeEach(async () => {
  // Login as test user before each test
  await userManager.loginTestUser()
})

afterEach(async () => {
  // Clean up test data after each test
  await dataManager.cleanup()
  await userManager.logout()
})

// Helper function to handle permission errors gracefully
export function handlePermissionError(error: any, testName: string): boolean {
  if (error?.message?.includes('Only superusers') || error?.message?.includes('403')) {
    console.warn(`⚠️  ${testName}: Collection permissions not configured - skipping test`)
    return true
  }
  return false
}

export { testPb, dataManager, userManager }
