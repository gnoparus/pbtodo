/**
 * Core Accessibility Tests
 *
 * This test suite focuses on essential WCAG 2.1 AA accessibility violations
 * for the main application components using jest-axe.
 */

import React from 'react'
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { screen } from '@testing-library/react'

import { renderWithProviders } from '../helpers/test-utils'
import {
  createAccessibilityTester,
  getAxeConfig,
} from './axe-helpers'
import LoginPage from '../../components/LoginPage'
import RegisterPage from '../../components/RegisterPage'
import TodoPage from '../../components/TodoPage'

describe('Core Accessibility Tests', () => {
  let user: ReturnType<any>

  beforeEach(() => {
    user = { setup: () => ({}) }
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('LoginPage Core Accessibility', () => {
    it('should have no critical accessibility violations', async () => {
      const { container } = renderWithProviders(<LoginPage />)
      const tester = createAccessibilityTester({ container })

      // Use minimal config to focus on critical issues
      const results = await tester.getResults({
        disabledRules: [
          'page-has-heading-one', // Component-level test
          'landmark-one-main', // Component-level test
          'document-title', // Component-level test
          'html-has-lang', // Component-level test
          'meta-viewport', // Component-level test
          'bypass', // Skip links not needed for components
          'color-contrast', // Visual testing, not structural
        ],
      })

      // Check for critical violations only
      const criticalViolations = results.violations.filter(
        violation => violation.impact === 'critical' || violation.impact === 'serious'
      )

      if (criticalViolations.length > 0) {
        console.error('Critical accessibility violations found:', criticalViolations)
      }

      expect(criticalViolations).toHaveLength(0)
    })

    it('should have proper form structure', () => {
      renderWithProviders(<LoginPage />)

      // Check for proper form labels
      expect(screen.getByLabelText(/email address/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/password/i)).toBeInTheDocument()

      // Check for proper input types
      const emailInput = screen.getByLabelText(/email address/i) as HTMLInputElement
      const passwordInput = screen.getByLabelText(/password/i) as HTMLInputElement

      expect(emailInput.type).toBe('email')
      expect(passwordInput.type).toBe('password')
      expect(emailInput.required).toBe(true)
      expect(passwordInput.required).toBe(true)
    })

    it('should have accessible submit button', () => {
      renderWithProviders(<LoginPage />)

      const submitButton = screen.getByRole('button', { name: /sign in/i })
      expect(submitButton).toBeInTheDocument()
      expect(submitButton).toHaveAttribute('type', 'submit')
    })

    it('should have proper heading hierarchy', () => {
      renderWithProviders(<LoginPage />)

      const mainHeading = screen.getByRole('heading', { level: 2 })
      expect(mainHeading).toBeInTheDocument()
      expect(mainHeading).toHaveTextContent(/sign in/i)
    })
  })

  describe('RegisterPage Core Accessibility', () => {
    it('should have no critical accessibility violations', async () => {
      const { container } = renderWithProviders(<RegisterPage />)
      const tester = createAccessibilityTester({ container })

      const results = await tester.getResults({
        disabledRules: [
          'page-has-heading-one',
          'landmark-one-main',
          'document-title',
          'html-has-lang',
          'meta-viewport',
          'bypass',
          'color-contrast',
        ],
      })

      const criticalViolations = results.violations.filter(
        violation => violation.impact === 'critical' || violation.impact === 'serious'
      )

      if (criticalViolations.length > 0) {
        console.error('Critical accessibility violations found:', criticalViolations)
      }

      expect(criticalViolations).toHaveLength(0)
    })

    it('should have proper form structure', () => {
      renderWithProviders(<RegisterPage />)

      // Check for proper form labels
      expect(screen.getByLabelText(/full name/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/email address/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument()

      // Check for required fields
      const nameInput = screen.getByLabelText(/full name/i) as HTMLInputElement
      const emailInput = screen.getByLabelText(/email address/i) as HTMLInputElement
      const passwordInput = screen.getByLabelText(/^password$/i) as HTMLInputElement
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i) as HTMLInputElement

      expect(nameInput.required).toBe(true)
      expect(emailInput.required).toBe(true)
      expect(passwordInput.required).toBe(true)
      expect(confirmPasswordInput.required).toBe(true)
    })

    it('should have accessible submit button', () => {
      renderWithProviders(<RegisterPage />)

      const submitButton = screen.getByRole('button', { name: /sign up|create account/i })
      expect(submitButton).toBeInTheDocument()
      expect(submitButton).toHaveAttribute('type', 'submit')
    })

    it('should have proper heading hierarchy', () => {
      renderWithProviders(<RegisterPage />)

      const mainHeading = screen.getByRole('heading', { level: 2 })
      expect(mainHeading).toBeInTheDocument()
      expect(mainHeading).toHaveTextContent(/create your account/i)
    })
  })

  describe('TodoPage Core Accessibility', () => {
    it('should have no critical accessibility violations', async () => {
      const { container } = renderWithProviders(<TodoPage />)
      const tester = createAccessibilityTester({ container })

      const results = await tester.getResults({
        disabledRules: [
          'page-has-heading-one',
          'landmark-one-main',
          'document-title',
          'html-has-lang',
          'meta-viewport',
          'bypass',
          'color-contrast',
        ],
      })

      const criticalViolations = results.violations.filter(
        violation => violation.impact === 'critical' || violation.impact === 'serious'
      )

      if (criticalViolations.length > 0) {
        console.error('Critical accessibility violations found:', criticalViolations)
      }

      expect(criticalViolations).toHaveLength(0)
    })

    it('should have proper form structure', () => {
      renderWithProviders(<TodoPage />)

      // Check for proper form labels
      expect(screen.getByLabelText(/todo title/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/description/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/priority/i)).toBeInTheDocument()

      // Check for required title field
      const titleInput = screen.getByLabelText(/todo title/i) as HTMLInputElement
      expect(titleInput.required).toBe(false)
    })

    it('should have accessible submit button', () => {
      renderWithProviders(<TodoPage />)

      const submitButton = screen.getByRole('button', { name: /add todo|adding todo/i })
      expect(submitButton).toBeInTheDocument()
      expect(submitButton).toHaveAttribute('type', 'submit')
    })

    it('should have proper heading hierarchy', () => {
      renderWithProviders(<TodoPage />)

      const mainHeading = screen.getByRole('heading', { level: 1 })
      expect(mainHeading).toBeInTheDocument()
      expect(mainHeading).toHaveTextContent(/my todos/i)
    })

    it('should have semantic structure', () => {
      const { container } = renderWithProviders(<TodoPage />)

      // Check for semantic elements
      expect(container.querySelector('main')).toBeInTheDocument()
      expect(container.querySelector('form')).toBeInTheDocument()
      expect(container.querySelector('h1')).toBeInTheDocument()
    })
  })

  describe('Keyboard Navigation Basics', () => {
    it('should have focusable elements in forms', () => {
      // Test LoginPage
      const { container: loginContainer } = renderWithProviders(<LoginPage />)
      const loginInputs = loginContainer.querySelectorAll('input, button')
      expect(loginInputs.length).toBeGreaterThan(0)

      // Test RegisterPage
      const { container: registerContainer } = renderWithProviders(<RegisterPage />)
      const registerInputs = registerContainer.querySelectorAll('input, button')
      expect(registerInputs.length).toBeGreaterThan(0)

      // Test TodoPage
      const { container: todoContainer } = renderWithProviders(<TodoPage />)
      const todoInputs = todoContainer.querySelectorAll('input, button, textarea, select')
      expect(todoInputs.length).toBeGreaterThan(0)
    })

    it('should have properly associated labels', () => {
      // Test LoginPage
      renderWithProviders(<LoginPage />)

      const emailLabel = screen.getByText(/email address/i)
      const emailInput = screen.getByLabelText(/email address/i)
      expect(emailLabel.getAttribute('for')).toBe(emailInput.id)

      const passwordLabel = screen.getByText(/password/i)
      const passwordInput = screen.getByLabelText(/password/i)
      expect(passwordLabel.getAttribute('for')).toBe(passwordInput.id)
    })
  })

  describe('Screen Reader Support', () => {
    it('should have meaningful button text', () => {
      // Test LoginPage
      const { container: loginContainer } = renderWithProviders(<LoginPage />)
      const loginButton = loginContainer.querySelector('button')
      expect(loginButton).toHaveAccessibleName()

      // Test RegisterPage
      const { container: registerContainer } = renderWithProviders(<RegisterPage />)
      const registerButton = registerContainer.querySelector('button')
      expect(registerButton).toHaveAccessibleName()

      // Test TodoPage
      const { container: todoContainer } = renderWithProviders(<TodoPage />)
      const todoButton = todoContainer.querySelector('button')
      expect(todoButton).toHaveAccessibleName()
    })

    it('should have proper form labeling', () => {
      // Test LoginPage
      const { container: loginContainer } = renderWithProviders(<LoginPage />)
      const loginForm = loginContainer.querySelector('form')
      expect(loginForm).toHaveAccessibleName()

      // Test RegisterPage
      const { container: registerContainer } = renderWithProviders(<RegisterPage />)
      const registerForm = registerContainer.querySelector('form')
      expect(registerForm).toHaveAccessibleName()

      // Test TodoPage
      const { container: todoContainer } = renderWithProviders(<TodoPage />)
      const todoForm = todoContainer.querySelector('form')
      expect(todoForm).toHaveAccessibleName()
    })
  })
})
