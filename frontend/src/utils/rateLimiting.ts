/**
 * Client-Side Rate Limiting Utilities
 *
 * Implements rate limiting for authentication and API requests
 * to prevent abuse and enhance security.
 */

export interface RateLimitConfig {
  maxAttempts: number
  windowMs: number
  blockDurationMs: number
  resetOnSuccess?: boolean
}

export interface RateLimitStatus {
  attempts: number
  remaining: number
  isBlocked: boolean
  resetTime: number
  blockExpires: number
}

class RateLimiter {
  private attempts: number = 0
  private windowStart: number = Date.now()
  private blockExpires: number = 0
  private config: RateLimitConfig
  private storageKey: string

  constructor(config: RateLimitConfig, storageKey: string) {
    this.config = config
    this.storageKey = `rate_limit_${storageKey}`
    this.loadState()
  }

  /**
   * Check if action is allowed and record attempt
   */
  canAttempt(): RateLimitStatus {
    const now = Date.now()

    // Check if currently blocked
    if (now < this.blockExpires) {
      return {
        attempts: this.attempts,
        remaining: 0,
        isBlocked: true,
        resetTime: this.windowStart + this.config.windowMs,
        blockExpires: this.blockExpires
      }
    }

    // Reset window if expired
    if (now - this.windowStart >= this.config.windowMs) {
      this.reset()
    }

    // Check if attempt is allowed
    const remaining = Math.max(0, this.config.maxAttempts - this.attempts - 1)

    return {
      attempts: this.attempts,
      remaining,
      isBlocked: false,
      resetTime: this.windowStart + this.config.windowMs,
      blockExpires: 0
    }
  }

  /**
   * Record an attempt
   */
  recordAttempt(success: boolean = false): RateLimitStatus {
    const now = Date.now()

    // Check if currently blocked
    if (now < this.blockExpires) {
      return {
        attempts: this.attempts,
        remaining: 0,
        isBlocked: true,
        resetTime: this.windowStart + this.config.windowMs,
        blockExpires: this.blockExpires
      }
    }

    // Reset window if expired
    if (now - this.windowStart >= this.config.windowMs) {
      this.reset()
    }

    // Increment attempt
    this.attempts++

    // Block if limit exceeded
    if (this.attempts >= this.config.maxAttempts) {
      this.blockExpires = now + this.config.blockDurationMs
      this.saveState()
    }

    // Reset on success if configured
    if (success && this.config.resetOnSuccess) {
      this.reset()
    }

    this.saveState()

    return {
      attempts: this.attempts,
      remaining: Math.max(0, this.config.maxAttempts - this.attempts),
      isBlocked: this.attempts >= this.config.maxAttempts,
      resetTime: this.windowStart + this.config.windowMs,
      blockExpires: this.blockExpires
    }
  }

  /**
   * Reset the rate limiter
   */
  reset(): void {
    this.attempts = 0
    this.windowStart = Date.now()
    this.blockExpires = 0
    this.saveState()
  }

  /**
   * Get remaining attempts
   */
  getRemaining(): number {
    const now = Date.now()

    // Reset if window expired
    if (now - this.windowStart >= this.config.windowMs) {
      this.reset()
    }

    return Math.max(0, this.config.maxAttempts - this.attempts)
  }

  /**
   * Get time until reset (in seconds)
   */
  getTimeUntilReset(): number {
    const now = Date.now()
    const resetTime = this.windowStart + this.config.windowMs
    return Math.max(0, Math.ceil((resetTime - now) / 1000))
  }

  /**
   * Get time until block expires (in seconds)
   */
  getTimeUntilUnblock(): number {
    const now = Date.now()
    return Math.max(0, Math.ceil((this.blockExpires - now) / 1000))
  }

  /**
   * Save state to localStorage
   */
  private saveState(): void {
    const state = {
      attempts: this.attempts,
      windowStart: this.windowStart,
      blockExpires: this.blockExpires
    }

    try {
      localStorage.setItem(this.storageKey, JSON.stringify(state))
    } catch (error) {
      console.warn('Failed to save rate limit state:', error)
    }
  }

  /**
   * Load state from localStorage
   */
  private loadState(): void {
    try {
      const stored = localStorage.getItem(this.storageKey)
      if (stored) {
        const state = JSON.parse(stored)
        this.attempts = state.attempts || 0
        this.windowStart = state.windowStart || Date.now()
        this.blockExpires = state.blockExpires || 0
      }
    } catch (error) {
      console.warn('Failed to load rate limit state:', error)
    }
  }
}

// Pre-configured rate limiters for common use cases
const limiters = new Map<string, RateLimiter>()

/**
 * Get or create a rate limiter instance
 */
export function getRateLimiter(key: string, config: RateLimitConfig): RateLimiter {
  if (!limiters.has(key)) {
    limiters.set(key, new RateLimiter(config, key))
  }
  return limiters.get(key)!
}

/**
 * Authentication rate limiter (5 attempts per minute, 15 minute block)
 */
export function getAuthRateLimiter(): RateLimiter {
  return getRateLimiter('auth', {
    maxAttempts: 5,
    windowMs: 60 * 1000, // 1 minute
    blockDurationMs: 15 * 60 * 1000, // 15 minutes
    resetOnSuccess: true
  })
}

/**
 * Registration rate limiter (3 attempts per minute, 30 minute block)
 */
export function getRegistrationRateLimiter(): RateLimiter {
  return getRateLimiter('registration', {
    maxAttempts: 3,
    windowMs: 60 * 1000, // 1 minute
    blockDurationMs: 30 * 60 * 1000, // 30 minutes
    resetOnSuccess: true
  })
}

/**
 * Password reset rate limiter (3 attempts per hour, 1 hour block)
 */
export function getPasswordResetRateLimiter(): RateLimiter {
  return getRateLimiter('password_reset', {
    maxAttempts: 3,
    windowMs: 60 * 60 * 1000, // 1 hour
    blockDurationMs: 60 * 60 * 1000, // 1 hour
    resetOnSuccess: true
  })
}

/**
 * API request rate limiter (100 requests per minute, 1 minute block)
 */
export function getApiRateLimiter(): RateLimiter {
  return getRateLimiter('api', {
    maxAttempts: 100,
    windowMs: 60 * 1000, // 1 minute
    blockDurationMs: 60 * 1000, // 1 minute
    resetOnSuccess: false
  })
}

/**
 * Utility function to format time remaining
 */
export function formatTimeRemaining(seconds: number): string {
  if (seconds < 60) {
    return `${seconds} second${seconds !== 1 ? 's' : ''}`
  } else if (seconds < 3600) {
    const minutes = Math.floor(seconds / 60)
    return `${minutes} minute${minutes !== 1 ? 's' : ''}`
  } else {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    if (minutes === 0) {
      return `${hours} hour${hours !== 1 ? 's' : ''}`
    }
    return `${hours} hour${hours !== 1 ? 's' : ''} ${minutes} minute${minutes !== 1 ? 's' : ''}`
  }
}

/**
 * React hook for rate limiting
 */
export function useRateLimiter(key: string, config: RateLimitConfig) {
  const limiter = getRateLimiter(key, config)

  return {
    canAttempt: () => limiter.canAttempt(),
    recordAttempt: (success?: boolean) => limiter.recordAttempt(success),
    reset: () => limiter.reset(),
    getRemaining: () => limiter.getRemaining(),
    getTimeUntilReset: () => limiter.getTimeUntilReset(),
    getTimeUntilUnblock: () => limiter.getTimeUntilUnblock()
  }
}

export { RateLimiter as default }
