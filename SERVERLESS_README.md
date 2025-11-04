# PBTodo Serverless Architecture

A fully serverless Todo application built with Cloudflare Workers, D1, and Pages.

## 🌟 Features

- **100% Serverless** - No servers to manage
- **Global Edge Deployment** - Low latency worldwide (275+ locations)
- **Secure Authentication** - JWT tokens with PBKDF2 password hashing
- **Rate Limiting** - Server-side rate limiting with KV storage
- **Type Safety** - Full TypeScript support
- **Modern Stack** - React 18, Vite, Cloudflare Workers

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Cloudflare Edge Network                   │
│                                                              │
│  ┌──────────────┐      ┌──────────────┐      ┌──────────┐  │
│  │   Frontend   │      │   Workers    │      │    D1    │  │
│  │   (Pages)    │─────▶│     API      │─────▶│ Database │  │
│  │   React+Vite │      │  TypeScript  │      │  SQLite  │  │
│  └──────────────┘      └──────────────┘      └──────────┘  │
│         │                      │                            │
│         │                      ▼                            │
│         │              ┌──────────────┐                     │
│         │              │  KV Storage  │                     │
│         └─────────────▶│  Sessions +  │                     │
│          Static Assets │ Rate Limits  │                     │
│                        └──────────────┘                     │
└─────────────────────────────────────────────────────────────┘
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- Cloudflare account
- Wrangler CLI: `npm install -g wrangler`

### Setup

1. **Clone and install dependencies**:
   ```bash
   git clone <repo-url>
   cd pbtodo
   npm install
   cd workers && npm install
   ```

2. **Login to Cloudflare**:
   ```bash
   wrangler login
   ```

3. **Run automated setup**:
   ```bash
   ./scripts/setup-cloudflare.sh
   ```
   This creates:
   - D1 database
   - KV namespaces (sessions, rate-limits)
   - Applies migrations
   - Sets JWT secret

4. **Start development servers**:

   Terminal 1 (Workers API):
   ```bash
   cd workers
   npm run dev
   # Runs on http://localhost:8787
   ```

   Terminal 2 (Frontend):
   ```bash
   cd frontend
   npm run dev
   # Runs on http://localhost:5173
   ```

5. **Open browser**: Navigate to `http://localhost:5173`

## 📁 Project Structure

```
pbtodo/
├── migrations/                 # D1 database migrations
│   ├── 001_create_users.sql
│   └── 002_create_todos.sql
│
├── workers/                    # Cloudflare Workers API
│   ├── src/
│   │   ├── handlers/          # Route handlers
│   │   │   ├── auth.ts        # Auth endpoints
│   │   │   └── todos.ts       # Todo CRUD
│   │   ├── middleware/        # Middleware
│   │   │   ├── auth.ts        # JWT verification
│   │   │   ├── cors.ts        # CORS handling
│   │   │   └── rateLimit.ts   # Rate limiting
│   │   ├── utils/             # Utilities
│   │   │   ├── crypto.ts      # Password hashing
│   │   │   ├── jwt.ts         # JWT utilities
│   │   │   └── validation.ts  # Input validation
│   │   ├── types/             # TypeScript types
│   │   └── index.ts           # Main router
│   ├── wrangler.toml          # Workers config
│   ├── package.json
│   └── tsconfig.json
│
├── frontend/                   # React frontend
│   ├── src/
│   │   ├── services/
│   │   │   └── api.ts         # API client
│   │   ├── contexts/          # React contexts
│   │   ├── components/        # React components
│   │   └── utils/             # Utilities
│   └── .env.development       # Environment variables
│
└── scripts/
    └── setup-cloudflare.sh    # Automated setup
```

## 🔌 API Endpoints

### Authentication

- `POST /api/auth/register` - Register new user
  ```json
  {
    "email": "user@example.com",
    "password": "SecurePass123!",
    "name": "John Doe"
  }
  ```

- `POST /api/auth/login` - Login user
  ```json
  {
    "email": "user@example.com",
    "password": "SecurePass123!"
  }
  ```

- `POST /api/auth/logout` - Logout user (protected)
- `POST /api/auth/refresh` - Refresh token (protected)
- `GET /api/auth/me` - Get current user (protected)

### Todos

- `GET /api/todos` - List all todos (protected)
- `POST /api/todos` - Create todo (protected)
  ```json
  {
    "title": "Buy groceries",
    "description": "Milk, eggs, bread",
    "priority": "high"
  }
  ```

- `GET /api/todos/:id` - Get single todo (protected)
- `PATCH /api/todos/:id` - Update todo (protected)
  ```json
  {
    "completed": true
  }
  ```

- `DELETE /api/todos/:id` - Delete todo (protected)
- `PATCH /api/todos/:id/toggle` - Toggle completion (protected)

### Utility

- `GET /api/health` - Health check (public)

## 🔐 Security

### Password Security
- **PBKDF2** with 100,000 iterations
- **SHA-256** hash algorithm
- 16-byte random salt per password
- Constant-time comparison

### JWT Tokens
- **HS256** algorithm
- 24-hour expiration
- Stored in localStorage
- Includes userId and email in payload

### Rate Limiting
- **Login**: 5 attempts/min → 15-min block
- **Registration**: 3 attempts/min → 30-min block
- **API**: 100 requests/min → 1-min block
- Tracked per IP address
- Stored in Cloudflare KV

### CORS
- Configurable allowed origins
- Credentials support
- Preflight request handling

## 🗄️ Database Schema

### Users Table
```sql
CREATE TABLE users (
  id TEXT PRIMARY KEY,                    -- UUID
  email TEXT UNIQUE NOT NULL,             -- User email
  name TEXT NOT NULL,                     -- Display name
  password_hash TEXT NOT NULL,            -- PBKDF2 hash
  avatar TEXT,                            -- Optional avatar URL
  created_at INTEGER NOT NULL,            -- Unix timestamp
  updated_at INTEGER NOT NULL             -- Unix timestamp
);
```

### Todos Table
```sql
CREATE TABLE todos (
  id TEXT PRIMARY KEY,                    -- UUID
  title TEXT NOT NULL,                    -- Todo title (max 200)
  description TEXT,                       -- Optional (max 1000)
  completed INTEGER NOT NULL DEFAULT 0,   -- Boolean (0 or 1)
  priority TEXT NOT NULL,                 -- 'low'|'medium'|'high'
  user_id TEXT NOT NULL,                  -- Foreign key to users
  created_at INTEGER NOT NULL,            -- Unix timestamp
  updated_at INTEGER NOT NULL,            -- Unix timestamp
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

## 🧪 Testing

### Test API Locally

```bash
# Health check
curl http://localhost:8787/api/health

# Register
curl -X POST http://localhost:8787/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test1234!","name":"Test User"}'

# Login
curl -X POST http://localhost:8787/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test1234!"}'

# Get todos (replace TOKEN with your JWT)
curl http://localhost:8787/api/todos \
  -H "Authorization: Bearer TOKEN"

# Create todo
curl -X POST http://localhost:8787/api/todos \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"Test Todo","priority":"medium"}'
```

### Run Frontend Tests

```bash
npm run test:unit
npm run test:integration
npm run test:e2e
```

## 🚀 Deployment

### Deploy Workers API

```bash
cd workers
npm run deploy
# Deployed to: https://pbtodo-api.workers.dev
```

### Deploy Frontend to Pages

```bash
# Build frontend
npm run build

# Deploy to Pages
cd workers
wrangler pages deploy ../frontend/dist --project-name=pbtodo-frontend
# Deployed to: https://pbtodo-frontend.pages.dev
```

### Set Environment Variables

```bash
# Set JWT secret
cd workers
wrangler secret put JWT_SECRET
# Enter your secret when prompted

# Update allowed origins in wrangler.toml
[vars]
ALLOWED_ORIGINS = "https://pbtodo-frontend.pages.dev"
```

## 🌍 Environment Variables

### Frontend (`.env.development`)
```env
VITE_API_URL=http://127.0.0.1:8787/api
VITE_HTTPS_ENABLED=false
VITE_DEV_MODE=true
VITE_MIN_PASSWORD_LENGTH=8
VITE_REQUIRE_PASSWORD_COMPLEXITY=true
```

### Workers (`wrangler.toml`)
```toml
[vars]
ALLOWED_ORIGINS = "http://localhost:5173"
ENVIRONMENT = "development"

# Secrets (set via: wrangler secret put <NAME>)
# JWT_SECRET - Secret key for JWT signing
```

## 📊 Performance Metrics

### Cloudflare Workers
- **Cold start**: 10-50ms
- **Warm requests**: 1-5ms
- **Global deployment**: 275+ locations
- **Concurrent requests**: Unlimited

### D1 Database
- **Read latency**: 10-50ms (edge cached)
- **Write latency**: 100-300ms (primary region)
- **Storage**: 5GB free tier
- **Queries**: 5M reads/day, 100K writes/day

### KV Storage
- **Read latency**: 10-50ms (edge cached)
- **Write latency**: ~60s global propagation
- **Storage**: 1GB free tier
- **Operations**: 100K reads/day, 1K writes/day

## 💰 Pricing

### Free Tier (Sufficient for small apps)
- **Workers**: 100,000 requests/day
- **D1**: 5M row reads/day, 100K writes/day
- **KV**: 100K reads/day, 1K writes/day
- **Pages**: Unlimited requests

**Estimated Cost**: $0/month

### Paid Tier (High traffic)
- **Workers**: $5/10M requests
- **D1**: $5/1B row reads
- **KV**: $0.50/1M reads
- **Pages**: Free

**Estimated Cost**: $5-20/month (medium traffic)

## 🛠️ Development

### Add New API Endpoint

1. Create handler in `workers/src/handlers/`
2. Add route in `workers/src/index.ts`
3. Add types in `workers/src/types/`
4. Update frontend API client in `frontend/src/services/api.ts`

### Add Database Migration

1. Create SQL file in `migrations/`
2. Apply migration:
   ```bash
   wrangler d1 execute pbtodo-db --file=migrations/003_your_migration.sql
   ```

### Update Environment Variables

1. Add to `.env.development` (frontend)
2. Add to `wrangler.toml` (workers)
3. Set secrets: `wrangler secret put SECRET_NAME`

## 🐛 Troubleshooting

### Workers not starting
```bash
# Check wrangler version
wrangler --version

# Update wrangler
npm install -g wrangler@latest

# Clear wrangler cache
rm -rf ~/.wrangler
```

### Database errors
```bash
# List databases
wrangler d1 list

# Query database
wrangler d1 execute pbtodo-db --command "SELECT * FROM users LIMIT 5"

# Re-apply migrations
wrangler d1 execute pbtodo-db --file=migrations/001_create_users.sql
```

### CORS issues
1. Check `ALLOWED_ORIGINS` in `wrangler.toml`
2. Ensure frontend URL is included
3. Restart Workers dev server

### Authentication errors
```bash
# Check if JWT_SECRET is set
wrangler secret list

# Set JWT_SECRET
wrangler secret put JWT_SECRET
```

## 📚 Resources

- [Cloudflare Workers Docs](https://developers.cloudflare.com/workers/)
- [Cloudflare D1 Docs](https://developers.cloudflare.com/d1/)
- [Cloudflare KV Docs](https://developers.cloudflare.com/workers/runtime-apis/kv/)
- [Cloudflare Pages Docs](https://developers.cloudflare.com/pages/)
- [Wrangler CLI Docs](https://developers.cloudflare.com/workers/wrangler/)

## 🤝 Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open pull request

## 📄 License

MIT License - see LICENSE file for details

## 🙏 Acknowledgments

- Built with [Cloudflare Workers](https://workers.cloudflare.com/)
- Frontend powered by [React](https://react.dev/) and [Vite](https://vitejs.dev/)
- Inspired by modern serverless architectures

---

**Status**: ✅ Production Ready

**Version**: 1.0.0

**Last Updated**: 2024-11-04