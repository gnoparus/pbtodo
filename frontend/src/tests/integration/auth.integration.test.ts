import { describe, it, expect, beforeEach } from 'vitest'
import PocketBase from 'pocketbase'
import { TEST_CONFIG } from './setup'

describe('Authentication Integration Tests', () => {
  let pb: PocketBase

  beforeEach(() => {
    pb = new PocketBase(TEST_CONFIG.pocketbaseUrl)
    pb.autoCancellation(false)
  })

  describe('User Registration', () => {
    it('should register a new user successfully', async () => {
      const randomEmail = `test_${Date.now()}@example.com`
      const password = 'testpassword123'
      const name = 'Test User'

      const result = await pb.collection('users').create({
        email: randomEmail,
        password,
        passwordConfirm: password,
        name,
      })

      expect(result).toBeDefined()
      expect(result.id).toBeDefined()
      expect(result.email).toBe(randomEmail)
      expect(result.name).toBe(name)
    })

    it('should reject registration with invalid email', async () => {
      const promise = pb.collection('users').create({
        email: 'invalid-email',
        password: 'testpassword123',
        passwordConfirm: 'testpassword123',
        name: 'Test User',
      })

      await expect(promise).rejects.toThrow()
    })

    it('should reject registration with mismatched passwords', async () => {
      const randomEmail = `test_${Date.now()}@example.com`

      const promise = pb.collection('users').create({
        email: randomEmail,
        password: 'testpassword123',
        passwordConfirm: 'differentpassword',
        name: 'Test User',
      })

      await expect(promise).rejects.toThrow()
    })
  })

  describe('User Login', () => {
    it('should login with valid credentials', async () => {
      const result = await pb.collection('users').authWithPassword(
        TEST_CONFIG.testUserEmail,
        TEST_CONFIG.testUserPassword
      )

      expect(result).toBeDefined()
      expect(result.record).toBeDefined()
      expect(result.token).toBeDefined()
      expect(pb.authStore.isValid).toBe(true)
      expect(pb.authStore.model?.email).toBe(TEST_CONFIG.testUserEmail)
    })

    it('should reject login with invalid credentials', async () => {
      const promise = pb.collection('users').authWithPassword(
        'invalid@example.com',
        'wrongpassword'
      )

      await expect(promise).rejects.toThrow()
      expect(pb.authStore.isValid).toBe(false)
    })
  })

  describe('Authentication State', () => {
    it('should maintain authentication state', async () => {
      // Login
      await pb.collection('users').authWithPassword(
        TEST_CONFIG.testUserEmail,
        TEST_CONFIG.testUserPassword
      )

      expect(pb.authStore.isValid).toBe(true)

      // Logout
      pb.authStore.clear()
      expect(pb.authStore.isValid).toBe(false)
      expect(pb.authStore.token).toBe('')
      expect(pb.authStore.model).toBeNull()
    })
  })
})
