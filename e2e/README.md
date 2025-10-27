# End-to-End Testing Documentation

This directory contains end-to-end (E2E) tests for the Todo SaaS application using Playwright.

## 📋 Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Setup](#setup)
- [Running Tests](#running-tests)
- [Test Structure](#test-structure)
- [Writing Tests](#writing-tests)
- [Best Practices](#best-practices)
- [CI/CD Integration](#cicd-integration)
- [Troubleshooting](#troubleshooting)

## 🎯 Overview

E2E tests validate complete user workflows through a real browser, testing the integration between:
- Frontend (React + Vite)
- Backend (PocketBase)
- Authentication flows
- Database operations
- UI interactions

### Test Coverage

Our E2E test suite covers:

- ✅ **Authentication**: Registration, login, logout, session persistence
- ✅ **Todo CRUD**: Create, read, update, delete operations
- ✅ **Data Isolation**: User-specific data access
- ✅ **Navigation**: Route protection, redirects
- ✅ **Form Validation**: Client-side and server-side validation
- ✅ **Error Handling**: Network errors, invalid inputs
- ✅ **Responsive Design**: Mobile and desktop viewports
- ✅ **Accessibility**: ARIA labels, keyboard navigation

## 🏗️ Architecture

### Directory Structure

```
e2e/
├── fixtures/           # Test data and fixtures
│   ├── users.ts       # User test data
│   └── todos.ts       # Todo test data
├── pages/             # Page Object Models
│   ├── BasePage.ts    # Base page with common functionality
│   ├── LoginPage.ts   # Login page interactions
│   ├── RegisterPage.ts # Registration page interactions
│   └── TodoPage.ts    # Todo management page interactions
├── tests/             # Test files
│   ├── auth.e2e.spec.ts
│   ├── todos.e2e.spec.ts
│   ├── navigation.e2e.spec.ts
│   └── edge-cases.e2e.spec.ts
├── utils/             # Helper utilities
│   └── test-helpers.ts # Common test utilities
└── README.md          # This file
```

### Page Object Model (POM)

We use the Page Object Model pattern to:
- Encapsulate page-specific logic
- Reduce code duplication
- Make tests more maintainable
- Improve readability

Each page object provides:
- **Locators**: Element selectors
- **Actions**: User interactions (click, fill, etc.)
- **Assertions**: Page state verification

## 🚀 Setup

### Prerequisites

- Node.js 18+ and npm 9+
- PocketBase server installed and configured
- All project dependencies installed

### Installation

Playwright is already installed as part of the project setup. If you need to reinstall:

```bash
# Install Playwright
npm install -D @playwright/test

# Install browsers
npx playwright install
```

### Configuration

The E2E test configuration is in `playwright.config.ts` at the project root:

- **Test directory**: `./e2e/tests`
- **Base URL**: `http://localhost:5173`
- **Browsers**: Chromium, Firefox, WebKit
- **Mobile**: Chrome (Pixel 5), Safari (iPhone 12)
- **Timeouts**: 30s per test, 5s for assertions
- **Retries**: 2 on CI, 0 locally
- **Workers**: 1 on CI, auto locally

### Environment Setup

The test suite automatically starts:
1. **PocketBase server** on `http://localhost:8090`
2. **Vite dev server** on `http://localhost:5173`

Ensure PocketBase is properly migrated:

```bash
cd pocketbase
./pocketbase migrate up
```

## 🧪 Running Tests

### Basic Commands

```bash
# Run all E2E tests
npm run test:e2e

# Run tests in headed mode (see browser)
npm run test:e2e:headed

# Run tests in UI mode (interactive)
npm run test:e2e:ui

# Run tests in debug mode
npm run test:e2e:debug

# Run specific browser
npm run test:e2e:chrome
npm run test:e2e:firefox
npm run test:e2e:webkit

# Run mobile tests only
npm run test:e2e:mobile

# View test report
npm run test:e2e:report
```

### Running Specific Tests

```bash
# Run a specific test file
npx playwright test e2e/tests/auth.e2e.spec.ts

# Run tests matching a pattern
npx playwright test --grep "login"

# Run a specific test by line number
npx playwright test e2e/tests/auth.e2e.spec.ts:45
```

### Test Options

```bash
# Run tests in parallel
npx playwright test --workers=4

# Run tests with screenshots
npx playwright test --screenshot=on

# Run tests with video recording
npx playwright test --video=on

# Update snapshots
npx playwright test --update-snapshots
```

## 📝 Test Structure

### Test Organization

Tests are organized by feature/functionality:

1. **auth.e2e.spec.ts** - Authentication flows
   - User registration
   - User login
   - Session persistence
   - Logout functionality
   - Validation errors

2. **todos.e2e.spec.ts** - Todo management
   - Create todos
   - View todos
   - Update todos
   - Complete/uncomplete todos
   - Delete todos
   - Priority handling

3. **navigation.e2e.spec.ts** - Navigation and routing
   - Route protection
   - Redirects
   - Browser back/forward
   - Responsive behavior

4. **edge-cases.e2e.spec.ts** - Edge cases and error handling
   - Network errors
   - Invalid inputs
   - Concurrent operations
   - Session expiry

### Test Anatomy

```typescript
import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';
import { TodoPage } from '../pages/TodoPage';
import { generateTestUser, deleteTestUser } from '../utils/test-helpers';

test.describe('Authentication', () => {
  let testUser: TestUser;

  test.beforeEach(async ({ page }) => {
    // Setup: Create test user
    testUser = await generateTestUser();
  });

  test.afterEach(async () => {
    // Cleanup: Delete test user
    await deleteTestUser(testUser.email);
  });

  test('should allow user to login', async ({ page }) => {
    // Arrange
    const loginPage = new LoginPage(page);
    await loginPage.goto();

    // Act
    await loginPage.login(testUser.email, testUser.password);

    // Assert
    await expect(page).toHaveURL(/\/todos/);
  });
});
```

## ✍️ Writing Tests

### Using Page Objects

```typescript
import { LoginPage } from '../pages/LoginPage';
import { TodoPage } from '../pages/TodoPage';

test('create a todo', async ({ page }) => {
  // Login first
  const loginPage = new LoginPage(page);
  await loginPage.goto();
  await loginPage.loginAndWaitForRedirect(email, password);

  // Create todo
  const todoPage = new TodoPage(page);
  await todoPage.createTodo('Buy groceries', {
    description: 'Milk, eggs, bread',
    priority: 'high'
  });

  // Verify todo exists
  expect(await todoPage.todoExists('Buy groceries')).toBe(true);
});
```

### Using Test Helpers

```typescript
import { 
  generateTestUser, 
  createTestUser, 
  deleteTestUser,
  createTestTodo 
} from '../utils/test-helpers';

test('user data isolation', async ({ page }) => {
  // Create test users
  const user1 = await createTestUser();
  const user2 = await createTestUser();

  // Create todos for user1
  const loginPage = new LoginPage(page);
  await loginPage.goto();
  await loginPage.loginAndWaitForRedirect(user1.email, user1.password);

  const todoPage = new TodoPage(page);
  await todoPage.createTodo('User 1 Todo');

  // Login as user2
  await loginPage.goto();
  await loginPage.loginAndWaitForRedirect(user2.email, user2.password);

  // Verify user2 doesn't see user1's todos
  expect(await todoPage.todoExists('User 1 Todo')).toBe(false);

  // Cleanup
  await deleteTestUser(user1.email);
  await deleteTestUser(user2.email);
});
```

### Using Fixtures

```typescript
import { testUsers, invalidUsers } from '../fixtures/users';
import { testTodos, todosByPriority } from '../fixtures/todos';

test('login validation', async ({ page }) => {
  const loginPage = new LoginPage(page);
  await loginPage.goto();

  // Use predefined invalid user
  await loginPage.login(
    invalidUsers.nonExistent.email,
    invalidUsers.nonExistent.password
  );

  // Verify error shown
  expect(await loginPage.isErrorAlertVisible()).toBe(true);
});
```

## 🎯 Best Practices

### 1. Test Independence

Each test should be independent and not rely on other tests:

```typescript
// ❌ Bad: Depends on previous test
test('create todo', async ({ page }) => {
  // Assumes user is already logged in
});

// ✅ Good: Self-contained
test('create todo', async ({ page }) => {
  // Login first
  await loginAsTestUser(page);
  // Then create todo
});
```

### 2. Data Cleanup

Always clean up test data:

```typescript
test('user registration', async ({ page }) => {
  const user = generateTestUser();

  try {
    // Test code
    await registerUser(page, user);
  } finally {
    // Always cleanup
    await deleteTestUser(user.email);
  }
});
```

### 3. Meaningful Assertions

Use descriptive assertion messages:

```typescript
// ❌ Bad
expect(count).toBe(5);

// ✅ Good
expect(count, 'should have 5 active todos').toBe(5);
```

### 4. Wait for Elements

Use Playwright's auto-waiting instead of hardcoded waits:

```typescript
// ❌ Bad
await page.waitForTimeout(3000);
await page.click('#button');

// ✅ Good
await page.click('#button'); // Playwright waits automatically
```

### 5. Selectors

Prefer accessible selectors:

```typescript
// ❌ Bad: Brittle CSS selectors
await page.click('.btn.btn-primary.mt-4');

// ✅ Good: Semantic selectors
await page.getByRole('button', { name: 'Sign in' }).click();
await page.getByLabel('Email address').fill(email);
```

### 6. Error Handling

Gracefully handle expected errors:

```typescript
test('network error handling', async ({ page }) => {
  // Simulate network error
  await page.route('**/api/todos', route => route.abort());

  const todoPage = new TodoPage(page);
  await todoPage.createTodo('Test');

  // Verify error message shown
  const error = await todoPage.getErrorMessage();
  expect(error).toContain('Failed');
});
```

## 🔄 CI/CD Integration

### GitHub Actions

Example workflow configuration:

```yaml
name: E2E Tests

on: [push, pull_request]

jobs:
  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - name: Install dependencies
        run: npm ci
      - name: Install Playwright Browsers
        run: npx playwright install --with-deps
      - name: Setup PocketBase
        run: |
          cd pocketbase
          wget https://github.com/pocketbase/pocketbase/releases/download/v0.20.1/pocketbase_0.20.1_linux_amd64.zip
          unzip pocketbase_0.20.1_linux_amd64.zip
          chmod +x pocketbase
      - name: Run E2E tests
        run: npm run test:e2e
      - uses: actions/upload-artifact@v3
        if: always()
        with:
          name: playwright-report
          path: playwright-report/
```

### Environment Variables

For CI environments, you may need to set:

```bash
export CI=true
export PLAYWRIGHT_BROWSERS_PATH=0
```

## 🐛 Troubleshooting

### Common Issues

#### 1. PocketBase Not Running

**Error**: `Connection refused at http://localhost:8090`

**Solution**:
```bash
cd pocketbase
./pocketbase serve
```

#### 2. Frontend Not Running

**Error**: `Connection refused at http://localhost:5173`

**Solution**:
```bash
npm run dev
```

#### 3. Port Already in Use

**Error**: `Port 8090 is already in use`

**Solution**:
```bash
# Kill process on port 8090
lsof -ti:8090 | xargs kill -9

# Or change the port in playwright.config.ts
```

#### 4. Test Data Not Cleaned Up

**Error**: `User already exists` or `Email already in use`

**Solution**:
```bash
# Clear test data manually
cd pocketbase
rm -rf pb_data
./pocketbase migrate up
```

#### 5. Browser Installation Issues

**Error**: `Executable doesn't exist`

**Solution**:
```bash
# Reinstall browsers
npx playwright install --force
```

### Debugging Tests

```bash
# Run in headed mode to see browser
npm run test:e2e:headed

# Use debug mode with inspector
npm run test:e2e:debug

# Generate trace for failed tests
npx playwright test --trace on

# View trace
npx playwright show-trace trace.zip
```

### Verbose Output

```bash
# Show detailed logs
DEBUG=pw:api npx playwright test

# Show browser console logs
npx playwright test --headed
```

## 📊 Test Metrics

### Coverage Goals

- **Authentication**: 100% of user flows
- **Todo CRUD**: 100% of operations
- **Error Handling**: 80% of error scenarios
- **UI Components**: 90% of interactive elements

### Performance Targets

- Test suite completion: < 10 minutes
- Individual test: < 30 seconds
- Flakiness rate: < 5%

## 🔗 References

- [Playwright Documentation](https://playwright.dev)
- [Page Object Model Pattern](https://playwright.dev/docs/pom)
- [Best Practices](https://playwright.dev/docs/best-practices)
- [Accessibility Testing](https://playwright.dev/docs/accessibility-testing)

## 📝 Contributing

When adding new E2E tests:

1. Follow the existing test structure
2. Use Page Object Models for UI interactions
3. Create reusable test helpers for common operations
4. Add test data to fixtures when appropriate
5. Ensure tests are independent and can run in any order
6. Clean up test data after each test
7. Document complex test scenarios
8. Update this README if adding new test categories

## 📞 Support

For questions or issues:
- Check the [Troubleshooting](#troubleshooting) section
- Review existing tests for examples
- Refer to [Playwright documentation](https://playwright.dev)
- Open an issue in the project repository