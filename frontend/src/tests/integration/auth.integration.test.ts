import { describe, it, expect, beforeEach, vi } from 'vitest'
import { api } from '../../services/api'
import { TEST_CONFIG, MOCK_TEST_USER, MOCK_AUTH_TOKEN } from './setup'

// Mock the fetch function
global.fetch = vi.fn()

describe('Authentication Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    localStorage.setItem('authToken', MOCK_AUTH_TOKEN)
    api.reloadToken()
  })

  describe('User Registration', () => {
    it('should register a new user successfully', async () => {
      const mockResponse = {
        success: true,
        data: {
          token: MOCK_AUTH_TOKEN,
          user: MOCK_TEST_USER,
        },
      }

      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockResponse,
      })

      const result = await api.auth.register(
        'newuser@example.com',
        'Password123!',
        'New User'
      )

      expect(result).toBeDefined()
      expect(result.user).toBeDefined()
      expect(result.token).toBeDefined()
    })

    it('should reject registration with invalid email', async () => {
      const mockResponse = {
        success: false,
        error: 'Invalid email format',
      }

      ;(global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => mockResponse,
      })

      await expect(
        api.auth.register('invalid-email', 'Password123!', 'User')
      ).rejects.toThrow()
    })

    it('should validate password requirements', async () => {
      const mockResponse = {
        success: false,
        error: 'Password does not meet complexity requirements',
      }

      ;(global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => mockResponse,
      })

      await expect(
        api.auth.register('user@example.com', 'weak', 'User')
      ).rejects.toThrow()
    })
  })

  describe('User Login', () => {
    it('should login with valid credentials', async () => {
      const mockResponse = {
        success: true,
        data: {
          token: MOCK_AUTH_TOKEN,
          user: MOCK_TEST_USER,
        },
      }

      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockResponse,
      })

      const result = await api.auth.login(
        TEST_CONFIG.testUserEmail,
        TEST_CONFIG.testUserPassword
      )

      expect(result).toBeDefined()
      expect(result.user).toBeDefined()
      expect(result.token).toBeDefined()
      expect(localStorage.getItem('authToken')).toBe(MOCK_AUTH_TOKEN)
    })

    it('should reject login with invalid credentials', async () => {
      const mockResponse = {
        success: false,
        error: 'Invalid email or password',
      }

      ;(global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => mockResponse,
      })

      await expect(
        api.auth.login('invalid@example.com', 'wrongpassword')
      ).rejects.toThrow()

      expect(localStorage.getItem('authToken')).toBeNull()
    })

    it('should handle network errors gracefully', async () => {
      ;(global.fetch as any).mockRejectedValueOnce(
        new Error('Network request failed')
      )

      await expect(
        api.auth.login(TEST_CONFIG.testUserEmail, TEST_CONFIG.testUserPassword)
      ).rejects.toThrow()
    })
  })

  describe('Authentication State', () => {
    it('should maintain authentication state', async () => {
      const token = MOCK_AUTH_TOKEN
      localStorage.setItem('authToken', token)

      expect(api.auth.isAuthenticated()).toBe(true)

      api.auth.logout()

      expect(localStorage.getItem('authToken')).toBeNull()
      expect(api.auth.isAuthenticated()).toBe(false)
    })

    it('should detect expired tokens', async () => {
      // Create an expired token
      const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ0ZXN0IiwiZXhwIjoxNjAwMDAwMDAwfQ.mock'
      localStorage.setItem('authToken', expiredToken)

      expect(api.auth.isAuthenticated()).toBe(false)
      expect(localStorage.getItem('authToken')).toBeNull()
    })

    it('should decode current user from token', async () => {
      localStorage.setItem('authToken', MOCK_AUTH_TOKEN)

      const user = api.auth.getCurrentUser()

      expect(user).toBeDefined()
      expect(user?.id).toBeDefined()
    })
  })

  describe('Token Refresh', () => {
    it('should refresh authentication token', async () => {
      const newToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.new.token'
      const mockResponse = {
        success: true,
        data: {
          token: newToken,
          user: MOCK_TEST_USER,
        },
      }

      localStorage.setItem('authToken', MOCK_AUTH_TOKEN)

      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockResponse,
      })

      const result = await api.auth.refresh()

      expect(result).toBeDefined()
      expect(result.token).toBe(newToken)
      expect(localStorage.getItem('authToken')).toBe(newToken)
    })
  })
})
