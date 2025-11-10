# 🚀 Deployment Guide

This guide covers all aspects of deploying the pbtodo application across different environments.

## 📋 Table of Contents

- [Environment Configuration](#environment-configuration)
- [Branch Strategy](#branch-strategy)
- [CI/CD Pipeline](#cicd-pipeline)
- [Manual Deployment](#manual-deployment)
- [Troubleshooting](#troubleshooting)

## 🌍 Environment Configuration

### Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `VITE_API_URL` | API base URL | `http://127.0.0.1:8787/api` | Yes |
| `VITE_ENVIRONMENT` | Environment name | `development` | No |
| `VITE_HTTPS_ENABLED` | Enable HTTPS mode | `false` | No |
| `VITE_DEV_MODE` | Development mode | `true` | No |
| `VITE_ENABLE_SECURITY_HEADERS` | Enable security headers | `true` | No |
| `VITE_ENABLE_CSP` | Enable CSP | `true` | No |
| `VITE_ENABLE_HSTS` | Enable HSTS | `false` | No |

### Environment-Specific Configurations

#### Development
```bash
VITE_API_URL=http://localhost:8787/api
VITE_ENVIRONMENT=development
VITE_DEV_MODE=true
VITE_HTTPS_ENABLED=false
```

#### Staging
```bash
VITE_API_URL=https://pbtodo-api-staging.bua.workers.dev/api
VITE_ENVIRONMENT=staging
VITE_DEV_MODE=false
VITE_HTTPS_ENABLED=true
VITE_ENABLE_SECURITY_HEADERS=true
VITE_ENABLE_CSP=true
VITE_ENABLE_HSTS=true
```

#### Production
```bash
VITE_API_URL=https://pbtodo-api.bua.workers.dev/api
VITE_ENVIRONMENT=production
VITE_DEV_MODE=false
VITE_HTTPS_ENABLED=true
VITE_ENABLE_SECURITY_HEADERS=true
VITE_ENABLE_CSP=true
VITE_ENABLE_HSTS=true
```

## 🌿 Branch Strategy

### Branch Naming Convention

| Branch | Purpose | Environment |
|---------|----------|------------|
| `main` | Production-ready code | Production |
| `develop` | Integration testing | Staging |
| `feature/*` | Feature development | Development |

### Deployment Flow

```
feature/* → develop (PR) → main (Release)
    ↓           ↓              ↓
Development   Staging       Production
```

## 🔄 CI/CD Pipeline

### Workflow Overview

| Workflow | Trigger | Environment | Purpose |
|----------|----------|------------| `ci.yml` | Push to main/develop/feature/* | All | Build and test |
| `deploy-staging.yml` | Push to develop | Staging | Deploy to staging |
| `deploy-production.yml` | Push to main | Production | Deploy to production |
| `security-scan.yml` | Push to any branch | All | Security scanning |

### Pipeline Stages

#### 1. Build & Test
- **TypeScript compilation**
- **Unit tests**
- **Integration tests**
- **Security checks**
- **Code quality linting**

#### 2. Build Artifacts
- Frontend: `frontend/dist/`
- Workers: Compiled Workers bundle
- Infrastructure: Deployment configs

#### 3. Deploy
- **Staging**: Automatic on develop push
- **Production**: Automatic on main push

#### 4. Health Checks
- API endpoint verification
- Frontend accessibility
- Security header validation

## 🛠️ Manual Deployment

### Prerequisites

- Node.js 20+
- npm or yarn
- Cloudflare CLI (wrangler)
- Appropriate environment variables

### Staging Deployment

```bash
# Build for staging
cd frontend
VITE_API_URL=https://pbtodo-api-staging.bua.workers.dev/api npm run build

# Deploy to Pages
cd frontend/dist
npx wrangler pages deploy --project-name=pbtodo-frontend --branch=develop
```

### Production Deployment

```bash
# Build for production
cd frontend
VITE_API_URL=https://pbtodo-api.bua.workers.dev/api npm run build

# Deploy to Pages
cd frontend/dist
npx wrangler pages deploy --project-name=pbtodo-frontend --branch=main
```

### Workers API Deployment

```bash
# Deploy Workers
cd workers
npx wrangler deploy --env production
```

## 🔧 Environment Setup

### Local Development

1. **Clone repository**
   ```bash
   git clone https://github.com/gnoparus/pbtodo.git
   cd pbtodo
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set environment variables**
   ```bash
   # Create .env.local in frontend/
   echo "VITE_API_URL=http://localhost:8787/api" > frontend/.env.local
   ```

4. **Start development servers**
   ```bash
   # Terminal 1: Start API
   cd workers
   npm run dev

   # Terminal 2: Start frontend
   cd frontend
   npm run dev
   ```

### Cloudflare Setup

1. **Install Wrangler**
   ```bash
   npm install -g wrangler
   ```

2. **Authenticate**
   ```bash
   wrangler auth login
   ```

3. **Configure Account**
   ```bash
   export CLOUDFLARE_ACCOUNT_ID=your-account-id
   ```

## 🔍 Troubleshooting

### Common Issues

#### CSP Violations

**Problem**: "Connect-src violates CSP directive"

**Solution**:
1. Check `VITE_API_URL` is set correctly
2. Ensure no static CSP in HTML
3. Verify dynamic CSP is being applied

```bash
# Verify CSP is dynamic
curl -s https://your-domain.com/login | grep "Content-Security-Policy"
```

#### API Endpoint Not Found

**Problem**: 404 errors on API calls

**Solution**:
1. Check for double `/api` in URLs
2. Verify `VITE_API_URL` includes `/api` suffix
3. Ensure Workers deployment succeeded

#### Build Failures

**Problem**: TypeScript or build errors

**Solution**:
1. Check environment variables in workflow
2. Verify all dependencies installed
3. Check for missing type definitions

#### Deployment Failures

**Problem**: Pages deployment fails

**Solution**:
1. Verify Cloudflare authentication
2. Check account permissions
3. Ensure build artifacts exist

### Debug Mode

Enable development debugging:

```bash
# Frontend debug
VITE_DEV_MODE=true npm run dev

# API debug
cd workers
npm run dev:debug
```

### Log Locations

| Component | Log Location |
|-----------|---------------|
| Frontend | Browser console |
| Workers | Cloudflare Dashboard → Workers → Logs |
| CI/CD | GitHub Actions → Workflow runs |
| Pages | Cloudflare Dashboard → Pages → Analytics |

## 📊 Monitoring

### Health Check Endpoints

| Environment | Health URL |
|------------|-------------|
| Development | `http://localhost:8787/api/health` |
| Staging | `https://pbtodo-api-staging.bua.workers.dev/api/health` |
| Production | `https://pbtodo-api.bua.workers.dev/api/health` |

### Monitoring Commands

```bash
# Check API health
curl -s https://pbtodo-api.bua.workers.dev/api/health

# Check CSP headers
curl -I https://pbtodo-frontend.pages.dev | grep -i "content-security-policy"

# Test login endpoint
curl -X POST https://pbtodo-api.bua.workers.dev/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"TestPass123!"}'
```

## 🔐 Security Considerations

### Environment-Specific Security

| Setting | Development | Staging | Production |
|----------|--------------|----------|------------|
| CSP | Report-only | Full CSP | Full CSP |
| HTTPS | Optional | Required | Required |
| HSTS | Disabled | Enabled | Enabled |
| Debug Info | Visible | Hidden | Hidden |

### Security Headers Validation

```bash
# Verify security headers
curl -I https://your-domain.com | grep -E "(X-Frame-Options|X-Content-Type-Options|Content-Security-Policy)"
```

## 📚 Additional Resources

- [Architecture Overview](../architecture.md)
- [Security Guidelines](../SECURITY.md)
- [Environment Variables](../ENVIRONMENTS.md)
- [URL Reference](../URLS.md)

---

## 🆘 Support

For deployment issues:
1. Check this guide first
2. Review CI/CD logs in GitHub Actions
3. Check Cloudflare Dashboard for errors
4. Create an issue with environment details