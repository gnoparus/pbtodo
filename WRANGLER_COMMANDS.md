# Wrangler v4 Command Reference

This document provides the correct commands for Wrangler v4+ (the syntax changed from v3).

## 🔧 Installation

```bash
# Install globally
npm install -g wrangler

# Check version
wrangler --version
```

## 🔐 Authentication

```bash
# Login to Cloudflare
wrangler login

# Logout
wrangler logout

# Check who is logged in
wrangler whoami
```

## 🗄️ D1 Database Commands

### Create Database
```bash
wrangler d1 create pbtodo-db
```

### List Databases
```bash
wrangler d1 list
```

### Execute SQL
```bash
# Execute from file
wrangler d1 execute pbtodo-db --file=migrations/001_create_users.sql

# Execute from file (remote)
wrangler d1 execute pbtodo-db --file=migrations/001_create_users.sql --remote

# Execute command directly
wrangler d1 execute pbtodo-db --command="SELECT * FROM users LIMIT 5"

# Execute command (remote)
wrangler d1 execute pbtodo-db --command="SELECT * FROM users" --remote
```

### Database Info
```bash
# Get database info
wrangler d1 info pbtodo-db

# Delete database (careful!)
wrangler d1 delete pbtodo-db
```

## 🗂️ KV Namespace Commands (⚠️ CHANGED IN V4)

### Create KV Namespace
```bash
# Create namespace (note: space instead of colon)
wrangler kv namespace create "SESSIONS"
wrangler kv namespace create "RATE_LIMITS"

# Create preview namespace
wrangler kv namespace create "SESSIONS" --preview
wrangler kv namespace create "RATE_LIMITS" --preview
```

### List KV Namespaces
```bash
wrangler kv namespace list
```

### KV Key Operations
```bash
# List keys in namespace
wrangler kv key list --namespace-id=<NAMESPACE_ID>

# Get value
wrangler kv key get "session:user123" --namespace-id=<NAMESPACE_ID>

# Put value
wrangler kv key put "test-key" "test-value" --namespace-id=<NAMESPACE_ID>

# Delete key
wrangler kv key delete "test-key" --namespace-id=<NAMESPACE_ID>
```

### Bulk Operations
```bash
# Put multiple keys from JSON file
wrangler kv bulk put data.json --namespace-id=<NAMESPACE_ID>

# Delete multiple keys
wrangler kv bulk delete keys.json --namespace-id=<NAMESPACE_ID>
```

## 🚀 Workers Commands

### Development
```bash
# Start local dev server
wrangler dev

# Start with specific port
wrangler dev --port 8787

# Start with remote resources (D1, KV)
wrangler dev --remote

# Verbose mode
wrangler dev --verbose
```

### Deployment
```bash
# Deploy to production
wrangler deploy

# Deploy specific environment
wrangler deploy --env production
wrangler deploy --env staging

# Dry run (don't actually deploy)
wrangler deploy --dry-run
```

### Worker Management
```bash
# List workers
wrangler deployments list

# Tail logs
wrangler tail

# Tail with filters
wrangler tail --status error
wrangler tail --status ok

# Delete worker
wrangler delete
```

## 🔒 Secrets Management

### Set Secret
```bash
# Interactive (recommended)
wrangler secret put JWT_SECRET

# From stdin
echo "my-secret-value" | wrangler secret put JWT_SECRET

# For specific environment
wrangler secret put JWT_SECRET --env production
```

### List Secrets
```bash
# List all secrets (values not shown)
wrangler secret list

# List for specific environment
wrangler secret list --env production
```

### Delete Secret
```bash
wrangler secret delete JWT_SECRET

# For specific environment
wrangler secret delete JWT_SECRET --env production
```

## 📄 Pages Commands

### Deploy to Pages
```bash
# Deploy directory
wrangler pages deploy <directory>

# Deploy with project name
wrangler pages deploy frontend/dist --project-name=pbtodo-frontend

# Deploy specific branch
wrangler pages deploy frontend/dist --branch=main

# Deploy with commit info
wrangler pages deploy frontend/dist --commit-dirty=true
```

### Pages Projects
```bash
# List projects
wrangler pages project list

# Create project
wrangler pages project create pbtodo-frontend

# Delete project
wrangler pages project delete pbtodo-frontend
```

### Pages Deployments
```bash
# List deployments
wrangler pages deployment list

# Tail logs
wrangler pages deployment tail
```

## 🪣 R2 Bucket Commands

### Create Bucket
```bash
wrangler r2 bucket create pbtodo-assets
```

### List Buckets
```bash
wrangler r2 bucket list
```

### Object Operations
```bash
# Upload file
wrangler r2 object put pbtodo-assets/test.txt --file=./test.txt

# Download file
wrangler r2 object get pbtodo-assets/test.txt --file=./downloaded.txt

# List objects
wrangler r2 object list pbtodo-assets

# Delete object
wrangler r2 object delete pbtodo-assets/test.txt
```

## 📊 Analytics & Logs

### View Analytics
```bash
# View analytics (requires GraphQL Analytics API)
wrangler tail --format=json
```

### Logs
```bash
# Tail logs (real-time)
wrangler tail

# Filter by status
wrangler tail --status error
wrangler tail --status ok

# Filter by method
wrangler tail --method POST

# Sample rate
wrangler tail --sampling-rate=0.5
```

## 🔧 Configuration

### Init/Generate
```bash
# Initialize new project
wrangler init

# Generate types
wrangler types
```

### Validation
```bash
# Validate wrangler.toml
wrangler deploy --dry-run
```

## 📦 Common Workflows

### Initial Setup
```bash
# 1. Login
wrangler login

# 2. Create D1 database
wrangler d1 create pbtodo-db

# 3. Create KV namespaces
wrangler kv namespace create "SESSIONS"
wrangler kv namespace create "SESSIONS" --preview
wrangler kv namespace create "RATE_LIMITS"
wrangler kv namespace create "RATE_LIMITS" --preview

# 4. Apply migrations
wrangler d1 execute pbtodo-db --file=migrations/001_create_users.sql
wrangler d1 execute pbtodo-db --file=migrations/002_create_todos.sql

# 5. Set secrets
wrangler secret put JWT_SECRET

# 6. Deploy
wrangler deploy
```

### Development Workflow
```bash
# 1. Start dev server
wrangler dev --remote

# 2. Make changes
# 3. Test locally
# 4. Deploy when ready
wrangler deploy
```

### Deployment Workflow
```bash
# 1. Deploy Workers
cd workers
wrangler deploy --env production

# 2. Deploy Pages
cd ..
npm run build
cd workers
wrangler pages deploy ../frontend/dist --project-name=pbtodo-frontend
```

## 🆘 Troubleshooting

### Clear Cache
```bash
# Remove wrangler cache
rm -rf ~/.wrangler

# Reinstall wrangler
npm uninstall -g wrangler
npm install -g wrangler
```

### Debug Mode
```bash
# Run with verbose logging
wrangler dev --verbose
wrangler deploy --verbose

# Check configuration
wrangler deploy --dry-run
```

### Check Status
```bash
# Check authentication
wrangler whoami

# Check version
wrangler --version

# Check configuration
cat wrangler.toml
```

## 📚 Key Syntax Changes from v3 to v4

| Command | Wrangler v3 | Wrangler v4 |
|---------|-------------|-------------|
| Create KV | `kv:namespace create` | `kv namespace create` |
| List KV | `kv:namespace list` | `kv namespace list` |
| KV Keys | `kv:key list` | `kv key list` |
| KV Get | `kv:key get` | `kv key get` |
| KV Put | `kv:key put` | `kv key put` |
| Pages Deploy | `pages publish` | `pages deploy` |

**Note**: The main change is **colons (`:`) became spaces** in subcommands.

## 🔗 Resources

- [Wrangler Documentation](https://developers.cloudflare.com/workers/wrangler/)
- [Wrangler GitHub](https://github.com/cloudflare/workers-sdk/tree/main/packages/wrangler)
- [Cloudflare Changelog](https://developers.cloudflare.com/workers/platform/changelog/)

---

**Last Updated**: November 4, 2024  
**Wrangler Version**: 4.45.3+