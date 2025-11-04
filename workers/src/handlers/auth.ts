/**
 * Authentication handlers for user registration and login
 * Implements secure password hashing and JWT token generation
 */

import type {
  Env,
  CreateUserInput,
  LoginInput,
  AuthResponse,
  User,
} from "../types";
import { hashPassword, verifyPassword, generateUUID } from "../utils/crypto";
import { generateToken } from "../utils/jwt";
import {
  validateEmail,
  validatePassword,
  validateName,
  parseAndValidateJSON,
  validateRequiredFields,
} from "../utils/validation";

/**
 * Success response helper
 */
function successResponse(data: any, status: number = 200): Response {
  return new Response(
    JSON.stringify({
      success: true,
      data,
    }),
    {
      status,
      headers: { "Content-Type": "application/json" },
    },
  );
}

/**
 * Error response helper
 */
function errorResponse(error: string, status: number = 400): Response {
  return new Response(
    JSON.stringify({
      success: false,
      error,
    }),
    {
      status,
      headers: { "Content-Type": "application/json" },
    },
  );
}

/**
 * Register a new user
 * POST /api/auth/register
 */
export async function handleRegister(
  request: Request,
  env: Env,
): Promise<Response> {
  try {
    // Parse and validate JSON body
    const body = await parseAndValidateJSON(request);

    // Validate required fields
    const requiredValidation = validateRequiredFields(body, [
      "email",
      "password",
      "name",
    ]);
    if (!requiredValidation.isValid) {
      return errorResponse(requiredValidation.errors.join(", "), 400);
    }

    const { email, password, name } = body as CreateUserInput;

    // Validate email
    const emailValidation = validateEmail(email);
    if (!emailValidation.isValid) {
      return errorResponse(emailValidation.errors.join(", "), 400);
    }

    // Validate password
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      return errorResponse(passwordValidation.errors.join(", "), 400);
    }

    // Validate name
    const nameValidation = validateName(name);
    if (!nameValidation.isValid) {
      return errorResponse(nameValidation.errors.join(", "), 400);
    }

    // Check if user already exists
    const existingUser = await env.DB.prepare(
      "SELECT id FROM users WHERE email = ?",
    )
      .bind(email.toLowerCase())
      .first();

    if (existingUser) {
      return errorResponse("Email already registered", 409);
    }

    // Hash password
    const passwordHash = await hashPassword(password);
    const userId = generateUUID();
    const now = Math.floor(Date.now() / 1000);

    // Insert user into database
    await env.DB.prepare(
      "INSERT INTO users (id, email, name, password_hash, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
    )
      .bind(userId, email.toLowerCase(), name, passwordHash, now, now)
      .run();

    // Generate JWT token
    const token = await generateToken(
      userId,
      email.toLowerCase(),
      env.JWT_SECRET,
      86400,
    );

    // Store session in KV (24 hour expiry)
    // Ensure TTL is at least 60 seconds (Cloudflare KV minimum)
    const sessionKey = `session:${userId}`;
    const ttl = 86400; // 24 hours
    console.log("Registration - Setting KV TTL:", ttl, "for key:", sessionKey);
    if (ttl < 60) {
      console.error("KV TTL too low:", ttl);
      return errorResponse("Session configuration error", 500);
    }
    try {
      await env.SESSIONS.put(sessionKey, token, {
        expirationTtl: ttl,
      });
      console.log("Registration - KV PUT successful");
    } catch (kvError) {
      console.error("Registration - KV PUT error:", kvError);
      throw kvError;
    }

    // Return user data and token
    const user: User = {
      id: userId,
      email: email.toLowerCase(),
      name,
      created_at: now,
      updated_at: now,
    };

    const authResponse: AuthResponse = {
      token,
      user,
    };

    return successResponse(authResponse, 201);
  } catch (error) {
    console.error("Registration error:", error);
    // Check if it's a KV error and provide better error message
    const errorMessage =
      error instanceof Error ? error.message : "Registration failed";
    if (
      errorMessage.includes("KV PUT failed") ||
      errorMessage.includes("expiration_ttl")
    ) {
      return errorResponse("Session storage error. Please try again.", 500);
    }
    return errorResponse("Registration failed", 500);
  }
}

/**
 * Login user
 * POST /api/auth/login
 */
export async function handleLogin(
  request: Request,
  env: Env,
): Promise<Response> {
  try {
    // Parse and validate JSON body
    const body = await parseAndValidateJSON(request);

    // Validate required fields
    const requiredValidation = validateRequiredFields(body, [
      "email",
      "password",
    ]);
    if (!requiredValidation.isValid) {
      return errorResponse(requiredValidation.errors.join(", "), 400);
    }

    const { email, password } = body as LoginInput;

    // Validate email format
    const emailValidation = validateEmail(email);
    if (!emailValidation.isValid) {
      return errorResponse("Invalid credentials", 401);
    }

    // Get user from database
    const user = await env.DB.prepare(
      "SELECT id, email, name, password_hash, avatar, created_at, updated_at FROM users WHERE email = ?",
    )
      .bind(email.toLowerCase())
      .first();

    if (!user) {
      return errorResponse("Invalid credentials", 401);
    }

    // Verify password
    const passwordValid = await verifyPassword(
      password,
      user.password_hash as string,
    );
    if (!passwordValid) {
      return errorResponse("Invalid credentials", 401);
    }

    // Generate JWT token
    const token = await generateToken(
      user.id as string,
      user.email as string,
      env.JWT_SECRET,
      86400,
    );

    // Store session in KV (24 hour expiry)
    // Ensure TTL is at least 60 seconds (Cloudflare KV minimum)
    const sessionKey = `session:${user.id}`;
    const ttl = 86400; // 24 hours
    console.log(
      "Login - Setting KV TTL:",
      ttl,
      "for key:",
      sessionKey,
      "token length:",
      token.length,
    );
    if (ttl < 60) {
      console.error("KV TTL too low:", ttl);
      return errorResponse("Session configuration error", 500);
    }
    try {
      await env.SESSIONS.put(sessionKey, token, {
        expirationTtl: ttl,
      });
      console.log("Login - KV PUT successful");
    } catch (kvError) {
      console.error("Login - KV PUT error:", kvError);
      throw kvError;
    }

    // Return user data and token
    const userData: User = {
      id: user.id as string,
      email: user.email as string,
      name: user.name as string,
      avatar: user.avatar as string | undefined,
      created_at: user.created_at as number,
      updated_at: user.updated_at as number,
    };

    const authResponse: AuthResponse = {
      token,
      user: userData,
    };

    return successResponse(authResponse, 200);
  } catch (error) {
    console.error("Login error:", error);
    // Check if it's a KV error and provide better error message
    const errorMessage =
      error instanceof Error ? error.message : "Login failed";
    if (
      errorMessage.includes("KV PUT failed") ||
      errorMessage.includes("expiration_ttl")
    ) {
      return errorResponse("Session storage error. Please try again.", 500);
    }
    return errorResponse("Login failed", 500);
  }
}

/**
 * Logout user
 * POST /api/auth/logout
 */
export async function handleLogout(
  _request: Request,
  env: Env,
  userId: string,
): Promise<Response> {
  try {
    // Delete session from KV
    const sessionKey = `session:${userId}`;
    await env.SESSIONS.delete(sessionKey);

    return successResponse({ message: "Logged out successfully" }, 200);
  } catch (error) {
    console.error("Logout error:", error);
    return errorResponse("Logout failed", 500);
  }
}

/**
 * Refresh authentication token
 * POST /api/auth/refresh
 */
export async function handleRefresh(
  _request: Request,
  env: Env,
  userId: string,
): Promise<Response> {
  try {
    // Get user from database
    const user = await env.DB.prepare(
      "SELECT id, email, name, avatar, created_at, updated_at FROM users WHERE id = ?",
    )
      .bind(userId)
      .first();

    if (!user) {
      return errorResponse("User not found", 404);
    }

    // Generate new JWT token
    const token = await generateToken(
      user.id as string,
      user.email as string,
      env.JWT_SECRET,
      86400,
    );

    // Update session in KV
    // Store session in KV (24 hour expiry)
    // Ensure TTL is at least 60 seconds (Cloudflare KV minimum)
    const sessionKey = `session:${userId}`;
    const ttl = 86400; // 24 hours
    console.log("Refresh - Setting KV TTL:", ttl, "for key:", sessionKey);
    if (ttl < 60) {
      console.error("KV TTL too low:", ttl);
      return errorResponse("Session configuration error", 500);
    }
    try {
      await env.SESSIONS.put(sessionKey, token, {
        expirationTtl: ttl,
      });
      console.log("Refresh - KV PUT successful");
    } catch (kvError) {
      console.error("Refresh - KV PUT error:", kvError);
      throw kvError;
    }

    // Return user data and token
    const userData: User = {
      id: user.id as string,
      email: user.email as string,
      name: user.name as string,
      avatar: user.avatar as string | undefined,
      created_at: user.created_at as number,
      updated_at: user.updated_at as number,
    };

    const authResponse: AuthResponse = {
      token,
      user: userData,
    };

    return successResponse(authResponse, 200);
  } catch (error) {
    console.error("Token refresh error:", error);
    return errorResponse("Token refresh failed", 500);
  }
}

/**
 * Get current user
 * GET /api/auth/me
 */
export async function handleGetCurrentUser(
  _request: Request,
  env: Env,
  userId: string,
): Promise<Response> {
  try {
    // Get user from database
    const user = await env.DB.prepare(
      "SELECT id, email, name, avatar, created_at, updated_at FROM users WHERE id = ?",
    )
      .bind(userId)
      .first();

    if (!user) {
      return errorResponse("User not found", 404);
    }

    // Return user data
    const userData: User = {
      id: user.id as string,
      email: user.email as string,
      name: user.name as string,
      avatar: user.avatar as string | undefined,
      created_at: user.created_at as number,
      updated_at: user.updated_at as number,
    };

    return successResponse(userData, 200);
  } catch (error) {
    console.error("Get current user error:", error);
    return errorResponse("Failed to get user", 500);
  }
}
