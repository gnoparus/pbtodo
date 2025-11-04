/**
 * CORS middleware for Cloudflare Workers
 * Handles Cross-Origin Resource Sharing headers
 */

import type { Env } from '../types';

/**
 * Get allowed origins from environment
 */
function getAllowedOrigins(env: Env): string[] {
  const origins = env.ALLOWED_ORIGINS || 'http://localhost:5173';
  return origins.split(',').map(origin => origin.trim());
}

/**
 * Check if origin is allowed
 */
function isOriginAllowed(origin: string | null, allowedOrigins: string[]): boolean {
  if (!origin) {
    return false;
  }

  // Check exact match
  if (allowedOrigins.includes(origin)) {
    return true;
  }

  // Check wildcard patterns (e.g., *.pages.dev)
  return allowedOrigins.some(allowed => {
    if (allowed.includes('*')) {
      const pattern = allowed.replace(/\*/g, '.*');
      const regex = new RegExp(`^${pattern}$`);
      return regex.test(origin);
    }
    return false;
  });
}

/**
 * Add CORS headers to response
 */
export function addCorsHeaders(
  response: Response,
  request: Request,
  env: Env
): Response {
  const origin = request.headers.get('Origin');
  const allowedOrigins = getAllowedOrigins(env);

  // Create new headers object
  const headers = new Headers(response.headers);

  // Check if origin is allowed
  if (origin && isOriginAllowed(origin, allowedOrigins)) {
    headers.set('Access-Control-Allow-Origin', origin);
  } else if (allowedOrigins.includes('*')) {
    headers.set('Access-Control-Allow-Origin', '*');
  }

  // Add other CORS headers
  headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  headers.set(
    'Access-Control-Allow-Headers',
    'Content-Type, Authorization, X-Requested-With'
  );
  headers.set('Access-Control-Max-Age', '86400'); // 24 hours
  headers.set('Access-Control-Allow-Credentials', 'true');

  // Create new response with updated headers
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

/**
 * Handle CORS preflight requests
 */
export function handleCorsPreFlight(request: Request, env: Env): Response {
  const origin = request.headers.get('Origin');
  const allowedOrigins = getAllowedOrigins(env);

  const headers: Record<string, string> = {
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
    'Access-Control-Max-Age': '86400',
    'Access-Control-Allow-Credentials': 'true',
  };

  // Check if origin is allowed
  if (origin && isOriginAllowed(origin, allowedOrigins)) {
    headers['Access-Control-Allow-Origin'] = origin;
  } else if (allowedOrigins.includes('*')) {
    headers['Access-Control-Allow-Origin'] = '*';
  }

  return new Response(null, {
    status: 204,
    headers,
  });
}

/**
 * CORS middleware wrapper
 */
export async function corsMiddleware(
  request: Request,
  env: Env,
  handler: () => Promise<Response>
): Promise<Response> {
  // Handle preflight requests
  if (request.method === 'OPTIONS') {
    return handleCorsPreFlight(request, env);
  }

  // Process request and add CORS headers to response
  const response = await handler();
  return addCorsHeaders(response, request, env);
}
