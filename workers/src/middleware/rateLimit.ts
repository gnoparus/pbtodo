/**
 * Rate limiting middleware for Cloudflare Workers
 * Uses KV storage to track request rates per IP/user
 */

import type { Env, RateLimitInfo, RateLimitConfig } from "../types";

/**
 * Default rate limit configurations
 */
const DEFAULT_CONFIGS: Record<string, RateLimitConfig> = {
  auth: {
    maxAttempts: 5,
    windowMs: 60 * 1000, // 1 minute
    blockDurationMs: 15 * 60 * 1000, // 15 minutes
  },
  registration: {
    maxAttempts: 3,
    windowMs: 60 * 1000, // 1 minute
    blockDurationMs: 30 * 60 * 1000, // 30 minutes
  },
  api: {
    maxAttempts: 100,
    windowMs: 60 * 1000, // 1 minute
    blockDurationMs: 60 * 1000, // 1 minute
  },
};

/**
 * Get client identifier (IP address)
 */
function getClientIdentifier(request: Request): string {
  // Try to get real IP from Cloudflare headers
  const cfConnectingIp = request.headers.get("CF-Connecting-IP");
  if (cfConnectingIp) {
    return cfConnectingIp;
  }

  // Fallback to other headers
  const xForwardedFor = request.headers.get("X-Forwarded-For");
  if (xForwardedFor) {
    return xForwardedFor.split(",")[0].trim();
  }

  const xRealIp = request.headers.get("X-Real-IP");
  if (xRealIp) {
    return xRealIp;
  }

  return "unknown";
}

/**
 * Generate rate limit key
 */
function getRateLimitKey(identifier: string, type: string): string {
  return `rate_limit:${type}:${identifier}`;
}

/**
 * Get rate limit info from KV
 */
async function getRateLimitInfo(
  env: Env,
  key: string,
): Promise<RateLimitInfo | null> {
  const data = await env.RATE_LIMITS.get(key);
  if (!data) {
    return null;
  }

  try {
    return JSON.parse(data) as RateLimitInfo;
  } catch {
    return null;
  }
}

/**
 * Save rate limit info to KV
 */
async function saveRateLimitInfo(
  env: Env,
  key: string,
  info: RateLimitInfo,
  expirationTimestamp: number,
): Promise<void> {
  await env.RATE_LIMITS.put(key, JSON.stringify(info), {
    expiration: expirationTimestamp,
  });
}

/**
 * Check if request should be rate limited
 */
export async function checkRateLimit(
  request: Request,
  env: Env,
  type: string = "api",
  config?: RateLimitConfig,
): Promise<{ allowed: boolean; info: RateLimitInfo }> {
  const limitConfig = config || DEFAULT_CONFIGS[type] || DEFAULT_CONFIGS.api;
  const identifier = getClientIdentifier(request);
  const key = getRateLimitKey(identifier, type);
  const now = Date.now();

  // Get existing rate limit info
  let info = await getRateLimitInfo(env, key);

  // Initialize if not exists or expired
  if (!info || info.resetAt < now) {
    info = {
      key,
      attempts: 0,
      resetAt: now + limitConfig.windowMs,
      blocked: false,
    };
  }

  // Check if currently blocked
  if (info.blocked && info.resetAt > now) {
    return {
      allowed: false,
      info,
    };
  }

  // Reset if window expired
  if (info.resetAt < now) {
    info.attempts = 0;
    info.resetAt = now + limitConfig.windowMs;
    info.blocked = false;
  }

  // Increment attempts
  info.attempts++;

  // Check if limit exceeded
  if (info.attempts > limitConfig.maxAttempts) {
    info.blocked = true;
    info.resetAt = now + limitConfig.blockDurationMs;
  }

  // Save updated info with absolute expiration timestamp
  // Ensure expiration is at least 65 seconds in the future (KV minimum is 60, adding 5 second buffer)
  const expirationTimestamp = Math.floor(info.resetAt / 1000);
  const currentTimestamp = Math.floor(Date.now() / 1000);
  const minExpiration = currentTimestamp + 65;
  const finalExpiration = Math.max(expirationTimestamp, minExpiration);
  await saveRateLimitInfo(env, key, info, finalExpiration);

  return {
    allowed: !info.blocked,
    info,
  };
}

/**
 * Rate limit error response
 */
function rateLimitErrorResponse(info: RateLimitInfo): Response {
  const retryAfter = Math.ceil((info.resetAt - Date.now()) / 1000);

  return new Response(
    JSON.stringify({
      success: false,
      error: "Too many requests",
      message: `Rate limit exceeded. Try again in ${retryAfter} seconds.`,
      retryAfter,
    }),
    {
      status: 429,
      headers: {
        "Content-Type": "application/json",
        "Retry-After": retryAfter.toString(),
        "X-RateLimit-Limit": "100",
        "X-RateLimit-Remaining": "0",
        "X-RateLimit-Reset": info.resetAt.toString(),
      },
    },
  );
}

/**
 * Rate limit middleware
 */
export async function rateLimitMiddleware(
  request: Request,
  env: Env,
  type: string = "api",
  config?: RateLimitConfig,
): Promise<Response | null> {
  const { allowed, info } = await checkRateLimit(request, env, type, config);

  if (!allowed) {
    return rateLimitErrorResponse(info);
  }

  return null;
}

/**
 * Rate limit middleware wrapper
 */
export async function withRateLimit(
  request: Request,
  env: Env,
  type: string,
  handler: () => Promise<Response>,
): Promise<Response> {
  const limitResponse = await rateLimitMiddleware(request, env, type);

  if (limitResponse) {
    return limitResponse;
  }

  return handler();
}

/**
 * Reset rate limit for a specific identifier
 */
export async function resetRateLimit(
  env: Env,
  identifier: string,
  type: string,
): Promise<void> {
  const key = getRateLimitKey(identifier, type);
  await env.RATE_LIMITS.delete(key);
}

/**
 * Get rate limit status (for debugging)
 */
export async function getRateLimitStatus(
  request: Request,
  env: Env,
  type: string = "api",
): Promise<RateLimitInfo | null> {
  const identifier = getClientIdentifier(request);
  const key = getRateLimitKey(identifier, type);
  return getRateLimitInfo(env, key);
}
