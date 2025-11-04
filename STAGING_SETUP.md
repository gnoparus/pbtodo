# Staging Environment Setup Guide

## Overview

This guide explains how to set up a complete staging environment for the pbtodo application using Cloudflare Workers, Pages, D1, and KV.

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Staging Environment                   │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  Frontend (Cloudflare Pages)                             │
│  ├─ URL: staging.pbtodo-frontend.pages.dev              │
│  └─ Branch: develop                                      │
│                                                           │
│  Backend (Cloudflare Workers)                            │
│  ├─ URL: pbtodo-api-staging.bua.workers.dev             │
│  ├─ D1 Database: pbtodo-db-staging                      │
│  ├─ KV: SESSIONS (staging)                              │
│  └─ KV: RATE_LIMITS (staging)                           │
│                                                           │
└─────────────────────────────────────────────────────────┘
```

## Prerequisites

- Cloudflare account with Workers enabled
- Wrangler CLI installed (`npm install -g wrangler`)
- Authenticated with Cloudflare (`wrangler login`)
- Git repository access

## Step 1: Create Staging Branch

```bash
# Create and push develop branch for staging
git checkout -b develop
git push origin develop

# Or use an existing branch
git checkout develop
git pull origin develop
```

## Step 2: Create Cloudflare Resources

### 2.1 Create Staging D1 Database

```bash
# Create staging database
wrangler d1 create pbtodo-db-staging

# Output will show database ID like:
# database_id = "abc123-def456-ghi789"
```

**Copy the `database_id` from the output!**

### 2.2 Create Staging KV Namespaces

```bash
# Create SESSIONS KV namespace for staging
wrangler kv:namespace create "SESSIONS" --env staging

# Output example:
# id = "xyz789abc123def456"

# Create RATE_LIMITS KV namespace for staging
wrangler kv:namespace create "RATE_LIMITS" --env staging

# Output example:
# id = "qwe456rty789uio012"
```

**Copy both KV namespace IDs from the outputs!**

### 2.3 Initialize Staging Database Schema

```bash
cd workers

# Apply migrations to staging database
wrangler d1 execute pbtodo-db-staging --file=./migrations/0001_initial_schema.sql --env staging

# Verify tables were created
wrangler d1 execute pbtodo-db-staging --command="SELECT name FROM sqlite_master WHERE type='table';" --env staging
```

## Step 3: Update wrangler.toml Configuration

Edit `workers/wrangler.toml` and replace the placeholder IDs:

```toml
# Staging environment
[env.staging]
name = "pbtodo-api-staging"

# D1 Database binding for staging
[[env.staging.d1_databases]]
binding = "DB"
database_name = "pbtodo-db-staging"
database_id = "YOUR_STAGING_DB_ID_HERE"  # Replace with actual ID from step 2.1

# Staging KV namespaces
[[env.staging.kv_namespaces]]
binding = "SESSIONS"
id = "YOUR_STAGING_SESSIONS_KV_ID"  # Replace with actual ID from step 2.2

[[env.staging.kv_namespaces]]
binding = "RATE_LIMITS"
id = "YOUR_STAGING_RATE_LIMITS_KV_ID"  # Replace with actual ID from step 2.2

[env.staging.vars]
ALLOWED_ORIGINS = "https://staging.pbtodo-frontend.pages.dev,https://develop.pbtodo-frontend.pages.dev,http://localhost:5173"
ENVIRONMENT = "staging"
```

## Step 4: Set Staging Secrets

```bash
cd workers

# Set JWT secret for staging
wrangler secret put JWT_SECRET --env staging
# Enter a secure random string (different from production!)

# Set encryption key for staging
wrangler secret put ENCRYPTION_KEY --env staging
# Enter a secure random string (different from production!)

# Verify secrets are set
wrangler secret list --env staging
```

**Important:** Use different secrets than production!

## Step 5: Deploy Backend to Staging

```bash
cd workers

# Deploy to staging environment
wrangler deploy --env staging

# You should see output like:
# Uploaded pbtodo-api-staging (X.XX sec)
# Deployed pbtodo-api-staging triggers (X.XX sec)
#   https://pbtodo-api-staging.bua.workers.dev
```

### Test Staging API

```bash
# Test health endpoint
curl https://pbtodo-api-staging.bua.workers.dev/api/health

# Expected response: {"status":"ok","timestamp":...}

# Test registration
curl -X POST https://pbtodo-api-staging.bua.workers.dev/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@staging.com","password":"TestPass123!","name":"Staging Test"}'

# Expected response: {"success":true,"data":{...}}
```

## Step 6: Setup Frontend Staging on Cloudflare Pages

### 6.1 Create Staging Environment in Pages

1. Go to Cloudflare Dashboard → Pages
2. Select your `pbtodo-frontend` project
3. Go to **Settings** → **Builds & deployments**
4. Scroll to **Branch deployments**
5. Add `develop` branch for automatic deployments

### 6.2 Configure Staging Environment Variables

In Cloudflare Pages dashboard:

1. Go to **Settings** → **Environment variables**
2. Select **Production and Previews** or create **Preview** environment
3. Add these variables:

```
VITE_API_URL = https://pbtodo-api-staging.bua.workers.dev/api
VITE_HTTPS_ENABLED = true
VITE_DEV_MODE = false
VITE_ENABLE_SECURITY_HEADERS = true
VITE_ENABLE_CSP = true
VITE_ENABLE_HSTS = true
VITE_ENVIRONMENT = staging
```

### 6.3 Deploy to Staging

```bash
# Push to develop branch to trigger deployment
git checkout develop
git merge master  # Merge latest changes
git push origin develop
```

Cloudflare Pages will automatically:
- Build the frontend with staging environment variables
- Deploy to: `https://develop.pbtodo-frontend.pages.dev`
- Create preview URL: `https://staging.pbtodo-frontend.pages.dev` (if configured)

## Step 7: Setup GitHub Actions for Staging

### 7.1 Update Workflow Triggers

The `deploy-staging.yml` workflow is already configured to trigger on:
- Push to `develop` branch
- After successful CI pipeline completion

### 7.2 Configure GitHub Secrets (Optional for Traditional Servers)

If you're deploying to traditional servers (not Cloudflare), add these secrets:

```bash
# Via GitHub CLI
gh secret set STAGING_DOMAIN -b "staging.yourdomain.com"
gh secret set STAGING_SERVER -b "staging.example.com"
gh secret set STAGING_USER -b "deploy"
gh secret set STAGING_SSH_KEY < ~/.ssh/staging_deploy_key

# Or via GitHub web UI:
# Repository → Settings → Secrets and variables → Actions → New repository secret
```

### 7.3 For Cloudflare-only Staging

Update `.github/workflows/deploy-staging.yml` to use Cloudflare deployment:

```yaml
name: 🚀 Deploy to Staging

on:
  push:
    branches: [develop]
  workflow_dispatch:

env:
  NODE_VERSION: '20'

jobs:
  deploy-staging:
    name: 🚀 Deploy to Staging
    runs-on: ubuntu-latest
    
    steps:
      - name: 📥 Checkout Code
        uses: actions/checkout@v4

      - name: 🟢 Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}

      - name: 📦 Install Dependencies
        run: cd workers && npm install

      - name: 🚀 Deploy Workers to Staging
        run: cd workers && npx wrangler deploy --env staging
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          CLOUDFLARE_ACCOUNT_ID: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
```

## Step 8: Testing Staging Environment

### 8.1 Automated Tests

```bash
# Run against staging
VITE_API_URL=https://pbtodo-api-staging.bua.workers.dev/api npm run test:e2e
```

### 8.2 Manual Testing Checklist

- [ ] Frontend loads at staging URL
- [ ] User registration works
- [ ] User login works
- [ ] Create, read, update, delete todos
- [ ] Session persistence
- [ ] Rate limiting works
- [ ] CORS headers are correct
- [ ] Security headers present
- [ ] Error handling works

### 8.3 Health Check Script

```bash
#!/bin/bash
# Save as scripts/check-staging-health.sh

STAGING_API="https://pbtodo-api-staging.bua.workers.dev"

echo "🏥 Checking staging environment health..."

# Check API health
if curl -f -s "$STAGING_API/api/health" > /dev/null; then
    echo "✅ API health check passed"
else
    echo "❌ API health check failed"
    exit 1
fi

# Check registration
RESPONSE=$(curl -s -X POST "$STAGING_API/api/auth/register" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"test$(date +%s)@staging.com\",\"password\":\"TestPass123!\",\"name\":\"Test\"}")

if echo "$RESPONSE" | grep -q '"success":true'; then
    echo "✅ Registration test passed"
else
    echo "❌ Registration test failed"
    echo "Response: $RESPONSE"
    exit 1
fi

echo "✅ All staging health checks passed!"
```

## Step 9: Staging Workflow

### Development → Staging → Production Flow

```bash
# 1. Develop on feature branch
git checkout -b feature/new-feature
# ... make changes ...
git commit -m "Add new feature"

# 2. Merge to develop (triggers staging deployment)
git checkout develop
git merge feature/new-feature
git push origin develop
# Wait for staging deployment to complete

# 3. Test on staging
# Run automated tests, manual QA, etc.

# 4. Merge to master (triggers production deployment)
git checkout master
git merge develop
git push origin master
# Wait for production deployment to complete
```

### Quick Staging Deploy

```bash
# Deploy only backend changes
cd workers
wrangler deploy --env staging

# Deploy only frontend changes (push to develop)
git checkout develop
git add .
git commit -m "Update frontend"
git push origin develop
```

## Step 10: Monitoring and Debugging

### View Staging Logs

```bash
# Tail Workers logs in staging
wrangler tail --env staging

# View specific function logs
wrangler tail --env staging --format pretty
```

### Query Staging Database

```bash
# Run SQL query on staging DB
wrangler d1 execute pbtodo-db-staging \
  --command="SELECT * FROM users LIMIT 5;" \
  --env staging

# Export staging data
wrangler d1 export pbtodo-db-staging \
  --output=staging-backup.sql \
  --env staging
```

### Check KV Data

```bash
# List keys in staging SESSIONS KV
wrangler kv:key list --namespace-id=YOUR_STAGING_SESSIONS_KV_ID

# Get specific key value
wrangler kv:key get "session:USER_ID" \
  --namespace-id=YOUR_STAGING_SESSIONS_KV_ID
```

### Staging Metrics

View metrics in Cloudflare Dashboard:
- Workers → pbtodo-api-staging → Metrics
- Pages → pbtodo-frontend → Analytics
- D1 → pbtodo-db-staging → Metrics

## Step 11: Maintenance

### Reset Staging Database

```bash
# Clear all data (careful!)
wrangler d1 execute pbtodo-db-staging \
  --command="DELETE FROM todos; DELETE FROM users;" \
  --env staging

# Reapply migrations
wrangler d1 execute pbtodo-db-staging \
  --file=./migrations/0001_initial_schema.sql \
  --env staging
```

### Clear Staging Cache

```bash
# Clear KV namespaces
wrangler kv:key delete "session:*" --namespace-id=YOUR_STAGING_SESSIONS_KV_ID
wrangler kv:key delete "rate_limit:*" --namespace-id=YOUR_STAGING_RATE_LIMITS_KV_ID
```

### Update Staging Secrets

```bash
# Rotate JWT secret
wrangler secret put JWT_SECRET --env staging

# Update other secrets
wrangler secret put ENCRYPTION_KEY --env staging
```

## Troubleshooting

### Issue: Staging deployment fails with "Database not found"

**Solution:** Verify database ID in wrangler.toml matches the created database

```bash
wrangler d1 list
# Find pbtodo-db-staging and verify ID
```

### Issue: CORS errors in browser

**Solution:** Check ALLOWED_ORIGINS in wrangler.toml includes staging frontend URL

```toml
[env.staging.vars]
ALLOWED_ORIGINS = "https://develop.pbtodo-frontend.pages.dev,http://localhost:5173"
```

### Issue: KV operations failing

**Solution:** Verify KV namespace IDs are correct

```bash
wrangler kv:namespace list
# Find staging namespaces and verify IDs match wrangler.toml
```

### Issue: Secrets not working

**Solution:** List and re-create secrets

```bash
wrangler secret list --env staging
wrangler secret put JWT_SECRET --env staging
```

## Environment Comparison

| Feature | Development | Staging | Production |
|---------|------------|---------|------------|
| Branch | feature/* | develop | master |
| Workers URL | pbtodo-api-dev.bua.workers.dev | pbtodo-api-staging.bua.workers.dev | pbtodo-api.bua.workers.dev |
| Pages URL | localhost:5173 | develop.pbtodo-frontend.pages.dev | pbtodo-frontend.pages.dev |
| Database | pbtodo-db (shared) | pbtodo-db-staging | pbtodo-db |
| Auto Deploy | No | Yes (on push to develop) | Yes (on push to master) |
| Data | Test data | Test data | Real data |
| Secrets | Shared with prod | Unique | Unique |

## Best Practices

1. **Always test on staging before production**
   - Run full test suite
   - Manual QA testing
   - Performance testing

2. **Keep staging data fresh**
   - Regularly sync anonymized production data
   - Or generate realistic test data

3. **Use different secrets**
   - Never use production secrets in staging
   - Rotate secrets regularly

4. **Monitor staging closely**
   - Set up alerts for errors
   - Review logs regularly
   - Check metrics

5. **Document staging-specific issues**
   - Keep a changelog of staging-only fixes
   - Track differences from production

6. **Clean up regularly**
   - Clear old test data
   - Remove inactive test accounts
   - Archive old deployments

## Resources

- [Cloudflare Workers Documentation](https://developers.cloudflare.com/workers/)
- [Cloudflare Pages Documentation](https://developers.cloudflare.com/pages/)
- [Wrangler CLI Documentation](https://developers.cloudflare.com/workers/wrangler/)
- [D1 Database Documentation](https://developers.cloudflare.com/d1/)
- [Workers KV Documentation](https://developers.cloudflare.com/kv/)

## Quick Reference Commands

```bash
# Deploy to staging
cd workers && wrangler deploy --env staging

# View staging logs
wrangler tail --env staging

# Query staging DB
wrangler d1 execute pbtodo-db-staging --command="SELECT * FROM users;" --env staging

# List staging secrets
wrangler secret list --env staging

# Health check
curl https://pbtodo-api-staging.bua.workers.dev/api/health

# Push to staging
git push origin develop
```

---

**Last Updated:** January 2025  
**Maintainer:** DevOps Team  
**Status:** ✅ Ready for Use