/**
 * Security Headers Tests
 *
 * Comprehensive test suite for security headers functionality.
 * Tests CSP implementation, header validation, and security monitoring.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  applySecurityHeaders,
  validateSecurityHeaders,
  initializeSecurityMonitoring,
  addSRIToIntegrityAttributes,
  createSecureScript,
  createSecureStyle,
  getCSPNonce
} from '../../services/securityHeaders'

// Mock the environment config
vi.mock('../../config/environment', () => ({
  config: {
    devMode: true,
    httpsEnabled: false,
    securityHeaders: true,
    cspEnabled: true,
    hstsEnabled: true
  },
  getSecurityHeaders: () => ({
    'X-Frame-Options': 'DENY',
    'X-Content-Type-Options': 'nosniff',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin'
  })
}))

describe('Security Headers Service', () => {
  beforeEach(() => {
    // Clear any existing meta tags
    document.head.innerHTML = ''

    // Clear window properties
    delete (window as any).__CSP_NONCE__

    // Reset crypto mock
    Object.defineProperty(global, 'crypto', {
      value: {
        getRandomValues: vi.fn().mockReturnValue(new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16]))
      },
      writable: true
    })
  })

  afterEach(() => {
    // Clean up DOM after each test
    document.head.innerHTML = ''
    delete (window as any).__CSP_NONCE__
  })

  describe('applySecurityHeaders', () => {
    it('should apply all required security headers', () => {
      applySecurityHeaders()

      const requiredHeaders = [
        'X-Frame-Options',
        'X-Content-Type-Options',
        'X-XSS-Protection',
        'Referrer-Policy',
        'Permissions-Policy'
      ]

      requiredHeaders.forEach(headerName => {
        const meta = document.querySelector(`meta[http-equiv="${headerName}"]`)
        expect(meta).toBeTruthy()
        expect(meta?.getAttribute('content')).toBeTruthy()
      })
    })

    it('should apply Content Security Policy', () => {
      applySecurityHeaders()

      const cspMeta = document.querySelector('meta[http-equiv="Content-Security-Policy"]')
      expect(cspMeta).toBeTruthy()

      const cspContent = cspMeta?.getAttribute('content')
      expect(cspContent).toContain("default-src 'self'")
      expect(cspContent).toContain("script-src 'self'")
      expect(cspContent).toContain("style-src 'self'")
    })

    it('should generate and store CSP nonce', () => {
      applySecurityHeaders()

      const nonce = getCSPNonce()
      expect(nonce).toBeTruthy()
      expect(typeof nonce).toBe('string')
      expect(nonce?.length).toBeGreaterThan(0)
    })

    it('should use provided CSP nonce', () => {
      const customNonce = 'test-nonce-123'
      applySecurityHeaders({ cspNonce: customNonce })

      const nonce = getCSPNonce()
      expect(nonce).toBe(customNonce)
    })

    it('should apply CSP in report-only mode when configured', () => {
      applySecurityHeaders({ cspReportOnly: true })

      const cspMeta = document.querySelector('meta[http-equiv="Content-Security-Policy-Report-Only"]')
      expect(cspMeta).toBeTruthy()

      const regularCspMeta = document.querySelector('meta[http-equiv="Content-Security-Policy"]')
      expect(regularCspMeta).toBeFalsy()
    })

    it('should build restrictive Permissions Policy', () => {
      applySecurityHeaders()

      const permissionsMeta = document.querySelector('meta[http-equiv="Permissions-Policy"]')
      expect(permissionsMeta).toBeTruthy()

      const permissionsContent = permissionsMeta?.getAttribute('content')
      expect(permissionsContent).toContain('camera=()')
      expect(permissionsContent).toContain('microphone=()')
      expect(permissionsContent).toContain('geolocation=()')
    })

    it('should allow fullscreen when configured', () => {
      applySecurityHeaders({ allowFullscreen: true })

      const permissionsMeta = document.querySelector('meta[http-equiv="Permissions-Policy"]')
      const permissionsContent = permissionsMeta?.getAttribute('content')
      expect(permissionsContent).not.toContain('fullscreen=()')
    })

    it('should allow sync XHR when configured', () => {
      applySecurityHeaders({ allowSyncXHR: true })

      const permissionsMeta = document.querySelector('meta[http-equiv="Permissions-Policy"]')
      const permissionsContent = permissionsMeta?.getAttribute('content')
      expect(permissionsContent).not.toContain('synchronous-xhr=()')
    })
  })

  describe('validateSecurityHeaders', () => {
    beforeEach(() => {
      applySecurityHeaders()
    })

    it('should validate all required headers are present', () => {
      const validation = validateSecurityHeaders()
      // Allow for warnings in dev mode (unsafe-inline is expected)
      expect(validation.missing).toHaveLength(0)
      expect(validation.valid).toBe(validation.warnings.length === 0)
    })

    it('should detect missing security headers', () => {
      // Remove a header
      const cspMeta = document.querySelector('meta[http-equiv="X-Frame-Options"]')
      cspMeta?.remove()

      const validation = validateSecurityHeaders()
      expect(validation.valid).toBe(false)
      expect(validation.missing).toContain('X-Frame-Options')
    })

    it('should warn about unsafe-inline in CSP', () => {
      // Add unsafe-inline to CSP
      const cspMeta = document.querySelector('meta[http-equiv="Content-Security-Policy"]')
      if (cspMeta) {
        cspMeta.setAttribute('content', "script-src 'self' 'unsafe-inline'")
      }

      const validation = validateSecurityHeaders()
      expect(validation.warnings).toContain('CSP contains unsafe-inline - consider using nonces')
    })

    it('should warn about unsafe-eval in CSP', () => {
      // Add unsafe-eval to CSP
      const cspMeta = document.querySelector('meta[http-equiv="Content-Security-Policy"]')
      if (cspMeta) {
        cspMeta.setAttribute('content', "script-src 'self' 'unsafe-eval'")
      }

      const validation = validateSecurityHeaders()
      expect(validation.warnings).toContain('CSP contains unsafe-eval - security risk')
    })
  })

  describe('initializeSecurityMonitoring', () => {
    it('should set up CSP violation listener', () => {
      const addEventListenerSpy = vi.spyOn(window, 'addEventListener')

      initializeSecurityMonitoring()

      expect(addEventListenerSpy).toHaveBeenCalledWith('securitypolicyviolation', expect.any(Function))

      addEventListenerSpy.mockRestore()
    })

    it('should handle CSP violation events', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      const mockEvent = {
        violatedDirective: 'script-src',
        effectiveDirective: 'script-src',
        blockedURI: 'inline',
        sourceFile: 'test.js',
        lineNumber: 1,
        columnNumber: 1,
        statusCode: 200
      }

      initializeSecurityMonitoring()

      // Simulate CSP violation
      const event = new Event('securitypolicyviolation') as any
      Object.assign(event, mockEvent)

      window.dispatchEvent(event)

      expect(consoleSpy).toHaveBeenCalledWith('🚨 CSP Violation:', expect.objectContaining({
        violatedDirective: 'script-src',
        blockedURI: 'inline'
      }))

      consoleSpy.mockRestore()
    })
  })

  describe('addSRIToIntegrityAttributes', () => {
    beforeEach(() => {
      document.head.innerHTML = ''
    })

    it('should warn about external resources without SRI', () => {
      // Add external stylesheet
      const link = document.createElement('link')
      link.setAttribute('rel', 'stylesheet')
      link.setAttribute('href', 'https://example.com/style.css')
      document.head.appendChild(link)

      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      addSRIToIntegrityAttributes()

      expect(consoleSpy).toHaveBeenCalledWith('⚠️ External resource missing SRI: https://example.com/style.css')

      consoleSpy.mockRestore()
    })

    it('should ignore local resources', () => {
      // Add local stylesheet
      const link = document.createElement('link')
      link.setAttribute('rel', 'stylesheet')
      link.setAttribute('href', '/local/style.css')
      document.head.appendChild(link)

      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      addSRIToIntegrityAttributes()

      expect(consoleSpy).not.toHaveBeenCalled()

      consoleSpy.mockRestore()
    })
  })

  describe('createSecureScript', () => {
    it('should create script with CSP nonce', () => {
      const nonce = 'test-nonce'
      applySecurityHeaders({ cspNonce: nonce })

      const script = createSecureScript('console.log("test")', 'test-script')

      expect(script.getAttribute('nonce')).toBe(nonce)
      expect(script.textContent).toBe('console.log("test")')
      expect(script.id).toBe('test-script')
    })

    it('should create script without nonce when not available', () => {
      const script = createSecureScript('console.log("test")')

      expect(script.getAttribute('nonce')).toBeNull()
      expect(script.textContent).toBe('console.log("test")')
    })
  })

  describe('createSecureStyle', () => {
    it('should create style with CSP nonce', () => {
      const nonce = 'test-nonce'
      applySecurityHeaders({ cspNonce: nonce })

      const style = createSecureStyle('body { color: red; }', 'test-style')

      expect(style.getAttribute('nonce')).toBe(nonce)
      expect(style.textContent).toBe('body { color: red; }')
      expect(style.id).toBe('test-style')
    })

    it('should create style without nonce when not available', () => {
      const style = createSecureStyle('body { color: red; }')

      expect(style.getAttribute('nonce')).toBeNull()
      expect(style.textContent).toBe('body { color: red; }')
    })
  })

  describe('CSP Nonce Management', () => {
    it('should store nonce in global window object', () => {
      applySecurityHeaders()

      expect((window as any).__CSP_NONCE__).toBeTruthy()
      expect(typeof (window as any).__CSP_NONCE__).toBe('string')
    })

    it('should generate unique nonces for each call', () => {
      const getRandomValuesSpy = vi.spyOn(crypto, 'getRandomValues')

      applySecurityHeaders()
      const nonce1 = getCSPNonce()

      // Reset and call again
      document.head.innerHTML = ''
      delete (window as any).__CSP_NONCE__

      // Reset and call with different crypto values
      document.head.innerHTML = ''
      delete (window as any).__CSP_NONCE__

      // Mock different crypto values
      const mockCrypto = global.crypto as any
      mockCrypto.getRandomValues.mockReturnValueOnce(
        new Uint8Array([17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32])
      )

      applySecurityHeaders()
      const nonce2 = getCSPNonce()

      expect(nonce1).not.toBe(nonce2)
      expect(getRandomValuesSpy).toHaveBeenCalledTimes(2)

      getRandomValuesSpy.mockRestore()
    })
  })

  describe('Security Header Integration', () => {
    it('should work with existing security configuration', () => {
      expect(() => {
        applySecurityHeaders({
          cspReportOnly: false,
          strictDynamic: true,
          allowFullscreen: false,
          allowPayment: false,
          allowSyncXHR: false
        })
      }).not.toThrow()

      const validation = validateSecurityHeaders()
      expect(validation.missing.length).toBe(0)
    })

    it('should handle configuration errors gracefully', () => {
      expect(() => {
        applySecurityHeaders({
          cspReportOnly: true
        })
      }).not.toThrow()

      const cspMeta = document.querySelector('meta[http-equiv="Content-Security-Policy-Report-Only"]')
      expect(cspMeta).toBeTruthy()
    })
  })
})
