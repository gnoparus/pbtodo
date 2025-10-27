import { Page, Locator } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * Register Page Object Model
 * Handles all interactions with the registration page
 */
export class RegisterPage extends BasePage {
  // Locators
  readonly nameInput: Locator;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly confirmPasswordInput: Locator;
  readonly registerButton: Locator;
  readonly loginLink: Locator;
  readonly errorAlert: Locator;
  readonly nameError: Locator;
  readonly emailError: Locator;
  readonly passwordError: Locator;
  readonly confirmPasswordError: Locator;
  readonly heading: Locator;

  constructor(page: Page) {
    super(page);

    // Initialize locators based on the actual RegisterPage component
    this.nameInput = page.locator('#name');
    this.emailInput = page.locator('#email');
    this.passwordInput = page.locator('#password');
    this.confirmPasswordInput = page.locator('#confirmPassword');
    this.registerButton = page.getByRole('button', { name: /sign up/i });
    this.loginLink = page.getByRole('link', { name: /sign in/i });
    this.errorAlert = page.getByRole('alert');
    this.nameError = page.locator('#name-error');
    this.emailError = page.locator('#email-error');
    this.passwordError = page.locator('#password-error');
    this.confirmPasswordError = page.locator('#confirmPassword-error');
    this.heading = page.getByRole('heading', { name: /create your account/i });
  }

  /**
   * Navigate to the register page
   */
  async goto(): Promise<void> {
    await super.goto('/register');
    await this.waitForPageLoad();
  }

  /**
   * Perform registration with all required fields
   */
  async register(
    name: string,
    email: string,
    password: string,
    confirmPassword?: string
  ): Promise<void> {
    await this.fillInput(this.nameInput, name);
    await this.fillInput(this.emailInput, email);
    await this.fillInput(this.passwordInput, password);
    await this.fillInput(this.confirmPasswordInput, confirmPassword || password);
    await this.clickButton(this.registerButton);
  }

  /**
   * Fill only the name field
   */
  async fillName(name: string): Promise<void> {
    await this.fillInput(this.nameInput, name);
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
   * Fill only the confirm password field
   */
  async fillConfirmPassword(confirmPassword: string): Promise<void> {
    await this.fillInput(this.confirmPasswordInput, confirmPassword);
  }

  /**
   * Click the register button
   */
  async clickRegister(): Promise<void> {
    await this.clickButton(this.registerButton);
  }

  /**
   * Click the login link to navigate to login page
   */
  async clickLoginLink(): Promise<void> {
    await this.loginLink.click();
  }

  /**
   * Check if register button is disabled
   */
  async isRegisterButtonDisabled(): Promise<boolean> {
    return await this.registerButton.isDisabled();
  }

  /**
   * Check if register button shows loading state
   */
  async isRegisterButtonLoading(): Promise<boolean> {
    const text = await this.getTextContent(this.registerButton);
    return text.toLowerCase().includes('creating account');
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
   * Get name field validation error
   */
  async getNameError(): Promise<string | null> {
    try {
      await this.nameError.waitFor({ state: 'visible', timeout: 2000 });
      return await this.getTextContent(this.nameError);
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
   * Get confirm password field validation error
   */
  async getConfirmPasswordError(): Promise<string | null> {
    try {
      await this.confirmPasswordError.waitFor({ state: 'visible', timeout: 2000 });
      return await this.getTextContent(this.confirmPasswordError);
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
   * Wait for successful registration (redirect to todos page)
   */
  async waitForSuccessfulRegistration(): Promise<void> {
    await this.page.waitForURL(/\/todos/, { timeout: 10000 });
  }

  /**
   * Verify we're on the register page
   */
  async isOnRegisterPage(): Promise<boolean> {
    try {
      await this.heading.waitFor({ state: 'visible', timeout: 3000 });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Submit registration form with Enter key
   */
  async submitWithEnter(): Promise<void> {
    await this.confirmPasswordInput.press('Enter');
  }

  /**
   * Trigger name field blur to show validation
   */
  async blurNameField(): Promise<void> {
    await this.nameInput.blur();
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
   * Trigger confirm password field blur to show validation
   */
  async blurConfirmPasswordField(): Promise<void> {
    await this.confirmPasswordInput.blur();
  }

  /**
   * Clear all form fields
   */
  async clearForm(): Promise<void> {
    await this.nameInput.clear();
    await this.emailInput.clear();
    await this.passwordInput.clear();
    await this.confirmPasswordInput.clear();
  }

  /**
   * Check if name input has error styling
   */
  async nameInputHasError(): Promise<boolean> {
    const classes = await this.nameInput.getAttribute('class');
    return classes?.includes('border-red-500') ?? false;
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
   * Check if confirm password input has error styling
   */
  async confirmPasswordInputHasError(): Promise<boolean> {
    const classes = await this.confirmPasswordInput.getAttribute('class');
    return classes?.includes('border-red-500') ?? false;
  }

  /**
   * Get name input value
   */
  async getNameValue(): Promise<string> {
    return await this.nameInput.inputValue();
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
   * Get confirm password input value
   */
  async getConfirmPasswordValue(): Promise<string> {
    return await this.confirmPasswordInput.inputValue();
  }

  /**
   * Complete registration flow and wait for redirect
   */
  async registerAndWaitForRedirect(
    name: string,
    email: string,
    password: string
  ): Promise<void> {
    await this.register(name, email, password);
    await this.waitForSuccessfulRegistration();
  }
}
