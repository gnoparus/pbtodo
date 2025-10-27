import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * Login Page Object Model
 * Handles all interactions with the login page
 */
export class LoginPage extends BasePage {
  // Locators
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly loginButton: Locator;
  readonly registerLink: Locator;
  readonly errorAlert: Locator;
  readonly emailError: Locator;
  readonly passwordError: Locator;
  readonly heading: Locator;

  constructor(page: Page) {
    super(page);

    // Initialize locators based on the actual LoginPage component
    this.emailInput = page.locator('#email');
    this.passwordInput = page.locator('#password');
    this.loginButton = page.getByRole('button', { name: /sign in/i });
    this.registerLink = page.getByRole('link', { name: /sign up for a new account/i });
    this.errorAlert = page.getByRole('alert');
    this.emailError = page.locator('#email-error');
    this.passwordError = page.locator('#password-error');
    this.heading = page.getByRole('heading', { name: /sign in to your account/i });
  }

  /**
   * Navigate to the login page
   */
  async goto(): Promise<void> {
    await super.goto('/login');
    await this.waitForPageLoad();
  }

  /**
   * Perform login with email and password
   */
  async login(email: string, password: string): Promise<void> {
    await this.fillInput(this.emailInput, email);
    await this.fillInput(this.passwordInput, password);
    await this.clickButton(this.loginButton);
  }

  /**
   * Fill only the email field
   */
  async fillEmail(email: string): Promise<void> {
    await this.fillInput(this.emailInput, email);
  }

  /**
   * Fill only the password field
   */
  async fillPassword(password: string): Promise<void> {
    await this.fillInput(this.passwordInput, password);
  }

  /**
   * Click the login button
   */
  async clickLogin(): Promise<void> {
    await this.clickButton(this.loginButton);
  }

  /**
   * Click the register link to navigate to registration
   */
  async clickRegisterLink(): Promise<void> {
    await this.registerLink.click();
  }

  /**
   * Check if login button is disabled
   */
  async isLoginButtonDisabled(): Promise<boolean> {
    return await this.loginButton.isDisabled();
  }

  /**
   * Check if login button shows loading state
   */
  async isLoginButtonLoading(): Promise<boolean> {
    const text = await this.getTextContent(this.loginButton);
    return text.toLowerCase().includes('signing in');
  }

  /**
   * Get the error message from the alert
   */
  async getErrorMessage(): Promise<string | null> {
    try {
      await this.errorAlert.waitFor({ state: 'visible', timeout: 3000 });
      return await this.getTextContent(this.errorAlert);
    } catch {
      return null;
    }
  }

  /**
   * Get email field validation error
   */
  async getEmailError(): Promise<string | null> {
    try {
      await this.emailError.waitFor({ state: 'visible', timeout: 2000 });
      return await this.getTextContent(this.emailError);
    } catch {
      return null;
    }
  }

  /**
   * Get password field validation error
   */
  async getPasswordError(): Promise<string | null> {
    try {
      await this.passwordError.waitFor({ state: 'visible', timeout: 2000 });
      return await this.getTextContent(this.passwordError);
    } catch {
      return null;
    }
  }

  /**
   * Check if error alert is visible
   */
  async isErrorAlertVisible(): Promise<boolean> {
    return await this.isVisible(this.errorAlert);
  }

  /**
   * Wait for successful login (redirect to todos page)
   */
  async waitForSuccessfulLogin(): Promise<void> {
    await this.page.waitForURL(/\/todos/, { timeout: 10000 });
  }

  /**
   * Verify we're on the login page
   */
  async isOnLoginPage(): Promise<boolean> {
    try {
      await this.heading.waitFor({ state: 'visible', timeout: 3000 });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Submit login form with Enter key
   */
  async submitWithEnter(): Promise<void> {
    await this.passwordInput.press('Enter');
  }

  /**
   * Trigger email field blur to show validation
   */
  async blurEmailField(): Promise<void> {
    await this.emailInput.blur();
  }

  /**
   * Trigger password field blur to show validation
   */
  async blurPasswordField(): Promise<void> {
    await this.passwordInput.blur();
  }

  /**
   * Clear all form fields
   */
  async clearForm(): Promise<void> {
    await this.emailInput.clear();
    await this.passwordInput.clear();
  }

  /**
   * Check if email input has error styling
   */
  async emailInputHasError(): Promise<boolean> {
    const classes = await this.emailInput.getAttribute('class');
    return classes?.includes('border-red-500') ?? false;
  }

  /**
   * Check if password input has error styling
   */
  async passwordInputHasError(): Promise<boolean> {
    const classes = await this.passwordInput.getAttribute('class');
    return classes?.includes('border-red-500') ?? false;
  }

  /**
   * Get email input value
   */
  async getEmailValue(): Promise<string> {
    return await this.emailInput.inputValue();
  }

  /**
   * Get password input value
   */
  async getPasswordValue(): Promise<string> {
    return await this.passwordInput.inputValue();
  }

  /**
   * Complete login flow and wait for redirect
   */
  async loginAndWaitForRedirect(email: string, password: string): Promise<void> {
    await this.login(email, password);
    await this.waitForSuccessfulLogin();
  }
}
