/**
 * Validation utilities for input sanitization and security
 * Replicates frontend validation logic for server-side enforcement
 */

import type { ValidationResult } from '../types';

/**
 * Email validation with comprehensive checks
 */
export function validateEmail(email: string): ValidationResult {
  const errors: string[] = [];

  if (!email) {
    errors.push('Email is required');
    return { isValid: false, errors };
  }

  if (email.length > 254) {
    errors.push('Email is too long');
    return { isValid: false, errors };
  }

  // Basic email regex (RFC 5322 compliant simplified)
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

  if (!emailRegex.test(email)) {
    errors.push('Invalid email format');
    return { isValid: false, errors };
  }

  // Additional checks
  const [localPart, domain] = email.split('@');

  if (localPart.length > 64) {
    errors.push('Email local part is too long');
    return { isValid: false, errors };
  }

  if (domain.length > 253) {
    errors.push('Email domain is too long');
    return { isValid: false, errors };
  }

  // Check for consecutive dots
  if (email.includes('..')) {
    errors.push('Email cannot contain consecutive dots');
    return { isValid: false, errors };
  }

  // Check for leading/trailing dots
  if (email.startsWith('.') || email.endsWith('.')) {
    errors.push('Email cannot start or end with a dot');
    return { isValid: false, errors };
  }

  return { isValid: true, errors: [] };
}

/**
 * Password validation with security requirements
 */
export function validatePassword(password: string, minLength: number = 8): ValidationResult {
  const errors: string[] = [];

  if (!password) {
    errors.push('Password is required');
    return { isValid: false, errors };
  }

  // Length validation
  if (password.length < minLength) {
    errors.push(`Password must be at least ${minLength} characters long`);
  }

  // Character complexity requirements
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }

  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  if (!/[^a-zA-Z0-9]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }

  // Common password patterns
  const commonPatterns = [
    /^password/i,
    /^123456/,
    /^qwerty/i,
    /^admin/i,
    /^letmein/i,
    /(.)\1{2,}/, // 3+ consecutive same characters
  ];

  for (const pattern of commonPatterns) {
    if (pattern.test(password)) {
      errors.push('Password contains common or weak patterns');
      break;
    }
  }

  return { isValid: errors.length === 0, errors };
}

/**
 * Name validation with sanitization
 */
export function validateName(name: string): ValidationResult {
  const errors: string[] = [];

  if (!name) {
    errors.push('Name is required');
    return { isValid: false, errors };
  }

  if (name.length < 2) {
    errors.push('Name must be at least 2 characters long');
  }

  if (name.length > 50) {
    errors.push('Name must be less than 50 characters long');
  }

  // Check for allowed characters (letters, spaces, hyphens, apostrophes)
  const nameRegex = /^[a-zA-Z\s'-]+$/;
  if (!nameRegex.test(name)) {
    errors.push('Name can only contain letters, spaces, hyphens, and apostrophes');
  }

  // Check for dangerous content
  const dangerousPatterns = [/<script/i, /javascript:/i, /on\w+=/i, /expression\s*\(/i];

  for (const pattern of dangerousPatterns) {
    if (pattern.test(name)) {
      errors.push('Name contains invalid characters');
      break;
    }
  }

  return { isValid: errors.length === 0, errors };
}

/**
 * Todo title validation
 */
export function validateTodoTitle(title: string): ValidationResult {
  const errors: string[] = [];

  if (!title) {
    errors.push('Title is required');
    return { isValid: false, errors };
  }

  if (title.trim().length === 0) {
    errors.push('Title cannot be empty');
  }

  if (title.length > 200) {
    errors.push('Title must be less than 200 characters');
  }

  return { isValid: errors.length === 0, errors };
}

/**
 * Todo description validation
 */
export function validateTodoDescription(description: string | undefined): ValidationResult {
  const errors: string[] = [];

  if (!description) {
    return { isValid: true, errors: [] }; // Optional field
  }

  if (description.length > 1000) {
    errors.push('Description must be less than 1000 characters');
  }

  // Basic XSS prevention
  const xssPatterns = [/<script/i, /javascript:/i, /on\w+=/i];

  for (const pattern of xssPatterns) {
    if (pattern.test(description)) {
      errors.push('Description contains invalid content');
      break;
    }
  }

  return { isValid: errors.length === 0, errors };
}

/**
 * Todo priority validation
 */
export function validateTodoPriority(priority: string): ValidationResult {
  const errors: string[] = [];
  const validPriorities = ['low', 'medium', 'high'];

  if (!priority) {
    errors.push('Priority is required');
    return { isValid: false, errors };
  }

  if (!validPriorities.includes(priority)) {
    errors.push('Priority must be one of: low, medium, high');
  }

  return { isValid: errors.length === 0, errors };
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
    .trim();
}

/**
 * Validate UUID format
 */
export function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

/**
 * Validate request body has required fields
 */
export function validateRequiredFields(
  body: any,
  requiredFields: string[]
): ValidationResult {
  const errors: string[] = [];

  for (const field of requiredFields) {
    if (!(field in body) || body[field] === null || body[field] === undefined) {
      errors.push(`Missing required field: ${field}`);
    }
  }

  return { isValid: errors.length === 0, errors };
}

/**
 * Validate JSON body
 */
export async function parseAndValidateJSON(request: Request): Promise<any> {
  try {
    const contentType = request.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      throw new Error('Content-Type must be application/json');
    }

    return await request.json();
  } catch (error) {
    throw new Error('Invalid JSON body');
  }
}
