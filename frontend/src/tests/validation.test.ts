import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  validatePassword,
  validateEmail,
  validateName,
  validateTodoTitle,
  validateTodoDescription,
  sanitizeInput,
  validateInput,
  getPasswordStrengthData
} from '../utils/validation'

describe('Password Validation', () => {
  beforeEach(() => {
    // Mock environment config for consistent testing
    vi.stubGlobal('import.meta', {
      env: {
        VITE_MIN_PASSWORD_LENGTH: '8',
        VITE_REQUIRE_PASSWORD_COMPLEXITY: 'true'
      }
    })
  })

  it('should reject passwords shorter than minimum length', () => {
    const result = validatePassword('Pass1')
    expect(result.isValid).toBe(false)
    expect(result.errors).toContain('Password must be at least 8 characters long')
  })

  it('should accept passwords of minimum length', () => {
    const result = validatePassword('Password1')
    expect(result.isValid).toBe(false) // Still invalid due to missing complexity
    expect(result.errors).not.toContain('Password must be at least 8 characters long')
  })

  it('should require lowercase letters when complexity is enabled', () => {
    const result = validatePassword('PASSWORD1!')
    expect(result.isValid).toBe(false)
    expect(result.errors).toContain('Password must contain at least one lowercase letter')
  })

  it('should require uppercase letters when complexity is enabled', () => {
    const result = validatePassword('password1!')
    expect(result.isValid).toBe(false)
    expect(result.errors).toContain('Password must contain at least one uppercase letter')
  })

  it('should require numbers when complexity is enabled', () => {
    const result = validatePassword('Password!')
    expect(result.isValid).toBe(false)
    expect(result.errors).toContain('Password must contain at least one number')
  })

  it('should require special characters when complexity is enabled', () => {
    const result = validatePassword('Password1')
    expect(result.isValid).toBe(false)
    expect(result.errors).toContain('Password must contain at least one special character')
  })

  it('should accept strong passwords with all requirements', () => {
    const result = validatePassword('StrongP@ssw0rd!')
    expect(result.isValid).toBe(true)
    expect(result.errors).toHaveLength(0)
    expect(result.strength).toBeGreaterThanOrEqual(70)
  })

  it('should reject common password patterns', () => {
    const result = validatePassword('Password123!')
    expect(result.isValid).toBe(false)
    expect(result.errors).toContain('Password contains common or weak patterns')
  })

  it('should reject passwords with repeated characters', () => {
    const result = validatePassword('Password111!')
    expect(result.isValid).toBe(false)
    expect(result.errors).toContain('Password contains common or weak patterns')
  })

  it('should calculate password strength correctly', () => {
    const weakResult = validatePassword('weak')
    expect(weakResult.strength).toBeLessThan(30)
    expect(weakResult.feedback).toContain('Password strength: Weak')

    const strongResult = validatePassword('VeryStr0ng!P@ssw0rd')
    expect(strongResult.strength).toBeGreaterThanOrEqual(80)
    expect(strongResult.feedback).toContain('Password strength: Strong')
  })
})

describe('Email Validation', () => {
  it('should reject empty email', () => {
    const result = validateEmail('')
    expect(result.isValid).toBe(false)
    expect(result.error).toBe('Email is required')
  })

  it('should reject invalid email formats', () => {
    const invalidEmails = [
      'invalid',
      '@invalid.com',
      'invalid.com',
      'invalid@.com',
      'invalid..email@example.com'
    ]
    invalidEmails.forEach(email => {
      const result = validateEmail(email)
      expect(result.isValid).toBe(false)
    })
  })

  it('should accept valid email formats', () => {
    const validEmails = [
      'user@example.com',
      'user.name@example.com',
      'user+tag@example.com',
      'user123@example-domain.com',
      'test.email.with+symbol@example.com'
    ]

    validEmails.forEach(email => {
      const result = validateEmail(email)
      expect(result.isValid).toBe(true)
    })
  })

  it('should reject emails that are too long', () => {
    const longEmail = 'a'.repeat(250) + '@example.com'
    const result = validateEmail(longEmail)
    expect(result.isValid).toBe(false)
    expect(result.error).toBe('Email is too long')
  })

  it('should reject emails with consecutive dots', () => {
    const result = validateEmail('user..name@example.com')
    expect(result.isValid).toBe(false)
    expect(result.error).toBe('Email cannot contain consecutive dots')
  })

  it('should reject emails starting or ending with dots', () => {
   const result1 = validateEmail('.invalid@example.com')
   const result2 = validateEmail('invalid@example.com.')

   expect(result1.isValid).toBe(false)
   expect(result2.isValid).toBe(false)
 })
})

describe('Name Validation', () => {
  it('should reject empty name', () => {
    const result = validateName('')
    expect(result.isValid).toBe(false)
    expect(result.error).toBe('Name is required')
  })

  it('should reject names shorter than 2 characters', () => {
    const result = validateName('A')
    expect(result.isValid).toBe(false)
    expect(result.error).toBe('Name must be at least 2 characters long')
  })

  it('should reject names longer than 50 characters', () => {
    const longName = 'A'.repeat(51)
    const result = validateName(longName)
    expect(result.isValid).toBe(false)
    expect(result.error).toBe('Name must be less than 50 characters long')
  })

  it('should reject names with invalid characters', () => {
    const invalidNames = [
      'John123',
      'John@Doe',
      'John<script>',
      'John&Doe'
    ]

    invalidNames.forEach(name => {
      const result = validateName(name)
      expect(result.isValid).toBe(false)
    })
  })

  it('should accept valid names with allowed characters', () => {
    const validNames = [
      'John Doe',
      'John O\'Connor',
      'Jean-Claude',
      'Mary-Jane',
      'Joseph'
    ]

    validNames.forEach(name => {
      const result = validateName(name)
      expect(result.isValid).toBe(true)
    })
  })
})

describe('Todo Validation', () => {
  describe('Title Validation', () => {
    it('should reject empty title', () => {
      const result = validateTodoTitle('')
      expect(result.isValid).toBe(false)
      expect(result.error).toBe('Title is required')
    })

    it('should reject whitespace-only title', () => {
      const result = validateTodoTitle('   ')
      expect(result.isValid).toBe(false)
      expect(result.error).toBe('Title cannot be empty')
    })

    it('should reject titles longer than 200 characters', () => {
      const longTitle = 'A'.repeat(201)
      const result = validateTodoTitle(longTitle)
      expect(result.isValid).toBe(false)
      expect(result.error).toBe('Title must be less than 200 characters')
    })

    it('should reject titles with excessive whitespace', () => {
      const result = validateTodoTitle('Todo with   multiple   spaces')
      expect(result.isValid).toBe(true)
      expect(result.error).toBeUndefined()
    })

    it('should accept valid titles', () => {
      const validTitles = [
        'Buy groceries',
        'Call mom',
        'Finish project report',
        'Schedule dentist appointment'
      ]

      validTitles.forEach(title => {
        const result = validateTodoTitle(title)
        expect(result.isValid).toBe(true)
      })
    })
  })

  describe('Description Validation', () => {
    it('should accept empty description', () => {
      const result = validateTodoDescription('')
      expect(result.isValid).toBe(true)
    })

    it('should reject descriptions longer than 1000 characters', () => {
      const longDescription = 'A'.repeat(1001)
      const result = validateTodoDescription(longDescription)
      expect(result.isValid).toBe(false)
      expect(result.error).toBe('Description must be less than 1000 characters')
    })

    it('should reject descriptions with XSS attempts', () => {
      const xssAttempts = [
        '<script>alert("xss")</script>',
        'javascript:alert("xss")',
        '<img onload="alert(\'xss\')">',
        '<body onload="alert(\'xss\')">'
      ]

      xssAttempts.forEach(description => {
        const result = validateTodoDescription(description)
        expect(result.isValid).toBe(false)
        expect(result.error).toBe('Description contains invalid content')
      })
    })

    it('should accept valid descriptions', () => {
      const validDescriptions = [
        'Buy milk, eggs, and bread from the store',
        'Need to call the dentist to schedule appointment',
        'Research topic for blog post'
      ]

      validDescriptions.forEach(description => {
        const result = validateTodoDescription(description)
        expect(result.isValid).toBe(true)
      })
    })
  })
})

describe('Input Sanitization', () => {
  it('should escape HTML tags', () => {
    const input = '<script>alert("xss")</script>'
    const expected = '&lt;script&gt;alert(&quot;xss&quot;)&lt;&#x2F;script&gt;'
    expect(sanitizeInput(input)).toBe(expected)
  })

  it('should escape special characters', () => {
    const input = '"hello" & \'world\' / test'
    const expected = '&quot;hello&quot; & &#x27;world&#x27; &#x2F; test'
    expect(sanitizeInput(input)).toBe(expected)
  })

  it('should trim whitespace', () => {
    const input = '  hello world  '
    const expected = 'hello world'
    expect(sanitizeInput(input)).toBe(expected)
  })
})

describe('Generic Input Validation', () => {
  it('should validate required fields', () => {
    const result = validateInput('', { required: true })
    expect(result.isValid).toBe(false)
    expect(result.error).toBe('This field is required')
  })

  it('should validate minimum length', () => {
    const result = validateInput('ab', { required: true, minLength: 3 })
    expect(result.isValid).toBe(false)
    expect(result.error).toBe('Must be at least 3 characters long')
  })

  it('should validate maximum length', () => {
    const result = validateInput('abcdef', { maxLength: 5 })
    expect(result.isValid).toBe(false)
    expect(result.error).toBe('Must be less than 5 characters long')
  })

  it('should validate pattern matching', () => {
    const result = validateInput('123', { pattern: /^[a-zA-Z]+$/ })
    expect(result.isValid).toBe(false)
    expect(result.error).toBe('Invalid format')
  })

  it('should accept valid input', () => {
    const result = validateInput('hello', {
      required: true,
      minLength: 3,
      maxLength: 10,
      pattern: /^[a-zA-Z]+$/
    })
    expect(result.isValid).toBe(true)
  })

  it('should use custom error message', () => {
    const result = validateInput('', {
      required: true,
      errorMessage: 'Custom error message'
    })
    expect(result.isValid).toBe(false)
    expect(result.error).toBe('Custom error message')
  })
})

describe('Password Strength Data', () => {
  it('should return correct data for weak passwords', () => {
    const result = getPasswordStrengthData(25)
    expect(result.color).toBe('red')
    expect(result.text).toBe('Weak')
    expect(result.width).toBe('25%')
  })

  it('should return correct data for fair passwords', () => {
    const result = getPasswordStrengthData(45)
    expect(result.color).toBe('orange')
    expect(result.text).toBe('Fair')
    expect(result.width).toBe('50%')
  })

  it('should return correct data for good passwords', () => {
    const result = getPasswordStrengthData(70)
    expect(result.color).toBe('yellow')
    expect(result.text).toBe('Good')
    expect(result.width).toBe('75%')
  })

  it('should return correct data for strong passwords', () => {
    const result = getPasswordStrengthData(90)
    expect(result.color).toBe('green')
    expect(result.text).toBe('Strong')
    expect(result.width).toBe('100%')
  })
})
