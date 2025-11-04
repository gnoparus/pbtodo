/**
 * TypeScript type definitions for Cloudflare Workers API
 */

// Cloudflare environment bindings
export interface Env {
  // D1 Database
  DB: D1Database;

  // KV Namespaces
  SESSIONS: KVNamespace;
  RATE_LIMITS: KVNamespace;

  // R2 Buckets (optional)
  ASSETS?: R2Bucket;

  // Environment variables
  ENVIRONMENT: string;
  ALLOWED_ORIGINS: string;

  // Secrets (set via wrangler secret put)
  JWT_SECRET: string;
}

// User types
export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  created_at: number;
  updated_at: number;
}

export interface UserWithPassword extends User {
  password_hash: string;
}

export interface CreateUserInput {
  email: string;
  password: string;
  name: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

// Todo types
export interface Todo {
  id: string;
  title: string;
  description?: string;
  completed: boolean;
  priority: 'low' | 'medium' | 'high';
  user_id: string;
  created_at: number;
  updated_at: number;
}

export interface CreateTodoInput {
  title: string;
  description?: string;
  priority: 'low' | 'medium' | 'high';
  completed?: boolean;
}

export interface UpdateTodoInput {
  title?: string;
  description?: string;
  completed?: boolean;
  priority?: 'low' | 'medium' | 'high';
}

// JWT types
export interface JWTPayload {
  userId: string;
  email: string;
  iat: number;
  exp: number;
}

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

// Rate limiting types
export interface RateLimitInfo {
  key: string;
  attempts: number;
  resetAt: number;
  blocked: boolean;
}

export interface RateLimitConfig {
  maxAttempts: number;
  windowMs: number;
  blockDurationMs: number;
}

// Validation types
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

// Request context
export interface RequestContext {
  userId?: string;
  user?: User;
  ip?: string;
  userAgent?: string;
}

// Session types
export interface Session {
  userId: string;
  email: string;
  createdAt: number;
  expiresAt: number;
}
