/**
 * API Client for Cloudflare Workers Backend
 * Replaces PocketBase SDK with custom REST API client
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8787';

export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  created_at: number;
  updated_at: number;
}

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

interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

interface AuthResponse {
  token: string;
  user: User;
}

/**
 * API Client Class
 */
class ApiClient {
  private token: string | null = null;


  constructor() {
    // Load token from localStorage on initialization
    this.token = localStorage.getItem('authToken');
  }

  /**
   * Make HTTP request with error handling
   */
  private async request<T = any>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    // Add Authorization header if token exists
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const url = `${API_BASE_URL}${endpoint}`;

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      // Handle 204 No Content
      if (response.status === 204) {
        return null as T;
      }

      // Parse JSON response
      let data: ApiResponse<T>;
      try {
        data = await response.json();
      } catch {
        throw new Error('Invalid JSON response from server');
      }

      // Handle error responses
      if (!response.ok) {
        throw new Error(data.error || data.message || `HTTP ${response.status}`);
      }

      // Return the data payload
      return data.data as T;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Network request failed');
    }
  }

  /**
   * Set authentication token
   */
  private setToken(token: string): void {
    this.token = token;
    localStorage.setItem('authToken', token);
  }

  /**
   * Clear authentication token
   */
  private clearToken(): void {
    this.token = null;
    localStorage.removeItem('authToken');
  }

  // ============================================
  // Authentication API
  // ============================================

  auth = {
    /**
     * Register a new user
     */
    register: async (
      email: string,
      password: string,
      name: string
    ): Promise<AuthResponse> => {
      const response = await this.request<AuthResponse>('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({ email, password, name }),
      });

      this.setToken(response.token);
      return response;
    },

    /**
     * Login user
     */
    login: async (email: string, password: string): Promise<AuthResponse> => {
      const response = await this.request<AuthResponse>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });

      this.setToken(response.token);
      return response;
    },

    /**
     * Logout user
     */
    logout: (): void => {
      // Call logout endpoint (fire and forget)
      if (this.token) {
        this.request('/api/auth/logout', { method: 'POST' }).catch(console.error);
      }
      this.clearToken();
    },

    /**
     * Refresh authentication token
     */
    refresh: async (): Promise<AuthResponse> => {
      const response = await this.request<AuthResponse>('/api/auth/refresh', {
        method: 'POST',
      });

      this.setToken(response.token);
      return response;
    },

    /**
     * Get current authenticated user
     */
    getCurrentUser: (): User | null => {
      if (!this.token) {
        return null;
      }

      // Decode JWT payload (without verification - server will verify)
      try {
        const payload = this.token.split('.')[1];
        const decoded = JSON.parse(atob(payload));
        return {
          id: decoded.userId,
          email: decoded.email,
          name: '', // Name not stored in JWT, will be fetched if needed
          created_at: decoded.iat,
          updated_at: decoded.iat,
        };
      } catch {
        return null;
      }
    },

    /**
     * Check if user is authenticated
     */
    isAuthenticated: (): boolean => {
      if (!this.token) {
        return false;
      }

      // Check token expiration
      try {
        const payload = this.token.split('.')[1];
        const decoded = JSON.parse(atob(payload));
        const exp = decoded.exp;

        if (exp && exp * 1000 < Date.now()) {
          // Token expired
          this.clearToken();
          return false;
        }

        return true;
      } catch {
        this.clearToken();
        return false;
      }
    },

    /**
     * Request password reset (placeholder)
     */
    requestPasswordReset: async (_email: string): Promise<void> => {
      // Not implemented in Workers yet, placeholder for compatibility
      console.warn('Password reset not implemented yet');
      await Promise.resolve();
    },

    /**
     * Reset password (placeholder)
     */
    resetPassword: async (
      _token: string,
      _password: string,
      _passwordConfirm: string
    ): Promise<void> => {
      // Not implemented in Workers yet, placeholder for compatibility
      console.warn('Password reset not implemented yet');
      await Promise.resolve();
    },
  };

  // ============================================
  // Todos API
  // ============================================

  todos = {
    /**
     * Get all todos for current user
     */
    getAll: async (): Promise<Todo[]> => {
      return this.request<Todo[]>('/api/todos', {
        method: 'GET',
      });
    },

    /**
     * Get single todo by ID
     */
    getById: async (id: string): Promise<Todo> => {
      return this.request<Todo>(`/api/todos/${id}`, {
        method: 'GET',
      });
    },

    /**
     * Create new todo
     */
    create: async (data: Partial<Todo>): Promise<Todo> => {
      // Prepare todo data
      const todoData: any = {
        title: data.title,
        priority: data.priority || 'medium',
        completed: data.completed !== undefined ? data.completed : false,
      };

      // Add optional description if provided
      if (data.description !== undefined && data.description !== '') {
        todoData.description = data.description;
      }

      return this.request<Todo>('/api/todos', {
        method: 'POST',
        body: JSON.stringify(todoData),
      });
    },

    /**
     * Update todo
     */
    update: async (id: string, data: Partial<Todo>): Promise<Todo> => {
      return this.request<Todo>(`/api/todos/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      });
    },

    /**
     * Delete todo
     */
    delete: async (id: string): Promise<boolean> => {
      await this.request(`/api/todos/${id}`, {
        method: 'DELETE',
      });
      return true;
    },

    /**
     * Toggle todo completion status
     */
    toggleComplete: async (id: string, completed: boolean): Promise<Todo> => {
      return this.request<Todo>(`/api/todos/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ completed }),
      });
    },
  };
}

// Export singleton instance
export const api = new ApiClient();

// Export default for backward compatibility
export default api;
