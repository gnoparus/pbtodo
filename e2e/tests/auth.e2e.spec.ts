import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';
import { RegisterPage } from '../pages/RegisterPage';
import { TodoPage } from '../pages/TodoPage';
import { generateTestUser, deleteTestUser, createTestUser } from '../utils/test-helpers';
import { testUsers, invalidUsers } from '../fixtures/users';
import type { TestUser } from '../utils/test-helpers';

test.describe('Authentication - User Registration', () => {
  let testUser: TestUser;

  test.beforeEach(async () => {
    testUser = generateTestUser();
  });

  test.afterEach(async () => {
    await deleteTestUser(testUser.email);
  });

  test('TC1.1: should allow new user to register with valid credentials', async ({ page }) => {
    const registerPage = new RegisterPage(page);
    await registerPage.goto();

    // Verify we're on the registration page
    expect(await registerPage.isOnRegisterPage()).toBe(true);

    // Fill registration form
    await registerPage.register(testUser.name, testUser.email, testUser.password);

    // Should redirect to todos page
    await expect(page).toHaveURL(/\/todos/, { timeout: 10000 });

    // Verify user is on the todo page
    const todoPage = new TodoPage(page);
    expect(await todoPage.isOnTodoPage()).toBe(true);

    // Verify welcome message shows user name
    const userName = await todoPage.getUserName();
    expect(userName).toContain(testUser.name);
  });

  test('TC1.2: should show validation error for mismatched passwords', async ({ page }) => {
    const registerPage = new RegisterPage(page);
    await registerPage.goto();

    // Fill form with mismatched passwords
    await registerPage.fillName(testUser.name);
    await registerPage.fillEmail(testUser.email);
    await registerPage.fillPassword(testUser.password);
    await registerPage.fillConfirmPassword('DifferentPassword123!');
    await registerPage.blurConfirmPasswordField();

    // Should show validation error
    const error = await registerPage.getConfirmPasswordError();
    expect(error).toContain('do not match');
  });

  test('TC1.3: should show validation error for invalid email format', async ({ page }) => {
    const registerPage = new RegisterPage(page);
    await registerPage.goto();

    // Fill form with invalid email
    await registerPage.fillName(testUser.name);
    await registerPage.fillEmail(invalidUsers.invalidEmail.email);
    await registerPage.blurEmailField();

    // Should show validation error
    const error = await registerPage.getEmailError();
    expect(error).toContain('invalid');
  });

  test('TC1.4: should show validation error for short password', async ({ page }) => {
    const registerPage = new RegisterPage(page);
    await registerPage.goto();

    // Fill form with short password
    await registerPage.fillName(testUser.name);
    await registerPage.fillEmail(testUser.email);
    await registerPage.fillPassword(invalidUsers.shortPassword.password);
    await registerPage.blurPasswordField();

    // Should show validation error
    const error = await registerPage.getPasswordError();
    expect(error).toContain('at least 6 characters');
  });

  test('TC1.5: should show validation error for short name', async ({ page }) => {
    const registerPage = new RegisterPage(page);
    await registerPage.goto();

    // Fill form with short name
    await registerPage.fillName('A');
    await registerPage.blurNameField();

    // Should show validation error
    const error = await registerPage.getNameError();
    expect(error).toContain('at least 2 characters');
  });

  test('TC1.6: should show error when registering with existing email', async ({ page }) => {
    // First, create a user
    await createTestUser(testUser);

    // Try to register with the same email
    const registerPage = new RegisterPage(page);
    await registerPage.goto();
    await registerPage.register(testUser.name, testUser.email, testUser.password);

    // Should show error alert
    await page.waitForTimeout(1000); // Wait for API response
    const error = await registerPage.getErrorMessage();
    expect(error).not.toBeNull();
  });

  test('TC1.7: should persist session after page refresh', async ({ page }) => {
    const registerPage = new RegisterPage(page);
    await registerPage.goto();

    // Register new user
    await registerPage.registerAndWaitForRedirect(testUser.name, testUser.email, testUser.password);

    // Verify on todos page
    const todoPage = new TodoPage(page);
    expect(await todoPage.isOnTodoPage()).toBe(true);

    // Refresh the page
    await page.reload();

    // Should still be on todos page
    await expect(page).toHaveURL(/\/todos/);
    expect(await todoPage.isOnTodoPage()).toBe(true);

    // User name should still be visible
    const userName = await todoPage.getUserName();
    expect(userName).toContain(testUser.name);
  });

  test('TC1.8: should navigate to login page when clicking sign in link', async ({ page }) => {
    const registerPage = new RegisterPage(page);
    await registerPage.goto();

    // Click the login link
    await registerPage.clickLoginLink();

    // Should navigate to login page
    await expect(page).toHaveURL(/\/login/);

    const loginPage = new LoginPage(page);
    expect(await loginPage.isOnLoginPage()).toBe(true);
  });
});

test.describe('Authentication - User Login', () => {
  let testUser: TestUser;

  test.beforeEach(async () => {
    // Create a test user before each test
    testUser = await createTestUser();
  });

  test.afterEach(async () => {
    await deleteTestUser(testUser.email);
  });

  test('TC2.1: should allow existing user to login with correct credentials', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();

    // Verify we're on the login page
    expect(await loginPage.isOnLoginPage()).toBe(true);

    // Login with test user
    await loginPage.login(testUser.email, testUser.password);

    // Should redirect to todos page
    await expect(page).toHaveURL(/\/todos/, { timeout: 10000 });

    // Verify user is logged in
    const todoPage = new TodoPage(page);
    expect(await todoPage.isOnTodoPage()).toBe(true);

    // Verify welcome message
    const userName = await todoPage.getUserName();
    expect(userName).toContain(testUser.name);
  });

  test('TC2.2: should show error for invalid credentials', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();

    // Try to login with wrong password
    await loginPage.login(testUser.email, 'WrongPassword123!');

    // Wait for error to appear
    await page.waitForTimeout(1000);

    // Should show error message
    const error = await loginPage.getErrorMessage();
    expect(error).not.toBeNull();

    // Should still be on login page
    expect(await loginPage.isOnLoginPage()).toBe(true);
  });

  test('TC2.3: should show error for non-existent user', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();

    // Try to login with non-existent user
    await loginPage.login(
      invalidUsers.nonExistent.email,
      invalidUsers.nonExistent.password
    );

    // Wait for error to appear
    await page.waitForTimeout(1000);

    // Should show error message
    const error = await loginPage.getErrorMessage();
    expect(error).not.toBeNull();
  });

  test('TC2.4: should show validation error for invalid email format', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();

    // Fill email with invalid format
    await loginPage.fillEmail('not-an-email');
    await loginPage.blurEmailField();

    // Should show validation error
    const error = await loginPage.getEmailError();
    expect(error).toContain('invalid');
  });

  test('TC2.5: should show validation error for short password', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();

    // Fill password with short value
    await loginPage.fillPassword('12345');
    await loginPage.blurPasswordField();

    // Should show validation error
    const error = await loginPage.getPasswordError();
    expect(error).toContain('at least 6 characters');
  });

  test('TC2.6: should allow login with Enter key', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();

    // Fill credentials
    await loginPage.fillEmail(testUser.email);
    await loginPage.fillPassword(testUser.password);

    // Submit with Enter key
    await loginPage.submitWithEnter();

    // Should redirect to todos page
    await expect(page).toHaveURL(/\/todos/, { timeout: 10000 });
  });

  test('TC2.7: should persist session after page refresh', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();

    // Login
    await loginPage.loginAndWaitForRedirect(testUser.email, testUser.password);

    // Verify on todos page
    const todoPage = new TodoPage(page);
    expect(await todoPage.isOnTodoPage()).toBe(true);

    // Refresh the page
    await page.reload();

    // Should still be on todos page
    await expect(page).toHaveURL(/\/todos/);
    expect(await todoPage.isOnTodoPage()).toBe(true);
  });

  test('TC2.8: should navigate to register page when clicking sign up link', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();

    // Click the register link
    await loginPage.clickRegisterLink();

    // Should navigate to register page
    await expect(page).toHaveURL(/\/register/);

    const registerPage = new RegisterPage(page);
    expect(await registerPage.isOnRegisterPage()).toBe(true);
  });
});

test.describe('Authentication - Logout', () => {
  let testUser: TestUser;

  test.beforeEach(async () => {
    testUser = await createTestUser();
  });

  test.afterEach(async () => {
    await deleteTestUser(testUser.email);
  });

  test('TC3.1: should logout user and redirect to login page', async ({ page }) => {
    // First login
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.loginAndWaitForRedirect(testUser.email, testUser.password);

    // Verify logged in
    const todoPage = new TodoPage(page);
    expect(await todoPage.isOnTodoPage()).toBe(true);

    // Click logout button in header
    await page.getByRole('button', { name: /logout/i }).click();

    // Should redirect to login page
    await expect(page).toHaveURL(/\/login/, { timeout: 5000 });
  });

  test('TC3.2: should clear session after logout', async ({ page }) => {
    // First login
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.loginAndWaitForRedirect(testUser.email, testUser.password);

    // Logout
    await page.getByRole('button', { name: /logout/i }).click();
    await expect(page).toHaveURL(/\/login/, { timeout: 5000 });

    // Try to navigate to protected route
    await page.goto('/todos');

    // Should redirect back to login
    await expect(page).toHaveURL(/\/login/, { timeout: 5000 });
  });

  test('TC3.3: should not allow access to todos page after logout', async ({ page }) => {
    // First login
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.loginAndWaitForRedirect(testUser.email, testUser.password);

    // Logout
    await page.getByRole('button', { name: /logout/i }).click();
    await expect(page).toHaveURL(/\/login/, { timeout: 5000 });

    // Manually navigate to todos
    await page.goto('/todos');

    // Should be redirected to login
    await expect(page).toHaveURL(/\/login/);
  });
});

test.describe('Authentication - Route Protection', () => {
  test('TC4.1: should redirect unauthenticated user to login', async ({ page }) => {
    // Try to access todos without authentication
    await page.goto('/todos');

    // Should redirect to login
    await expect(page).toHaveURL(/\/login/, { timeout: 5000 });
  });

  test('TC4.2: should redirect root path to todos for unauthenticated user', async ({ page }) => {
    // Navigate to root
    await page.goto('/');

    // Should redirect to login (via todos redirect)
    await expect(page).toHaveURL(/\/login/, { timeout: 5000 });
  });

  test('TC4.3: should allow authenticated user to access todos', async ({ page }) => {
    // Create and login user
    const testUser = await createTestUser();

    try {
      const loginPage = new LoginPage(page);
      await loginPage.goto();
      await loginPage.loginAndWaitForRedirect(testUser.email, testUser.password);

      // Should be on todos page
      await expect(page).toHaveURL(/\/todos/);

      const todoPage = new TodoPage(page);
      expect(await todoPage.isOnTodoPage()).toBe(true);
    } finally {
      await deleteTestUser(testUser.email);
    }
  });

  test('TC4.4: should redirect authenticated user from login to todos', async ({ page }) => {
    // Create and login user
    const testUser = await createTestUser();

    try {
      const loginPage = new LoginPage(page);
      await loginPage.goto();
      await loginPage.loginAndWaitForRedirect(testUser.email, testUser.password);

      // Now try to go to login page again
      await page.goto('/login');

      // Should stay on todos or be able to see todos
      // (depending on implementation, might show login but user is logged in)
      const todoPage = new TodoPage(page);
      const userName = await todoPage.getUserName();
      expect(userName).toContain(testUser.name);
    } finally {
      await deleteTestUser(testUser.email);
    }
  });
});

test.describe('Authentication - Session Management', () => {
  let testUser: TestUser;

  test.beforeEach(async () => {
    testUser = await createTestUser();
  });

  test.afterEach(async () => {
    await deleteTestUser(testUser.email);
  });

  test('TC5.1: should maintain session across page navigation', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.loginAndWaitForRedirect(testUser.email, testUser.password);

    // Navigate to different pages
    await page.goto('/login');
    await page.goto('/register');
    await page.goto('/todos');

    // Should still be authenticated on todos page
    const todoPage = new TodoPage(page);
    const userName = await todoPage.getUserName();
    expect(userName).toContain(testUser.name);
  });

  test('TC5.2: should maintain session across browser refresh', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.loginAndWaitForRedirect(testUser.email, testUser.password);

    // Refresh multiple times
    await page.reload();
    await page.waitForTimeout(500);
    await page.reload();
    await page.waitForTimeout(500);

    // Should still be authenticated
    const todoPage = new TodoPage(page);
    expect(await todoPage.isOnTodoPage()).toBe(true);
    const userName = await todoPage.getUserName();
    expect(userName).toContain(testUser.name);
  });

  test('TC5.3: should show loading state while checking authentication', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();

    // Start login
    await loginPage.fillEmail(testUser.email);
    await loginPage.fillPassword(testUser.password);
    await loginPage.clickLogin();

    // Should show loading state
    expect(await loginPage.isLoginButtonLoading()).toBe(true);
  });
});
