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
   ./pocketbase serve
   ```
   
   - Visit `http://localhost:8090/_/` to create admin account
   - Follow the setup guide in `pocketbase/README.md`

3. **Start the frontend**
   ```bash
   npm run dev
   ```

   The app will be available at `http://localhost:5173`

## Project Structure

```
pbtodo/
├── frontend/                 # Vite + React + Tailwind
│   ├── src/
│   │   ├── components/       # React components
│   │   ├── contexts/        # React contexts (Auth, Todo)
│   │   ├── services/        # API service layer
│   │   ├── tests/           # Test files
│   │   └── ...
│   ├── package.json
│   └── vite.config.ts
├── pocketbase/              # PocketBase server files
│   ├── pb_migrations/      # Database migrations
│   └── README.md          # PocketBase setup guide
├── package.json           # Root workspace configuration
└── README.md             # This file
```

## Development

### Available Scripts

```bash
# Development
npm run dev              # Start frontend dev server
npm run test             # Run tests
npm run test:ui          # Run tests with UI
npm run test:coverage    # Run tests with coverage

# Building
npm run build            # Build for production
npm run preview          # Preview production build

# Code quality
npm run lint             # Run ESLint
npm run type-check       # Run TypeScript checks
```

### Testing

The project uses Vitest for testing with React Testing Library. Tests are written in a test-driven development approach.

- All components have comprehensive tests
- API services are mocked for isolated testing
- User interactions and accessibility are tested

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

- All PocketBase collections have proper access rules
- Users can only access their own data
- Passwords are hashed by PocketBase
- CORS is configured for production domains
- Input validation on both frontend and backend

## Contributing

1. Fork the repository
2. Create a feature branch
3. Write tests for new functionality
4. Ensure all tests pass
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Tech Stack

- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS
- **Backend**: PocketBase (Go-based BaaS)
- **Testing**: Vitest, React Testing Library
- **Routing**: React Router v6
- **State Management**: React Context API