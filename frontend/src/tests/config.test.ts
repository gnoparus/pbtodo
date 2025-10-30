import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { config, validateConfig, getSecurityHeaders } from '../config/environment'

// Mock console methods to avoid noise in tests
const originalConsoleWarn = console.warn
const originalConsoleError = console.error
const originalConsoleLog = console.log

describe('Environment Configuration', () => {
  beforeEach(() => {
    // Mock console methods
    console.warn = vi.fn()
    console.error = vi.fn()
    console.log = vi.fn()
  })

  afterEach(() => {
    // Restore console methods
    console.warn = originalConsoleWarn
    console.error = originalConsoleError
    console.log = originalConsoleLog
  })

  describe('Default Configuration', () => {
    it('should have sensible default values', () => {
      expect(config.pocketbaseUrl).toBe('http://127.0.0.1:8090')
      expect(config.httpsEnabled).toBe(false)
      expect(config.sessionTimeoutMinutes).toBe(1440)
      expect(config.minPasswordLength).toBe(8)
      expect(config.requirePasswordComplexity).toBe(true)
      expect(config.maxLoginAttemptsPerMinute).toBe(5)
      expect(config.devMode).toBe(true)
      expect(config.allowedOrigins).toEqual(['http://localhost:5173', 'http://127.0.0.1:5173'])
      expect(config.securityHeaders).toBe(true)
      expect(config.cspEnabled).toBe(true)
      expect(config.hstsEnabled).toBe(true)
    })
  })

  describe('Configuration Validation', () => {
    it('should validate valid configuration', () => {
      expect(() => validateConfig()).not.toThrow()
    })

    it('should reject invalid PocketBase URL', () => {
      // Override config temporarily for test
      const originalUrl = config.pocketbaseUrl
      Object.defineProperty(config, 'pocketbaseUrl', { value: 'invalid-url' })

      expect(() => validateConfig()).toThrow('Invalid configuration detected')
      expect(console.error).toHaveBeenCalledWith('❌ Configuration validation failed:')
      expect(console.error).toHaveBeenCalledWith('  - Invalid PocketBase URL: invalid-url')

      // Restore original
      Object.defineProperty(config, 'pocketbaseUrl', { value: originalUrl })
    })

    it('should reject password length less than 6', () => {
      const originalLength = config.minPasswordLength
      Object.defineProperty(config, 'minPasswordLength', { value: 4 })

      expect(() => validateConfig()).toThrow('Invalid configuration detected')
      expect(console.error).toHaveBeenCalledWith('  - Minimum password length should be at least 6 characters')

      // Restore original
      Object.defineProperty(config, 'minPasswordLength', { value: originalLength })
    })

    it('should reject session timeout less than 5 minutes', () => {
      const originalTimeout = config.sessionTimeoutMinutes
      Object.defineProperty(config, 'sessionTimeoutMinutes', { value: 2 })

      expect(() => validateConfig()).toThrow('Invalid configuration detected')
      expect(console.error).toHaveBeenCalledWith('  - Session timeout should be at least 5 minutes')

      // Restore original
      Object.defineProperty(config, 'sessionTimeoutMinutes', { value: originalTimeout })
    })

    it('should reject max login attempts less than 1', () => {
      const originalAttempts = config.maxLoginAttemptsPerMinute
      Object.defineProperty(config, 'maxLoginAttemptsPerMinute', { value: 0 })

      expect(() => validateConfig()).toThrow('Invalid configuration detected')
      expect(console.error).toHaveBeenCalledWith('  - Maximum login attempts per minute should be at least 1')

      // Restore original
      Object.defineProperty(config, 'maxLoginAttemptsPerMinute', { value: originalAttempts })
    })
  })

  describe('Security Headers', () => {
    it('should return basic security headers', () => {
      const headers = getSecurityHeaders()

      expect(headers).toEqual(
        expect.objectContaining({
          'X-Frame-Options': 'DENY',
          'X-Content-Type-Options': 'nosniff',
          'X-XSS-Protection': '1; mode=block',
          'Referrer-Policy': 'strict-origin-when-cross-origin',
          'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
          'Content-Security-Policy': expect.stringContaining('default-src'),
        })
      )
    })

    it('should not include HSTS header when HTTPS is disabled', () => {
      const headers = getSecurityHeaders()
      expect(headers['Strict-Transport-Security']).toBeUndefined()
    })

    it('should include CSP with correct directives', () => {
      const headers = getSecurityHeaders()
      const csp = headers['Content-Security-Policy']

      expect(csp).toContain("default-src 'self'")
      expect(csp).toContain("script-src 'self' 'unsafe-inline'")
      expect(csp).toContain("style-src 'self' 'unsafe-inline'")
      expect(csp).toContain("img-src 'self' data: https:")
      expect(csp).toContain("font-src 'self'")
      expect(csp).toContain("connect-src 'self'")
      expect(csp).toContain("frame-ancestors 'none'")
      expect(csp).toContain("base-uri 'self'")
      expect(csp).toContain("form-action 'self'")
    })
  })

  describe('HTTPS Security Headers', () => {
    it('should include HSTS when HTTPS is enabled', () => {
      const originalHttpsEnabled = config.httpsEnabled
      Object.defineProperty(config, 'httpsEnabled', { value: true })

      const headers = getSecurityHeaders()
      expect(headers['Strict-Transport-Security']).toBe('max-age=31536000; includeSubDomains; preload')

      // Restore original
      Object.defineProperty(config, 'httpsEnabled', { value: originalHttpsEnabled })
    })
  })

  describe('Feature Flags', () => {
    it('should handle disabled security headers', () => {
      const originalSecurityHeaders = config.securityHeaders
      const originalCspEnabled = config.cspEnabled

      Object.defineProperty(config, 'securityHeaders', { value: false })
      Object.defineProperty(config, 'cspEnabled', { value: false })

      const headers = getSecurityHeaders()
      expect(headers).toEqual({})

      // Restore original
      Object.defineProperty(config, 'securityHeaders', { value: originalSecurityHeaders })
      Object.defineProperty(config, 'cspEnabled', { value: originalCspEnabled })
    })
  })

  describe('Development Logging', () => {
    it('should log configuration in development mode', () => {
      validateConfig()
      expect(console.log).toHaveBeenCalledWith(
        '🔧 Environment Configuration:',
        expect.objectContaining({
          pocketbaseUrl: expect.any(String),
          httpsEnabled: expect.any(Boolean),
          minPasswordLength: expect.any(Number),
        })
      )
    })
  })
})
