import { describe, it, expect, vi, beforeEach } from 'vitest'
import { pb } from '../services/pocketbase'

// Mock PocketBase client
const mockRecordService = {
  getFirstListItem: vi.fn(),
  getFullList: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
}

const mockUsersService = {
  authViaEmail: vi.fn(),
  authRefresh: vi.fn(),
  requestPasswordReset: vi.fn(),
  confirmPasswordReset: vi.fn(),
}

// Mock the PocketBase constructor
vi.mock('pocketbase', () => {
  return {
    default: vi.fn(() => ({
      authStore: {
        token: '',
        isValid: false,
        record: null,
        clear: vi.fn(),
      },
      collection: vi.fn(() => mockRecordService),
      users: mockUsersService,
    })),
  }
})

describe('PocketBase Service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Authentication', () => {
    it('should initialize with empty auth state', () => {
      expect(pb.authStore.token).toBe('')
      expect(pb.authStore.isValid).toBe(false)
      expect(pb.authStore.record).toBe(null)
    })

    it('should login with valid credentials', async () => {
      const mockUser = { id: '1', email: 'test@example.com', name: 'Test User' }
      mockUsersService.authViaEmail.mockResolvedValue(mockUser)

      const result = await pb.users.authViaEmail('test@example.com', 'password')

      expect(mockUsersService.authViaEmail).toHaveBeenCalledWith('test@example.com', 'password')
      expect(result).toEqual(mockUser)
    })

    it('should handle login failure', async () => {
      const error = new Error('Invalid credentials')
      mockUsersService.authViaEmail.mockRejectedValue(error)

      await expect(pb.users.authViaEmail('test@example.com', 'wrong')).rejects.toThrow('Invalid credentials')
    })

    it('should refresh authentication token', async () => {
      const mockUser = { id: '1', email: 'test@example.com' }
      mockUsersService.authRefresh.mockResolvedValue(mockUser)

      const result = await pb.users.authRefresh()

      expect(mockUsersService.authRefresh).toHaveBeenCalled()
      expect(result).toEqual(mockUser)
    })

    it('should clear auth state on logout', () => {
      pb.authStore.clear()

      expect(pb.authStore.clear).toHaveBeenCalled()
    })
  })

  describe('Todo Operations', () => {
    const mockTodo = {
      id: '1',
      title: 'Test Todo',
      completed: false,
      user: 'user-id',
      created: '2023-01-01T00:00:00Z',
      updated: '2023-01-01T00:00:00Z',
    }

    it('should fetch todos for authenticated user', async () => {
      const mockTodos = [mockTodo]
      mockRecordService.getFullList.mockResolvedValue(mockTodos)

      const todos = await pb.collection('todos').getFullList()

      expect(pb.collection).toHaveBeenCalledWith('todos')
      expect(todos).toEqual(mockTodos)
    })

    it('should create a new todo', async () => {
      const newTodo = { title: 'New Todo', completed: false }
      mockRecordService.create.mockResolvedValue({ ...newTodo, id: '2' })

      const result = await pb.collection('todos').create(newTodo)

      expect(pb.collection).toHaveBeenCalledWith('todos')
      expect(mockRecordService.create).toHaveBeenCalledWith(newTodo)
      expect(result).toEqual({ ...newTodo, id: '2' })
    })

    it('should update an existing todo', async () => {
      const updatedTodo = { ...mockTodo, title: 'Updated Todo', completed: true }
      mockRecordService.update.mockResolvedValue(updatedTodo)

      const result = await pb.collection('todos').update('1', { title: 'Updated Todo', completed: true })

      expect(pb.collection).toHaveBeenCalledWith('todos')
      expect(mockRecordService.update).toHaveBeenCalledWith('1', { title: 'Updated Todo', completed: true })
      expect(result).toEqual(updatedTodo)
    })

    it('should delete a todo', async () => {
      mockRecordService.delete.mockResolvedValue(true)

      await pb.collection('todos').delete('1')

      expect(pb.collection).toHaveBeenCalledWith('todos')
      expect(mockRecordService.delete).toHaveBeenCalledWith('1')
    })
  })

  describe('Error Handling', () => {
    it('should handle network errors gracefully', async () => {
      const networkError = new Error('Network error')
      mockRecordService.getFullList.mockRejectedValue(networkError)

      await expect(pb.collection('todos').getFullList()).rejects.toThrow('Network error')
    })

    it('should handle validation errors', async () => {
      const validationError = new Error('Validation failed: Title is required')
      mockRecordService.create.mockRejectedValue(validationError)

      await expect(pb.collection('todos').create({})).rejects.toThrow('Validation failed: Title is required')
    })
  })
})
