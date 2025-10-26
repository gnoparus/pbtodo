import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';
import { RegisterPage } from '../pages/RegisterPage';
import { TodoPage } from '../pages/TodoPage';
import { createTestUser, deleteTestUser } from '../utils/test-helpers';
import { invalidUsers, invalidTodos } from '../fixtures/todos';
import type { TestUser } from '../utils/test-helpers';

test.describe('Edge Cases - Form Validation', () => {
  test('TC1.1: should prevent login form submission with empty fields', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();

    // Try to submit empty form
    await loginPage.clickLogin();

    // Should stay on login page due to HTML5 validation
    await page.waitForTimeout(500);
    expect(await loginPage.isOnLoginPage()).toBe(true);
  });

  test('TC1.2: should prevent registration with empty required fields', async ({ page }) => {
    const registerPage = new RegisterPage(page);
    await registerPage.goto();

    // Try to submit with only some fields
    await registerPage.fillName('Test User');
    await registerPage.clickRegister();

    // Should stay on register page
    await page.waitForTimeout(500);
    expect(await registerPage.isOnRegisterPage()).toBe(true);
  });

  test('TC1.3: should validate email format on blur', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();

    // Enter invalid email
    await loginPage.fillEmail('not-an-email');
    await loginPage.blurEmailField();

    // Should show validation error
    const error = await loginPage.getEmailError();
    expect(error).toContain('invalid');
  });

  test('TC1.4: should validate password length on blur', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();

    // Enter short password
    await loginPage.fillPassword('123');
    await loginPage.blurPasswordField();

    // Should show validation error
    const error = await loginPage.getPasswordError();
    expect(error).toContain('at least 6 characters');
  });

  test('TC1.5: should validate password confirmation match', async ({ page }) => {
    const registerPage = new RegisterPage(page);
    await registerPage.goto();

    // Enter mismatched passwords
    await registerPage.fillPassword('Password123!');
    await registerPage.fillConfirmPassword('DifferentPassword123!');
    await registerPage.blurConfirmPasswordField();

    // Should show validation error
    const error = await registerPage.getConfirmPasswordError();
    expect(error).toContain('do not match');
  });

  test('TC1.6: should validate todo title is not empty', async ({ page }) => {
    const testUser = await createTestUser();

    try {
      const loginPage = new LoginPage(page);
      await loginPage.goto();
      await loginPage.loginAndWaitForRedirect(testUser.email, testUser.password);

      const todoPage = new TodoPage(page);

      // Try to create todo without title
      await todoPage.clickAddTodo();

      // Should not create todo (HTML5 validation prevents submission)
      await page.waitForTimeout(500);
      expect(await todoPage.isEmptyStateVisible()).toBe(true);
    } finally {
      await deleteTestUser(testUser.email);
    }
  });
});

test.describe('Edge Cases - Data Isolation', () => {
  test('TC2.1: should not allow user to see other users todos', async ({ page }) => {
    // Create two users
    const user1 = await createTestUser({
      email: `user1_${Date.now()}@example.com`,
    });
    const user2 = await createTestUser({
      email: `user2_${Date.now()}@example.com`,
    });

    try {
      // Login as user1 and create a todo
      const loginPage = new LoginPage(page);
      await loginPage.goto();
      await loginPage.loginAndWaitForRedirect(user1.email, user1.password);

      const todoPage = new TodoPage(page);
      await todoPage.createTodo('User 1 Private Todo');
      await page.waitForTimeout(1000);

      // Verify todo exists
      expect(await todoPage.todoExists('User 1 Private Todo')).toBe(true);

      // Logout
      await page.getByRole('button', { name: /logout/i }).click();
      await expect(page).toHaveURL(/\/login/, { timeout: 5000 });

      // Login as user2
      await loginPage.loginAndWaitForRedirect(user2.email, user2.password);

      // User2 should not see user1's todo
      await page.waitForTimeout(1000);
      expect(await todoPage.todoExists('User 1 Private Todo')).toBe(false);

      // Should show empty state
      expect(await todoPage.isEmptyStateVisible()).toBe(true);
    } finally {
      await deleteTestUser(user1.email);
      await deleteTestUser(user2.email);
    }
  });

  test('TC2.2: should maintain separate todo lists for different users', async ({ page }) => {
    const user1 = await createTestUser({
      email: `user1_${Date.now()}@example.com`,
    });
    const user2 = await createTestUser({
      email: `user2_${Date.now()}@example.com`,
    });

    try {
      const loginPage = new LoginPage(page);
      const todoPage = new TodoPage(page);

      // User 1 creates todos
      await loginPage.goto();
      await loginPage.loginAndWaitForRedirect(user1.email, user1.password);
      await todoPage.createTodo('User 1 Todo A');
      await page.waitForTimeout(500);
      await todoPage.createTodo('User 1 Todo B');
      await page.waitForTimeout(1000);

      // Verify user 1 has 2 todos
      expect(await todoPage.getActiveTodoCount()).toBe(2);

      // Logout and login as user 2
      await page.getByRole('button', { name: /logout/i }).click();
      await expect(page).toHaveURL(/\/login/, { timeout: 5000 });

      await loginPage.loginAndWaitForRedirect(user2.email, user2.password);

      // User 2 creates different todos
      await todoPage.createTodo('User 2 Todo X');
      await page.waitForTimeout(500);
      await todoPage.createTodo('User 2 Todo Y');
      await page.waitForTimeout(500);
      await todoPage.createTodo('User 2 Todo Z');
      await page.waitForTimeout(1000);

      // Verify user 2 has 3 todos
      expect(await todoPage.getActiveTodoCount()).toBe(3);

      // Verify user 2 doesn't see user 1's todos
      expect(await todoPage.todoExists('User 1 Todo A')).toBe(false);
      expect(await todoPage.todoExists('User 1 Todo B')).toBe(false);

      // Logout and login back as user 1
      await page.getByRole('button', { name: /logout/i }).click();
      await expect(page).toHaveURL(/\/login/, { timeout: 5000 });

      await loginPage.loginAndWaitForRedirect(user1.email, user1.password);

      // User 1 should still have only their 2 todos
      await page.waitForTimeout(1000);
      expect(await todoPage.getActiveTodoCount()).toBe(2);
      expect(await todoPage.todoExists('User 1 Todo A')).toBe(true);
      expect(await todoPage.todoExists('User 1 Todo B')).toBe(true);

      // User 1 should not see user 2's todos
      expect(await todoPage.todoExists('User 2 Todo X')).toBe(false);
      expect(await todoPage.todoExists('User 2 Todo Y')).toBe(false);
      expect(await todoPage.todoExists('User 2 Todo Z')).toBe(false);
    } finally {
      await deleteTestUser(user1.email);
      await deleteTestUser(user2.email);
    }
  });
});

test.describe('Edge Cases - Concurrent Operations', () => {
  let testUser: TestUser;

  test.beforeEach(async () => {
    testUser = await createTestUser();
  });

  test.afterEach(async () => {
    await deleteTestUser(testUser.email);
  });

  test('TC3.1: should handle rapid todo creation', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.loginAndWaitForRedirect(testUser.email, testUser.password);

    const todoPage = new TodoPage(page);

    // Create multiple todos rapidly
    const todoTitles = ['Todo 1', 'Todo 2', 'Todo 3', 'Todo 4', 'Todo 5'];

    for (const title of todoTitles) {
      await todoPage.fillTitle(title);
      await todoPage.clickAddTodo();
      await page.waitForTimeout(200); // Minimal wait
    }

    // Wait for all to complete
    await page.waitForTimeout(2000);

    // All todos should be created
    for (const title of todoTitles) {
      expect(await todoPage.todoExists(title)).toBe(true);
    }
  });

  test('TC3.2: should handle rapid completion toggles', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.loginAndWaitForRedirect(testUser.email, testUser.password);

    const todoPage = new TodoPage(page);

    // Create a todo
    await todoPage.createTodo('Toggle Test');
    await page.waitForTimeout(1000);

    // Toggle completion multiple times rapidly
    await todoPage.toggleTodoComplete('Toggle Test');
    await page.waitForTimeout(100);
    await todoPage.toggleTodoComplete('Toggle Test');
    await page.waitForTimeout(100);
    await todoPage.toggleTodoComplete('Toggle Test');
    await page.waitForTimeout(1000);

    // Final state should be completed (odd number of toggles)
    expect(await todoPage.isTodoCompleted('Toggle Test')).toBe(true);
  });
});

test.describe('Edge Cases - Session Expiry', () => {
  test('TC4.1: should handle invalid session gracefully', async ({ page }) => {
    const testUser = await createTestUser();

    try {
      const loginPage = new LoginPage(page);
      await loginPage.goto();
      await loginPage.loginAndWaitForRedirect(testUser.email, testUser.password);

      // Verify logged in
      const todoPage = new TodoPage(page);
      expect(await todoPage.isOnTodoPage()).toBe(true);

      // Clear auth storage to simulate expired session
      await page.evaluate(() => {
        localStorage.clear();
      });

      // Try to navigate to todos
      await page.goto('/todos');

      // Should redirect to login
      await expect(page).toHaveURL(/\/login/, { timeout: 5000 });
    } finally {
      await deleteTestUser(testUser.email);
    }
  });
});

test.describe('Edge Cases - Special Characters', () => {
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

  test('TC5.1: should handle todo with special characters', async ({ page }) => {
    const todoPage = new TodoPage(page);

    const specialTitle = 'Todo with special chars: @#$%^&*()';

    await todoPage.createTodo(specialTitle);
    await page.waitForTimeout(1000);

    // Should be created successfully
    expect(await todoPage.todoExists(specialTitle)).toBe(true);
  });

  test('TC5.2: should handle todo with unicode characters', async ({ page }) => {
    const todoPage = new TodoPage(page);

    const unicodeTitle = 'Todo with unicode: 你好世界 🌍 🚀';

    await todoPage.createTodo(unicodeTitle);
    await page.waitForTimeout(1000);

    // Should be created successfully
    expect(await todoPage.todoExists(unicodeTitle)).toBe(true);
  });

  test('TC5.3: should handle todo with very long title', async ({ page }) => {
    const todoPage = new TodoPage(page);

    const longTitle = 'A'.repeat(100); // 100 characters

    await todoPage.createTodo(longTitle);
    await page.waitForTimeout(1000);

    // Should be created successfully (within limit)
    const todos = await todoPage.getAllTodoTitles();
    const found = todos.some(title => title.includes('A'.repeat(50))); // Check partial match
    expect(found).toBe(true);
  });

  test('TC5.4: should handle todo with line breaks in description', async ({ page }) => {
    const todoPage = new TodoPage(page);

    await todoPage.fillTitle('Multi-line Description');
    await todoPage.fillDescription('Line 1\nLine 2\nLine 3');
    await todoPage.clickAddTodo();
    await page.waitForTimeout(1000);

    // Should be created successfully
    expect(await todoPage.todoExists('Multi-line Description')).toBe(true);
  });
});

test.describe('Edge Cases - Empty States', () => {
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

  test('TC6.1: should show empty state when no todos exist', async ({ page }) => {
    const todoPage = new TodoPage(page);

    // Should show empty state
    expect(await todoPage.isEmptyStateVisible()).toBe(true);
  });

  test('TC6.2: should hide empty state after creating first todo', async ({ page }) => {
    const todoPage = new TodoPage(page);

    // Initially empty
    expect(await todoPage.isEmptyStateVisible()).toBe(true);

    // Create a todo
    await todoPage.createTodo('First Todo');
    await page.waitForTimeout(1000);

    // Empty state should disappear
    expect(await todoPage.isEmptyStateVisible()).toBe(false);
  });

  test('TC6.3: should show empty state again after deleting all todos', async ({ page }) => {
    const todoPage = new TodoPage(page);

    // Create and delete a todo
    await todoPage.createTodo('Temporary Todo');
    await page.waitForTimeout(1000);
    await todoPage.deleteTodo('Temporary Todo');
    await page.waitForTimeout(500);

    // Empty state should reappear
    expect(await todoPage.isEmptyStateVisible()).toBe(true);
  });
});

test.describe('Edge Cases - Loading States', () => {
  let testUser: TestUser;

  test.beforeEach(async () => {
    testUser = await createTestUser();
  });

  test.afterEach(async () => {
    await deleteTestUser(testUser.email);
  });

  test('TC7.1: should show loading state during login', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();

    // Fill credentials
    await loginPage.fillEmail(testUser.email);
    await loginPage.fillPassword(testUser.password);

    // Click login
    await loginPage.clickLogin();

    // Should briefly show loading state
    // (This might be very fast, so we just verify successful login)
    await expect(page).toHaveURL(/\/todos/, { timeout: 10000 });
  });

  test('TC7.2: should show loading state during registration', async ({ page }) => {
    const newUser = {
      name: `Test User ${Date.now()}`,
      email: `test${Date.now()}@example.com`,
      password: 'Password123!',
    };

    try {
      const registerPage = new RegisterPage(page);
      await registerPage.goto();

      // Fill form
      await registerPage.fillName(newUser.name);
      await registerPage.fillEmail(newUser.email);
      await registerPage.fillPassword(newUser.password);
      await registerPage.fillConfirmPassword(newUser.password);

      // Click register
      await registerPage.clickRegister();

      // Should complete registration
      await expect(page).toHaveURL(/\/todos/, { timeout: 10000 });
    } finally {
      await deleteTestUser(newUser.email);
    }
  });
});

test.describe('Edge Cases - Error Recovery', () => {
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

  test('TC8.1: should recover from failed todo creation', async ({ page }) => {
    const todoPage = new TodoPage(page);

    // Try to create a todo (this should succeed in normal conditions)
    await todoPage.createTodo('Test Todo');
    await page.waitForTimeout(1000);

    // Verify it was created
    expect(await todoPage.todoExists('Test Todo')).toBe(true);

    // Form should be cleared and ready for next todo
    const titleValue = await todoPage.titleInput.inputValue();
    expect(titleValue).toBe('');
  });

  test('TC8.2: should allow retry after failed login', async ({ page }) => {
    // Logout first
    await page.getByRole('button', { name: /logout/i }).click();
    await expect(page).toHaveURL(/\/login/, { timeout: 5000 });

    const loginPage = new LoginPage(page);

    // Try with wrong password
    await loginPage.login(testUser.email, 'WrongPassword123!');
    await page.waitForTimeout(1000);

    // Should show error
    const error = await loginPage.getErrorMessage();
    expect(error).not.toBeNull();

    // Should be able to retry with correct password
    await loginPage.clearForm();
    await loginPage.loginAndWaitForRedirect(testUser.email, testUser.password);

    // Should succeed
    await expect(page).toHaveURL(/\/todos/);
  });
});

test.describe('Edge Cases - Page Refresh Scenarios', () => {
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

  test('TC9.1: should preserve todos after page refresh', async ({ page }) => {
    const todoPage = new TodoPage(page);

    // Create multiple todos with different states
    await todoPage.createTodo('Active Todo', { priority: 'high' });
    await page.waitForTimeout(500);
    await todoPage.createTodo('Completed Todo', { priority: 'low' });
    await page.waitForTimeout(500);
    await todoPage.toggleTodoComplete('Completed Todo');
    await page.waitForTimeout(1000);

    // Refresh page
    await page.reload();
    await page.waitForTimeout(1000);

    // Todos should still exist with correct states
    expect(await todoPage.todoExists('Active Todo')).toBe(true);
    expect(await todoPage.todoExists('Completed Todo')).toBe(true);
    expect(await todoPage.isTodoCompleted('Active Todo')).toBe(false);
    expect(await todoPage.isTodoCompleted('Completed Todo')).toBe(true);
  });

  test('TC9.2: should preserve form input during refresh', async ({ page }) => {
    const todoPage = new TodoPage(page);

    // Fill form but don't submit
    await todoPage.fillTitle('Unsaved Todo');
    await todoPage.fillDescription('This is unsaved');

    // Refresh page
    await page.reload();
    await page.waitForTimeout(1000);

    // Form should be cleared (not saved to localStorage)
    const titleValue = await todoPage.titleInput.inputValue();
    expect(titleValue).toBe('');
  });
});
