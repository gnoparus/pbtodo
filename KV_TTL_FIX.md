# Cloudflare KV TTL Issue & Resolution

## Issue Description

Users were experiencing intermittent 500 errors during login and registration with the error message:
```
KV PUT failed: 400 Invalid expiration_ttl of XX. Expiration TTL must be at least 60.
```

Where XX was a varying small number (20-54 seconds), despite the code setting TTL to 86400 (24 hours).

## Root Cause

The issue was caused by using `expirationTtl` parameter with Cloudflare Workers KV `put()` method. When using `expirationTtl`, Cloudflare KV expects the TTL value to be calculated at the exact moment the KV write occurs. However, due to timing differences between:

1. JWT token generation (which captures `Date.now()`)
2. Token decoding/logging
3. KV PUT operation

There could be slight timing variations that resulted in the effective TTL being calculated differently than expected by the KV API, sometimes resulting in values below the 60-second minimum.

## Solution

Switch from using `expirationTtl` (relative seconds) to `expiration` (absolute Unix timestamp).

### Before (Problematic Code)

```typescript
const ttl = 86400; // 24 hours
await env.SESSIONS.put(sessionKey, token, {
  expirationTtl: ttl,
});
```

### After (Fixed Code)

```typescript
const now = Math.floor(Date.now() / 1000);
const expirationTimestamp = now + 86400; // 24 hours from now
await env.SESSIONS.put(sessionKey, token, {
  expiration: expirationTimestamp,
});
```

## Files Modified

- `workers/src/handlers/auth.ts`
  - Modified `handleRegister()` - Line ~135-150
  - Modified `handleLogin()` - Line ~268-295
  - Modified `handleRefresh()` - Line ~380-400
- `workers/src/middleware/rateLimit.ts` (Additional fix - January 2025)
  - Modified `saveRateLimitInfo()` - Changed parameter from `ttlSeconds` to `expirationTimestamp`
  - Modified `checkRateLimit()` - Changed KV expiration calculation from relative TTL to absolute timestamp

## Testing

After deploying the fix to production environment:

```bash
cd workers
wrangler deploy --env production
```

Test registration:
```bash
curl -X POST https://pbtodo-api.bua.workers.dev/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"TestPass123!","name":"Test User"}'
```

Test login:
```bash
curl -X POST https://pbtodo-api.bua.workers.dev/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"TestPass123!"}'
```

Both should return `{"success": true, "data": {...}}` with no KV errors.

## Important Notes

1. **Deployment Environment**: Make sure to deploy to the correct environment using `--env production` flag. The default deployment goes to development environment which may have different KV bindings.

2. **Propagation Delay**: After deployment, there may be a brief propagation delay (10-30 seconds) before all edge locations serve the new code.

3. **Timestamp Format**: Cloudflare KV `expiration` parameter expects Unix timestamp in **seconds**, not milliseconds. Always use `Math.floor(Date.now() / 1000)`.

4. **Minimum TTL**: Cloudflare KV requires a minimum TTL of 60 seconds. When using absolute timestamps, ensure `expiration - currentTime >= 60`.

## References

- [Cloudflare Workers KV API Documentation](https://developers.cloudflare.com/kv/api/)
- [KV put() method](https://developers.cloudflare.com/kv/api/write-key-value-pairs/)

## Additional Issue Found

After the initial fix, the same error continued to occur. Investigation revealed that the rate limiting middleware (`rateLimit.ts`) was also using `expirationTtl` with a calculated TTL value:

```typescript
const ttlSeconds = Math.ceil((info.resetAt - now) / 1000);
await saveRateLimitInfo(env, key, info, ttlSeconds);
```

When requests arrived near the end of a rate limit window, `ttlSeconds` could be less than 60 seconds, causing the same KV error.

### Additional Fix Applied

Changed `saveRateLimitInfo()` function to use absolute expiration timestamp:

```typescript
// Before
const ttlSeconds = Math.ceil((info.resetAt - now) / 1000);
await env.RATE_LIMITS.put(key, JSON.stringify(info), {
  expirationTtl: ttlSeconds,
});

// After
const expirationTimestamp = Math.ceil(info.resetAt / 1000);
await env.RATE_LIMITS.put(key, JSON.stringify(info), {
  expiration: expirationTimestamp,
});
```

This ensures the KV expiration is always calculated as an absolute Unix timestamp, avoiding timing-related issues.

## Resolution Dates

- Initial fix: November 4, 2025
- Rate limit fix: January 2025

## Status

✅ **RESOLVED** - All KV operations now use absolute expiration timestamps
- Auth handlers fixed in deployment: `b97e4cbf-01db-4f80-bb45-b451643f4ac2`
- Rate limit fix in deployment: `a7b12d08-7bb1-40bd-bf70-f0c20a8a58e5`
