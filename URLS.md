# Application URLs Reference

## 🌍 All Environment URLs

### Quick Reference Table

| Environment | API Backend | Frontend | Status |
|-------------|-------------|----------|--------|
| **Development** | https://pbtodo-api-dev.bua.workers.dev | http://localhost:5173 | ✅ Active |
| **Staging** | https://pbtodo-api-staging.bua.workers.dev | https://develop.pbtodo-frontend.pages.dev | ✅ Active |
| **Production** | https://pbtodo-api.bua.workers.dev | https://pbtodo-frontend.pages.dev | ✅ Active |

---

## 1️⃣ Development Environment

### API Backend
```
https://pbtodo-api-dev.bua.workers.dev
```

**Endpoints:**
- Health: `https://pbtodo-api-dev.bua.workers.dev/api/health`
- Register: `https://pbtodo-api-dev.bua.workers.dev/api/auth/register`
- Login: `https://pbtodo-api-dev.bua.workers.dev/api/auth/login`
- Todos: `https://pbtodo-api-dev.bua.workers.dev/api/todos`

### Frontend
```
http://localhost:5173
```

**Purpose:** Local development and testing

**How to run:**
```bash
npm run dev
```

---

## 2️⃣ Staging Environment

### API Backend
```
https://pbtodo-api-staging.bua.workers.dev
```

**Endpoints:**
- Health: `https://pbtodo-api-staging.bua.workers.dev/api/health`
- Register: `https://pbtodo-api-staging.bua.workers.dev/api/auth/register`
- Login: `https://pbtodo-api-staging.bua.workers.dev/api/auth/login`
- Todos: `https://pbtodo-api-staging.bua.workers.dev/api/todos`

### Frontend
```
https://develop.pbtodo-frontend.pages.dev
```

**Alternative staging URLs** (Cloudflare Pages preview):
- Branch deployments: `https://develop.pbtodo-frontend.pages.dev`
- Custom subdomain: `https://staging.pbtodo-frontend.pages.dev` (if configured)

**Purpose:** Pre-production testing and QA

**Auto-deploys on:** Push to `develop` branch

---

## 3️⃣ Production Environment

### API Backend
```
https://pbtodo-api.bua.workers.dev
```

**Endpoints:**
- Health: `https://pbtodo-api.bua.workers.dev/api/health`
- Register: `https://pbtodo-api.bua.workers.dev/api/auth/register`
- Login: `https://pbtodo-api.bua.workers.dev/api/auth/login`
- Refresh: `https://pbtodo-api.bua.workers.dev/api/auth/refresh`
- Logout: `https://pbtodo-api.bua.workers.dev/api/auth/logout`
- Todos (GET): `https://pbtodo-api.bua.workers.dev/api/todos`
- Todo by ID (GET): `https://pbtodo-api.bua.workers.dev/api/todos/:id`
- Create Todo (POST): `https://pbtodo-api.bua.workers.dev/api/todos`
- Update Todo (PUT): `https://pbtodo-api.bua.workers.dev/api/todos/:id`
- Delete Todo (DELETE): `https://pbtodo-api.bua.workers.dev/api/todos/:id`
- Toggle Todo (PATCH): `https://pbtodo-api.bua.workers.dev/api/todos/:id/toggle`

### Frontend
```
https://pbtodo-frontend.pages.dev
```

**Alternative production URLs** (Cloudflare Pages deployments):
- Main: `https://pbtodo-frontend.pages.dev`
- Preview URLs: `https://[commit-hash].pbtodo-frontend.pages.dev`
- Allowed origins:
  - `https://8141e11b.pbtodo-frontend.pages.dev`
  - `https://35c06048.pbtodo-frontend.pages.dev`
  - `https://33e334ef.pbtodo-frontend.pages.dev`
  - `https://c0ab88d7.pbtodo-frontend.pages.dev`
  - `https://1b7b007a.pbtodo-frontend.pages.dev`
  - `https://master.pbtodo-frontend.pages.dev`

**Purpose:** Live application serving real users

**Auto-deploys on:** Push to `master` branch

---

## 🧪 Testing URLs

### Quick Health Checks

```bash
# Development
curl https://pbtodo-api-dev.bua.workers.dev/api/health

# Staging
curl https://pbtodo-api-staging.bua.workers.dev/api/health

# Production
curl https://pbtodo-api.bua.workers.dev/api/health
```

**Expected response:**
```json
{
  "success": true,
  "message": "PBTodo API is running",
  "timestamp": 1762256314891,
  "version": "1.0.1-expiration-test"
}
```

### Test Registration

```bash
# Staging (safe for testing)
curl -X POST https://pbtodo-api-staging.bua.workers.dev/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"TestPass123!","name":"Test User"}'

# Development
curl -X POST https://pbtodo-api-dev.bua.workers.dev/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"TestPass123!","name":"Test User"}'
```

### Test Login

```bash
# Staging
curl -X POST https://pbtodo-api-staging.bua.workers.dev/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"TestPass123!"}'

# Production (use real credentials)
curl -X POST https://pbtodo-api.bua.workers.dev/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"your-email@example.com","password":"YourPassword123!"}'
```

---

## 🔧 Environment Configuration

### Development
- **Branch:** feature/* branches
- **Database:** pbtodo-db (e3a9f258-138e-4270-84c9-d0d720594105) - Shared with production
- **CORS:** `http://localhost:5173`, `http://127.0.0.1:5173`
- **Auto-deploy:** No (manual only)

### Staging
- **Branch:** develop
- **Database:** pbtodo-db-staging (cd9fcfcb-fccb-4f81-a211-16a40754dae6) - Isolated
- **CORS:** `https://develop.pbtodo-frontend.pages.dev`, `http://localhost:5173`
- **Auto-deploy:** Yes (on push to develop)

### Production
- **Branch:** master
- **Database:** pbtodo-db (e3a9f258-138e-4270-84c9-d0d720594105)
- **CORS:** `https://pbtodo-frontend.pages.dev` + preview URLs
- **Auto-deploy:** Yes (on push to master)

---

## 📱 Access URLs in Browser

### Development
Open in browser: http://localhost:5173
- Run `npm run dev` first
- API automatically points to dev backend

### Staging
Open in browser: https://develop.pbtodo-frontend.pages.dev
- Automatically deployed on push to develop
- Uses staging API backend

### Production
Open in browser: https://pbtodo-frontend.pages.dev
- Live production application
- Uses production API backend

---

## 🔗 Additional URLs

### Cloudflare Dashboard
- Workers: https://dash.cloudflare.com/workers
- Pages: https://dash.cloudflare.com/pages
- D1 Databases: https://dash.cloudflare.com/d1
- KV Namespaces: https://dash.cloudflare.com/kv

### GitHub Repository
- Main: https://github.com/gnoparus/pbtodo
- Actions: https://github.com/gnoparus/pbtodo/actions
- Settings: https://github.com/gnoparus/pbtodo/settings

---

## 🎯 Use Cases

### Local Development
```
Frontend: http://localhost:5173
API: https://pbtodo-api-dev.bua.workers.dev
```
- Rapid iteration
- Debug with browser DevTools
- Test new features locally

### Pre-Production Testing
```
Frontend: https://develop.pbtodo-frontend.pages.dev
API: https://pbtodo-api-staging.bua.workers.dev
```
- QA testing
- Integration testing
- Performance testing
- Security testing
- Isolated from production data

### Production
```
Frontend: https://pbtodo-frontend.pages.dev
API: https://pbtodo-api.bua.workers.dev
```
- Live application
- Real user data
- Production monitoring
- Performance tracking

---

## 🔄 URL Configuration in Code

### Frontend Environment Variables

**Development (.env.development):**
```env
VITE_API_URL=https://pbtodo-api-dev.bua.workers.dev/api
VITE_ENVIRONMENT=development
```

**Staging (.env.staging):**
```env
VITE_API_URL=https://pbtodo-api-staging.bua.workers.dev/api
VITE_ENVIRONMENT=staging
```

**Production (.env.production):**
```env
VITE_API_URL=https://pbtodo-api.bua.workers.dev/api
VITE_ENVIRONMENT=production
```

### Backend CORS Configuration

Located in `workers/wrangler.toml`:

```toml
[env.development.vars]
ALLOWED_ORIGINS = "http://localhost:5173,http://127.0.0.1:5173"

[env.staging.vars]
ALLOWED_ORIGINS = "https://develop.pbtodo-frontend.pages.dev,http://localhost:5173"

[env.production.vars]
ALLOWED_ORIGINS = "https://pbtodo-frontend.pages.dev,https://..."
```

---

## 📊 Quick Copy-Paste

### All Health Checks
```bash
echo "=== Development ==="
curl -s https://pbtodo-api-dev.bua.workers.dev/api/health | jq

echo "=== Staging ==="
curl -s https://pbtodo-api-staging.bua.workers.dev/api/health | jq

echo "=== Production ==="
curl -s https://pbtodo-api.bua.workers.dev/api/health | jq
```

### Open All Frontends
```bash
# macOS
open http://localhost:5173
open https://develop.pbtodo-frontend.pages.dev
open https://pbtodo-frontend.pages.dev

# Linux
xdg-open http://localhost:5173
xdg-open https://develop.pbtodo-frontend.pages.dev
xdg-open https://pbtodo-frontend.pages.dev
```

---

## ✅ Verification

All URLs tested and verified on: **November 4, 2025**

- ✅ Development API responding
- ✅ Staging API responding
- ✅ Production API responding
- ✅ All health checks passing
- ✅ Registration working
- ✅ Login working
- ✅ CORS properly configured

---

**Last Updated:** November 4, 2025  
**Status:** ✅ All URLs Active and Operational