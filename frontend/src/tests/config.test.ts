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
      expect(config.apiBaseUrl).toBe('http://127.0.0.1:8787/api')
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

    it('should reject invalid API URL', () => {
      // Override config temporarily for test
      const originalUrl = config.apiBaseUrl
      Object.defineProperty(config, 'apiBaseUrl', { value: 'invalid-url', configurable: true })

      expect(() => validateConfig()).toThrow('Invalid configuration detected')
      expect(console.error).toHaveBeenCalledWith('❌ Configuration validation failed:')
      expect(console.error).toHaveBeenCalledWith('  - Invalid API URL: invalid-url')

      // Restore original
      Object.defineProperty(config, 'apiBaseUrl', { value: originalUrl, configurable: true })
    })

    it('should reject password length less than 6', () => {
      const originalLength = config.minPasswordLength
      Object.defineProperty(config, 'minPasswordLength', { value: 4, configurable: true })

      expect(() => validateConfig()).toThrow('Invalid configuration detected')
      expect(console.error).toHaveBeenCalledWith('  - Minimum password length should be at least 6 characters')

      // Restore original
      Object.defineProperty(config, 'minPasswordLength', { value: originalLength, configurable: true })
    })

    it('should reject session timeout less than 5 minutes', () => {
      const originalTimeout = config.sessionTimeoutMinutes
      Object.defineProperty(config, 'sessionTimeoutMinutes', { value: 2, configurable: true })

      expect(() => validateConfig()).toThrow('Invalid configuration detected')
      expect(console.error).toHaveBeenCalledWith('  - Session timeout should be at least 5 minutes')

      // Restore original
      Object.defineProperty(config, 'sessionTimeoutMinutes', { value: originalTimeout, configurable: true })
    })

    it('should reject max login attempts less than 1', () => {
      const originalAttempts = config.maxLoginAttemptsPerMinute
      Object.defineProperty(config, 'maxLoginAttemptsPerMinute', { value: 0, configurable: true })

      expect(() => validateConfig()).toThrow('Invalid configuration detected')
      expect(console.error).toHaveBeenCalledWith('  - Maximum login attempts per minute should be at least 1')

      // Restore original
      Object.defineProperty(config, 'maxLoginAttemptsPerMinute', { value: originalAttempts, configurable: true })
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
        })
      )
    })

    it('should not include HSTS header when HTTPS is disabled', () => {
      const headers = getSecurityHeaders()
      expect(headers['Strict-Transport-Security']).toBeUndefined()
    })

    it('should include security headers when enabled', () => {
      const headers = getSecurityHeaders()
      expect(Object.keys(headers).length).toBeGreaterThan(0)
      expect(headers['X-Frame-Options']).toBe('DENY')
    })
  })

  describe('HTTPS Security Headers', () => {
    it('should include HSTS when HTTPS is enabled', () => {
      const originalHttpsEnabled = config.httpsEnabled
      Object.defineProperty(config, 'httpsEnabled', { value: true, configurable: true })

      const headers = getSecurityHeaders()
      expect(headers['Strict-Transport-Security']).toBe('max-age=31536000; includeSubDomains; preload')

      // Restore original
      Object.defineProperty(config, 'httpsEnabled', { value: originalHttpsEnabled, configurable: true })
    })
  })

  describe('Feature Flags', () => {
    it('should handle disabled security headers', () => {
      const originalSecurityHeaders = config.securityHeaders
      const originalCspEnabled = config.cspEnabled

      Object.defineProperty(config, 'securityHeaders', { value: false, configurable: true })
      Object.defineProperty(config, 'cspEnabled', { value: false, configurable: true })

      const headers = getSecurityHeaders()
      expect(headers).toEqual({})

      // Restore original
      Object.defineProperty(config, 'securityHeaders', { value: originalSecurityHeaders, configurable: true })
      Object.defineProperty(config, 'cspEnabled', { value: originalCspEnabled, configurable: true })
    })
  })

  describe('Development Logging', () => {
    it('should log configuration in development mode', () => {
      validateConfig()
      expect(console.log).toHaveBeenCalledWith(
        '🔧 Environment Configuration:',
        expect.objectContaining({
          apiBaseUrl: expect.any(String),
          httpsEnabled: expect.any(Boolean),
          minPasswordLength: expect.any(Number),
        })
      )
    })
  })
})
