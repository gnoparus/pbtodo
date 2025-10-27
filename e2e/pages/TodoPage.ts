import { Page, Locator } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * Todo Page Object Model
 * Handles all interactions with the todo management page
 */
export class TodoPage extends BasePage {
  // Form Locators
  readonly titleInput: Locator;
  readonly descriptionInput: Locator;
  readonly prioritySelect: Locator;
  readonly addTodoButton: Locator;
  readonly titleError: Locator;

  // Page Elements
  readonly heading: Locator;
  readonly welcomeMessage: Locator;
  readonly errorAlert: Locator;
  readonly emptyState: Locator;
  readonly loadingSpinner: Locator;

  // Section Headers
  readonly activeTodosHeader: Locator;
  readonly completedTodosHeader: Locator;

  constructor(page: Page) {
    super(page);

    // Initialize form locators
    this.titleInput = page.locator('#title');
    this.descriptionInput = page.locator('#description');
    this.prioritySelect = page.locator('#priority');
    this.addTodoButton = page.getByRole('button', { name: /add todo/i });
    this.titleError = page.locator('#title-error');

    // Initialize page elements
    this.heading = page.getByRole('heading', { name: /my todos/i });
    this.welcomeMessage = page.getByText(/welcome back/i);
    this.errorAlert = page.getByRole('alert');
    this.emptyState = page.getByText(/no todos yet/i);
    this.loadingSpinner = page.getByText(/loading todos/i);

    // Initialize section headers
    this.activeTodosHeader = page.getByRole('heading', { name: /active todos/i });
    this.completedTodosHeader = page.getByRole('heading', { name: /completed todos/i });
  }

  /**
   * Navigate to the todo page
   */
  async goto(): Promise<void> {
    await super.goto('/todos');
    await this.waitForPageLoad();
  }

  /**
   * Create a new todo
   */
  async createTodo(
    title: string,
    options?: {
      description?: string;
      priority?: 'low' | 'medium' | 'high';
    }
  ): Promise<void> {
    await this.fillInput(this.titleInput, title);

    if (options?.description) {
      await this.fillInput(this.descriptionInput, options.description);
    }

    if (options?.priority) {
      await this.prioritySelect.selectOption(options.priority);
    }

    await this.clickButton(this.addTodoButton);
  }

  /**
   * Fill only the title field
   */
  async fillTitle(title: string): Promise<void> {
    await this.fillInput(this.titleInput, title);
  }

  /**
   * Fill only the description field
   */
  async fillDescription(description: string): Promise<void> {
    await this.fillInput(this.descriptionInput, description);
  }

  /**
   * Select priority
   */
  async selectPriority(priority: 'low' | 'medium' | 'high'): Promise<void> {
    await this.prioritySelect.selectOption(priority);
  }

  /**
   * Click the add todo button
   */
  async clickAddTodo(): Promise<void> {
    await this.clickButton(this.addTodoButton);
  }

  /**
   * Get a todo item by title
   */
  getTodoByTitle(title: string): Locator {
    return this.page.getByRole('heading', { name: title, exact: true });
  }

  /**
   * Get todo container by title
   */
  getTodoContainer(title: string): Locator {
    return this.page.locator('.card').filter({ hasText: title });
  }

  /**
   * Check if a todo exists
   */
  async todoExists(title: string): Promise<boolean> {
    try {
      const todo = this.getTodoByTitle(title);
      await todo.waitFor({ state: 'visible', timeout: 3000 });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Toggle todo completion status by title
   */
  async toggleTodoComplete(title: string): Promise<void> {
    const todoContainer = this.getTodoContainer(title);
    const checkbox = todoContainer.locator('input[type="checkbox"]');
    await checkbox.click();
  }

  /**
   * Delete a todo by title
   */
  async deleteTodo(title: string): Promise<void> {
    const todoContainer = this.getTodoContainer(title);
    const deleteButton = todoContainer.getByRole('button', { name: new RegExp(`delete ${title}`, 'i') });
    await deleteButton.click();
  }

  /**
   * Get todo priority badge text
   */
  async getTodoPriority(title: string): Promise<string> {
    const todoContainer = this.getTodoContainer(title);
    const priorityBadge = todoContainer.locator('.inline-flex.items-center.px-2\\.5');
    return await this.getTextContent(priorityBadge);
  }

  /**
   * Get todo description text
   */
  async getTodoDescription(title: string): Promise<string | null> {
    try {
      const todoContainer = this.getTodoContainer(title);
      const description = todoContainer.locator('p.text-sm.text-gray-600').first();
      return await this.getTextContent(description);
    } catch {
      return null;
    }
  }

  /**
   * Check if a todo is completed
   */
  async isTodoCompleted(title: string): Promise<boolean> {
    const todoContainer = this.getTodoContainer(title);
    const checkbox = todoContainer.locator('input[type="checkbox"]');
    return await checkbox.isChecked();
  }

  /**
   * Check if a todo has strikethrough (completed styling)
   */
  async hasTodoStrikethrough(title: string): Promise<boolean> {
    const todoHeading = this.getTodoByTitle(title);
    const classes = await todoHeading.getAttribute('class');
    return classes?.includes('line-through') ?? false;
  }

  /**
   * Get all todo titles
   */
  async getAllTodoTitles(): Promise<string[]> {
    const todos = this.page.locator('.card h3');
    const count = await todos.count();
    const titles: string[] = [];

    for (let i = 0; i < count; i++) {
      const title = await todos.nth(i).textContent();
      if (title) {
        titles.push(title.trim());
      }
    }

    return titles;
  }

  /**
   * Get count of active todos from the welcome message
   */
  async getActiveTodoCount(): Promise<number> {
    const text = await this.getTextContent(this.welcomeMessage);
    const match = text.match(/(\d+)\s+active/);
    return match ? parseInt(match[1], 10) : 0;
  }

  /**
   * Get count of completed todos from the welcome message
   */
  async getCompletedTodoCount(): Promise<number> {
    const text = await this.getTextContent(this.welcomeMessage);
    const match = text.match(/(\d+)\s+completed/);
    return match ? parseInt(match[1], 10) : 0;
  }

  /**
   * Get total number of todos visible on the page
   */
  async getTotalTodoCount(): Promise<number> {
    const todos = this.page.locator('.card').filter({ has: this.page.locator('input[type="checkbox"]') });
    return await todos.count();
  }

  /**
   * Check if empty state is visible
   */
  async isEmptyStateVisible(): Promise<boolean> {
    return await this.isVisible(this.emptyState);
  }

  /**
   * Check if loading spinner is visible
   */
  async isLoadingSpinnerVisible(): Promise<boolean> {
    return await this.isVisible(this.loadingSpinner);
  }

  /**
   * Check if add todo button is disabled
   */
  async isAddTodoButtonDisabled(): Promise<boolean> {
    return await this.addTodoButton.isDisabled();
  }

  /**
   * Check if add todo button shows loading state
   */
  async isAddTodoButtonLoading(): Promise<boolean> {
    const text = await this.getTextContent(this.addTodoButton);
    return text.toLowerCase().includes('adding todo');
  }

  /**
   * Get title field validation error
   */
  async getTitleError(): Promise<string | null> {
    try {
      await this.titleError.waitFor({ state: 'visible', timeout: 2000 });
      return await this.getTextContent(this.titleError);
    } catch {
      return null;
    }
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
   * Dismiss error alert
   */
  async dismissError(): Promise<void> {
    const dismissButton = this.errorAlert.getByRole('button', { name: /dismiss error/i });
    await dismissButton.click();
  }

  /**
   * Wait for todos to load
   */
  async waitForTodosToLoad(): Promise<void> {
    try {
      await this.loadingSpinner.waitFor({ state: 'hidden', timeout: 5000 });
    } catch {
      // Loading spinner might not appear if data loads quickly
    }
  }

  /**
   * Verify we're on the todo page
   */
  async isOnTodoPage(): Promise<boolean> {
    try {
      await this.heading.waitFor({ state: 'visible', timeout: 3000 });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Clear the todo form
   */
  async clearForm(): Promise<void> {
    await this.titleInput.clear();
    await this.descriptionInput.clear();
    await this.prioritySelect.selectOption('medium');
  }

  /**
   * Get user name from welcome message
   */
  async getUserName(): Promise<string | null> {
    const text = await this.getTextContent(this.welcomeMessage);
    const match = text.match(/welcome back,\s+([^!]+)/i);
    return match ? match[1].trim() : null;
  }

  /**
   * Check if active todos section is visible
   */
  async isActiveTodosSectionVisible(): Promise<boolean> {
    return await this.isVisible(this.activeTodosHeader);
  }

  /**
   * Check if completed todos section is visible
   */
  async isCompletedTodosSectionVisible(): Promise<boolean> {
    return await this.isVisible(this.completedTodosHeader);
  }

  /**
   * Get all active todo titles
   */
  async getActiveTodoTitles(): Promise<string[]> {
    const activeTodosSection = this.page.locator('div').filter({ has: this.activeTodosHeader });
    const todos = activeTodosSection.locator('.card h3');
    const count = await todos.count();
    const titles: string[] = [];

    for (let i = 0; i < count; i++) {
      const title = await todos.nth(i).textContent();
      if (title) {
        titles.push(title.trim());
      }
    }

    return titles;
  }

  /**
   * Get all completed todo titles
   */
  async getCompletedTodoTitles(): Promise<string[]> {
    const completedTodosSection = this.page.locator('div').filter({ has: this.completedTodosHeader });
    const todos = completedTodosSection.locator('.card h3');
    const count = await todos.count();
    const titles: string[] = [];

    for (let i = 0; i < count; i++) {
      const title = await todos.nth(i).textContent();
      if (title) {
        titles.push(title.trim());
      }
    }

    return titles;
  }

  /**
   * Trigger title field blur to show validation
   */
  async blurTitleField(): Promise<void> {
    await this.titleInput.blur();
  }

  /**
   * Check if title input has error styling
   */
  async titleInputHasError(): Promise<boolean> {
    const classes = await this.titleInput.getAttribute('class');
    return classes?.includes('border-red-500') ?? false;
  }

  /**
   * Complete todo creation flow
   */
  async createTodoAndWait(
    title: string,
    options?: {
      description?: string;
      priority?: 'low' | 'medium' | 'high';
    }
  ): Promise<void> {
    await this.createTodo(title, options);
    await this.page.waitForTimeout(500); // Wait for UI to update
    await this.waitForTodosToLoad();
  }
}
