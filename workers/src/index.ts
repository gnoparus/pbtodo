/**
 * Cloudflare Workers API Entry Point
 * Main router for PBTodo serverless API
 */

import type { Env, RequestContext } from './types';
import { corsMiddleware, handleCorsPreFlight } from './middleware/cors';
import { authenticateRequest } from './middleware/auth';
import { rateLimitMiddleware } from './middleware/rateLimit';
import {
  handleRegister,
  handleLogin,
  handleLogout,
  handleRefresh,
  handleGetCurrentUser,
} from './handlers/auth';
import {
  handleGetTodos,
  handleGetTodoById,
  handleCreateTodo,
  handleUpdateTodo,
  handleDeleteTodo,
  handleToggleTodo,
} from './handlers/todos';

/**
 * Parse URL path segments
 */
function parsePathSegments(pathname: string): string[] {
  return pathname.split('/').filter(Boolean);
}

/**
 * Health check endpoint
 */
function handleHealthCheck(): Response {
  return new Response(
    JSON.stringify({
      success: true,
      message: 'PBTodo API is running',
      timestamp: Date.now(),
      version: '1.0.0',
    }),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }
  );
}

/**
 * Not found response
 */
function notFoundResponse(): Response {
  return new Response(
    JSON.stringify({
      success: false,
      error: 'Not found',
      message: 'The requested endpoint does not exist',
    }),
    {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    }
  );
}

/**
 * Method not allowed response
 */
function methodNotAllowedResponse(allowedMethods: string[]): Response {
  return new Response(
    JSON.stringify({
      success: false,
      error: 'Method not allowed',
      message: `Allowed methods: ${allowedMethods.join(', ')}`,
    }),
    {
      status: 405,
      headers: {
        'Content-Type': 'application/json',
        'Allow': allowedMethods.join(', '),
      },
    }
  );
}

/**
 * Internal server error response
 */
function serverErrorResponse(error?: string): Response {
  return new Response(
    JSON.stringify({
      success: false,
      error: 'Internal server error',
      message: error || 'An unexpected error occurred',
    }),
    {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    }
  );
}

/**
 * Route handler for public (unauthenticated) endpoints
 */
async function handlePublicRoute(
  request: Request,
  env: Env,
  segments: string[]
): Promise<Response> {
  const method = request.method;

  // Health check
  if (segments[0] === 'health' && method === 'GET') {
    return handleHealthCheck();
  }

  // Auth routes
  if (segments[0] === 'auth') {
    const authRoute = segments[1];

    // POST /api/auth/register
    if (authRoute === 'register' && method === 'POST') {
      // Apply rate limiting for registration
      const rateLimitResponse = await rateLimitMiddleware(request, env, 'registration');
      if (rateLimitResponse) return rateLimitResponse;

      return handleRegister(request, env);
    }

    // POST /api/auth/login
    if (authRoute === 'login' && method === 'POST') {
      // Apply rate limiting for login
      const rateLimitResponse = await rateLimitMiddleware(request, env, 'auth');
      if (rateLimitResponse) return rateLimitResponse;

      return handleLogin(request, env);
    }

    // Unknown auth route
    return notFoundResponse();
  }

  // No public route matched
  return notFoundResponse();
}

/**
 * Route handler for protected (authenticated) endpoints
 */
async function handleProtectedRoute(
  request: Request,
  env: Env,
  segments: string[],
  ctx: RequestContext
): Promise<Response> {
  const method = request.method;
  const userId = ctx.userId!;

  // Auth routes
  if (segments[0] === 'auth') {
    const authRoute = segments[1];

    // POST /api/auth/logout
    if (authRoute === 'logout' && method === 'POST') {
      return handleLogout(request, env, userId);
    }

    // POST /api/auth/refresh
    if (authRoute === 'refresh' && method === 'POST') {
      return handleRefresh(request, env, userId);
    }

    // GET /api/auth/me
    if (authRoute === 'me' && method === 'GET') {
      return handleGetCurrentUser(request, env, userId);
    }

    return notFoundResponse();
  }

  // Todos routes
  if (segments[0] === 'todos') {
    // GET /api/todos - List all todos
    if (segments.length === 1 && method === 'GET') {
      return handleGetTodos(request, env, userId);
    }

    // POST /api/todos - Create new todo
    if (segments.length === 1 && method === 'POST') {
      return handleCreateTodo(request, env, userId);
    }

    // Routes with todo ID
    if (segments.length >= 2) {
      const todoId = segments[1];

      // GET /api/todos/:id - Get single todo
      if (segments.length === 2 && method === 'GET') {
        return handleGetTodoById(request, env, userId, todoId);
      }

      // PATCH /api/todos/:id - Update todo
      if (segments.length === 2 && (method === 'PATCH' || method === 'PUT')) {
        return handleUpdateTodo(request, env, userId, todoId);
      }

      // DELETE /api/todos/:id - Delete todo
      if (segments.length === 2 && method === 'DELETE') {
        return handleDeleteTodo(request, env, userId, todoId);
      }

      // PATCH /api/todos/:id/toggle - Toggle completion
      if (segments.length === 3 && segments[2] === 'toggle' && method === 'PATCH') {
        return handleToggleTodo(request, env, userId, todoId);
      }

      // Method not allowed for this route
      if (segments.length === 2) {
        return methodNotAllowedResponse(['GET', 'PATCH', 'PUT', 'DELETE']);
      }
    }

    return notFoundResponse();
  }

  // No protected route matched
  return notFoundResponse();
}

/**
 * Main request handler
 */
async function handleRequest(request: Request, env: Env): Promise<Response> {
  try {
    const url = new URL(request.url);
    const pathname = url.pathname;

    // Parse path segments (remove /api prefix if present)
    let segments = parsePathSegments(pathname);
    if (segments[0] === 'api') {
      segments = segments.slice(1);
    }

    // Empty path
    if (segments.length === 0) {
      return handleHealthCheck();
    }

    // Try public routes first
    const publicRoutes = ['health', 'auth'];
    if (publicRoutes.includes(segments[0])) {
      // For auth routes, only register and login are public
      if (segments[0] === 'auth' && ['register', 'login'].includes(segments[1])) {
        return await handlePublicRoute(request, env, segments);
      }
      // Health check is always public
      if (segments[0] === 'health') {
        return await handlePublicRoute(request, env, segments);
      }
    }

    // All other routes require authentication
    const authResult = await authenticateRequest(request, env);

    // If authentication failed, return error response
    if (authResult instanceof Response) {
      return authResult;
    }

    // Authentication succeeded, handle protected route
    return await handleProtectedRoute(request, env, segments, authResult);
  } catch (error) {
    console.error('Request handler error:', error);
    return serverErrorResponse(
      error instanceof Error ? error.message : 'Unknown error'
    );
  }
}

/**
 * Cloudflare Workers fetch handler
 */
export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    try {
      // Handle CORS preflight requests
      if (request.method === 'OPTIONS') {
        return handleCorsPreFlight(request, env);
      }

      // Process request with CORS wrapper
      return await corsMiddleware(request, env, async () => {
        return await handleRequest(request, env);
      });
    } catch (error) {
      console.error('Worker error:', error);
      const errorResponse = serverErrorResponse(
        error instanceof Error ? error.message : 'Unknown error'
      );
      // Add CORS headers even to error responses
      return corsMiddleware(request, env, async () => errorResponse);
    }
  },
};
