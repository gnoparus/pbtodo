# Quick Start: Staging Environment Setup

This is a condensed version of the full [STAGING_SETUP.md](./STAGING_SETUP.md) guide. Follow these steps to get staging up and running quickly.

## Prerequisites

- Wrangler CLI installed: `npm install -g wrangler`
- Authenticated: `wrangler login`
- Cloudflare account with Workers enabled

## 5-Minute Setup

### 1. Create Resources

```bash
# Create staging database
wrangler d1 create pbtodo-db-staging

# Create KV namespaces
wrangler kv:namespace create "SESSIONS" --env staging
wrangler kv:namespace create "RATE_LIMITS" --env staging
```

**Copy the IDs from the outputs!**

### 2. Update Configuration

Edit `workers/wrangler.toml` and replace these placeholders with the IDs you just got:

```toml
# Line ~28
database_id = "YOUR_STAGING_DB_ID_HERE"

# Line ~53
id = "YOUR_STAGING_SESSIONS_KV_ID"

# Line ~57
id = "YOUR_STAGING_RATE_LIMITS_KV_ID"
```

### 3. Initialize Database

```bash
cd workers
wrangler d1 execute pbtodo-db-staging \
  --file=./migrations/0001_initial_schema.sql \
  --env staging
```

### 4. Set Secrets

```bash
# Generate and set secrets (use different values than production!)
wrangler secret put JWT_SECRET --env staging
wrangler secret put ENCRYPTION_KEY --env staging
```

### 5. Deploy Backend

```bash
wrangler deploy --env staging
```

**Your API is now live at:** `https://pbtodo-api-staging.bua.workers.dev`

### 6. Test It

```bash
# Health check
curl https://pbtodo-api-staging.bua.workers.dev/api/health

# Test registration
curl -X POST https://pbtodo-api-staging.bua.workers.dev/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@staging.com","password":"TestPass123!","name":"Test"}'
```

If you see `{"success":true,...}` - you're done! 🎉

## Frontend Setup (Cloudflare Pages)

### Option 1: Automatic (Recommended)

1. Push code to `develop` branch
2. Go to Cloudflare Dashboard → Pages → pbtodo-frontend
3. Settings → Builds & deployments → Configure branch deployments
4. Add `develop` branch
5. Set environment variables:
   ```
   VITE_API_URL = https://pbtodo-api-staging.bua.workers.dev/api
   VITE_ENVIRONMENT = staging
   ```

**Frontend will be at:** `https://develop.pbtodo-frontend.pages.dev`

### Option 2: GitHub Actions (Automated)

Once you have secrets configured:

```bash
git checkout -b develop
git push origin develop
```

The `deploy-staging-cloudflare.yml` workflow will automatically deploy.

## Daily Usage

### Deploy Changes to Staging

```bash
# Backend only
cd workers && wrangler deploy --env staging

# Frontend only (push to develop)
git checkout develop
git merge your-feature-branch
git push origin develop
```

### View Logs

```bash
wrangler tail --env staging
```

### Query Database

```bash
wrangler d1 execute pbtodo-db-staging \
  --command="SELECT * FROM users LIMIT 5;" \
  --env staging
```

## Workflow

```
feature/branch → develop → staging environment
                     ↓
                  Testing
                     ↓
                  master → production environment
```

## Need Help?

- **Full guide**: [STAGING_SETUP.md](./STAGING_SETUP.md)
- **Troubleshooting**: See STAGING_SETUP.md section 11
- **CI/CD status**: [CI_CD_STATUS.md](./CI_CD_STATUS.md)

## Common Issues

**"Database not found"**
- Verify database_id in wrangler.toml

**"CORS error"**
- Check ALLOWED_ORIGINS includes your frontend URL

**"Secret not set"**
```bash
wrangler secret list --env staging
wrangler secret put JWT_SECRET --env staging
```

---

That's it! You now have a fully functional staging environment. 🚀