import PocketBase from 'pocketbase'

const pb = new PocketBase('http://localhost:8090')

// Disable auto-cancellation for better error handling
pb.autoCancellation(false)

export { pb }

// Type definitions for our collections
export interface User {
  id: string
  email: string
  name: string
  avatar?: string
  created: string
  updated: string
}

export interface Todo {
  id: string
  title: string
  description?: string
  completed: boolean
  priority: 'low' | 'medium' | 'high'
  user: string
  created: string
  updated: string
}

// API service functions
export const api = {
  // Authentication
  auth: {
    login: async (email: string, password: string) => {
      return await pb.collection('users').authWithPassword(email, password)
    },
    register: async (email: string, password: string, name: string) => {
      return await pb.collection('users').create({
        email,
        password,
        passwordConfirm: password,
        name,
      })
    },
    logout: () => {
      pb.authStore.clear()
    },
    refresh: async () => {
      return await pb.collection('users').authRefresh()
    },
    requestPasswordReset: async (email: string) => {
      return await pb.collection('users').requestPasswordReset(email)
    },
    resetPassword: async (token: string, password: string, passwordConfirm: string) => {
      return await pb.collection('users').confirmPasswordReset(
        token,
        password,
        passwordConfirm
      )
    },
    getCurrentUser: (): User | null => {
      return pb.authStore.model as User | null
    },
    isAuthenticated: (): boolean => {
      return pb.authStore.isValid
    },
  },

  // Todos
  todos: {
    getAll: async (): Promise<Todo[]> => {
      return await pb.collection('todos').getFullList<Todo>({
        sort: '-created',
      })
    },
    getById: async (id: string): Promise<Todo> => {
      return await pb.collection('todos').getOne<Todo>(id)
    },
    create: async (data: Partial<Todo>): Promise<Todo> => {
      return await pb.collection('todos').create<Todo>(data)
    },
    update: async (id: string, data: Partial<Todo>): Promise<Todo> => {
      return await pb.collection('todos').update<Todo>(id, data)
    },
    delete: async (id: string): Promise<boolean> => {
      return await pb.collection('todos').delete(id)
    },
    toggleComplete: async (id: string, completed: boolean): Promise<Todo> => {
      return await pb.collection('todos').update<Todo>(id, { completed })
    },
  },
}

export default api
