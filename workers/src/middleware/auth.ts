/**
 * Authentication middleware for Cloudflare Workers
 * Verifies JWT tokens and extracts user information
 */

import type { Env, RequestContext } from '../types';
import { verifyToken, extractTokenFromHeader } from '../utils/jwt';

/**
 * Authentication error response
 */
function authErrorResponse(message: string, status: number = 401): Response {
  return new Response(
    JSON.stringify({
      success: false,
      error: message,
    }),
    {
      status,
      headers: { 'Content-Type': 'application/json' },
    }
  );
}

/**
 * Extract and verify authentication token
 */
export async function authenticateRequest(
  request: Request,
  env: Env
): Promise<RequestContext | Response> {
  // Extract token from Authorization header
  const authHeader = request.headers.get('Authorization');
  const token = extractTokenFromHeader(authHeader);

  if (!token) {
    return authErrorResponse('Missing authentication token');
  }

  // Verify token
  const payload = await verifyToken(token, env.JWT_SECRET);

  if (!payload) {
    return authErrorResponse('Invalid or expired token');
  }

  // Check if session exists in KV (optional additional security)
  const sessionKey = `session:${payload.userId}`;
  const session = await env.SESSIONS.get(sessionKey);

  if (!session) {
    return authErrorResponse('Session expired or invalid');
  }

  // Return context with user information
  return {
    userId: payload.userId,
    user: {
      id: payload.userId,
      email: payload.email,
      name: '', // Will be populated if needed
      created_at: 0,
      updated_at: 0,
    },
    ip: request.headers.get('CF-Connecting-IP') || undefined,
    userAgent: request.headers.get('User-Agent') || undefined,
  };
}

/**
 * Authentication middleware wrapper
 */
export async function authMiddleware(
  request: Request,
  env: Env,
  handler: (ctx: RequestContext) => Promise<Response>
): Promise<Response> {
  const result = await authenticateRequest(request, env);

  // If result is a Response, it's an error
  if (result instanceof Response) {
    return result;
  }

  // Otherwise, it's a context object - pass it to the handler
  return handler(result);
}

/**
 * Optional authentication middleware (doesn't fail if no token)
 */
export async function optionalAuthMiddleware(
  request: Request,
  env: Env
): Promise<RequestContext> {
  const authHeader = request.headers.get('Authorization');
  const token = extractTokenFromHeader(authHeader);

  if (!token) {
    return {
      ip: request.headers.get('CF-Connecting-IP') || undefined,
      userAgent: request.headers.get('User-Agent') || undefined,
    };
  }

  const payload = await verifyToken(token, env.JWT_SECRET);

  if (!payload) {
    return {
      ip: request.headers.get('CF-Connecting-IP') || undefined,
      userAgent: request.headers.get('User-Agent') || undefined,
    };
  }

  return {
    userId: payload.userId,
    user: {
      id: payload.userId,
      email: payload.email,
      name: '',
      created_at: 0,
      updated_at: 0,
    },
    ip: request.headers.get('CF-Connecting-IP') || undefined,
    userAgent: request.headers.get('User-Agent') || undefined,
  };
}
