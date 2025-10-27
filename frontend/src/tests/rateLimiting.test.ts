import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import RateLimiter, {
  getRateLimiter,
  getAuthRateLimiter,
  getRegistrationRateLimiter,
  getPasswordResetRateLimiter,
  getApiRateLimiter,
  formatTimeRemaining,
  useRateLimiter
} from '../utils/rateLimiting'

describe('RateLimiter Class', () => {
  let rateLimiter: RateLimiter

  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear()

    // Create a rate limiter with test configuration
    rateLimiter = new RateLimiter({
      maxAttempts: 5,
      windowMs: 60000, // 1 minute
      blockDurationMs: 300000 // 5 minutes
    }, 'test')
  })

  afterEach(() => {
    localStorage.clear()
  })

  describe('canAttempt', () => {
    it('should allow attempts when under limit', () => {
      const status = rateLimiter.canAttempt()
      expect(status.isBlocked).toBe(false)
      expect(status.attempts).toBe(0)
      expect(status.remaining).toBe(5)
    })

    it('should block when limit exceeded', () => {
      // Record 5 attempts
      for (let i = 0; i < 5; i++) {
        rateLimiter.recordAttempt()
      }

      const status = rateLimiter.canAttempt()
      expect(status.isBlocked).toBe(true)
      expect(status.attempts).toBe(5)
      expect(status.remaining).toBe(0)
    })

    it('should reset after window expires', () => {
      // Record attempts
      for (let i = 0; i < 5; i++) {
        rateLimiter.recordAttempt()
      }

      // Mock time passage
      vi.useFakeTimers()
      vi.advanceTimersByTime(61000) // Just over 1 minute

      const status = rateLimiter.canAttempt()
      expect(status.isBlocked).toBe(false)
      expect(status.attempts).toBe(0)
      expect(status.remaining).toBe(5)

      vi.useRealTimers()
    })

    it('should handle block duration correctly', () => {
      // Record 5 attempts to trigger block
      for (let i = 0; i < 5; i++) {
        rateLimiter.recordAttempt()
      }

      const status = rateLimiter.canAttempt()
      expect(status.isBlocked).toBe(true)
      expect(status.blockExpires).toBeGreaterThan(Date.now())
    })
  })

  describe('recordAttempt', () => {
    it('should increment attempts on failure', () => {
      const status = rateLimiter.recordAttempt(false)
      expect(status.attempts).toBe(1)
      expect(status.remaining).toBe(4)
      expect(status.isBlocked).toBe(false)
    })

    it('should reset on success when configured', () => {
      const resetLimiter = new RateLimiter({
        maxAttempts: 5,
        windowMs: 60000,
        blockDurationMs: 300000,
        resetOnSuccess: true
      }, 'reset-test')

      // Record some attempts
      resetLimiter.recordAttempt(false)
      resetLimiter.recordAttempt(false)

      // Record success
      const status = resetLimiter.recordAttempt(true)
      expect(status.attempts).toBe(0)
      expect(status.remaining).toBe(5)
    })

    it('should not reset on success when not configured', () => {
      // Record some attempts
      rateLimiter.recordAttempt(false)
      rateLimiter.recordAttempt(false)

      // Record success
      const status = rateLimiter.recordAttempt(true)
      expect(status.attempts).toBe(3) // Should not reset
    })

    it('should block after exceeding limit', () => {
      let status = rateLimiter.recordAttempt()

      // Record 5 attempts
      for (let i = 0; i < 5; i++) {
        status = rateLimiter.recordAttempt()
      }

      expect(status.isBlocked).toBe(true)
      expect(status.remaining).toBe(0)
    })
  })

  describe('reset', () => {
    it('should reset all counters', () => {
      // Record some attempts
      rateLimiter.recordAttempt()
      rateLimiter.recordAttempt()

      // Reset
      rateLimiter.reset()

      const status = rateLimiter.canAttempt()
      expect(status.attempts).toBe(0)
      expect(status.remaining).toBe(5)
      expect(status.isBlocked).toBe(false)
    })
  })

  describe('getRemaining', () => {
    it('should return correct remaining attempts', () => {
      expect(rateLimiter.getRemaining()).toBe(5)

      rateLimiter.recordAttempt()
      expect(rateLimiter.getRemaining()).toBe(4)

      rateLimiter.recordAttempt()
      expect(rateLimiter.getRemaining()).toBe(3)
    })

    it('should reset after window expires', () => {
      rateLimiter.recordAttempt()
      rateLimiter.recordAttempt()

      // Mock time passage
      vi.useFakeTimers()
      vi.advanceTimersByTime(61000)

      expect(rateLimiter.getRemaining()).toBe(5)

      vi.useRealTimers()
    })
  })

  describe('persistence', () => {
    it('should save state to localStorage', () => {
      rateLimiter.recordAttempt()
      rateLimiter.recordAttempt()

      const stored = localStorage.getItem('rate_limit_test')
      expect(stored).toBeTruthy()

      const state = JSON.parse(stored!)
      expect(state.attempts).toBe(2)
      expect(state.windowStart).toBeGreaterThan(0)
    })

    it('should load state from localStorage', () => {
      // Pre-populate localStorage
      const testState = {
        attempts: 3,
        windowStart: Date.now() - 30000,
        blockExpires: 0
      }
      localStorage.setItem('rate_limit_test', JSON.stringify(testState))

      const newLimiter = new RateLimiter({
        maxAttempts: 5,
        windowMs: 60000,
        blockDurationMs: 300000
      }, 'test')

      const status = newLimiter.canAttempt()
      expect(status.attempts).toBe(3)
      expect(status.remaining).toBe(2)
    })

    it('should handle corrupted localStorage data', () => {
      localStorage.setItem('rate_limit_test', 'invalid json')

      const newLimiter = new RateLimiter({
        maxAttempts: 5,
        windowMs: 60000,
        blockDurationMs: 300000
      }, 'test')

      // Should not crash and use defaults
      const status = newLimiter.canAttempt()
      expect(status.attempts).toBe(0)
      expect(status.remaining).toBe(5)
    })
  })
})

describe('Pre-configured Rate Limiters', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  afterEach(() => {
    localStorage.clear()
  })

  it('should create auth rate limiter with correct config', () => {
    const limiter = getAuthRateLimiter()
    const status = limiter.canAttempt()

    expect(status.remaining).toBe(5) // 5 attempts per minute
  })

  it('should create registration rate limiter with correct config', () => {
    const limiter = getRegistrationRateLimiter()
    const status = limiter.canAttempt()

    expect(status.remaining).toBe(3) // 3 attempts per minute
  })

  it('should create password reset rate limiter with correct config', () => {
    const limiter = getPasswordResetRateLimiter()
    const status = limiter.canAttempt()

    expect(status.remaining).toBe(3) // 3 attempts per hour
  })

  it('should create API rate limiter with correct config', () => {
    const limiter = getApiRateLimiter()
    const status = limiter.canAttempt()

    expect(status.remaining).toBe(100) // 100 requests per minute
  })

  it('should reuse the same limiter instance', () => {
    const limiter1 = getAuthRateLimiter()
    const limiter2 = getAuthRateLimiter()

    expect(limiter1).toBe(limiter2)
  })
})

describe('Utility Functions', () => {
  describe('formatTimeRemaining', () => {
    it('should format seconds correctly', () => {
      expect(formatTimeRemaining(30)).toBe('30 seconds')
      expect(formatTimeRemaining(1)).toBe('1 second')
      expect(formatTimeRemaining(59)).toBe('59 seconds')
    })

    it('should format minutes correctly', () => {
      expect(formatTimeRemaining(60)).toBe('1 minute')
      expect(formatTimeRemaining(120)).toBe('2 minutes')
      expect(formatTimeRemaining(3599)).toBe('59 minutes')
    })

    it('should format hours correctly', () => {
      expect(formatTimeRemaining(3600)).toBe('1 hour')
      expect(formatTimeRemaining(7200)).toBe('2 hours')
      expect(formatTimeRemaining(86400)).toBe('24 hours')
    })

    it('should format hours and minutes correctly', () => {
      expect(formatTimeRemaining(3660)).toBe('1 hour 1 minute')
      expect(formatTimeRemaining(7320)).toBe('2 hours 2 minutes')
    })

    it('should handle edge cases', () => {
      expect(formatTimeRemaining(0)).toBe('0 seconds')
      expect(formatTimeRemaining(-1)).toBe('0 seconds')
    })
  })

  describe('useRateLimiter Hook', () => {
    it('should return rate limiter functions', () => {
      const hookResult = useRateLimiter('test', {
        maxAttempts: 5,
        windowMs: 60000,
        blockDurationMs: 300000
      })

      expect(hookResult.canAttempt).toBeInstanceOf(Function)
      expect(hookResult.recordAttempt).toBeInstanceOf(Function)
      expect(hookResult.reset).toBeInstanceOf(Function)
      expect(hookResult.getRemaining).toBeInstanceOf(Function)
      expect(hookResult.getTimeUntilReset).toBeInstanceOf(Function)
      expect(hookResult.getTimeUntilUnblock).toBeInstanceOf(Function)
    })
  })
})

describe('Edge Cases and Error Handling', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('should handle localStorage quota exceeded', () => {
    // Mock localStorage to throw quota exceeded error
    const originalSetItem = localStorage.setItem
    localStorage.setItem = vi.fn(() => {
      throw new Error('QuotaExceededError')
    })

    const limiter = new RateLimiter({
      maxAttempts: 5,
      windowMs: 60000,
      blockDurationMs: 300000
    }, 'quota-test')

    // Should not crash
    expect(() => limiter.recordAttempt()).not.toThrow()

    // Restore original
    localStorage.setItem = originalSetItem
  })

  it('should handle localStorage getItem errors', () => {
    // Mock localStorage to throw error
    const originalGetItem = localStorage.getItem
    localStorage.getItem = vi.fn(() => {
      throw new Error('Storage error')
    })

    const limiter = new RateLimiter({
      maxAttempts: 5,
      windowMs: 60000,
      blockDurationMs: 300000
    }, 'error-test')

    // Should not crash and use defaults
    const status = limiter.canAttempt()
    expect(status.attempts).toBe(0)
    expect(status.remaining).toBe(5)

    // Restore original
    localStorage.getItem = originalGetItem
  })

  it('should handle rapid successive calls', () => {
    const limiter = getAuthRateLimiter()

    // Make many rapid calls
    for (let i = 0; i < 10; i++) {
      limiter.recordAttempt()
    }

    const status = limiter.canAttempt()
    expect(status.isBlocked).toBe(true)
    expect(status.attempts).toBeGreaterThanOrEqual(5)
  })

  it('should handle concurrent limiter instances', () => {
    const limiter1 = getRateLimiter('concurrent1', {
      maxAttempts: 3,
      windowMs: 60000,
      blockDurationMs: 300000
    })

    const limiter2 = getRateLimiter('concurrent2', {
      maxAttempts: 3,
      windowMs: 60000,
      blockDurationMs: 300000
    })

    // Use both limiters independently
    limiter1.recordAttempt()
    limiter1.recordAttempt()
    limiter2.recordAttempt()

    const status1 = limiter1.canAttempt()
    const status2 = limiter2.canAttempt()

    expect(status1.attempts).toBe(2)
    expect(status2.attempts).toBe(1)
  })
})

describe('Performance Considerations', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('should handle large number of attempts efficiently', () => {
    const limiter = getApiRateLimiter() // 100 requests per minute

    const startTime = performance.now()

    // Record many attempts
    for (let i = 0; i < 50; i++) {
      limiter.recordAttempt()
    }

    const endTime = performance.now()
    const duration = endTime - startTime

    // Should complete quickly (under 100ms)
    expect(duration).toBeLessThan(100)
  })

  it('should minimize localStorage operations', () => {
    const limiter = getAuthRateLimiter()
    const originalSetItem = localStorage.setItem
    let setItemCalls = 0

    localStorage.setItem = vi.fn(function(...args) {
      setItemCalls++
      return originalSetItem.apply(localStorage, args as any)
    })

    // Make multiple calls
    for (let i = 0; i < 5; i++) {
      limiter.recordAttempt()
    }

    // Should only save to localStorage when state changes significantly
    expect(setItemCalls).toBeLessThanOrEqual(5)

    localStorage.setItem = originalSetItem
  })
})
