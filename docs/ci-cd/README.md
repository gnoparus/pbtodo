# 🚀 CI/CD Pipeline Documentation

This document provides comprehensive documentation for the pbtodo application's CI/CD pipeline, including all workflows, environments, and deployment procedures.

## 📋 Table of Contents

- [Architecture Overview](#architecture-overview)
- [Branch Strategy](#branch-strategy)
- [Workflows Documentation](#workflows-documentation)
- [Environment Configuration](#environment-configuration)
- [Deployment Procedures](#deployment-procedures)
- [Security Implementation](#security-implementation)
- [Monitoring & Troubleshooting](#monitoring--troubleshooting)
- [Best Practices](#best-practices)

---

## 🏗️ Architecture Overview

The pbtodo CI/CD pipeline is designed for security-first deployment across multiple environments with comprehensive testing and validation.

### Pipeline Components

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   GitHub Repo   │───▶│  GitHub Actions │───▶│  Cloudflare    │
│   (main/develop)│    │  (Workflows)    │    │  (Pages/Workers)│
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Technology Stack

- **Source Control**: Git + GitHub
- **CI/CD Platform**: GitHub Actions
- **Frontend**: Vite + React + Tailwind CSS
- **Backend**: Cloudflare Workers (serverless)
- **Hosting**: Cloudflare Pages (static) + Workers (API)
- **Infrastructure**: Cloudflare (DNS/CDN/Security)

---

## 🌿 Branch Strategy

### Branch Naming Convention

| Branch | Purpose | Environment | Auto-Deploy |
|---------|----------|-------------|--------------|
| `main` | Production-ready code | Production | ✅ |
| `develop` | Integration testing | Staging | ✅ |
| `feature/*` | Feature development | Development | ❌ |
| `hotfix/*` | Critical fixes | Staging (PR) | ✅ |

### Deployment Flow

```
feature/* → develop (PR) → main (Release)
    ↓           ↓              ↓
Development   Staging       Production
```

### Git Workflow

1. **Feature Development**
   ```bash
   git checkout -b feature/new-feature
   # Development work
   git commit -m "feat: add new feature"
   git push origin feature/new-feature
   ```

2. **Integration to Staging**
   ```bash
   # Create PR to develop
   gh pr create --title "Feature: New Feature" --base develop
   # CI/CD runs automatically
   # After approval, deploys to staging
   ```

3. **Production Release**
   ```bash
   # After staging verification
   git checkout develop
   git pull origin develop
   git checkout main
   git merge develop
   git push origin main
   # Deploys to production automatically
   ```

---

## 🔄 Workflows Documentation

### Workflow Files Overview

| Workflow File | Trigger | Environment | Purpose |
|--------------|---------|-------------|--------|
| `ci.yml` | Push to main/develop/feature/* | All | Build & test |
| `deploy-staging.yml` | Push to develop | Staging | Deploy to staging |
| `deploy-production.yml` | Push to main | Production | Deploy to production |
| `security-scan.yml` | Push to any branch | All | Security scanning |

### Workflow Details

#### 🚀 CI Pipeline (`ci.yml`)

**Purpose**: Continuous integration testing and artifact creation

**Triggers**:
```yaml
on:
  push:
    branches: [main, develop, feature/*]
  pull_request:
    branches: [main, develop]
```

**Jobs**:
1. **Test & Build**: Run comprehensive test suite
2. **Security Scan**: Automated security analysis
3. **Artifact Upload**: Store build artifacts

**Environment Variables**:
```yaml
env:
  NODE_VERSION: "20"
```

#### 🚀 Deploy to Staging (`deploy-staging.yml`)

**Purpose**: Automatic deployment to staging environment

**Triggers**:
```yaml
on:
  push:
    branches: [develop]
  workflow_run:
    workflows: ["🚀 CI Pipeline"]
    types: [completed]
    branches: [develop]
```

**Jobs**:
1. **Deploy Workers API**: Deploy backend to staging
2. **Deploy Frontend**: Deploy frontend to staging
3. **Health Check**: Verify deployment success
4. **Deployment Summary**: Generate deployment report

**Environment Variables**:
```yaml
env:
  NODE_VERSION: "20"
  VITE_API_URL: "https://pbtodo-api-staging.bua.workers.dev/api"
  VITE_ENVIRONMENT: "staging"
  VITE_HTTPS_ENABLED: true
  VITE_DEV_MODE: false
  VITE_ENABLE_SECURITY_HEADERS: true
  VITE_ENABLE_CSP: true
  VITE_ENABLE_HSTS: true
```

#### 🚀 Deploy to Production (`deploy-production.yml`)

**Purpose**: Automatic deployment to production environment

**Triggers**:
```yaml
on:
  push:
    branches: [main]
```

**Jobs**:
1. **Deploy Workers API**: Deploy backend to production
2. **Deploy Frontend**: Deploy frontend to production
3. **Health Check**: Verify production deployment
4. **Deployment Summary**: Generate production report

**Environment Variables**:
```yaml
env:
  NODE_VERSION: "20"
  VITE_API_URL: "https://pbtodo-api.bua.workers.dev/api"
  VITE_ENVIRONMENT: "production"
  VITE_HTTPS_ENABLED: true
  VITE_DEV_MODE: false
  VITE_ENABLE_SECURITY_HEADERS: true
  VITE_ENABLE_CSP: true
  VITE_ENABLE_HSTS: true
```

---

## 🌍 Environment Configuration

### Environment Variables Reference

#### Core Configuration

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `VITE_API_URL` | API base endpoint | `http://localhost:8787/api` | Yes |
| `VITE_ENVIRONMENT` | Environment identifier | `development` | No |
| `VITE_HTTPS_ENABLED` | Enable HTTPS mode | `false` | No |
| `VITE_DEV_MODE` | Development mode flag | `true` | No |

#### Security Configuration

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `VITE_ENABLE_SECURITY_HEADERS` | Enable security headers | `true` | No |
| `VITE_ENABLE_CSP` | Enable CSP policies | `true` | No |
| `VITE_ENABLE_HSTS` | Enable HSTS header | `false` | No |

### Environment-Specific Configurations

#### Development Environment
```bash
# Configuration
VITE_API_URL=http://localhost:8787/api
VITE_ENVIRONMENT=development
VITE_DEV_MODE=true
VITE_HTTPS_ENABLED=false
```

#### Staging Environment
```bash
# Configuration
VITE_API_URL=https://pbtodo-api-staging.bua.workers.dev/api
VITE_ENVIRONMENT=staging
VITE_DEV_MODE=false
VITE_HTTPS_ENABLED=true
VITE_ENABLE_SECURITY_HEADERS=true
VITE_ENABLE_CSP=true
VITE_ENABLE_HSTS=true
```

#### Production Environment
```bash
# Configuration
VITE_API_URL=https://pbtodo-api.bua.workers.dev/api
VITE_ENVIRONMENT=production
VITE_DEV_MODE=false
VITE_HTTPS_ENABLED=true
VITE_ENABLE_SECURITY_HEADERS=true
VITE_ENABLE_CSP=true
VITE_ENABLE_HSTS=true
```

---

## 🚀 Deployment Procedures

### Manual Deployment

#### Prerequisites

1. **Node.js Environment**
   ```bash
   node --version  # Should be 20+
   npm --version   # Should be latest
   ```

2. **Cloudflare CLI**
   ```bash
   npm install -g wrangler
   wrangler --version
   ```

3. **Authentication**
   ```bash
   wrangler auth login
   export CLOUDFLARE_ACCOUNT_ID=your-account-id
   ```

#### Staging Deployment

```bash
# 1. Build for staging
cd frontend
VITE_API_URL=https://pbtodo-api-staging.bua.workers.dev/api npm run build

# 2. Deploy to Pages
cd frontend/dist
npx wrangler pages deploy --project-name=pbtodo-frontend --branch=develop

# 3. Deploy Workers API
cd workers
npx wrangler deploy --env staging
```

#### Production Deployment

```bash
# 1. Build for production
cd frontend
VITE_API_URL=https://pbtodo-api.bua.workers.dev/api npm run build

# 2. Deploy to Pages
cd frontend/dist
npx wrangler pages deploy --project-name=pbtodo-frontend --branch=main

# 3. Deploy Workers API
cd workers
npx wrangler deploy --env production
```

### Automatic Deployment

#### Staging Deployment Flow

1. **Push to develop branch**
   ```bash
   git checkout develop
   git add .
   git commit -m "feat: staging deployment"
   git push origin develop
   ```

2. **Automatic CI/CD Process**
   - Triggers `ci.yml` for testing
   - Triggers `deploy-staging.yml` for deployment
   - Deployment URLs: `https://staging.pbtodo-frontend.pages.dev`

#### Production Deployment Flow

1. **Push to main branch**
   ```bash
   git checkout main
   git merge develop
   git push origin main
   ```

2. **Automatic CI/CD Process**
   - Triggers `ci.yml` for testing
   - Triggers `deploy-production.yml` for deployment
   - Deployment URLs: `https://pbtodo-frontend.pages.dev`

---

## 🛡️ Security Implementation

### Content Security Policy (CSP)

#### Dynamic CSP Generation

The application uses dynamic CSP generation based on environment configuration:

```typescript
// CSP Directive Builder
const connectSrc = ["connect-src 'self'"]

// Add API URLs based on environment
const apiBaseUrl = import.meta.env.VITE_API_URL || config.apiBaseUrl
const apiHost = new URL(apiBaseUrl).origin
connectSrc.push(apiHost)

// Add development hosts
if (import.meta.env.VITE_ENVIRONMENT === 'development') {
  connectSrc.push('http://localhost:8787', 'ws://localhost:8787')
}
```

#### Environment-Specific CSP

| Environment | CSP Mode | API URL Allowed |
|-------------|------------|-----------------|
| Development | Report-only | `localhost:8787` |
| Staging | Full CSP | `pbtodo-api-staging.bua.workers.dev` |
| Production | Full CSP | `pbtodo-api.bua.workers.dev` |

#### CSP Directives

```
Content-Security-Policy: default-src 'self'; 
script-src 'self' 'nonce-{nonce}'; 
style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; 
font-src 'self' https://fonts.gstatic.com; 
img-src 'self' data: https:; 
connect-src 'self' {api-host}; 
frame-ancestors 'none'; 
base-uri 'self'; 
form-action 'self';
```

### Security Headers

#### Comprehensive Header Set

```typescript
const securityHeaders = {
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload'
}
```

---

## 📊 Monitoring & Troubleshooting

### Deployment Verification

#### Health Check Endpoints

| Environment | Health URL | Expected Response |
|-------------|-------------|-----------------|
| Development | `http://localhost:8787/api/health` | `{"success":true,"message":"API running"}` |
| Staging | `https://pbtodo-api-staging.bua.workers.dev/api/health` | `{"success":true,"message":"API running"}` |
| Production | `https://pbtodo-api.bua.workers.dev/api/health` | `{"success":true,"message":"API running"}` |

#### Frontend URLs

| Environment | Frontend URL | Purpose |
|-------------|---------------|---------|
| Development | `http://localhost:5173` | Local testing |
| Staging | `https://staging.pbtodo-frontend.pages.dev` | Integration testing |
| Production | `https://pbtodo-frontend.pages.dev` | Live application |

### Common Issues & Solutions

#### CSP Violations

**Problem**: `Connect-src violates CSP directive`

**Diagnosis**:
```bash
# Check current CSP
curl -s https://your-domain.com | grep -i "content-security-policy"

# Check API URL in CSP
curl -s https://your-domain.com | grep -o "connect-src[^;]*"
```

**Solutions**:
1. **Verify VITE_API_URL is set correctly**
   ```bash
   echo $VITE_API_URL
   # Should match environment-specific URL
   ```

2. **Check for static CSP conflicts**
   ```bash
   # Look for hardcoded CSP in HTML
   grep -r "Content-Security-Policy" frontend/dist/
   ```

3. **Ensure dynamic CSP generation**
   ```javascript
   // Check browser console for CSP application
   console.log('Applied CSP:', document.querySelector('meta[http-equiv="Content-Security-Policy"]'))
   ```

#### API Endpoint Issues

**Problem**: `404 Not Found` on API calls

**Diagnosis**:
```bash
# Check for double /api in URLs
curl -I https://your-api-url/api/api/auth/login

# Verify API configuration
grep -r "VITE_API_URL" .github/workflows/
```

**Solutions**:
1. **Remove duplicate /api prefixes**
   ```typescript
   // Incorrect
   const url = `${API_BASE_URL}/api/auth/login`
   
   // Correct  
   const url = `${API_BASE_URL}/auth/login`
   ```

2. **Verify build environment variables**
   ```bash
   # Check CI/CD environment
   gh run view --log <run-id> | grep VITE_API_URL
   ```

#### Build Failures

**Problem**: TypeScript compilation or build errors

**Diagnosis**:
```bash
# Check build logs
npm run build --verbose

# Verify environment variables
npm run build:env
```

**Solutions**:
1. **Check TypeScript configuration**
   ```bash
   npx tsc --noEmit --project frontend/
   ```

2. **Verify dependency installation**
   ```bash
   npm ci --verbose
   ```

3. **Check environment variable access**
   ```typescript
   console.log('API URL:', import.meta.env.VITE_API_URL)
   ```

#### Deployment Failures

**Problem**: Pages/Workers deployment fails

**Diagnosis**:
```bash
# Check Cloudflare authentication
wrangler whoami

# Verify project permissions
wrangler pages project list
```

**Solutions**:
1. **Re-authenticate with Cloudflare**
   ```bash
   wrangler auth logout
   wrangler auth login
   ```

2. **Check account permissions**
   ```bash
   # Ensure correct account is selected
   export CLOUDFLARE_ACCOUNT_ID=your-account-id
   ```

3. **Manual deployment as fallback**
   ```bash
   # Build and deploy manually
   cd frontend && npm run build
   cd frontend/dist && wrangler pages deploy
   ```

---

## 🏆 Best Practices

### Development Workflow

1. **Feature Branch Development**
   ```bash
   # Create feature branch
   git checkout -b feature/new-feature
   # Development work
   # Commit frequently with descriptive messages
   git commit -m "feat: implement user authentication"
   git push origin feature/new-feature
   ```

2. **Pull Request Process**
   ```bash
   # Create PR with detailed description
   gh pr create --title "Add User Authentication" \
     --body "## Description\n\nImplements user login/signup functionality.\n\n## Testing\n\n- [x] Unit tests pass\n- [x] Integration tests pass\n- [x] Manual testing passes"
   ```

3. **Code Quality Standards**
   ```bash
   # Run all checks before PR
   npm run lint
   npm run type-check
   npm run test
   npm run build
   ```

### Security Considerations

1. **Environment-Specific Security**
   - Development: Relaxed CSP for easier debugging
   - Staging: Full CSP matching production
   - Production: Maximum security headers

2. **Secrets Management**
   ```bash
   # Never commit secrets to repository
   # Use GitHub Secrets for all sensitive data
   # Rotate API keys regularly
   ```

3. **CSP Best Practices**
   ```typescript
   // Use nonces instead of unsafe-inline when possible
   // Limit connect-src to specific domains
   // Enable report-uri for monitoring
   // Avoid wildcards in production
   ```

### Deployment Automation

1. **Zero-Downtime Deployments**
   - Use preview deployments for testing
   - Implement health checks
   - Rollback capabilities

2. **Monitoring Integration**
   ```bash
   # Configure alerts for deployment failures
   # Set up monitoring dashboards
   # Track key metrics (success rate, response time)
   ```

---

## 📞 Support & Resources

### Getting Help

1. **Check this documentation first**
   - Review troubleshooting section
   - Check recent CI/CD runs
   - Verify configuration

2. **GitHub Issues**
   ```bash
   # Create detailed issue
   gh issue create --title "Deployment Failure" \
     --body "## Environment\n\nProduction\n\n## Steps\n\n1. Deploy to main\n2. CI/CD fails\n\n## Logs\n\n[Attach logs]"
   ```

3. **Monitoring Dashboard Access**
   - GitHub Actions: Workflow runs
   - Cloudflare Dashboard: Pages & Workers
   - Application logs: Check console

### Documentation Resources

- [Main README](../README.md)
- [Environment Config](../ENVIRONMENTS.md)
- [URL Reference](../URLS.md)
- [Deployment Guide](../deployment/README.md)
- [Security Guidelines](../SECURITY.md)

### Quick Reference

```bash
# Quick health check
curl -s https://pbtodo-api.bua.workers.dev/api/health

# Quick deployment status
gh run list --limit=5

# Quick environment check
echo $VITE_API_URL
```

---

## 📈 Pipeline Metrics

### Success Metrics

| Metric | Target | Current | Status |
|---------|--------|---------|--------|
| Build Success Rate | 95%+ | Track in CI/CD | 📊 |
| Deployment Success Rate | 90%+ | Track in releases | 📈 |
| Security Score | 8/10+ | Automated scanning | 🛡️ |
| Test Coverage | 80%+ | Automated testing | 🧪 |

### Monitoring Checklist

- [ ] Daily health check passes
- [ ] CSP violations < 5 per day
- [ ] API response time < 200ms
- [ ] Build time < 2 minutes
- [ ] Deployment time < 5 minutes
- [ ] Security scan passes
- [ ] All tests pass

---

*This documentation is maintained alongside the codebase and updated with each deployment. For the most current information, always check the latest version in the repository.*