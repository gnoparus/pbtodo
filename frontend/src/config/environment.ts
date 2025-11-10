/**
 * Environment Configuration Service
 *
 * Centralized configuration management for production and development environments.
 * All sensitive configuration values are loaded from environment variables.
 *
 * Security Notes:
 * - Only VITE_ prefixed variables are exposed to the frontend by Vite
 * - Never store secrets in frontend environment variables
 * - Use secure backend endpoints for sensitive operations
 */

interface AppConfig {
  // PocketBase Configuration
  pocketbaseUrl: string

  // Security Configuration
  httpsEnabled: boolean

  // Session Configuration
  sessionTimeoutMinutes: number

  // Password Requirements
  minPasswordLength: number
  requirePasswordComplexity: boolean

  // Rate Limiting
  maxLoginAttemptsPerMinute: number

  // Development Mode
  devMode: boolean

  // CORS Configuration
  allowedOrigins: string[]

  // Feature Flags
  securityHeaders: boolean
  cspEnabled: boolean
  hstsEnabled: boolean
}

/**
 * Get environment variable with optional default value
 */
function getEnvVar(key: string, defaultValue?: string): string {
  const value = import.meta.env[key]
  if (value === undefined) {
    if (defaultValue !== undefined) {
      console.warn(`⚠️ Environment variable ${key} not found, using default: ${defaultValue}`)
      return defaultValue
    }
    throw new Error(`❌ Required environment variable ${key} is not set`)
  }
  return value
}

/**
 * Parse boolean environment variable
 */
function getBoolEnvVar(key: string, defaultValue: boolean = false): boolean {
  const value = import.meta.env[key]
  if (value === undefined) {
    console.warn(`⚠️ Environment variable ${key} not found, using default: ${defaultValue}`)
    return defaultValue
  }
  return value.toLowerCase() === 'true'
}

/**
 * Parse number environment variable
 */
function getNumberEnvVar(key: string, defaultValue: number): number {
  const value = import.meta.env[key]
  if (value === undefined) {
    console.warn(`⚠️ Environment variable ${key} not found, using default: ${defaultValue}`)
    return defaultValue
  }

  const parsed = parseInt(value, 10)
  if (isNaN(parsed)) {
    console.warn(`⚠️ Invalid number value for ${key}: ${value}, using default: ${defaultValue}`)
    return defaultValue
  }

  return parsed
}

/**
 * Parse comma-separated list
 */
function getListEnvVar(key: string, defaultValue: string[]): string[] {
  const value = import.meta.env[key]
  if (value === undefined) {
    console.warn(`⚠️ Environment variable ${key} not found, using default: ${defaultValue}`)
    return defaultValue
  }

  return value.split(',').map((item: string) => item.trim()).filter(Boolean)
}

/**
 * Environment configuration for the application
 */
export const config: AppConfig = {
  // PocketBase Configuration
  pocketbaseUrl: getEnvVar('VITE_POCKETBASE_URL', 'http://127.0.0.1:8090'),

  // Security Configuration
  httpsEnabled: getBoolEnvVar('VITE_HTTPS_ENABLED', false),

  // Session Configuration
  sessionTimeoutMinutes: getNumberEnvVar('VITE_SESSION_TIMEOUT_MINUTES', 1440), // 24 hours

  // Password Requirements
  minPasswordLength: getNumberEnvVar('VITE_MIN_PASSWORD_LENGTH', 8),
  requirePasswordComplexity: getBoolEnvVar('VITE_REQUIRE_PASSWORD_COMPLEXITY', true),

  // Rate Limiting
  maxLoginAttemptsPerMinute: getNumberEnvVar('VITE_MAX_LOGIN_ATTEMPTS_PER_MINUTE', 5),

  // Development Mode
  devMode: getBoolEnvVar('VITE_DEV_MODE', true),

  // CORS Configuration
  allowedOrigins: getListEnvVar('VITE_ALLOWED_ORIGINS', ['http://localhost:5173', 'http://127.0.0.1:5173']),

  // Feature Flags
  securityHeaders: getBoolEnvVar('VITE_ENABLE_SECURITY_HEADERS', true),
  cspEnabled: getBoolEnvVar('VITE_ENABLE_CSP', true),
  hstsEnabled: getBoolEnvVar('VITE_ENABLE_HSTS', true),
}

/**
 * Validate environment configuration
 * This function should be called during application initialization
 */
export function validateConfig(): void {
  const errors: string[] = []

  // Validate PocketBase URL
  try {
    new URL(config.pocketbaseUrl)
  } catch {
    errors.push(`Invalid PocketBase URL: ${config.pocketbaseUrl}`)
  }

  // Validate password requirements
  if (config.minPasswordLength < 6) {
    errors.push('Minimum password length should be at least 6 characters')
  }

  // Validate session timeout
  if (config.sessionTimeoutMinutes < 5) {
    errors.push('Session timeout should be at least 5 minutes')
  }

  // Validate rate limiting
  if (config.maxLoginAttemptsPerMinute < 1) {
    errors.push('Maximum login attempts per minute should be at least 1')
  }

  if (errors.length > 0) {
    console.error('❌ Configuration validation failed:')
    errors.forEach(error => console.error(`  - ${error}`))
    throw new Error('Invalid configuration detected')
  }

  // Log configuration in development mode only
  if (config.devMode) {
    console.log('🔧 Environment Configuration:', {
      pocketbaseUrl: config.pocketbaseUrl,
      httpsEnabled: config.httpsEnabled,
      minPasswordLength: config.minPasswordLength,
      requirePasswordComplexity: config.requirePasswordComplexity,
      sessionTimeoutMinutes: config.sessionTimeoutMinutes,
      maxLoginAttemptsPerMinute: config.maxLoginAttemptsPerMinute,
      devMode: config.devMode,
    })
  }
}

/**
 * Get security headers for the application
 */
export function getSecurityHeaders(): Record<string, string> {
  const headers: Record<string, string> = {}

  if (config.securityHeaders) {
    // Prevent clickjacking
    headers['X-Frame-Options'] = 'DENY'

    // Prevent MIME type sniffing
    headers['X-Content-Type-Options'] = 'nosniff'

    // Enable XSS protection
    headers['X-XSS-Protection'] = '1; mode=block'

    // Referrer policy
    headers['Referrer-Policy'] = 'strict-origin-when-cross-origin'

    // Permissions policy
    headers['Permissions-Policy'] = 'camera=(), microphone=(), geolocation=()'
  }

  // Content Security Policy - handled dynamically by securityHeaders.ts
  // This avoids hardcoding API URLs and allows environment-specific configuration

  // HSTS (only in HTTPS mode)
  if (config.hstsEnabled && config.httpsEnabled) {
    headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains; preload'
  }

  return headers
}

export default config
