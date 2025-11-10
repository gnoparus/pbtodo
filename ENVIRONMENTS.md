# 🌍 Environments Overview

This document provides a complete overview of all deployed environments for the pbtodo application.

## 📋 Environment Summary

| Environment | Status | Purpose | Branch | Auto-Deploy | URL |
|-------------|--------|---------|--------|-------------|--------|------|
| **Development** | ✅ Active | Local development & testing | feature/* | No | `http://localhost:5173` |
| **Staging** | ✅ Active | Pre-production testing | develop | Yes | `https://staging.pbtodo-frontend.pages.dev` |
| **Production** | ✅ Active | Live application | main | Yes | `https://pbtodo-frontend.pages.dev` |

## 🌿 Branch Strategy

### Git Workflow
```
feature/* → develop (PR) → main (Release)
    ↓           ↓              ↓
Development   Staging         Production
```

### Deployment Triggers
- **feature/*** → PR → `develop`**: Triggers staging deployment
- **develop → main**: Triggers production deployment (after PR approval)
- **main**: Automatic production deployment

---

## 1️⃣ Development Environment

**Purpose:** Local development and feature testing

### Configuration
- **Workers API:** `http://localhost:8787`
- **Frontend:** `http://localhost:5173`
- **Branch:** `feature/*` branches
- **Database:** Local development environment
- **Version:** Current feature branch

### Environment Variables
```bash
VITE_API_URL=http://localhost:8787/api
VITE_ENVIRONMENT=development
VITE_DEV_MODE=true
VITE_HTTPS_ENABLED=false
```

### Local Setup
```bash
# Terminal 1: Start API
cd workers && npm run dev

# Terminal 2: Start frontend  
cd frontend && npm run dev
```

### Resources

```toml
[env.development]
name = "pbtodo-api-dev"
database_id = "e3a9f258-138e-4270-84c9-d0d720594105"
```

**D1 Database:** pbtodo-db
- UUID: `e3a9f258-138e-4270-84c9-d0d720594105`
- Shared with production (use with caution)

**KV Namespaces:**
- SESSIONS: `be366149c15e4007be460e67e8ab538f`
- RATE_LIMITS: `f115bf7d6b584fc7aee5ef4df507c1a9`

## 🔧 Environment Management

### Switching Between Environments
```bash
# Check current branch
git branch

# Switch to staging
git checkout develop

# Switch to main
git checkout main

# Create feature branch
git checkout -b feature/new-feature
```

### Environment Testing
```bash
# Test staging API
curl -s https://pbtodo-api-staging.bua.workers.dev/api/health

# Test production API  
curl -s https://pbtodo-api.bua.workers.dev/api/health

# Test local API
curl -s http://localhost:8787/api/health
```
npm run dev

# Test development API
curl https://pbtodo-api-dev.bua.workers.dev/api/health
```

### Notes

- ⚠️ Shares database with production - avoid destructive operations
- Use for testing Workers API changes before staging
- CORS configured for localhost

---

## 2️⃣ Staging Environment

**Purpose:** Pre-production testing and QA

### Configuration

- **Workers API:** https://pbtodo-api-staging.bua.workers.dev
- **Frontend:** https://develop.pbtodo-frontend.pages.dev
- **Branch:** develop
- **Database:** pbtodo-db-staging (isolated)
- **Version:** 5ad81a6a-23c9-415f-9c9b-441f6c1142c3

### Resources

```toml
[env.staging]
name = "pbtodo-api-staging"
database_id = "cd9fcfcb-fccb-4f81-a211-16a40754dae6"
```

**D1 Database:** pbtodo-db-staging
- UUID: `cd9fcfcb-fccb-4f81-a211-16a40754dae6`
- **Isolated** - safe for testing
- Created: 2025-11-04
- Tables: users, todos

**KV Namespaces:**
- SESSIONS: `813ae8a4d3884de894c976ab573870be`
- RATE_LIMITS: `6295b1db148944ac8594bdec5df630de`

**Secrets:**
- JWT_SECRET: ✅ Set (unique from production)
- ENCRYPTION_KEY: ✅ Set (unique from production)

### Usage

```bash
# Deploy to staging
cd workers
wrangler deploy --env staging

# Or push to develop branch (auto-deploys via GitHub Actions)
git push origin develop

# Test staging API
curl https://pbtodo-api-staging.bua.workers.dev/api/health

# View logs
wrangler tail --env staging

# Query database
wrangler d1 execute pbtodo-db-staging \
  --command="SELECT * FROM users LIMIT 5;" \
  --remote
```

### Automated Deployment

Triggers on:
- Push to `develop` branch
- Workflow: `.github/workflows/deploy-staging-cloudflare.yml`

Process:
1. ✅ Build & test
2. ✅ Deploy Workers API
3. ✅ Deploy frontend to Pages
4. ✅ Health checks
5. ✅ PR comments with deployment status

### Test Results

```bash
# ✅ Health Check
$ curl https://pbtodo-api-staging.bua.workers.dev/api/health
{"success":true,"message":"PBTodo API is running",...}

# ✅ Registration
$ curl -X POST https://pbtodo-api-staging.bua.workers.dev/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@staging.com","password":"TestPass123!","name":"Test"}'
{"success":true,"data":{...}}

# ✅ Login
$ curl -X POST https://pbtodo-api-staging.bua.workers.dev/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@staging.com","password":"TestPass123!"}'
{"success":true,"data":{...}}
```

### Notes

- 🔒 Fully isolated from production
- 🤖 Automatic deployments on push to develop
- 🧪 Safe for destructive testing
- 📊 Use for QA and integration testing

---

## 3️⃣ Production Environment

**Purpose:** Live application serving real users

### Configuration

- **Workers API:** https://pbtodo-api.bua.workers.dev
- **Frontend:** https://pbtodo-frontend.pages.dev
- **Branch:** master
- **Database:** pbtodo-db
- **Latest Version:** e377890a-2af7-4b84-8fe5-805061dd5be0

### Resources

```toml
[env.production]
name = "pbtodo-api"
database_id = "e3a9f258-138e-4270-84c9-d0d720594105"
```

**D1 Database:** pbtodo-db
- UUID: `e3a9f258-138e-4270-84c9-d0d720594105`
- **Production data** - handle with extreme care
- Tables: users, todos

**KV Namespaces:**
- SESSIONS: `be366149c15e4007be460e67e8ab538f`
- RATE_LIMITS: `f115bf7d6b584fc7aee5ef4df507c1a9`

**Secrets:**
- JWT_SECRET: ✅ Set
- ENCRYPTION_KEY: ✅ Set

### Usage

```bash
# Deploy to production
cd workers
wrangler deploy --env production

# Or push to master branch (auto-deploys via GitHub Actions)
git push origin master

# Test production API
curl https://pbtodo-api.bua.workers.dev/api/health

# View logs (use sparingly)
wrangler tail --env production
```

### Automated Deployment

Triggers on:
- Push to `master` branch
- Workflow: `.github/workflows/deploy-cloudflare.yml`

Process:
1. ✅ Build & test
2. ✅ TypeScript checks
3. ✅ Deploy Workers API
4. ✅ Deploy frontend to Pages
5. ✅ Health checks
6. ✅ Deployment summary

### Recent Deployments

| Version | Date | Description |
|---------|------|-------------|
| e377890a-2af7-4b84-8fe5-805061dd5be0 | 2025-11-04 | KV expiration fix (rate limiting) |
| a973ce02-25eb-4875-8dda-75159dd4110c | 2025-11-04 | Added 65-second buffer for KV |
| a7b12d08-7bb1-40bd-bf70-f0c20a8a58e5 | 2025-11-04 | Initial KV timestamp fix |

### Notes

- 🔴 **Production - handle with care!**
- 🚀 Automatic deployments on push to master
- 📊 All changes should be tested in staging first
- 🔒 Security headers enforced
- 📈 Rate limiting active

---

## 🔄 Deployment Workflow

### Recommended Flow

```
feature/branch  →  develop  →  master
     ↓              ↓           ↓
Local Dev      Staging    Production
```

### Step-by-Step

1. **Develop locally**
   ```bash
   git checkout -b feature/new-feature
   # Make changes, test locally
   npm run dev
   ```

2. **Deploy to staging**
   ```bash
   git checkout develop
   git merge feature/new-feature
   git push origin develop
   # Auto-deploys to staging
   ```

3. **Test on staging**
   - Run automated tests
   - Manual QA testing
   - Performance testing
   - Security checks

4. **Deploy to production**
   ```bash
   git checkout master
   git merge develop
   git push origin master
   # Auto-deploys to production
   ```

---

## 🛠️ Common Operations

### Switch Between Environments

```bash
# Deploy specific environment
wrangler deploy --env development
wrangler deploy --env staging
wrangler deploy --env production

# View environment status
wrangler deployments list --env staging

# Check environment configuration
wrangler tail --env staging
```

### Database Operations

```bash
# Query staging database
wrangler d1 execute pbtodo-db-staging \
  --command="SELECT COUNT(*) as users FROM users;" \
  --remote

# Export staging data
wrangler d1 export pbtodo-db-staging \
  --output=staging-backup.sql \
  --remote

# ⚠️ Production database (be careful!)
wrangler d1 execute pbtodo-db \
  --command="SELECT COUNT(*) as users FROM users;" \
  --remote
```

### KV Operations

```bash
# List keys in staging
wrangler kv key list \
  --namespace-id=813ae8a4d3884de894c976ab573870be

# Get specific session
wrangler kv key get "session:USER_ID" \
  --namespace-id=813ae8a4d3884de894c976ab573870be

# Clear staging cache (safe)
wrangler kv key delete "rate_limit:*" \
  --namespace-id=6295b1db148944ac8594bdec5df630de
```

### Secrets Management

```bash
# List secrets
wrangler secret list --env staging
wrangler secret list --env production

# Update secret
wrangler secret put JWT_SECRET --env staging
wrangler secret put JWT_SECRET --env production
```

---

## 🔍 Monitoring & Debugging

### Health Checks

```bash
# Check all environments
curl https://pbtodo-api-dev.bua.workers.dev/api/health
curl https://pbtodo-api-staging.bua.workers.dev/api/health
curl https://pbtodo-api.bua.workers.dev/api/health
```

### Logs

```bash
# Tail staging logs
wrangler tail --env staging --format pretty

# Tail production logs (use sparingly)
wrangler tail --env production --format pretty
```

### Metrics

View in Cloudflare Dashboard:
- Workers → [Environment] → Metrics
- D1 → [Database] → Metrics
- KV → Analytics

---

## 🔐 Security Considerations

### Secrets

- ✅ Different secrets per environment
- ✅ Rotated regularly
- ✅ Never committed to git
- ✅ Managed via Wrangler CLI

### Database Access

- 🔴 **Production:** Read-only queries only
- 🟡 **Staging:** Safe for testing, but backup first
- 🟢 **Development:** Shared with production (be careful!)

### CORS Configuration

**Development:**
- `http://localhost:5173`
- `http://127.0.0.1:5173`

**Staging:**
- `https://staging.pbtodo-frontend.pages.dev`
- `https://develop.pbtodo-frontend.pages.dev`
- `http://localhost:5173` (for local testing)

**Production:**
- `https://pbtodo-frontend.pages.dev`
- Cloudflare Pages preview URLs

---

## 📚 Documentation References

- **Quick Start:** [QUICK_START_STAGING.md](./QUICK_START_STAGING.md)
- **Full Staging Guide:** [STAGING_SETUP.md](./STAGING_SETUP.md)
- **CI/CD Status:** [CI_CD_STATUS.md](./CI_CD_STATUS.md)
- **KV Fix Details:** [KV_TTL_FIX.md](./KV_TTL_FIX.md)

---

## 🆘 Troubleshooting

### Environment not responding

```bash
# Check deployment status
wrangler deployments list --env staging

# Redeploy
wrangler deploy --env staging
```

### Database errors

```bash
# Verify database exists
wrangler d1 list

# Check tables
wrangler d1 execute pbtodo-db-staging \
  --command="SELECT name FROM sqlite_master WHERE type='table';" \
  --remote
```

### CORS errors

Check `ALLOWED_ORIGINS` in wrangler.toml matches your frontend URL.

### Secrets not working

```bash
# Verify secrets are set
wrangler secret list --env staging

# Re-create if needed
wrangler secret put JWT_SECRET --env staging
```

---

## 📊 Environment Comparison

| Feature | Development | Staging | Production |
|---------|-------------|---------|------------|
| **API URL** | pbtodo-api-dev | pbtodo-api-staging | pbtodo-api |
| **Database** | pbtodo-db (shared) | pbtodo-db-staging | pbtodo-db |
| **Isolated DB** | ❌ No | ✅ Yes | ✅ Yes |
| **Auto-Deploy** | ❌ No | ✅ Yes (develop) | ✅ Yes (master) |
| **Use Case** | Local testing | QA & integration | Live users |
| **Data Safety** | ⚠️ Shared | ✅ Safe | 🔴 Critical |
| **CORS** | localhost | staging URLs | production URLs |
| **Secrets** | Shared with prod | Unique | Unique |

---

## ✅ Current Status

### All Environments: ✅ OPERATIONAL

- ✅ Development: Deployed and tested
- ✅ Staging: Deployed and tested
- ✅ Production: Live and stable

### Recent Updates

- **2025-11-04:** Staging environment created and deployed
- **2025-11-04:** Development environment properly configured
- **2025-11-04:** KV expiration fix deployed to all environments
- **2025-11-04:** CI/CD pipelines updated for all environments

---

**Last Updated:** November 4, 2025  
**Maintainer:** DevOps Team  
**Status:** ✅ All Systems Operational