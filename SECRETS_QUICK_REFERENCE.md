# Secrets Management Quick Reference

## 🔑 Quick Commands

### View Secrets (Shows Names Only, NOT Values)

```bash
# IMPORTANT: Run from the workers/ directory!
cd workers

# Production secrets
wrangler secret list --env production

# Staging secrets
wrangler secret list --env staging

# Development secrets
wrangler secret list --env development
```

**Expected Output:**
```json
[
  {
    "name": "JWT_SECRET",
    "type": "secret_text"
  },
  {
    "name": "ENCRYPTION_KEY",
    "type": "secret_text"
  }
]
```

✅ **Notice:** Only the NAME is shown, never the actual secret value!

---

## 🔐 Set Secrets

```bash
# Navigate to workers directory first
cd workers

# Set production secret
wrangler secret put JWT_SECRET --env production
# You'll be prompted to enter the secret value

# Set staging secret
wrangler secret put JWT_SECRET --env staging

# Set development secret
wrangler secret put JWT_SECRET --env development
```

**Or pipe a generated secret:**
```bash
# Generate and set in one command
echo "$(openssl rand -hex 32)" | wrangler secret put JWT_SECRET --env production
```

---

## 🗑️ Delete Secrets

```bash
cd workers

# Delete from production
wrangler secret delete JWT_SECRET --env production

# Delete from staging
wrangler secret delete JWT_SECRET --env staging
```

---

## 🔄 Rotate Secrets (Recommended Every 90 Days)

```bash
cd workers

# 1. Generate new secret
NEW_SECRET=$(openssl rand -hex 32)

# 2. Update production
echo "$NEW_SECRET" | wrangler secret put JWT_SECRET --env production

# 3. Update staging (use different secret!)
echo "$(openssl rand -hex 32)" | wrangler secret put JWT_SECRET --env staging

# 4. Test staging deployment
wrangler deploy --env staging

# 5. Test production deployment
wrangler deploy --env production
```

---

## 🔍 Verify Security

```bash
# Check no secrets in repository
git grep -i "jwt_secret\|encryption_key" | grep -v "\.md\|#\|//"

# Check git history (should return nothing sensitive)
git log -S "jwt_secret" --all

# Verify secrets are set (from workers/ directory)
cd workers
wrangler secret list --env production
wrangler secret list --env staging
```

---

## 🆘 Common Issues

### Issue: "Required Worker name missing"

**Problem:** Running wrangler from wrong directory

**Solution:**
```bash
# ❌ Wrong - from root directory
wrangler secret list --env production

# ✅ Correct - from workers directory
cd workers
wrangler secret list --env production
```

### Issue: "Environment not found"

**Problem:** Typo in environment name

**Solution:**
```bash
# Valid environments:
--env development
--env staging
--env production

# Not valid:
--env prod  ❌
--env stage ❌
--env dev   ❌
```

### Issue: Need to rotate after exposure

**Immediate action:**
```bash
cd workers

# 1. Generate new secret
NEW_SECRET=$(openssl rand -hex 32)

# 2. Update all environments
echo "$NEW_SECRET" | wrangler secret put JWT_SECRET --env production
echo "$(openssl rand -hex 32)" | wrangler secret put JWT_SECRET --env staging
echo "$(openssl rand -hex 32)" | wrangler secret put JWT_SECRET --env development

# 3. Redeploy immediately
wrangler deploy --env production
```

---

## 📋 Current Secrets by Environment

### Production
- `JWT_SECRET` - For signing authentication tokens
- (Add ENCRYPTION_KEY if needed)

### Staging
- `JWT_SECRET` - Separate from production
- `ENCRYPTION_KEY` - Separate from production

### Development
- (Shares some KV with production - be careful!)

---

## 🎯 Best Practices

1. **Always run from `workers/` directory**
   ```bash
   cd workers
   wrangler secret put SECRET_NAME --env production
   ```

2. **Use different secrets per environment**
   ```bash
   # DON'T reuse the same secret!
   Production:  abc123...
   Staging:     def456...  (different!)
   Development: ghi789...  (different!)
   ```

3. **Generate strong secrets**
   ```bash
   # 256-bit secret (recommended)
   openssl rand -hex 32
   
   # 512-bit secret (extra secure)
   openssl rand -hex 64
   ```

4. **Never echo secrets in logs**
   ```bash
   # ❌ Don't do this
   SECRET=$(openssl rand -hex 32)
   echo "Secret is: $SECRET"  # BAD!
   
   # ✅ Do this
   echo "$(openssl rand -hex 32)" | wrangler secret put JWT_SECRET --env production
   ```

5. **Test on staging first**
   ```bash
   # Always test rotation on staging before production
   wrangler deploy --env staging
   # Test thoroughly
   wrangler deploy --env production
   ```

---

## 🔐 Security Verification Checklist

- [ ] Secrets only in Cloudflare Workers (not in code)
- [ ] Different secrets per environment
- [ ] No secrets in git repository
- [ ] No secrets in git history
- [ ] `.env` files in `.gitignore`
- [ ] Secrets rotated in last 90 days
- [ ] All team members trained on secret management

---

## 📚 Related Documentation

- **Full Guide:** [SECURITY.md](./SECURITY.md)
- **Environment Setup:** [ENVIRONMENTS.md](./ENVIRONMENTS.md)
- **Staging Setup:** [STAGING_SETUP.md](./STAGING_SETUP.md)

---

## ⚡ Quick Copy-Paste Commands

```bash
# View all secrets (from project root)
cd workers && \
wrangler secret list --env production && \
echo "---" && \
wrangler secret list --env staging

# Set JWT_SECRET for all environments
cd workers && \
echo "$(openssl rand -hex 32)" | wrangler secret put JWT_SECRET --env production && \
echo "$(openssl rand -hex 32)" | wrangler secret put JWT_SECRET --env staging && \
echo "$(openssl rand -hex 32)" | wrangler secret put JWT_SECRET --env development

# Set ENCRYPTION_KEY for all environments
cd workers && \
echo "$(openssl rand -hex 32)" | wrangler secret put ENCRYPTION_KEY --env production && \
echo "$(openssl rand -hex 32)" | wrangler secret put ENCRYPTION_KEY --env staging && \
echo "$(openssl rand -hex 32)" | wrangler secret put ENCRYPTION_KEY --env development

# Verify all deployments are working
curl https://pbtodo-api.bua.workers.dev/api/health && \
curl https://pbtodo-api-staging.bua.workers.dev/api/health && \
curl https://pbtodo-api-dev.bua.workers.dev/api/health
```

---

**Last Updated:** November 4, 2025  
**Status:** ✅ All secrets properly managed