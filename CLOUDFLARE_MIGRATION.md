# Cloudflare Serverless Migration Guide

This document provides a comprehensive guide for the migration from PocketBase to a full Cloudflare serverless architecture.

## 🎯 Overview

This migration replaces the PocketBase backend with:
- **Cloudflare Workers** - Serverless API endpoints
- **Cloudflare D1** - SQLite database
- **Cloudflare KV** - Session storage and rate limiting
- **Cloudflare Pages** - Static site hosting

## 📋 Prerequisites

1. **Cloudflare Account**: Sign up at [cloudflare.com](https://cloudflare.com)
2. **Node.js**: Version 18 or higher
3. **Wrangler CLI**: Install globally
   ```bash
   npm install -g wrangler
   ```
4. **Login to Cloudflare**:
   ```bash
   wrangler login
   ```

## 🚀 Quick Start

### 1. Setup Cloudflare Resources

Run the automated setup script:

```bash
./scripts/setup-cloudflare.sh
```

This script will:
- Create D1 database (`pbtodo-db`)
- Apply database migrations
- Create KV namespaces (sessions, rate-limits)
- Update `wrangler.toml` with resource IDs
- Set up JWT secret

### 2. Install Dependencies

```bash
# Install Workers dependencies
cd workers
npm install

# Install frontend dependencies (if not already done)
cd ../frontend
npm install
```

### 3. Test Locally

#### Start Workers API (Terminal 1):
```bash
cd workers
npm run dev
# API will run on http://localhost:8787
```

#### Start Frontend (Terminal 2):
```bash
cd frontend
npm run dev
# Frontend will run on http://localhost:5173
```

### 4. Deploy to Production

#### Deploy Workers API:
```bash
cd workers
npm run deploy
```

#### Deploy Frontend to Pages:
```bash
cd ..
npm run build
cd workers
wrangler pages deploy ../frontend/dist --project-name=pbtodo-frontend
```

## 📁 Project Structure

```
pbtodo/
├── migrations/              # D1 database migrations
│   ├── 001_create_users.sql
│   └── 002_create_todos.sql
├── workers/                 # Cloudflare Workers API
│   ├── src/
│   │   ├── handlers/       # API route handlers
│   │   │   ├── auth.ts     # Authentication endpoints
│   │   │   └── todos.ts    # Todos CRUD endpoints
│   │   ├── middleware/     # Express-like middleware
│   │   │   ├── auth.ts     # JWT authentication
│   │   │   ├── cors.ts     # CORS handling
│   │   │   └── rateLimit.ts # Rate limiting
│   │   ├── utils/          # Utility functions
│   │   │   ├── crypto.ts   # Password hashing
│   │   │   ├── jwt.ts      # JWT utilities
│   │   │   └── validation.ts # Input validation
│   │   ├── types/          # TypeScript types
│   │   └── index.ts        # Main router
│   ├── wrangler.toml       # Workers configuration
│   ├── package.json
│   └── tsconfig.json
├── frontend/               # React frontend (minimal changes)
│   ├── src/
│   │   ├── services/
│   │   │   ├── api.ts      # NEW: Workers API client
│   │   │   └── pocketbase.ts # OLD: PocketBase client (deprecated)
│   │   └── ...
│   └── .env.development    # Updated API URL
└── scripts/
    └── setup-cloudflare.sh # Automated setup
```

## 🔄 API Changes

### Authentication

**PocketBase (Old)**:
```typescript
await pb.collection('users').authWithPassword(email, password)
```

**Workers (New)**:
```typescript
await api.auth.login(email, password)
// Returns: { token: string, user: User }
```

### Todos CRUD

**PocketBase (Old)**:
```typescript
await pb.collection('todos').getFullList()
```

**Workers (New)**:
```typescript
await api.todos.getAll()
// Returns: Todo[]
```

## 🗄️ Database Schema

### Users Table
```sql
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  avatar TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
```

### Todos Table
```sql
CREATE TABLE todos (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  completed INTEGER NOT NULL DEFAULT 0,
  priority TEXT NOT NULL CHECK(priority IN ('low', 'medium', 'high')),
  user_id TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

## 🔐 Security Features

### Password Hashing
- Uses PBKDF2 with 100,000 iterations
- SHA-256 hash algorithm
- 16-byte random salt per password
- Constant-time comparison

### JWT Tokens
- HS256 algorithm
- 24-hour expiration
- Includes userId and email in payload
- Stored in localStorage

### Rate Limiting
- **Login**: 5 attempts per minute, 15-minute block
- **Registration**: 3 attempts per minute, 30-minute block
- **API**: 100 requests per minute
- Stored in Cloudflare KV

### CORS
- Configurable allowed origins
- Credentials support
- Preflight request handling

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

# Secrets (set via wrangler secret put)
# JWT_SECRET = "..." (set manually)
```

## 📡 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/logout` - Logout user (protected)
- `POST /api/auth/refresh` - Refresh token (protected)
- `GET /api/auth/me` - Get current user (protected)

### Todos
- `GET /api/todos` - List all todos (protected)
- `POST /api/todos` - Create todo (protected)
- `GET /api/todos/:id` - Get single todo (protected)
- `PATCH /api/todos/:id` - Update todo (protected)
- `DELETE /api/todos/:id` - Delete todo (protected)
- `PATCH /api/todos/:id/toggle` - Toggle completion (protected)

### Health
- `GET /api/health` - Health check (public)

## 🧪 Testing

### Test Workers Locally
```bash
cd workers
npm run dev
```

### Test API Endpoints
```bash
# Register user
curl -X POST http://localhost:8787/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test1234!","name":"Test User"}'

# Login
curl -X POST http://localhost:8787/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test1234!"}'

# Get todos (use token from login response)
curl -X GET http://localhost:8787/api/todos \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

## 🚨 Troubleshooting

### Workers not starting
```bash
# Check wrangler version
wrangler --version

# Update wrangler
npm install -g wrangler@latest

# Check wrangler.toml is valid
cd workers && wrangler dev --dry-run
```

### Database migrations failing
```bash
# List databases
wrangler d1 list

# Execute migration manually
wrangler d1 execute pbtodo-db --file=migrations/001_create_users.sql
```

### CORS errors
1. Check `ALLOWED_ORIGINS` in `wrangler.toml`
2. Ensure frontend URL is included
3. Restart Workers dev server

### Authentication errors
1. Verify JWT_SECRET is set: `cd workers && wrangler secret list`
2. Check token in localStorage
3. Verify token hasn't expired (24h)

## 📊 Performance

### Workers
- **Cold start**: ~10-50ms
- **Warm requests**: ~1-5ms
- **Global edge deployment**: 275+ locations

### D1 Database
- **Read latency**: ~10-50ms (edge cached)
- **Write latency**: ~100-300ms (primary region)
- **Storage**: 5GB free tier

### KV Storage
- **Read latency**: ~10-50ms (edge cached)
- **Write latency**: ~60s propagation globally
- **Storage**: 1GB free tier

## 💰 Cost Estimation

### Free Tier (Typical Small App)
- Workers: 100,000 requests/day
- D1: 5M reads/day, 100K writes/day
- KV: 100K reads/day, 1K writes/day
- Pages: Unlimited requests

**Estimated Monthly Cost**: $0

### Paid (High Traffic)
- Workers: $5 per 10M requests
- D1: $5 per 1B rows read
- KV: $0.50 per 1M reads

**Estimated Monthly Cost**: $5-20/month (medium traffic)

## 🔄 Migration Checklist

- [ ] Install wrangler CLI
- [ ] Login to Cloudflare
- [ ] Run setup script
- [ ] Review wrangler.toml
- [ ] Set JWT_SECRET
- [ ] Test Workers locally
- [ ] Test frontend with Workers API
- [ ] Deploy Workers to production
- [ ] Deploy frontend to Pages
- [ ] Update DNS (if using custom domain)
- [ ] Test production deployment
- [ ] Monitor logs and errors

## 📚 Additional Resources

- [Cloudflare Workers Docs](https://developers.cloudflare.com/workers/)
- [Cloudflare D1 Docs](https://developers.cloudflare.com/d1/)
- [Cloudflare KV Docs](https://developers.cloudflare.com/workers/runtime-apis/kv/)
- [Cloudflare Pages Docs](https://developers.cloudflare.com/pages/)
- [Wrangler CLI Docs](https://developers.cloudflare.com/workers/wrangler/)

## 🆘 Support

For issues or questions:
1. Check the troubleshooting section above
2. Review Cloudflare Workers documentation
3. Check GitHub issues
4. Open a new issue with detailed description

## 📝 Notes

- The old PocketBase service (`frontend/src/services/pocketbase.ts`) is kept for reference but is no longer used
- All API responses now follow the format: `{ success: boolean, data?: any, error?: string }`
- Timestamps are now Unix timestamps (seconds) instead of ISO strings
- User IDs and Todo IDs are UUIDs generated with `crypto.randomUUID()`
- Session storage moved from PocketBase to Cloudflare KV
- Rate limiting moved from client-side to server-side (KV storage)