# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added - E2E Testing Infrastructure (Phase 1-2)

**E2E Test Framework Setup:**
- Playwright E2E testing framework with multi-browser support
- Page Object Model (POM) architecture for maintainable tests
- Test fixtures for consistent test data (users, todos)
- Test helper utilities for common operations
- Comprehensive test documentation

**E2E Test Coverage (100 test cases):**
- Authentication flows: 26 test cases
  - User registration with validation
  - User login with error handling
  - Logout functionality
  - Route protection and redirects
  - Session management and persistence
- Todo CRUD operations: 22 test cases
  - Create, read, update, delete operations
  - Priority management
  - Completion toggle
- Navigation: 28 test cases
  - Route protection
  - Page transitions
  - Browser navigation (back/forward)
  - Header navigation
  - Responsive behavior (mobile, tablet, desktop)
  - Direct URL access
- Edge cases: 24 test cases
  - Form validation
  - Data isolation between users
  - Concurrent operations
  - Session expiry
  - Special characters and unicode
  - Empty states
  - Loading states
  - Error recovery

**Infrastructure:**
- Page Object Models: BasePage, LoginPage, RegisterPage, TodoPage
- Browser support: Chromium, Firefox, WebKit (Safari)
- Mobile testing: iPhone 12, Pixel 5 viewports
- Automatic screenshot and video on failure
- HTML test reports with trace viewer

### Added - Previous Features
- Comprehensive test suite with 177 passing tests
- PocketBase migration `007_add_todos_permissions.js` for proper collection setup
- Automated test user creation in test setup
- Integration tests for concurrent operations
- Integration tests for error handling
- API service integration tests
- Created and updated timestamp fields for todos collection

### Fixed
- **All unit tests now passing (177/178 tests, 1 skipped)**
- PocketBase collection schema using correct `fields` property instead of `schema`
- Todos collection permissions and API rules for authenticated users
- Auto-population of `user` field from authenticated session
- Auto-population of `completed` field with default value `false`
- Missing `created` and `updated` timestamp fields in todos collection
- Test expectations for PocketBase behavior (empty strings vs undefined)
- Test expectations for email visibility in user registration
- Concurrent test cleanup error handling
- Invalid data type coercion in validation tests

### Changed
- Updated `pbtodo/frontend/src/services/pocketbase.ts`:
  - Auto-populate `user` field with current authenticated user ID
  - Ensure `completed` field defaults to `false` when not provided
  - Only include defined fields in todo creation requests
- Updated test files to match PocketBase v0.31 behavior:
  - Empty text fields return `''` instead of `undefined`
  - Unauthorized access returns empty array instead of error
  - Email field may not be visible due to `emailVisibility` setting
- Improved test setup with better error handling and cleanup
- Updated documentation in README.md and pocketbase/README.md

### Removed
- Outdated `scripts/setup-test-collections.js` (replaced by migrations)
- Backup test file `todos.integration.test.ts.backup`
- Deprecated migrations (001-006) superseded by migration 007

### Known Limitations
- LoginPage and RegisterPage components do not programmatically redirect after successful authentication
- E2E tests work with current implementation but manual navigation may be required in some scenarios
- This will be addressed in a future update to improve UX

## Migration Details

### Migration 007: Add Todos Permissions

**Purpose:** Create todos collection with complete schema and API rules

**Schema:**
- `title` (text, required, max 200 chars)
- `description` (text, optional, max 1000 chars)
- `completed` (boolean, required, default via service layer)
- `priority` (select: low|medium|high, required)
- `user` (relation to users collection, required)
- `created` (autodate, onCreate)
- `updated` (autodate, onCreate + onUpdate)

**API Rules:**
- `listRule`: `@request.auth.id != '' && user = @request.auth.id`
- `viewRule`: `@request.auth.id != '' && user = @request.auth.id`
- `createRule`: `@request.auth.id != ''`
- `updateRule`: `@request.auth.id != '' && user = @request.auth.id`
- `deleteRule`: `@request.auth.id != '' && user = @request.auth.id`

**Security:**
- Users can only access their own todos
- Authentication required for all operations
- User field validated against authenticated session

## Test Coverage

### Component Tests (98 tests)
- ✅ App.test.tsx (7 tests)
- ✅ AuthContext.test.tsx (10 tests)
- ✅ Layout.test.tsx (15 tests)
- ✅ LoginPage.test.tsx (15 tests)
- ✅ ProtectedRoute.test.tsx (9 tests)
- ✅ RegisterPage.test.tsx (18 tests)
- ✅ TodoPage.test.tsx (19 tests)
- ⏭️ TodoContext.test.tsx (1 skipped)

### Integration Tests (59 tests)
- ✅ api-service.integration.test.ts (13 tests)
- ✅ auth.integration.test.ts (6 tests)
- ✅ basic.integration.test.ts (13 tests)
- ✅ concurrent.integration.test.ts (8 tests)
- ✅ error-handling.integration.test.ts (17 tests)
- ✅ todos.integration.test.ts (7 tests)

### Unit Tests (20 tests)
- ✅ pocketbase.test.ts (20 tests)

**Total: 177 passing, 1 skipped**

## Breaking Changes

None. All changes are backward compatible improvements to the testing infrastructure.

## Upgrade Notes

### For Developers

1. Ensure PocketBase is running before running tests:
   ```bash
   cd pocketbase && ./pocketbase serve
   ```

2. Apply the new migration:
   ```bash
   cd pocketbase && ./pocketbase migrate up
   ```

3. Run tests to verify everything works:
   ```bash
   npm run test
   ```

### For Production

1. Stop the PocketBase server
2. Apply migration: `./pocketbase migrate up`
3. Restart the server
4. Existing data will be preserved
5. New API rules will be applied automatically

## Known Issues

- One test intentionally skipped in TodoContext.test.tsx
- Integration tests require PocketBase server to be running
- Test user cleanup may occasionally fail in concurrent tests (handled gracefully)

## Contributors

- Fixed 35+ failing tests
- Added comprehensive documentation
- Improved migration system
- Enhanced error handling

---

For more information, see:
- [README.md](README.md) - Project overview and setup
- [pocketbase/README.md](pocketbase/README.md) - PocketBase setup and migrations