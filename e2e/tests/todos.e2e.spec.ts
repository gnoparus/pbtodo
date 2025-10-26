import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';
import { TodoPage } from '../pages/TodoPage';
import { createTestUser, deleteTestUser } from '../utils/test-helpers';
import { testTodos, todosByPriority } from '../fixtures/todos';
import type { TestUser } from '../utils/test-helpers';

test.describe('Todo CRUD - Create Operations', () => {
  let testUser: TestUser;

  test.beforeEach(async ({ page }) => {
    // Create user and login
    testUser = await createTestUser();
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.loginAndWaitForRedirect(testUser.email, testUser.password);
  });

  test.afterEach(async () => {
    await deleteTestUser(testUser.email);
  });

  test('TC1.1: should create a new todo with title only', async ({ page }) => {
    const todoPage = new TodoPage(page);

    // Should show empty state initially
    expect(await todoPage.isEmptyStateVisible()).toBe(true);

    // Create a simple todo
    await todoPage.createTodo('Buy groceries');

    // Wait for todo to appear
    await page.waitForTimeout(1000);

    // Todo should exist in the list
    expect(await todoPage.todoExists('Buy groceries')).toBe(true);

    // Empty state should disappear
    expect(await todoPage.isEmptyStateVisible()).toBe(false);
  });

  test('TC1.2: should create a todo with title, description, and priority', async ({ page }) => {
    const todoPage = new TodoPage(page);

    // Create todo with all fields
    await todoPage.createTodo('Buy groceries', {
      description: 'Milk, eggs, bread',
      priority: 'high',
    });

    await page.waitForTimeout(1000);

    // Verify todo exists
    expect(await todoPage.todoExists('Buy groceries')).toBe(true);

    // Verify priority
    const priority = await todoPage.getTodoPriority('Buy groceries');
    expect(priority.toLowerCase()).toBe('high');

    // Verify description
    const description = await todoPage.getTodoDescription('Buy groceries');
    expect(description).toContain('Milk, eggs, bread');
  });

  test('TC1.3: should create multiple todos', async ({ page }) => {
    const todoPage = new TodoPage(page);

    // Create multiple todos
    await todoPage.createTodo('Todo 1', { priority: 'high' });
    await page.waitForTimeout(500);
    await todoPage.createTodo('Todo 2', { priority: 'medium' });
    await page.waitForTimeout(500);
    await todoPage.createTodo('Todo 3', { priority: 'low' });
    await page.waitForTimeout(500);

    // All todos should exist
    expect(await todoPage.todoExists('Todo 1')).toBe(true);
    expect(await todoPage.todoExists('Todo 2')).toBe(true);
    expect(await todoPage.todoExists('Todo 3')).toBe(true);

    // Count should be correct
    const count = await todoPage.getActiveTodoCount();
    expect(count).toBeGreaterThanOrEqual(3);
  });

  test('TC1.4: should clear form after creating todo', async ({ page }) => {
    const todoPage = new TodoPage(page);

    // Fill and submit form
    await todoPage.fillTitle('Test Todo');
    await todoPage.fillDescription('Test Description');
    await todoPage.selectPriority('high');
    await todoPage.clickAddTodo();

    await page.waitForTimeout(1000);

    // Form should be cleared
    const titleValue = await todoPage.titleInput.inputValue();
    const descValue = await todoPage.descriptionInput.inputValue();
    const priorityValue = await todoPage.prioritySelect.inputValue();

    expect(titleValue).toBe('');
    expect(descValue).toBe('');
    expect(priorityValue).toBe('medium'); // Default value
  });

  test('TC1.5: should show validation error for empty title', async ({ page }) => {
    const todoPage = new TodoPage(page);

    // Try to submit without title
    await todoPage.clickAddTodo();

    // Should not create todo (form validation)
    // No error is shown because HTML5 validation prevents submission
    await page.waitForTimeout(500);
    expect(await todoPage.isEmptyStateVisible()).toBe(true);
  });

  test('TC1.6: should create todos with different priorities', async ({ page }) => {
    const todoPage = new TodoPage(page);

    // Create todos with different priorities
    await todoPage.createTodo('High Priority', { priority: 'high' });
    await page.waitForTimeout(500);
    await todoPage.createTodo('Medium Priority', { priority: 'medium' });
    await page.waitForTimeout(500);
    await todoPage.createTodo('Low Priority', { priority: 'low' });
    await page.waitForTimeout(500);

    // Verify priorities
    const highPriority = await todoPage.getTodoPriority('High Priority');
    const mediumPriority = await todoPage.getTodoPriority('Medium Priority');
    const lowPriority = await todoPage.getTodoPriority('Low Priority');

    expect(highPriority.toLowerCase()).toBe('high');
    expect(mediumPriority.toLowerCase()).toBe('medium');
    expect(lowPriority.toLowerCase()).toBe('low');
  });
});

test.describe('Todo CRUD - Read Operations', () => {
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

  test('TC2.1: should display empty state when no todos', async ({ page }) => {
    const todoPage = new TodoPage(page);

    // Should show empty state
    expect(await todoPage.isEmptyStateVisible()).toBe(true);

    // Should show appropriate message
    const emptyStateText = await todoPage.emptyState.textContent();
    expect(emptyStateText?.toLowerCase()).toContain('no todos');
  });

  test('TC2.2: should display todo list with active and completed sections', async ({ page }) => {
    const todoPage = new TodoPage(page);

    // Create some todos
    await todoPage.createTodo('Active Todo 1');
    await page.waitForTimeout(500);
    await todoPage.createTodo('Active Todo 2');
    await page.waitForTimeout(500);

    // Complete one todo
    await todoPage.toggleTodoComplete('Active Todo 1');
    await page.waitForTimeout(500);

    // Should show both sections
    expect(await todoPage.isActiveTodosSectionVisible()).toBe(true);
    expect(await todoPage.isCompletedTodosSectionVisible()).toBe(true);

    // Active section should have 1 todo
    const activeTodos = await todoPage.getActiveTodoTitles();
    expect(activeTodos).toContain('Active Todo 2');

    // Completed section should have 1 todo
    const completedTodos = await todoPage.getCompletedTodoTitles();
    expect(completedTodos).toContain('Active Todo 1');
  });

  test('TC2.3: should display todo count correctly', async ({ page }) => {
    const todoPage = new TodoPage(page);

    // Create 3 active todos
    await todoPage.createTodo('Todo 1');
    await page.waitForTimeout(500);
    await todoPage.createTodo('Todo 2');
    await page.waitForTimeout(500);
    await todoPage.createTodo('Todo 3');
    await page.waitForTimeout(500);

    // Check active count
    const activeCount = await todoPage.getActiveTodoCount();
    expect(activeCount).toBe(3);

    // Complete one
    await todoPage.toggleTodoComplete('Todo 1');
    await page.waitForTimeout(500);

    // Counts should update
    const newActiveCount = await todoPage.getActiveTodoCount();
    const completedCount = await todoPage.getCompletedTodoCount();
    expect(newActiveCount).toBe(2);
    expect(completedCount).toBe(1);
  });

  test('TC2.4: should persist todos after page refresh', async ({ page }) => {
    const todoPage = new TodoPage(page);

    // Create a todo
    await todoPage.createTodo('Persistent Todo', {
      description: 'Should survive refresh',
      priority: 'high',
    });
    await page.waitForTimeout(1000);

    // Refresh page
    await page.reload();
    await page.waitForTimeout(1000);

    // Todo should still exist
    expect(await todoPage.todoExists('Persistent Todo')).toBe(true);

    // Details should be preserved
    const priority = await todoPage.getTodoPriority('Persistent Todo');
    expect(priority.toLowerCase()).toBe('high');
  });
});

test.describe('Todo CRUD - Update Operations', () => {
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

  test('TC3.1: should mark todo as complete', async ({ page }) => {
    const todoPage = new TodoPage(page);

    // Create a todo
    await todoPage.createTodo('Complete Me');
    await page.waitForTimeout(1000);

    // Should not be completed initially
    expect(await todoPage.isTodoCompleted('Complete Me')).toBe(false);

    // Mark as complete
    await todoPage.toggleTodoComplete('Complete Me');
    await page.waitForTimeout(500);

    // Should be completed
    expect(await todoPage.isTodoCompleted('Complete Me')).toBe(true);

    // Should have strikethrough styling
    expect(await todoPage.hasTodoStrikethrough('Complete Me')).toBe(true);
  });

  test('TC3.2: should unmark completed todo', async ({ page }) => {
    const todoPage = new TodoPage(page);

    // Create and complete a todo
    await todoPage.createTodo('Toggle Me');
    await page.waitForTimeout(500);
    await todoPage.toggleTodoComplete('Toggle Me');
    await page.waitForTimeout(500);

    // Should be completed
    expect(await todoPage.isTodoCompleted('Toggle Me')).toBe(true);

    // Unmark as complete
    await todoPage.toggleTodoComplete('Toggle Me');
    await page.waitForTimeout(500);

    // Should not be completed
    expect(await todoPage.isTodoCompleted('Toggle Me')).toBe(false);
  });

  test('TC3.3: should move todo between active and completed sections', async ({ page }) => {
    const todoPage = new TodoPage(page);

    // Create a todo
    await todoPage.createTodo('Moving Todo');
    await page.waitForTimeout(1000);

    // Should be in active section
    let activeTodos = await todoPage.getActiveTodoTitles();
    expect(activeTodos).toContain('Moving Todo');

    // Complete it
    await todoPage.toggleTodoComplete('Moving Todo');
    await page.waitForTimeout(500);

    // Should be in completed section
    let completedTodos = await todoPage.getCompletedTodoTitles();
    expect(completedTodos).toContain('Moving Todo');

    // Should not be in active section
    activeTodos = await todoPage.getActiveTodoTitles();
    expect(activeTodos).not.toContain('Moving Todo');
  });

  test('TC3.4: should persist completion state after refresh', async ({ page }) => {
    const todoPage = new TodoPage(page);

    // Create and complete a todo
    await todoPage.createTodo('Persistent Completion');
    await page.waitForTimeout(500);
    await todoPage.toggleTodoComplete('Persistent Completion');
    await page.waitForTimeout(500);

    // Refresh page
    await page.reload();
    await page.waitForTimeout(1000);

    // Should still be completed
    expect(await todoPage.isTodoCompleted('Persistent Completion')).toBe(true);
  });
});

test.describe('Todo CRUD - Delete Operations', () => {
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

  test('TC4.1: should delete an active todo', async ({ page }) => {
    const todoPage = new TodoPage(page);

    // Create a todo
    await todoPage.createTodo('Delete Me');
    await page.waitForTimeout(1000);

    // Verify it exists
    expect(await todoPage.todoExists('Delete Me')).toBe(true);

    // Delete it
    await todoPage.deleteTodo('Delete Me');
    await page.waitForTimeout(500);

    // Should not exist anymore
    expect(await todoPage.todoExists('Delete Me')).toBe(false);
  });

  test('TC4.2: should delete a completed todo', async ({ page }) => {
    const todoPage = new TodoPage(page);

    // Create and complete a todo
    await todoPage.createTodo('Delete Completed');
    await page.waitForTimeout(500);
    await todoPage.toggleTodoComplete('Delete Completed');
    await page.waitForTimeout(500);

    // Delete it
    await todoPage.deleteTodo('Delete Completed');
    await page.waitForTimeout(500);

    // Should not exist anymore
    expect(await todoPage.todoExists('Delete Completed')).toBe(false);
  });

  test('TC4.3: should update todo count after deletion', async ({ page }) => {
    const todoPage = new TodoPage(page);

    // Create 3 todos
    await todoPage.createTodo('Todo 1');
    await page.waitForTimeout(500);
    await todoPage.createTodo('Todo 2');
    await page.waitForTimeout(500);
    await todoPage.createTodo('Todo 3');
    await page.waitForTimeout(1000);

    // Get initial count
    const initialCount = await todoPage.getActiveTodoCount();
    expect(initialCount).toBe(3);

    // Delete one
    await todoPage.deleteTodo('Todo 2');
    await page.waitForTimeout(500);

    // Count should decrease
    const newCount = await todoPage.getActiveTodoCount();
    expect(newCount).toBe(2);
  });

  test('TC4.4: should persist deletion after refresh', async ({ page }) => {
    const todoPage = new TodoPage(page);

    // Create two todos
    await todoPage.createTodo('Keep Me');
    await page.waitForTimeout(500);
    await todoPage.createTodo('Delete Me');
    await page.waitForTimeout(1000);

    // Delete one
    await todoPage.deleteTodo('Delete Me');
    await page.waitForTimeout(500);

    // Refresh
    await page.reload();
    await page.waitForTimeout(1000);

    // Deleted todo should not exist
    expect(await todoPage.todoExists('Delete Me')).toBe(false);

    // Other todo should still exist
    expect(await todoPage.todoExists('Keep Me')).toBe(true);
  });

  test('TC4.5: should show empty state after deleting all todos', async ({ page }) => {
    const todoPage = new TodoPage(page);

    // Create a todo
    await todoPage.createTodo('Only Todo');
    await page.waitForTimeout(1000);

    // Delete it
    await todoPage.deleteTodo('Only Todo');
    await page.waitForTimeout(500);

    // Should show empty state
    expect(await todoPage.isEmptyStateVisible()).toBe(true);
  });
});

test.describe('Todo CRUD - Priority Management', () => {
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

  test('TC5.1: should create todos with all priority levels', async ({ page }) => {
    const todoPage = new TodoPage(page);

    // Create todos with each priority
    for (const [priority, todos] of Object.entries(todosByPriority)) {
      const todo = todos[0];
      await todoPage.createTodo(todo.title, {
        priority: priority as 'low' | 'medium' | 'high',
      });
      await page.waitForTimeout(500);
    }

    // Verify all priorities exist
    const highPriority = await todoPage.getTodoPriority(todosByPriority.high[0].title);
    const mediumPriority = await todoPage.getTodoPriority(todosByPriority.medium[0].title);
    const lowPriority = await todoPage.getTodoPriority(todosByPriority.low[0].title);

    expect(highPriority.toLowerCase()).toBe('high');
    expect(mediumPriority.toLowerCase()).toBe('medium');
    expect(lowPriority.toLowerCase()).toBe('low');
  });

  test('TC5.2: should display priority badges with correct colors', async ({ page }) => {
    const todoPage = new TodoPage(page);

    // Create todos with different priorities
    await todoPage.createTodo('High Priority Task', { priority: 'high' });
    await page.waitForTimeout(500);
    await todoPage.createTodo('Medium Priority Task', { priority: 'medium' });
    await page.waitForTimeout(500);
    await todoPage.createTodo('Low Priority Task', { priority: 'low' });
    await page.waitForTimeout(500);

    // Get the priority badge elements
    const highBadge = todoPage.getTodoContainer('High Priority Task').locator('.inline-flex.items-center');
    const mediumBadge = todoPage.getTodoContainer('Medium Priority Task').locator('.inline-flex.items-center');
    const lowBadge = todoPage.getTodoContainer('Low Priority Task').locator('.inline-flex.items-center');

    // Verify badges have appropriate color classes
    const highClasses = await highBadge.first().getAttribute('class');
    const mediumClasses = await mediumBadge.first().getAttribute('class');
    const lowClasses = await lowBadge.first().getAttribute('class');

    expect(highClasses).toContain('red'); // High priority is red
    expect(mediumClasses).toContain('yellow'); // Medium priority is yellow
    expect(lowClasses).toContain('green'); // Low priority is green
  });

  test('TC5.3: should default to medium priority if not specified', async ({ page }) => {
    const todoPage = new TodoPage(page);

    // Create todo without specifying priority
    await todoPage.fillTitle('Default Priority Todo');
    await todoPage.clickAddTodo();
    await page.waitForTimeout(1000);

    // Should have medium priority (default)
    const priority = await todoPage.getTodoPriority('Default Priority Todo');
    expect(priority.toLowerCase()).toBe('medium');
  });
});
