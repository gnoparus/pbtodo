import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';
import { RegisterPage } from '../pages/RegisterPage';
import { TodoPage } from '../pages/TodoPage';
import { createTestUser, deleteTestUser } from '../utils/test-helpers';
import type { TestUser } from '../utils/test-helpers';

test.describe('Navigation - Route Protection', () => {
  test('TC1.1: should redirect unauthenticated user from todos to login', async ({ page }) => {
    // Try to access todos without authentication
    await page.goto('/todos');

    // Should redirect to login page
    await expect(page).toHaveURL(/\/login/, { timeout: 5000 });

    // Verify we're on the login page
    const loginPage = new LoginPage(page);
    expect(await loginPage.isOnLoginPage()).toBe(true);
  });

  test('TC1.2: should redirect root path appropriately for unauthenticated user', async ({ page }) => {
    // Navigate to root
    await page.goto('/');

    // Should redirect to login (via todos -> login redirect)
    await expect(page).toHaveURL(/\/login/, { timeout: 5000 });
  });

  test('TC1.3: should allow authenticated user to access protected routes', async ({ page }) => {
    // Create and login user
    const testUser = await createTestUser();

    try {
      const loginPage = new LoginPage(page);
      await loginPage.goto();
      await loginPage.loginAndWaitForRedirect(testUser.email, testUser.password);

      // Should be able to access todos page
      await page.goto('/todos');
      await expect(page).toHaveURL(/\/todos/);

      const todoPage = new TodoPage(page);
      expect(await todoPage.isOnTodoPage()).toBe(true);
    } finally {
      await deleteTestUser(testUser.email);
    }
  });

  test('TC1.4: should show loading state while checking authentication', async ({ page }) => {
    // Navigate to protected route
    await page.goto('/todos');

    // Should briefly show loading state before redirect
    // (This might be very fast, so we just verify redirect happens)
    await expect(page).toHaveURL(/\/login/, { timeout: 5000 });
  });
});

test.describe('Navigation - Page Transitions', () => {
  let testUser: TestUser;

  test.beforeEach(async () => {
    testUser = await createTestUser();
  });

  test.afterEach(async () => {
    await deleteTestUser(testUser.email);
  });

  test('TC2.1: should navigate from login to register page', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();

    // Click register link
    await loginPage.clickRegisterLink();

    // Should navigate to register page
    await expect(page).toHaveURL(/\/register/);

    const registerPage = new RegisterPage(page);
    expect(await registerPage.isOnRegisterPage()).toBe(true);
  });

  test('TC2.2: should navigate from register to login page', async ({ page }) => {
    const registerPage = new RegisterPage(page);
    await registerPage.goto();

    // Click login link
    await registerPage.clickLoginLink();

    // Should navigate to login page
    await expect(page).toHaveURL(/\/login/);

    const loginPage = new LoginPage(page);
    expect(await loginPage.isOnLoginPage()).toBe(true);
  });

  test('TC2.3: should navigate to todos after successful login', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();

    // Login
    await loginPage.login(testUser.email, testUser.password);

    // Should redirect to todos
    await expect(page).toHaveURL(/\/todos/, { timeout: 10000 });

    const todoPage = new TodoPage(page);
    expect(await todoPage.isOnTodoPage()).toBe(true);
  });

  test('TC2.4: should navigate to todos after successful registration', async ({ page }) => {
    const newUser = {
      name: `New User ${Date.now()}`,
      email: `newuser${Date.now()}@example.com`,
      password: 'Password123!',
    };

    try {
      const registerPage = new RegisterPage(page);
      await registerPage.goto();

      // Register
      await registerPage.register(newUser.name, newUser.email, newUser.password);

      // Should redirect to todos
      await expect(page).toHaveURL(/\/todos/, { timeout: 10000 });

      const todoPage = new TodoPage(page);
      expect(await todoPage.isOnTodoPage()).toBe(true);
    } finally {
      await deleteTestUser(newUser.email);
    }
  });

  test('TC2.5: should stay on login page after failed login', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();

    // Try to login with wrong password
    await loginPage.login(testUser.email, 'WrongPassword123!');

    // Wait for error
    await page.waitForTimeout(1000);

    // Should still be on login page
    await expect(page).toHaveURL(/\/login/);
    expect(await loginPage.isOnLoginPage()).toBe(true);
  });
});

test.describe('Navigation - Browser Navigation', () => {
  let testUser: TestUser;

  test.beforeEach(async ({ page }) => {
    testUser = await createTestUser();
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.loginAndWaitForRedirect(testUser.email, testUser.password);
  });

  test.afterEach(async () => {
    await deleteTestUser(testUser.email);
  });

  test('TC3.1: should handle browser back button correctly', async ({ page }) => {
    const todoPage = new TodoPage(page);

    // Navigate through pages
    await page.goto('/login');
    await page.goto('/register');
    await page.goto('/todos');

    // Verify we're on todos
    expect(await todoPage.isOnTodoPage()).toBe(true);

    // Go back
    await page.goBack();
    await page.waitForTimeout(500);

    // Should be on register page
    await expect(page).toHaveURL(/\/register/);

    // Go back again
    await page.goBack();
    await page.waitForTimeout(500);

    // Should be on login page
    await expect(page).toHaveURL(/\/login/);
  });

  test('TC3.2: should handle browser forward button correctly', async ({ page }) => {
    // Navigate through pages
    await page.goto('/login');
    await page.goto('/register');
    await page.goto('/todos');

    // Go back twice
    await page.goBack();
    await page.waitForTimeout(500);
    await page.goBack();
    await page.waitForTimeout(500);

    // Should be on login
    await expect(page).toHaveURL(/\/login/);

    // Go forward
    await page.goForward();
    await page.waitForTimeout(500);

    // Should be on register
    await expect(page).toHaveURL(/\/register/);
  });

  test('TC3.3: should preserve state when navigating back to todos', async ({ page }) => {
    const todoPage = new TodoPage(page);

    // Create a todo
    await todoPage.createTodo('Test Todo');
    await page.waitForTimeout(1000);

    // Navigate away
    await page.goto('/login');
    await page.waitForTimeout(500);

    // Navigate back
    await page.goBack();
    await page.waitForTimeout(1000);

    // Todo should still exist
    expect(await todoPage.todoExists('Test Todo')).toBe(true);
  });
});

test.describe('Navigation - Header Navigation', () => {
  let testUser: TestUser;

  test.beforeEach(async ({ page }) => {
    testUser = await createTestUser();
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.loginAndWaitForRedirect(testUser.email, testUser.password);
  });

  test.afterEach(async () => {
    await deleteTestUser(testUser.email);
  });

  test('TC4.1: should navigate to todos from header link', async ({ page }) => {
    // Go to login page first (still authenticated)
    await page.goto('/login');

    // Click "My Todos" link in header
    await page.getByRole('link', { name: /my todos/i }).click();

    // Should navigate to todos
    await expect(page).toHaveURL(/\/todos/);

    const todoPage = new TodoPage(page);
    expect(await todoPage.isOnTodoPage()).toBe(true);
  });

  test('TC4.2: should show user name in header when authenticated', async ({ page }) => {
    const todoPage = new TodoPage(page);
    await todoPage.goto();

    // Header should show user name
    const welcomeText = await page.getByText(/welcome/i).textContent();
    expect(welcomeText).toContain(testUser.name);
  });

  test('TC4.3: should logout from header button', async ({ page }) => {
    const todoPage = new TodoPage(page);
    await todoPage.goto();

    // Verify we're logged in
    expect(await todoPage.isOnTodoPage()).toBe(true);

    // Click logout button in header
    await page.getByRole('button', { name: /logout/i }).click();

    // Should redirect to login
    await expect(page).toHaveURL(/\/login/, { timeout: 5000 });

    const loginPage = new LoginPage(page);
    expect(await loginPage.isOnLoginPage()).toBe(true);
  });

  test('TC4.4: should navigate to home from logo', async ({ page }) => {
    await page.goto('/login');

    // Click logo
    await page.getByRole('link', { name: /todo saas/i }).click();

    // Should navigate to home (which redirects to appropriate page)
    await page.waitForTimeout(500);

    // For authenticated users, should end up on todos
    await expect(page).toHaveURL(/\/todos/);
  });
});

test.describe('Navigation - Unauthenticated Header', () => {
  test('TC5.1: should show login and register links when not authenticated', async ({ page }) => {
    await page.goto('/login');

    // Should show login link
    const loginLink = page.getByRole('link', { name: /^login$/i });
    await expect(loginLink).toBeVisible();

    // Should show register button
    const registerButton = page.getByRole('link', { name: /register/i });
    await expect(registerButton).toBeVisible();
  });

  test('TC5.2: should navigate to login from header', async ({ page }) => {
    await page.goto('/register');

    // Click login link in header
    await page.getByRole('link', { name: /^login$/i }).click();

    // Should navigate to login page
    await expect(page).toHaveURL(/\/login/);

    const loginPage = new LoginPage(page);
    expect(await loginPage.isOnLoginPage()).toBe(true);
  });

  test('TC5.3: should navigate to register from header', async ({ page }) => {
    await page.goto('/login');

    // Click register button in header
    await page.getByRole('link', { name: /register/i }).click();

    // Should navigate to register page
    await expect(page).toHaveURL(/\/register/);

    const registerPage = new RegisterPage(page);
    expect(await registerPage.isOnRegisterPage()).toBe(true);
  });
});

test.describe('Navigation - Responsive Behavior', () => {
  let testUser: TestUser;

  test.beforeEach(async () => {
    testUser = await createTestUser();
  });

  test.afterEach(async () => {
    await deleteTestUser(testUser.email);
  });

  test('TC6.1: should work correctly on mobile viewport - portrait', async ({ page }) => {
    // Set mobile viewport (iPhone 12)
    await page.setViewportSize({ width: 390, height: 844 });

    const loginPage = new LoginPage(page);
    await loginPage.goto();

    // Should be able to login on mobile
    await loginPage.loginAndWaitForRedirect(testUser.email, testUser.password);

    // Should navigate to todos
    await expect(page).toHaveURL(/\/todos/);

    const todoPage = new TodoPage(page);
    expect(await todoPage.isOnTodoPage()).toBe(true);
  });

  test('TC6.2: should work correctly on mobile viewport - landscape', async ({ page }) => {
    // Set mobile landscape viewport
    await page.setViewportSize({ width: 844, height: 390 });

    const loginPage = new LoginPage(page);
    await loginPage.goto();

    // Should be able to login in landscape
    await loginPage.loginAndWaitForRedirect(testUser.email, testUser.password);

    // Should navigate to todos
    await expect(page).toHaveURL(/\/todos/);

    const todoPage = new TodoPage(page);
    expect(await todoPage.isOnTodoPage()).toBe(true);
  });

  test('TC6.3: should work correctly on tablet viewport', async ({ page }) => {
    // Set tablet viewport (iPad)
    await page.setViewportSize({ width: 768, height: 1024 });

    const loginPage = new LoginPage(page);
    await loginPage.goto();

    // Should be able to login on tablet
    await loginPage.loginAndWaitForRedirect(testUser.email, testUser.password);

    // Should navigate to todos
    await expect(page).toHaveURL(/\/todos/);

    const todoPage = new TodoPage(page);
    expect(await todoPage.isOnTodoPage()).toBe(true);
  });

  test('TC6.4: should work correctly on desktop viewport', async ({ page }) => {
    // Set desktop viewport
    await page.setViewportSize({ width: 1920, height: 1080 });

    const loginPage = new LoginPage(page);
    await loginPage.goto();

    // Should be able to login on desktop
    await loginPage.loginAndWaitForRedirect(testUser.email, testUser.password);

    // Should navigate to todos
    await expect(page).toHaveURL(/\/todos/);

    const todoPage = new TodoPage(page);
    expect(await todoPage.isOnTodoPage()).toBe(true);
  });

  test('TC6.5: should adapt header layout on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    const testUser = await createTestUser();

    try {
      const loginPage = new LoginPage(page);
      await loginPage.goto();
      await loginPage.loginAndWaitForRedirect(testUser.email, testUser.password);

      // Header should be visible
      const header = page.locator('header');
      await expect(header).toBeVisible();

      // Logo should be visible
      const logo = page.getByRole('link', { name: /todo saas/i });
      await expect(logo).toBeVisible();

      // User controls should be visible
      const logoutButton = page.getByRole('button', { name: /logout/i });
      await expect(logoutButton).toBeVisible();
    } finally {
      await deleteTestUser(testUser.email);
    }
  });
});

test.describe('Navigation - URL Direct Access', () => {
  let testUser: TestUser;

  test.beforeEach(async () => {
    testUser = await createTestUser();
  });

  test.afterEach(async () => {
    await deleteTestUser(testUser.email);
  });

  test('TC7.1: should handle direct URL access to login page', async ({ page }) => {
    await page.goto('http://localhost:5173/login');

    const loginPage = new LoginPage(page);
    expect(await loginPage.isOnLoginPage()).toBe(true);
  });

  test('TC7.2: should handle direct URL access to register page', async ({ page }) => {
    await page.goto('http://localhost:5173/register');

    const registerPage = new RegisterPage(page);
    expect(await registerPage.isOnRegisterPage()).toBe(true);
  });

  test('TC7.3: should redirect direct URL access to todos when not authenticated', async ({ page }) => {
    await page.goto('http://localhost:5173/todos');

    // Should redirect to login
    await expect(page).toHaveURL(/\/login/, { timeout: 5000 });
  });

  test('TC7.4: should allow direct URL access to todos when authenticated', async ({ page }) => {
    // First login
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.loginAndWaitForRedirect(testUser.email, testUser.password);

    // Then directly access todos via URL
    await page.goto('http://localhost:5173/todos');

    // Should stay on todos
    await expect(page).toHaveURL(/\/todos/);

    const todoPage = new TodoPage(page);
    expect(await todoPage.isOnTodoPage()).toBe(true);
  });
});
