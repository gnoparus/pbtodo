/**
 * Enhanced Validation Utilities
 *
 * Provides comprehensive validation for user input with security focus.
 * Implements production-grade password requirements and input sanitization.
 */

import { config } from '../config/environment'

export interface PasswordValidationResult {
  isValid: boolean
  errors: string[]
  strength: number // 0-100
  feedback: string[]
}

export interface ValidationResult {
  isValid: boolean
  error?: string
}

/**
 * Password strength calculation based on multiple factors
 */
function calculatePasswordStrength(password: string): number {
  let strength = 0

  // Length contribution (up to 40 points)
  if (password.length >= 8) strength += 20
  if (password.length >= 12) strength += 10
  if (password.length >= 16) strength += 10

  // Character variety (up to 40 points)
  if (/[a-z]/.test(password)) strength += 10 // lowercase
  if (/[A-Z]/.test(password)) strength += 10 // uppercase
  if (/[0-9]/.test(password)) strength += 10 // numbers
  if (/[^a-zA-Z0-9]/.test(password)) strength += 10 // symbols

  // Pattern variety (up to 20 points)
  if (/(.{3}).*?\1/.test(password)) strength -= 10 // repeated patterns penalty
  if (/^[a-zA-Z]+$|^[0-9]+$/.test(password)) strength -= 10 // single char type penalty

  return Math.max(0, Math.min(100, strength))
}

/**
 * Comprehensive password validation with configurable requirements
 */
export function validatePassword(password: string): PasswordValidationResult {
  const errors: string[] = []
  const feedback: string[] = []

  // Length validation
  if (password.length < config.minPasswordLength) {
    errors.push(`Password must be at least ${config.minPasswordLength} characters long`)
  } else {
    feedback.push(`Good length: ${password.length} characters`)
  }

  // Character complexity requirements
  if (config.requirePasswordComplexity) {
    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter')
    }

    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter')
    }

    if (!/[0-9]/.test(password)) {
      errors.push('Password must contain at least one number')
    }

    if (!/[^a-zA-Z0-9]/.test(password)) {
      errors.push('Password must contain at least one special character')
    }

    // Check for variety
    const charTypes = [
      /[a-z]/.test(password),
      /[A-Z]/.test(password),
      /[0-9]/.test(password),
      /[^a-zA-Z0-9]/.test(password)
    ].filter(Boolean).length

    if (charTypes >= 3) {
      feedback.push('Good character variety')
    }
  }

  // Common password patterns (basic check)
  const commonPatterns = [
    /^password/i,
    /^123456/,
    /^qwerty/i,
    /^admin/i,
    /^letmein/i,
    /(.)\1{2,}/ // 3+ consecutive same characters
  ]

  for (const pattern of commonPatterns) {
    if (pattern.test(password)) {
      errors.push('Password contains common or weak patterns')
      break
    }
  }

  // Personal information check (placeholder for implementation)
  // This should check against user's email, name, etc.
  if (password.toLowerCase().includes('password')) {
    feedback.push('Avoid using the word "password" in your password')
  }

  const strength = calculatePasswordStrength(password)

  // Strength feedback
  if (strength < 30) {
    feedback.push('Password strength: Weak')
  } else if (strength < 60) {
    feedback.push('Password strength: Fair')
  } else if (strength < 80) {
    feedback.push('Password strength: Good')
  } else {
    feedback.push('Password strength: Strong')
  }

  return {
    isValid: errors.length === 0,
    errors,
    strength,
    feedback
  }
}

/**
 * Email validation with comprehensive checks
 */
export function validateEmail(email: string): ValidationResult {
  if (!email) {
    return { isValid: false, error: 'Email is required' }
  }

  if (email.length > 254) {
    return { isValid: false, error: 'Email is too long' }
  }

  // Basic email regex (RFC 5322 compliant simplified)
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/

  if (!emailRegex.test(email)) {
    return { isValid: false, error: 'Invalid email format' }
  }

  // Additional checks
  const [localPart, domain] = email.split('@')

  if (localPart.length > 64) {
    return { isValid: false, error: 'Email local part is too long' }
  }

  if (domain.length > 253) {
    return { isValid: false, error: 'Email domain is too long' }
  }

  // Check for consecutive dots
  if (email.includes('..')) {
    return { isValid: false, error: 'Email cannot contain consecutive dots' }
  }

  // Check for leading/trailing dots
  if (email.startsWith('.') || email.endsWith('.')) {
    return { isValid: false, error: 'Email cannot start or end with a dot' }
  }

  return { isValid: true }
}

/**
 * Name validation with sanitization
 */
export function validateName(name: string): ValidationResult {
  if (!name) {
    return { isValid: false, error: 'Name is required' }
  }

  if (name.length < 2) {
    return { isValid: false, error: 'Name must be at least 2 characters long' }
  }

  if (name.length > 50) {
    return { isValid: false, error: 'Name must be less than 50 characters long' }
  }

  // Check for allowed characters (letters, spaces, hyphens, apostrophes)
  const nameRegex = /^[a-zA-Z\s'-]+$/
  if (!nameRegex.test(name)) {
    return { isValid: false, error: 'Name can only contain letters, spaces, hyphens, and apostrophes' }
  }

  // Check for dangerous content
  const dangerousPatterns = [
    /<script/i,
    /javascript:/i,
    /on\w+=/i,
    /expression\s*\(/i
  ]

  for (const pattern of dangerousPatterns) {
    if (pattern.test(name)) {
      return { isValid: false, error: 'Name contains invalid characters' }
    }
  }

  return { isValid: true }
}

/**
 * Todo title validation
 */
export function validateTodoTitle(title: string): ValidationResult {
  if (!title) {
    return { isValid: false, error: 'Title is required' }
  }

  if (title.trim().length === 0) {
    return { isValid: false, error: 'Title cannot be empty' }
  }

  if (title.length > 200) {
    return { isValid: false, error: 'Title must be less than 200 characters' }
  }

  // Check for excessive whitespace
  if (title.trim().length !== title.length && /\s{3,}/.test(title)) {
    return { isValid: false, error: 'Title contains excessive whitespace' }
  }

  return { isValid: true }
}

/**
 * Todo description validation
 */
export function validateTodoDescription(description: string): ValidationResult {
  if (!description) {
    return { isValid: true } // Optional field
  }

  if (description.length > 1000) {
    return { isValid: false, error: 'Description must be less than 1000 characters' }
  }

  // Basic XSS prevention
  const xssPatterns = [
    /<script/i,
    /javascript:/i,
    /on\w+=/i
  ]

  for (const pattern of xssPatterns) {
    if (pattern.test(description)) {
      return { isValid: false, error: 'Description contains invalid content' }
    }
  }

  return { isValid: true }
}

/**
 * Sanitize user input to prevent XSS
 */
export function sanitizeInput(input: string): string {
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
    .trim()
}

/**
 * Generic input validation with customizable rules
 */
export function validateInput(input: string, rules: {
  required?: boolean
  minLength?: number
  maxLength?: number
  pattern?: RegExp
  errorMessage?: string
}): ValidationResult {
  if (rules.required && !input) {
    return { isValid: false, error: rules.errorMessage || 'This field is required' }
  }

  if (rules.minLength && input.length < rules.minLength) {
    return {
      isValid: false,
      error: rules.errorMessage || `Must be at least ${rules.minLength} characters long`
    }
  }

  if (rules.maxLength && input.length > rules.maxLength) {
    return {
      isValid: false,
      error: rules.errorMessage || `Must be less than ${rules.maxLength} characters long`
    }
  }

  if (rules.pattern && !rules.pattern.test(input)) {
    return {
      isValid: false,
      error: rules.errorMessage || 'Invalid format'
    }
  }

  return { isValid: true }
}

/**
 * Password strength meter component data
 */
export function getPasswordStrengthData(strength: number) {
  if (strength < 30) {
    return {
      color: 'red',
      text: 'Weak',
      width: '25%'
    }
  } else if (strength < 60) {
    return {
      color: 'orange',
      text: 'Fair',
      width: '50%'
    }
  } else if (strength < 80) {
    return {
      color: 'yellow',
      text: 'Good',
      width: '75%'
    }
  } else {
    return {
      color: 'green',
      text: 'Strong',
      width: '100%'
    }
  }
}
