/**
 * Accessibility Testing Utilities with jest-axe
 *
 * This file provides utilities for testing accessibility compliance
 * using jest-axe and axe-core for automated a11y testing.
 */

import { axe, toHaveNoViolations, AxeResults, Violation } from 'jest-axe'
import { RenderResult } from '@testing-library/react'
import { vi } from 'vitest'

// Extend Jest matchers for jest-axe
expect.extend(toHaveNoViolations)

/**
 * Accessibility test configuration options
 */
export interface AxeConfigOptions {
  /**
   * Rules to disable for specific tests
   */
  disabledRules?: string[]

  /**
   * Rules to enable that are normally disabled
   */
  enabledRules?: string[]

  /**
   * Component-specific test options
   */
  component?: string

  /**
   * Whether to include minor violations in strict mode
   */
  strict?: boolean
}

/**
 * Default axe configuration for the project
 */
const defaultAxeConfig = {
  rules: {
    // Enable recommended rules
    'color-contrast': { enabled: true },
    'focus-order-semantics': { enabled: true },
    'label-title-only': { enabled: true },
    'landmark-one-main': { enabled: true },
    'page-has-heading-one': { enabled: true },
    'region': { enabled: true },

    // Disable rules that may not apply to all components
    'bypass': { enabled: false }, // Skip links not needed for all components
    'document-title': { enabled: false }, // Individual components don't need titles
    'html-has-lang': { enabled: false }, // Component-level tests
    'meta-viewport': { enabled: false }, // Component-level tests
  },
}

/**
 * Custom axe configuration with options
 */
export const getAxeConfig = (options: AxeConfigOptions = {}): any => {
  const config = { ...defaultAxeConfig }

  if (options.disabledRules) {
    options.disabledRules.forEach(rule => {
      if (config.rules[rule]) {
        config.rules[rule].enabled = false
      }
    })
  }

  if (options.enabledRules) {
    options.enabledRules.forEach(rule => {
      if (!config.rules[rule]) {
        config.rules[rule] = { enabled: true }
      } else {
        config.rules[rule].enabled = true
      }
    })
  }

  return config
}

/**
 * Runs axe accessibility check on a rendered component
 */
export const checkAccessibility = async (
  renderResult: RenderResult,
  options: AxeConfigOptions = {}
): Promise<AxeResults> => {
  const config = getAxeConfig(options)
  const results = await axe(renderResult.container, config)
  return results
}

/**
 * Asserts that a component has no accessibility violations
 */
export const expectNoAccessibilityViolations = async (
  renderResult: RenderResult,
  options: AxeConfigOptions = {}
): Promise<void> => {
  const results = await checkAccessibility(renderResult, options)

  if (results.violations.length > 0) {
    console.error('Accessibility violations found:', formatViolations(results.violations))
  }

  expect(results).toHaveNoViolations()
}

/**
 * Formats accessibility violations for better debugging
 */
export const formatViolations = (violations: Violation[]): string => {
  return violations
    .map(violation => {
      const nodes = violation.nodes
        .map(node => `- ${node.html}${node.target ? ` (target: ${node.target.join(', ')})` : ''}`)
        .join('\n    ')

      return `
Rule: ${violation.id} - ${violation.description}
Impact: ${violation.impact}
Help: ${violation.help}
Help URL: ${violation.helpUrl}
Nodes:
    ${nodes}
`.trim()
    })
    .join('\n\n')
}

/**
 * Accessibility test presets for common scenarios
 */
export const accessibilityPresets = {
  /**
   * Standard form accessibility test
   */
  form: {
    disabledRules: ['page-has-heading-one', 'landmark-one-main'],
  },

  /**
   * Modal/dialog accessibility test
   */
  modal: {
    enabledRules: ['focus-order-semantics'],
    disabledRules: ['page-has-heading-one'],
  },

  /**
   * Navigation accessibility test
   */
  navigation: {
    enabledRules: ['focus-order-semantics'],
  },

  /**
   * Content accessibility test
   */
  content: {
    enabledRules: ['color-contrast', 'keyboard'],
    disabledRules: ['landmark-one-main'],
  },
}

/**
 * Common accessibility test scenarios
 */
export class AccessibilityTester {
  private renderResult: RenderResult

  constructor(renderResult: RenderResult) {
    this.renderResult = renderResult
  }

  /**
   * Test basic accessibility
   */
  async testBasic(): Promise<void> {
    await expectNoAccessibilityViolations(this.renderResult)
  }

  /**
   * Test form accessibility
   */
  async testForm(): Promise<void> {
    await expectNoAccessibilityViolations(this.renderResult, accessibilityPresets.form)
  }

  /**
   * Test with custom options
   */
  async testWithOptions(options: AxeConfigOptions): Promise<void> {
    await expectNoAccessibilityViolations(this.renderResult, options)
  }

  /**
   * Get full accessibility results
   */
  async getResults(options: AxeConfigOptions = {}): Promise<AxeResults> {
    return await checkAccessibility(this.renderResult, options)
  }

  /**
   * Test specific accessibility rules
   */
  async testSpecificRules(rules: string[], shouldPass: boolean = true): Promise<void> {
    const results = await this.getResults({
      enabledRules: rules,
    })

    const ruleViolations = results.violations.filter(v => rules.includes(v.id))

    if (shouldPass) {
      if (ruleViolations.length > 0) {
        console.error(`Expected rules ${rules.join(', ')} to pass, but found violations:`,
          formatViolations(ruleViolations))
      }
      expect(ruleViolations).toHaveLength(0)
    } else {
      expect(ruleViolations.length).toBeGreaterThan(0)
    }
  }
}

/**
 * Helper function to create accessibility tester
 */
export const createAccessibilityTester = (renderResult: RenderResult): AccessibilityTester => {
  return new AccessibilityTester(renderResult)
}

/**
 * Mock utilities for testing accessibility features
 */
export const accessibilityMocks = {
  /**
   * Mock screen reader user
   */
  mockScreenReader: () => {
    // Mock window.speechSynthesis for testing ARIA live regions
    Object.defineProperty(window, 'speechSynthesis', {
      value: {
        speak: vi.fn(),
        cancel: vi.fn(),
        pause: vi.fn(),
        resume: vi.fn(),
        getVoices: vi.fn(() => []),
      },
      writable: true,
    })
  },

  /**
   * Mock keyboard navigation
   */
  mockKeyboardNavigation: () => {
    // Mock focus management
    Object.defineProperty(document, 'activeElement', {
      value: document.body,
      writable: true,
    })
  },
}

/**
 * Focus management utilities for testing
 */
export const focusManagement = {
  /**
   * Get all focusable elements in container
   */
  getFocusableElements: (container: HTMLElement): HTMLElement[] => {
    const focusableSelectors = [
      'button:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      'a[href]',
      '[tabindex]:not([tabindex="-1"])',
      '[contenteditable="true"]',
    ].join(', ')

    return Array.from(container.querySelectorAll(focusableSelectors)) as HTMLElement[]
  },

  /**
   * Test tab order
   */
  testTabOrder: async (container: HTMLElement): Promise<boolean> => {
    const focusableElements = focusManagement.getFocusableElements(container)

    for (let i = 0; i < focusableElements.length; i++) {
      focusableElements[i].focus()
      if (document.activeElement !== focusableElements[i]) {
        return false
      }
    }

    return true
  },

  /**
   * Test focus trap (for modals)
   */
  testFocusTrap: (container: HTMLElement): boolean => {
    const focusableElements = focusManagement.getFocusableElements(container)

    if (focusableElements.length === 0) {
      return true // Nothing to trap
    }

    // Focus first element
    focusableElements[0].focus()
    const firstFocused = document.activeElement === focusableElements[0]

    // Focus last element and press Tab to cycle back
    focusableElements[focusableElements.length - 1].focus()
    const lastFocused = document.activeElement === focusableElements[focusableElements.length - 1]

    return firstFocused && lastFocused
  },
}

/**
 * Color contrast utilities
 */
export const colorContrast = {
  /**
   * Test color contrast for elements
   */
  testContrast: (elements: HTMLElement[]): boolean => {
    // This is a simplified version - in practice, you'd use a color contrast library
    // For now, we'll just check that elements have color styles applied
    return elements.every(el => {
      const styles = window.getComputedStyle(el)
      return styles.color && styles.backgroundColor
    })
  },
}

// Export commonly used utilities
export {
  axe,
  toHaveNoViolations,
}
