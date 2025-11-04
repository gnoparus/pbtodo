# Security Documentation

## 🔒 Secrets Management

### Overview

The pbtodo application uses **multiple layers of security** to protect sensitive data. Secrets are **NEVER stored in the repository** and are managed through secure external services.

## ✅ How Secrets Are Kept Safe

### 1. Cloudflare Workers Secrets

**Where secrets are stored:**
- ✅ Encrypted in Cloudflare's secure infrastructure
- ✅ Never exposed in code, logs, or API responses
- ✅ Accessed only at runtime by your Worker
- ✅ Transmitted over encrypted connections only

**How they work:**
```bash
# Setting a secret (encrypted immediately)
wrangler secret put JWT_SECRET --env production

# The secret is:
# ✅ Encrypted at rest in Cloudflare
# ✅ Never visible in wrangler.toml
# ✅ Only accessible to your Worker at runtime
# ✅ Not returned by wrangler secret list
```

**Security guarantees:**
- 🔐 **Encryption at rest**: AES-256 encryption
- 🔐 **Encryption in transit**: TLS 1.3
- 🔐 **Access control**: Only your Worker can access them
- 🔐 **No exposure**: Never logged or displayed
- 🔐 **Audit trail**: Changes tracked in Cloudflare dashboard

### 2. GitHub Secrets

**Where secrets are stored:**
- ✅ Encrypted in GitHub's secure vault
- ✅ Only accessible during workflow execution
- ✅ Masked in workflow logs automatically
- ✅ Cannot be exported or viewed after creation

**How they work:**
```yaml
# In workflow file (.github/workflows/*.yml)
env:
  CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
  # ✅ Value is masked in logs as ***
  # ✅ Only available during workflow execution
  # ✅ Cannot be read by pull requests from forks
```

**Security guarantees:**
- 🔐 **Encrypted storage**: Libsodium sealed boxes
- 🔐 **Access control**: Repository admins only
- 🔐 **Log masking**: Automatically hidden in outputs
- 🔐 **Fork protection**: Not accessible from forks
- 🔐 **Audit logs**: All access tracked

## 🛡️ Current Security Implementation

### Secrets Used

| Secret | Storage | Used By | Access Level |
|--------|---------|---------|--------------|
| `JWT_SECRET` | Cloudflare Workers | Auth tokens | Worker runtime only |
| `ENCRYPTION_KEY` | Cloudflare Workers | Data encryption | Worker runtime only |
| `CLOUDFLARE_API_TOKEN` | GitHub Secrets | CI/CD deployments | GitHub Actions only |
| `CLOUDFLARE_ACCOUNT_ID` | GitHub Secrets | CI/CD deployments | GitHub Actions only |

### What's NOT Stored in Secrets

These are **safe to store in wrangler.toml** because they're not sensitive:

```toml
# ✅ Safe - Public identifiers
database_id = "cd9fcfcb-fccb-4f81-a211-16a40754dae6"
id = "813ae8a4d3884de894c976ab573870be"  # KV namespace ID

# ✅ Safe - Public configuration
ALLOWED_ORIGINS = "https://pbtodo-frontend.pages.dev"
ENVIRONMENT = "production"

# ✅ Safe - Public URLs
# These are discoverable anyway
```

### What IS Stored as Secrets

These are **sensitive and stored securely**:

```bash
# 🔐 NEVER in code - Always in Cloudflare Workers
JWT_SECRET          # Used to sign/verify JWT tokens
ENCRYPTION_KEY      # Used to encrypt sensitive data

# 🔐 NEVER in code - Always in GitHub Secrets
CLOUDFLARE_API_TOKEN      # Allows CI/CD to deploy
CLOUDFLARE_ACCOUNT_ID     # Your Cloudflare account
```

## 🔍 Verification: Are We Safe?

### Check 1: Repository Scan

```bash
# ✅ This should return NOTHING
git grep -i "jwt_secret\|encryption_key" | grep -v "\.md\|comment"

# If it returns results with actual values = 🚨 DANGER
# If it only shows comments/docs = ✅ Safe
```

### Check 2: Cloudflare Secrets

```bash
# List secrets (shows names only, not values)
wrangler secret list --env production

# Expected output:
# [
#   {"name": "JWT_SECRET", "type": "secret_text"},
#   {"name": "ENCRYPTION_KEY", "type": "secret_text"}
# ]
# ✅ Notice: VALUES are not shown!
```

### Check 3: GitHub Secrets

```bash
# List GitHub secrets
gh secret list

# Expected output:
# CLOUDFLARE_API_TOKEN     Updated 2025-11-04
# CLOUDFLARE_ACCOUNT_ID    Updated 2025-11-04
# ✅ Notice: VALUES are not shown!
```

### Check 4: Git History

```bash
# Check if secrets were ever committed
git log -S "jwt_secret" --all
git log -S "encryption_key" --all

# ✅ Should only show commits about documentation
# 🚨 If it shows actual secret values = ROTATE IMMEDIATELY
```

## 🔄 Secret Rotation (Best Practice)

### When to Rotate Secrets

- 🔁 Every 90 days (recommended)
- 🔁 When team member leaves
- 🔁 After suspected breach
- 🔁 After accidental exposure
- 🔁 Before major deployments (optional)

### How to Rotate Secrets

```bash
# 1. Generate new secret
NEW_SECRET=$(openssl rand -hex 32)

# 2. Update in Cloudflare (for production)
echo "$NEW_SECRET" | wrangler secret put JWT_SECRET --env production

# 3. Update for staging
echo "$(openssl rand -hex 32)" | wrangler secret put JWT_SECRET --env staging

# 4. Update for development
echo "$(openssl rand -hex 32)" | wrangler secret put JWT_SECRET --env development

# 5. Test deployments
wrangler deploy --env staging
# Test thoroughly on staging

# 6. Deploy to production
wrangler deploy --env production

# ✅ All existing sessions will be invalidated (expected behavior)
```

### Rotating GitHub Secrets

```bash
# Via GitHub CLI
gh secret set CLOUDFLARE_API_TOKEN

# Or via GitHub web UI:
# 1. Repository → Settings → Secrets and variables → Actions
# 2. Click on secret name
# 3. Update value
# 4. Save
```

## 🚨 What If Secrets Are Exposed?

### Immediate Actions

1. **Rotate compromised secrets immediately**
   ```bash
   # Generate new secrets
   wrangler secret put JWT_SECRET --env production
   wrangler secret put ENCRYPTION_KEY --env production
   ```

2. **Revoke Cloudflare API tokens**
   - Go to Cloudflare Dashboard → Profile → API Tokens
   - Revoke compromised token
   - Create new token with minimal permissions

3. **Check GitHub audit logs**
   ```bash
   gh api /repos/OWNER/REPO/events | jq '.[] | select(.type == "SecurityEvent")'
   ```

4. **Force logout all users**
   ```bash
   # Clear all sessions in KV
   wrangler kv key list --namespace-id=YOUR_SESSIONS_KV_ID | \
   jq -r '.[].name' | \
   xargs -I {} wrangler kv key delete {} --namespace-id=YOUR_SESSIONS_KV_ID
   ```

5. **Review access logs**
   ```bash
   wrangler tail --env production --format pretty
   ```

### Prevention Checklist

- ✅ Never commit `.env` files
- ✅ Add `.env*` to `.gitignore`
- ✅ Use `wrangler secret` command only
- ✅ Never echo secrets in scripts
- ✅ Never log secrets in application code
- ✅ Use environment detection for debugging

## 🔐 Security Best Practices

### 1. Environment Separation

```bash
# ✅ Different secrets per environment
Production:  jwt_secret_PROD_abc123...
Staging:     jwt_secret_STAGING_def456...
Development: jwt_secret_DEV_ghi789...

# 🚨 NEVER use production secrets in other environments
```

### 2. Secret Strength

```bash
# ✅ Generate strong secrets
openssl rand -hex 32  # 256-bit secret

# ✅ Minimum requirements
# - At least 32 characters (256 bits)
# - Cryptographically random
# - Unique per environment
```

### 3. Access Control

**Cloudflare Workers:**
- Only Worker runtime has access
- No API to read secrets
- Changes audited in dashboard

**GitHub Secrets:**
- Repository admins only
- Requires admin access to view/edit
- All changes logged

### 4. Code Review

**Before committing, check:**
```bash
# Search for potential secrets
git diff | grep -i "secret\|key\|token\|password"

# If found, verify they're not actual values
```

### 5. CI/CD Security

**GitHub Actions:**
- ✅ Secrets masked in logs automatically
- ✅ Not accessible from forked PRs
- ✅ Minimal permissions (GITHUB_TOKEN)

**Example safe usage:**
```yaml
- name: Deploy
  run: wrangler deploy --env production
  env:
    CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
    # ✅ Value never appears in logs (shows ***)
```

## 📋 Security Checklist

### For Developers

- [ ] Never commit `.env` files
- [ ] Never hardcode secrets in code
- [ ] Use `wrangler secret put` command
- [ ] Different secrets per environment
- [ ] Review git diff before committing
- [ ] Use `.env.example` for documentation

### For DevOps

- [ ] Rotate secrets every 90 days
- [ ] Monitor Cloudflare audit logs
- [ ] Review GitHub security alerts
- [ ] Keep wrangler CLI updated
- [ ] Document secret rotation procedures
- [ ] Test secret rotation in staging first

### For Security Audits

- [ ] Scan git history for exposed secrets
- [ ] Verify `.gitignore` includes `.env*`
- [ ] Check Cloudflare access logs
- [ ] Review GitHub Actions logs
- [ ] Verify secret strength (256-bit minimum)
- [ ] Confirm separation per environment

## 🛠️ Tools & Commands

### Generate Secrets

```bash
# Generate 256-bit secret (recommended)
openssl rand -hex 32

# Generate 512-bit secret (extra secure)
openssl rand -hex 64

# Generate base64 secret
openssl rand -base64 32
```

### Manage Cloudflare Secrets

```bash
# Set secret
wrangler secret put SECRET_NAME --env production

# List secrets (names only, not values)
wrangler secret list --env production

# Delete secret
wrangler secret delete SECRET_NAME --env production
```

### Manage GitHub Secrets

```bash
# Set secret
gh secret set SECRET_NAME

# List secrets
gh secret list

# Delete secret
gh secret delete SECRET_NAME
```

### Audit & Monitoring

```bash
# Check for secrets in git history
git log -S "password" --all --oneline

# Scan repository for potential secrets
git grep -i "password\|secret\|key\|token" | grep -v "\.md"

# Monitor Workers logs
wrangler tail --env production --format pretty
```

## 📚 Additional Resources

- [Cloudflare Workers Secrets Documentation](https://developers.cloudflare.com/workers/configuration/secrets/)
- [GitHub Encrypted Secrets](https://docs.github.com/en/actions/security-guides/encrypted-secrets)
- [OWASP Secrets Management](https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html)
- [Wrangler CLI Documentation](https://developers.cloudflare.com/workers/wrangler/)

## 🆘 Support

If you suspect a security issue:

1. **Do NOT open a public issue**
2. Rotate affected secrets immediately
3. Contact repository administrators
4. Document incident for review

---

## ✅ Current Status

### Security Measures in Place

- ✅ All secrets stored in Cloudflare Workers (encrypted)
- ✅ GitHub Actions secrets encrypted
- ✅ No secrets in repository code
- ✅ No secrets in git history
- ✅ Separate secrets per environment
- ✅ Strong secret generation (256-bit)
- ✅ Automatic log masking in CI/CD
- ✅ Access control via Cloudflare/GitHub

### Latest Security Audit

**Date:** November 4, 2025
**Status:** ✅ SECURE
**Findings:** No secrets exposed in repository or git history
**Action Items:** None - all best practices followed

---

**Last Updated:** November 4, 2025  
**Maintainer:** Security Team  
**Review Schedule:** Quarterly (every 90 days)