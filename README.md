# Todo SaaS

A minimal todo SaaS application built with Vite, React, Tailwind CSS, and PocketBase.

## Architecture

```
Frontend (Vite + React + Tailwind) → PocketBase SDK → PocketBase Server (Self-hosted)
```

### Features

- ✅ User Authentication (signup/login/logout)
- ✅ Todo CRUD operations (create, read, update, delete)
- ✅ User-specific todo lists (data isolation)
- ✅ Responsive UI with Tailwind CSS
- ✅ Real-time todo management
- ✅ Priority levels (low, medium, high)
- ✅ Test-driven development

## Quick Start

### Prerequisites

- Node.js 18+
- npm 9+
- PocketBase (download from [pocketbase.io](https://pocketbase.io/docs/))

### Setup

1. **Clone and install dependencies**
   ```bash
   git clone <repository-url>
   cd pbtodo
   npm install
   ```

2. **Set up PocketBase Server**
   ```bash
   # Download and extract PocketBase to ./pocketbase/
   cd pocketbase
   
   # Run migrations to set up database schema
   ./pocketbase migrate up
   
   # Start the server
   ./pocketbase serve
   ```
   
   - The migrations will automatically create the `todos` collection with proper schema and API rules
   - Visit `http://localhost:8090/_/` to access the admin dashboard (optional)
   - See `pocketbase/README.md` for detailed setup instructions

3. **Start the frontend**
   ```bash
   npm run dev
   ```

   The app will be available at `http://localhost:5173`

## Project Structure

```
pbtodo/
├── e2e/                     # End-to-end tests (Playwright)
│   ├── fixtures/           # Test data fixtures
│   ├── pages/              # Page Object Models
│   ├── tests/              # E2E test files
│   ├── utils/              # Test helper utilities
│   └── README.md          # E2E testing documentation
├── frontend/                 # Vite + React + Tailwind
│   ├── src/
│   │   ├── components/       # React components
│   │   ├── contexts/        # React contexts (Auth, Todo)
│   │   ├── services/        # API service layer
│   │   ├── tests/           # Unit & integration tests
│   │   └── ...
│   ├── package.json
│   └── vite.config.ts
├── pocketbase/              # PocketBase server files
│   ├── pb_data/            # Database and uploaded files
│   ├── pb_migrations/      # Database migrations
│   │   ├── 001_create_todos_collection.js
│   │   ├── ...
│   │   └── 007_add_todos_permissions.js
│   └── README.md          # PocketBase setup guide
├── playwright.config.ts     # Playwright E2E test configuration
├── package.json           # Root workspace configuration
├── E2E_TEST_SUMMARY.md    # E2E test implementation summary
└── README.md             # This file
```

## Development

### Available Scripts

```bash
# Development
npm run dev              # Start frontend dev server
npm run test             # Run unit & integration tests
npm run test:ui          # Run tests with Vitest UI
npm run test:coverage    # Run tests with coverage report

# E2E Testing
npm run test:e2e         # Run all E2E tests
npm run test:e2e:ui      # Run E2E tests in UI mode
npm run test:e2e:headed  # Run E2E tests in headed mode
npm run test:e2e:debug   # Run E2E tests in debug mode
npm run test:e2e:chrome  # Run E2E tests in Chrome only
npm run test:e2e:firefox # Run E2E tests in Firefox only
npm run test:e2e:webkit  # Run E2E tests in Safari only
npm run test:e2e:mobile  # Run E2E tests on mobile viewports
npm run test:e2e:report  # View E2E test report
npm run test:all         # Run all tests (unit + integration + E2E)

# Building
npm run build            # Build for production
npm run preview          # Preview production build

# Code quality
npm run lint             # Run ESLint
npm run type-check       # Run TypeScript checks
```

### Database Migrations

PocketBase uses JavaScript migrations to manage database schema:

```bash
cd pocketbase

# Apply pending migrations
./pocketbase migrate up

# Revert last migration
./pocketbase migrate down

# Create a new migration
./pocketbase migrate create "migration_name"

# View migration history
./pocketbase migrate collections
```

Key migrations:
- `007_add_todos_permissions.js` - Creates todos collection with:
  - Schema: title, description, completed, priority, user, created, updated
  - API Rules: Users can only access their own todos
  - Automatic user field population for authenticated requests

### Testing

The project includes comprehensive test coverage using Vitest and React Testing Library.

**Test Structure:**
```
frontend/src/tests/
├── integration/         # Integration tests with PocketBase
│   ├── setup.ts        # Test utilities and setup
│   ├── auth.integration.test.ts
│   ├── todos.integration.test.ts
│   ├── api-service.integration.test.ts
│   ├── error-handling.integration.test.ts
│   └── concurrent.integration.test.ts
├── *.test.tsx          # Component tests
└── pocketbase.test.ts  # API service tests
```

**Running Tests:**
```bash
# Run all tests (requires PocketBase server running)
npm run test

# Run only unit tests (no PocketBase required)
npm run test:unit

# Run only integration tests
npm run test:integration

# Run with coverage
npm run test:coverage
```

**Test Coverage:**
- ✅ **177 unit & integration tests** (Vitest + React Testing Library)
  - All React components with user interaction tests
  - API service layer with mocked PocketBase
  - Integration tests with real PocketBase instance
  - Error handling and edge cases
  - Concurrent operations and race conditions
- ✅ **100 E2E tests** (Playwright)
  - 26 authentication flow tests
  - 22 todo CRUD operation tests
  - 28 navigation and routing tests
  - 24 edge case and error handling tests
  - Multi-browser testing (Chrome, Firefox, Safari)
  - Responsive design testing (mobile, tablet, desktop)

**Before Running Unit/Integration Tests:**
1. Start PocketBase server: `cd pocketbase && ./pocketbase serve`
2. Migrations are applied automatically on server start
3. Test users are created automatically during test setup

**Before Running E2E Tests:**
1. Start PocketBase server: `cd pocketbase && ./pocketbase serve`
2. Start frontend dev server: `npm run dev`
3. Run E2E tests: `npm run test:e2e`
4. See [e2e/README.md](e2e/README.md) for detailed E2E testing guide

### API Integration

The frontend connects to PocketBase through a service layer:

```typescript
// Authentication
api.auth.login(email, password)
api.auth.register(email, password, name)
api.auth.logout()

// Todo operations
api.todos.getAll()
api.todos.create(data)
api.todos.update(id, data)
api.todos.delete(id)
```

### Data Models

#### User
```typescript
interface User {
  id: string
  email: string
  name: string
  avatar?: string
  created: string
  updated: string
}
```

#### Todo
```typescript
interface Todo {
  id: string
  title: string
  description?: string
  completed: boolean
  priority: 'low' | 'medium' | 'high'
  user: string
  created: string
  updated: string
}
```

## Deployment

### Frontend (Vercel/Netlify)

1. Build the project:
   ```bash
   npm run build
   ```

2. Deploy the `frontend/dist` folder to your hosting platform

3. Configure environment variables:
   - `VITE_POCKETBASE_URL`: Your PocketBase server URL

### Backend (PocketBase)

1. Upload the `pocketbase` directory to your server
2. Ensure the executable has proper permissions
3. Configure firewall rules for port 8090
4. Use a reverse proxy (nginx) for HTTPS

## Security

**Access Control:**
- All PocketBase collections have API rules configured via migrations
- Users can only access their own todos (`user = @request.auth.id`)
- Authentication required for all todo operations
- User field is automatically populated from authenticated session

**Data Protection:**
- Passwords are hashed using bcrypt by PocketBase
- JWT tokens for session management
- CORS configured for production domains
- Input validation on both frontend and backend
- SQL injection protection built into PocketBase

**API Rules (todos collection):**
```javascript
listRule:   "@request.auth.id != '' && user = @request.auth.id"
viewRule:   "@request.auth.id != '' && user = @request.auth.id"
createRule: "@request.auth.id != ''"
updateRule: "@request.auth.id != '' && user = @request.auth.id"
deleteRule: "@request.auth.id != '' && user = @request.auth.id"
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Write tests for new functionality
4. Ensure all tests pass
5. Submit a pull request

## Testing

This project includes comprehensive test coverage at multiple levels:

### Unit & Integration Tests (Vitest)
- **177 tests** covering components, contexts, and API services
- React Testing Library for component testing
- Integration tests with real PocketBase instance
- Run: `npm run test`

### End-to-End Tests (Playwright)
- **100 tests** covering complete user workflows
- Multi-browser testing (Chrome, Firefox, Safari)
- Mobile and responsive design testing
- Page Object Model architecture
- Run: `npm run test:e2e`
- Documentation: [e2e/README.md](e2e/README.md)
- Implementation details: [E2E_TEST_SUMMARY.md](E2E_TEST_SUMMARY.md)

### Test Categories
- ✅ Authentication flows (registration, login, logout, session management)
- ✅ Todo CRUD operations (create, read, update, delete)
- ✅ Navigation and routing (protected routes, redirects, browser navigation)
- ✅ Form validation (client-side and server-side)
- ✅ Data isolation (user-specific data access)
- ✅ Error handling and edge cases
- ✅ Responsive design across devices

## License

MIT License - see LICENSE file for details

## Tech Stack

- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS
- **Backend**: PocketBase (Go-based BaaS)
- **Testing**: Vitest, React Testing Library, Playwright
- **Routing**: React Router v6
- **State Management**: React Context API