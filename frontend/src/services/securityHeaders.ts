/**
 * Security Headers Service
 *
 * Actively injects and manages security headers for the application.
 * Provides comprehensive web security protection including CSP, HSTS,
 * XSS protection, and other essential security headers.
 */

import { config, getSecurityHeaders } from '../config/environment'

export interface SecurityHeaderConfig {
  // Content Security Policy
  cspNonce?: string
  cspReportOnly?: boolean
  cspReportUri?: string

  // Additional security options
  enableSRI?: boolean
  strictDynamic?: boolean
  reportTo?: string

  // Feature policy enhancements
  allowFullscreen?: boolean
  allowPayment?: boolean
  allowSyncXHR?: boolean

  // HTTPS configuration
  httpsEnabled?: boolean
}

/**
 * Generate a CSP nonce for inline scripts and styles
 */
function generateCSPNonce(): string {
  const array = new Uint8Array(16)
  crypto.getRandomValues(array)
  return btoa(String.fromCharCode(...array))
}

/**
 * Build enhanced Content Security Policy
 */
function buildCSP(config: SecurityHeaderConfig): string {
  const directives: string[] = []

  // Default directive
  directives.push("default-src 'self'")

  // Script sources with nonce support
  const scriptSrc = ["script-src 'self'"]
  if (config.cspNonce) {
    scriptSrc.push(`'nonce-${config.cspNonce}'`)
  }
  if (config.strictDynamic) {
    scriptSrc.push("'strict-dynamic'")
  }
  scriptSrc.push("'unsafe-inline'") // Keep for now, will be removed with nonce implementation
  directives.push(scriptSrc.join(' '))

  // Style sources with nonce support
  const styleSrc = ["style-src 'self'"]
  if (config.cspNonce) {
    styleSrc.push(`'nonce-${config.cspNonce}'`)
  }
  styleSrc.push("'unsafe-inline'") // Required for Tailwind CSS
  styleSrc.push('https://fonts.googleapis.com')
  directives.push(styleSrc.join(' '))

  // Font sources
  directives.push("font-src 'self' https://fonts.gstatic.com")

  // Image sources
  directives.push("img-src 'self' data: https: blob:")

  // Connect sources (API endpoints)
  const connectSrc = ["connect-src 'self'"]

  // Add API URLs based on environment
  const apiBaseUrl = import.meta.env.VITE_API_URL || 'https://pbtodo-api.bua.workers.dev'
  try {
    const apiHost = new URL(apiBaseUrl).origin
    connectSrc.push(apiHost)
  } catch (error) {
    console.error('Invalid API URL provided:', apiBaseUrl)
    // Optionally skip adding to CSP
  }

  if (config.cspReportUri) {
    connectSrc.push(config.cspReportUri)
  }
  directives.push(connectSrc.join(' '))

  // Media sources
  directives.push("media-src 'self'")

  // Object sources
  directives.push("object-src 'none'")

  // Child sources (iframe restrictions)
  directives.push("child-src 'none'")

  // Frame sources
  directives.push("frame-src 'none'")

  // Worker sources
  directives.push("worker-src 'self'")

  // Manifest source
  directives.push("manifest-src 'self'")

  // Base URI
  directives.push("base-uri 'self'")

  // Form action
  directives.push("form-action 'self'")

  // Frame ancestors (prevent clickjacking)
  directives.push("frame-ancestors 'none'")

  // Upgrade insecure requests (HTTPS enforcement)
  if (config.httpsEnabled) {
    directives.push("upgrade-insecure-requests")
  }

  // Report to (CSP violation reporting)
  if (config.reportTo) {
    directives.push(`report-to ${config.reportTo}`)
  }

  // Report URI (legacy reporting)
  if (config.cspReportUri) {
    directives.push(`report-uri ${config.cspReportUri}`)
  }

  return directives.join('; ')
}

/**
 * Build enhanced Permissions Policy
 */
function buildPermissionsPolicy(config: SecurityHeaderConfig): string {
  const permissions: string[] = []

  // Disabled by default (high security)
  const disabledFeatures = [
    'camera',
    'microphone',
    'geolocation',
    'magnetometer',
    'gyroscope',
    'accelerometer',
    'ambient-light-sensor',
    'autoplay',
    'encrypted-media',
    'fullscreen',
    'payment',
    'usb',
    'vr',
    'xr'
  ]

  // Conditionally allowed features
  if (config.allowFullscreen) {
    disabledFeatures.splice(disabledFeatures.indexOf('fullscreen'), 1)
  }

  if (config.allowPayment) {
    disabledFeatures.splice(disabledFeatures.indexOf('payment'), 1)
  }

  // Build the policy string
  const policies = disabledFeatures.map(feature => `${feature}=()`)
  permissions.push(...policies)

  // Special handling for sync XHR
  if (!config.allowSyncXHR) {
    permissions.push('synchronous-xhr=()')
  }

  return permissions.join(', ')
}

/**
 * Apply security headers to the document
 */
export function applySecurityHeaders(headerConfig: SecurityHeaderConfig = {}): void {
  const headers = getSecurityHeaders()
  const mergedConfig = { ...headerConfig }

  // Generate nonce if not provided
  if (!mergedConfig.cspNonce) {
    mergedConfig.cspNonce = generateCSPNonce()
  }

  // Enhanced Content Security Policy
  const csp = buildCSP({
    ...mergedConfig,
    httpsEnabled: config.httpsEnabled
  })
  const cspHeaderName = mergedConfig.cspReportOnly ? 'Content-Security-Policy-Report-Only' : 'Content-Security-Policy'

  // Apply CSP via meta tag (since we can't set HTTP headers from frontend)
  let cspMeta = document.querySelector(`meta[http-equiv="${cspHeaderName}"]`)
  if (!cspMeta) {
    cspMeta = document.createElement('meta')
    cspMeta.setAttribute('http-equiv', cspHeaderName)
    document.head.appendChild(cspMeta)
  }
  cspMeta.setAttribute('content', csp)

  // Apply other security headers via meta tags
  Object.entries(headers).forEach(([name, value]) => {
    // Skip CSP as it's handled separately
    if (name === 'Content-Security-Policy') return

    let meta = document.querySelector(`meta[http-equiv="${name}"]`)
    if (!meta) {
      meta = document.createElement('meta')
      meta.setAttribute('http-equiv', name)
      document.head.appendChild(meta)
    }
    meta.setAttribute('content', value)
  })

  // Enhanced Permissions Policy
  const permissionsPolicy = buildPermissionsPolicy(mergedConfig)
  let permissionsMeta = document.querySelector('meta[http-equiv="Permissions-Policy"]')
  if (!permissionsMeta) {
    permissionsMeta = document.createElement('meta')
    permissionsMeta.setAttribute('http-equiv', 'Permissions-Policy')
    document.head.appendChild(permissionsMeta)
  }
  permissionsMeta.setAttribute('content', permissionsPolicy)

  // Store nonce for inline scripts/styles
  if (mergedConfig.cspNonce) {
    window.__CSP_NONCE__ = mergedConfig.cspNonce
  }

  // Log security headers in development
  if (config.devMode) {
    console.log('🛡️ Security Headers Applied:', {
      csp,
      permissionsPolicy,
      headers,
      nonce: mergedConfig.cspNonce
    })
  }
}

/**
 * Get the current CSP nonce
 */
export function getCSPNonce(): string | undefined {
  return (window as any).__CSP_NONCE__
}

/**
 * Add Subresource Integrity to external resources
 */
export function addSRIToIntegrityAttributes(): void {
  const externalResources = document.querySelectorAll('link[rel="stylesheet"], script[src]')

  externalResources.forEach(resource => {
    const element = resource as HTMLLinkElement | HTMLScriptElement
    const src = element.getAttribute('href') || element.getAttribute('src')

    // Only add SRI to external resources from different origins
    if (src && (src.startsWith('http://') || src.startsWith('https://'))) {
      // In a real implementation, you would precompute and store SRI hashes
      // For now, we'll just add a placeholder that should be replaced
      if (!element.getAttribute('integrity')) {
        console.warn(`⚠️ External resource missing SRI: ${src}`)
        // element.setAttribute('integrity', 'sha384-PLACEHOLDER_HASH')
      }
    }
  })
}

/**
 * Validate that all required security headers are present
 */
export function validateSecurityHeaders(): { valid: boolean; missing: string[]; warnings: string[] } {
  const requiredHeaders = [
    'X-Frame-Options',
    'X-Content-Type-Options',
    'X-XSS-Protection',
    'Referrer-Policy',
    'Content-Security-Policy',
    'Permissions-Policy'
  ]

  const missing: string[] = []
  const warnings: string[] = []

  requiredHeaders.forEach(headerName => {
    const meta = document.querySelector(`meta[http-equiv="${headerName}"]`)
    if (!meta) {
      missing.push(headerName)
    }
  })

  // Check for HTTPS in production
  if (!config.devMode && !config.httpsEnabled && location.protocol !== 'https:') {
    warnings.push('HTTPS not enabled in production')
  }

  // Check CSP effectiveness
  const cspMeta = document.querySelector('meta[http-equiv="Content-Security-Policy"]')
  if (cspMeta) {
    const csp = cspMeta.getAttribute('content') || ''
    if (csp.includes("'unsafe-inline'")) {
      warnings.push('CSP contains unsafe-inline - consider using nonces')
    }
    if (csp.includes("'unsafe-eval'")) {
      warnings.push('CSP contains unsafe-eval - security risk')
    }
  }

  return {
    valid: missing.length === 0 && warnings.length === 0,
    missing,
    warnings
  }
}

/**
 * Initialize security monitoring
 */
export function initializeSecurityMonitoring(): void {
  // CSP violation reporting
  if (window.addEventListener) {
    window.addEventListener('securitypolicyviolation', (event) => {
      console.error('🚨 CSP Violation:', {
        violatedDirective: event.violatedDirective,
        effectiveDirective: event.effectiveDirective,
        blockedURI: event.blockedURI,
        sourceFile: event.sourceFile,
        lineNumber: event.lineNumber,
        columnNumber: event.columnNumber,
        statusCode: event.statusCode
      })

      // In production, send this to your monitoring service
      if (!config.devMode) {
        // TODO: Send to monitoring service
        // sendSecurityEvent('csp_violation', event)
      }
    })
  }

  // Performance monitoring for security headers impact
  if (config.devMode && performance.measure) {
    const startMark = 'security-headers-start'
    const endMark = 'security-headers-end'

    performance.mark(startMark)

    setTimeout(() => {
      performance.mark(endMark)
      performance.measure('Security Headers Initialization', startMark, endMark)

      const measures = performance.getEntriesByName('Security Headers Initialization')
      if (measures.length > 0) {
        console.log('⚡ Security headers initialization took:', measures[0].duration, 'ms')
      }
    }, 0)
  }
}

/**
 * Create a secure nonce-based script tag
 */
export function createSecureScript(content: string, id?: string): HTMLScriptElement {
  const script = document.createElement('script')
  const nonce = getCSPNonce()

  if (nonce) {
    script.setAttribute('nonce', nonce)
  }

  script.textContent = content

  if (id) {
    script.id = id
  }

  return script
}

/**
 * Create a secure nonce-based style tag
 */
export function createSecureStyle(content: string, id?: string): HTMLStyleElement {
  const style = document.createElement('style')
  const nonce = getCSPNonce()

  if (nonce) {
    style.setAttribute('nonce', nonce)
  }

  style.textContent = content

  if (id) {
    style.id = id
  }

  return style
}

// Type declarations for global window object
declare global {
  interface Window {
    __CSP_NONCE__?: string
  }
}

export default {
  applySecurityHeaders,
  getCSPNonce,
  addSRIToIntegrityAttributes,
  validateSecurityHeaders,
  initializeSecurityMonitoring,
  createSecureScript,
  createSecureStyle
}
