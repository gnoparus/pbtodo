import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TodoProvider, useTodos } from '../contexts/TodoContext'
import { api, Todo } from '../services/pocketbase'
import { act } from 'react'

// Mock the PocketBase API
vi.mock('../services/pocketbase', () => ({
  api: {
    todos: {
      getAll: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      toggleComplete: vi.fn(),
      delete: vi.fn(),
    },
  },
}))

// Test component that uses the todos hook
const TestComponent = () => {
  const {
    todos,
    loading,
    error,
    loadTodos,
    createTodo,
    toggleTodoComplete,
    deleteTodo,
    clearError,
  } = useTodos()

  const handleLoadTodos = async () => {
    try {
      await loadTodos()
    } catch {
      // Error is handled by context
    }
  }

  const handleCreateTodo = async () => {
    try {
      await createTodo('New Todo', 'Description', 'medium')
    } catch {
      // Error is handled by context
    }
  }

  const handleToggleTodo = async (id: string, completed: boolean) => {
    try {
      await toggleTodoComplete(id, completed)
    } catch {
      // Error is handled by context
    }
  }

  const handleDeleteTodo = async (id: string) => {
    try {
      await deleteTodo(id)
    } catch {
      // Error is handled by context
    }
  }

  return (
    <div>
      <div data-testid="loading">{loading ? 'Loading' : 'Not Loading'}</div>
      <div data-testid="error">{error || 'No Error'}</div>
      <div data-testid="todo-count">{todos.length}</div>

      <button onClick={handleLoadTodos}>Load Todos</button>
      <button onClick={handleCreateTodo}>Create Todo</button>
      <button onClick={clearError}>Clear Error</button>

      <ul data-testid="todo-list">
        {todos.map(todo => (
          <li key={todo.id} data-testid={`todo-${todo.id}`}>
            <span data-testid={`todo-title-${todo.id}`}>{todo.title}</span>
            <span data-testid={`todo-completed-${todo.id}`}>
              {todo.completed ? 'Completed' : 'Active'}
            </span>
            <button
              onClick={() => handleToggleTodo(todo.id, !todo.completed)}
              data-testid={`toggle-${todo.id}`}
            >
              Toggle
            </button>
            <button
              onClick={() => handleDeleteTodo(todo.id)}
              data-testid={`delete-${todo.id}`}
            >
              Delete
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}

const renderWithProvider = () => {
  return render(
    <TodoProvider>
      <TestComponent />
    </TodoProvider>
  )
}

const createMockTodo = (overrides: Partial<Todo> = {}): Todo => ({
  id: Math.random().toString(36).substring(7),
  title: 'Test Todo',
  description: 'Test Description',
  completed: false,
  priority: 'medium',
  user: 'user123',
  created: new Date().toISOString(),
  updated: new Date().toISOString(),
  ...overrides,
})

describe('Optimistic Updates - Current Behavior (Non-Optimistic)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(api.todos.getAll).mockResolvedValue([])
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Create Todo - Current Behavior', () => {
    it('should show loading state before todo appears in list', async () => {
      const user = userEvent.setup()
      const newTodo = createMockTodo({ id: 'new-1', title: 'New Todo' })

      // Simulate API delay
      vi.mocked(api.todos.create).mockImplementation(() =>
        new Promise(resolve => setTimeout(() => resolve(newTodo), 100))
      )

      renderWithProvider()

      // Initially not loading, no todos
      expect(screen.getByTestId('loading')).toHaveTextContent('Not Loading')
      expect(screen.getByTestId('todo-count')).toHaveTextContent('0')

      // Click create
      await user.click(screen.getByText('Create Todo'))

      // Should show loading immediately
      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('Loading')
      })

      // Todo should NOT appear immediately (non-optimistic)
      expect(screen.getByTestId('todo-count')).toHaveTextContent('0')
      expect(screen.queryByTestId('todo-new-1')).not.toBeInTheDocument()

      // After API completes, todo appears
      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('Not Loading')
        expect(screen.getByTestId('todo-count')).toHaveTextContent('1')
        expect(screen.getByTestId('todo-new-1')).toBeInTheDocument()
      })
    })

    it('should not show todo in list if API call fails', async () => {
      const user = userEvent.setup()
      vi.mocked(api.todos.create).mockRejectedValue(new Error('Network error'))

      renderWithProvider()

      await user.click(screen.getByText('Create Todo'))

      // Wait for operation to complete
      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('Not Loading')
      })

      // Todo should not appear
      expect(screen.getByTestId('todo-count')).toHaveTextContent('0')

      // Error should be shown (TodoContext passes through the error message directly)
      expect(screen.getByTestId('error')).toHaveTextContent('Network error')
    })

    it('should allow multiple creates to queue up', async () => {
      const user = userEvent.setup()
      const todos = [
        createMockTodo({ id: 'new-1' }),
        createMockTodo({ id: 'new-2' }),
      ]

      let createCount = 0
      vi.mocked(api.todos.create).mockImplementation(() =>
        Promise.resolve(todos[createCount++])
      )

      renderWithProvider()

      // First create
      await user.click(screen.getByText('Create Todo'))

      // Second create (context doesn't block this)
      await user.click(screen.getByText('Create Todo'))

      // Both should have been called
      await waitFor(() => {
        expect(api.todos.create).toHaveBeenCalledTimes(2)
      })

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('Not Loading')
        expect(screen.getByTestId('todo-count')).toHaveTextContent('2')
      })
    })
  })

  describe('Toggle Complete - Current Behavior', () => {
    it('should show loading state before completion status changes', async () => {
      const user = userEvent.setup()
      const todo = createMockTodo({ id: 'todo-1', completed: false })
      const updatedTodo = { ...todo, completed: true }

      vi.mocked(api.todos.getAll).mockResolvedValue([todo])
      vi.mocked(api.todos.toggleComplete).mockImplementation(() =>
        new Promise(resolve => setTimeout(() => resolve(updatedTodo), 100))
      )

      renderWithProvider()

      // Load initial todos
      await user.click(screen.getByText('Load Todos'))
      await waitFor(() => {
        expect(screen.getByTestId('todo-todo-1')).toBeInTheDocument()
        expect(screen.getByTestId('todo-completed-todo-1')).toHaveTextContent('Active')
      })

      // Toggle completion
      await user.click(screen.getByTestId('toggle-todo-1'))

      // Should show loading
      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('Loading')
      })

      // Status should NOT change immediately (non-optimistic)
      expect(screen.getByTestId('todo-completed-todo-1')).toHaveTextContent('Active')

      // After API completes, status changes
      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('Not Loading')
        expect(screen.getByTestId('todo-completed-todo-1')).toHaveTextContent('Completed')
      })
    })

    it('should not change completion status if API call fails', async () => {
      const user = userEvent.setup()
      const todo = createMockTodo({ id: 'todo-1', completed: false })

      vi.mocked(api.todos.getAll).mockResolvedValue([todo])
      vi.mocked(api.todos.toggleComplete).mockRejectedValue(new Error('Network error'))

      renderWithProvider()

      await user.click(screen.getByText('Load Todos'))
      await waitFor(() => {
        expect(screen.getByTestId('todo-todo-1')).toBeInTheDocument()
      })

      // Initial state
      expect(screen.getByTestId('todo-completed-todo-1')).toHaveTextContent('Active')

      // Toggle completion
      await user.click(screen.getByTestId('toggle-todo-1'))

      // Wait for operation to fail
      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('Not Loading')
      })

      // Status should still be Active
      expect(screen.getByTestId('todo-completed-todo-1')).toHaveTextContent('Active')
      expect(screen.getByTestId('error')).toHaveTextContent('Network error')
    })
  })

  describe('Delete Todo - Current Behavior', () => {
    it('should show loading state before todo is removed from list', async () => {
      const user = userEvent.setup()
      const todo = createMockTodo({ id: 'todo-1' })

      vi.mocked(api.todos.getAll).mockResolvedValue([todo])
      vi.mocked(api.todos.delete).mockImplementation(() =>
        new Promise(resolve => setTimeout(() => resolve(), 100))
      )

      renderWithProvider()

      await user.click(screen.getByText('Load Todos'))
      await waitFor(() => {
        expect(screen.getByTestId('todo-todo-1')).toBeInTheDocument()
      })

      // Delete todo
      await user.click(screen.getByTestId('delete-todo-1'))

      // Should show loading
      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('Loading')
      })

      // Todo should still be visible (non-optimistic)
      expect(screen.getByTestId('todo-todo-1')).toBeInTheDocument()
      expect(screen.getByTestId('todo-count')).toHaveTextContent('1')

      // After API completes, todo is removed
      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('Not Loading')
        expect(screen.queryByTestId('todo-todo-1')).not.toBeInTheDocument()
        expect(screen.getByTestId('todo-count')).toHaveTextContent('0')
      })
    })

    it('should not remove todo from list if API call fails', async () => {
      const user = userEvent.setup()
      const todo = createMockTodo({ id: 'todo-1' })

      vi.mocked(api.todos.getAll).mockResolvedValue([todo])
      vi.mocked(api.todos.delete).mockRejectedValue(new Error('Network error'))

      renderWithProvider()

      await user.click(screen.getByText('Load Todos'))
      await waitFor(() => {
        expect(screen.getByTestId('todo-todo-1')).toBeInTheDocument()
      })

      // Delete todo
      await user.click(screen.getByTestId('delete-todo-1'))

      // Wait for operation to fail
      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('Not Loading')
      })

      // Todo should still be in the list
      expect(screen.getByTestId('todo-todo-1')).toBeInTheDocument()
      expect(screen.getByTestId('todo-count')).toHaveTextContent('1')
      expect(screen.getByTestId('error')).toHaveTextContent('Network error')
    })
  })

  describe('User Experience - Current Behavior', () => {
    it('should show loading spinner during operations', async () => {
      const user = userEvent.setup()
      const newTodo = createMockTodo({ id: 'new-1' })

      vi.mocked(api.todos.create).mockImplementation(() =>
        new Promise(resolve => setTimeout(() => resolve(newTodo), 100))
      )

      renderWithProvider()

      await user.click(screen.getByText('Create Todo'))

      // Loading indicator should be visible
      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('Loading')
      })

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('Not Loading')
      })
    })

    it('should show error state when operation fails', async () => {
      const user = userEvent.setup()
      vi.mocked(api.todos.create).mockRejectedValue(new Error('Server error'))

      renderWithProvider()

      await user.click(screen.getByText('Create Todo'))

      await waitFor(() => {
        expect(screen.getByTestId('error')).toHaveTextContent('Server error')
      })

      // User can clear error
      await user.click(screen.getByText('Clear Error'))
      expect(screen.getByTestId('error')).toHaveTextContent('No Error')
    })

    it('should handle rapid operations by processing them all', async () => {
      const user = userEvent.setup()
      const todos = [
        createMockTodo({ id: 'todo-1' }),
        createMockTodo({ id: 'todo-2' }),
      ]

      vi.mocked(api.todos.getAll).mockResolvedValue(todos)
      vi.mocked(api.todos.delete).mockResolvedValue()

      renderWithProvider()

      await user.click(screen.getByText('Load Todos'))
      await waitFor(() => {
        expect(screen.getByTestId('todo-count')).toHaveTextContent('2')
      })

      // Delete both todos rapidly - context doesn't block concurrent operations
      await user.click(screen.getByTestId('delete-todo-1'))
      await user.click(screen.getByTestId('delete-todo-2'))

      // Both deletes should be processed
      await waitFor(() => {
        expect(api.todos.delete).toHaveBeenCalledTimes(2)
      })

      await waitFor(() => {
        expect(screen.getByTestId('todo-count')).toHaveTextContent('0')
      })
    })
  })
})

describe('Optimistic Updates - Expected Future Behavior (TODO)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(api.todos.getAll).mockResolvedValue([])
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  // NOTE: These tests are currently SKIPPED because optimistic updates are not yet implemented.
  // They serve as specification for the desired behavior when optimistic updates are added.

  describe.skip('Create Todo - Optimistic Behavior (TODO)', () => {
    it('should immediately show new todo in list before API completes', async () => {
      const user = userEvent.setup()
      const newTodo = createMockTodo({ id: 'new-1', title: 'New Todo' })

      let resolveCreate: (value: Todo) => void
      vi.mocked(api.todos.create).mockImplementation(() =>
        new Promise(resolve => {
          resolveCreate = resolve
        })
      )

      renderWithProvider()

      expect(screen.getByTestId('todo-count')).toHaveTextContent('0')

      await user.click(screen.getByText('Create Todo'))

      // Todo should appear immediately with optimistic ID
      await waitFor(() => {
        expect(screen.getByTestId('todo-count')).toHaveTextContent('1')
      })

      // Should have temporary/optimistic ID
      const todoElement = screen.getByTestId(/^todo-/)
      expect(todoElement).toBeInTheDocument()

      // Complete the API call
      act(() => {
        resolveCreate!(newTodo)
      })

      // Todo should still be visible with server ID
      await waitFor(() => {
        expect(screen.getByTestId('todo-new-1')).toBeInTheDocument()
      })
    })

    it('should rollback optimistic create if API call fails', async () => {
      const user = userEvent.setup()
      vi.mocked(api.todos.create).mockRejectedValue(new Error('Network error'))

      renderWithProvider()

      expect(screen.getByTestId('todo-count')).toHaveTextContent('0')

      await user.click(screen.getByText('Create Todo'))

      // Todo should appear immediately
      await waitFor(() => {
        expect(screen.getByTestId('todo-count')).toHaveTextContent('1')
      })

      // After API fails, todo should be removed
      await waitFor(() => {
        expect(screen.getByTestId('todo-count')).toHaveTextContent('0')
        expect(screen.getByTestId('error')).toHaveTextContent('Network error')
      })
    })
  })

  describe.skip('Toggle Complete - Optimistic Behavior (TODO)', () => {
    it('should immediately update completion status before API completes', async () => {
      const user = userEvent.setup()
      const todo = createMockTodo({ id: 'todo-1', completed: false })
      const updatedTodo = { ...todo, completed: true }

      vi.mocked(api.todos.getAll).mockResolvedValue([todo])

      let resolveToggle: (value: Todo) => void
      vi.mocked(api.todos.toggleComplete).mockImplementation(() =>
        new Promise(resolve => {
          resolveToggle = resolve
        })
      )

      renderWithProvider()

      await user.click(screen.getByText('Load Todos'))
      await waitFor(() => {
        expect(screen.getByTestId('todo-completed-todo-1')).toHaveTextContent('Active')
      })

      await user.click(screen.getByTestId('toggle-todo-1'))

      // Status should change immediately (optimistic)
      await waitFor(() => {
        expect(screen.getByTestId('todo-completed-todo-1')).toHaveTextContent('Completed')
      })

      // Should not be loading (optimistic update doesn't block UI)
      expect(screen.getByTestId('loading')).toHaveTextContent('Not Loading')

      // Complete API call
      act(() => {
        resolveToggle!(updatedTodo)
      })

      // Status should remain Completed
      expect(screen.getByTestId('todo-completed-todo-1')).toHaveTextContent('Completed')
    })

    it('should rollback optimistic toggle if API call fails', async () => {
      const user = userEvent.setup()
      const todo = createMockTodo({ id: 'todo-1', completed: false })

      vi.mocked(api.todos.getAll).mockResolvedValue([todo])
      vi.mocked(api.todos.toggleComplete).mockRejectedValue(new Error('Network error'))

      renderWithProvider()

      await user.click(screen.getByText('Load Todos'))
      await waitFor(() => {
        expect(screen.getByTestId('todo-completed-todo-1')).toHaveTextContent('Active')
      })

      await user.click(screen.getByTestId('toggle-todo-1'))

      // Status should change immediately
      await waitFor(() => {
        expect(screen.getByTestId('todo-completed-todo-1')).toHaveTextContent('Completed')
      })

      // After API fails, status should revert
      await waitFor(() => {
        expect(screen.getByTestId('todo-completed-todo-1')).toHaveTextContent('Active')
        expect(screen.getByTestId('error')).toHaveTextContent('Network error')
      })
    })
  })

  describe.skip('Delete Todo - Optimistic Behavior (TODO)', () => {
    it('should immediately remove todo from list before API completes', async () => {
      const user = userEvent.setup()
      const todo = createMockTodo({ id: 'todo-1' })

      vi.mocked(api.todos.getAll).mockResolvedValue([todo])

      let resolveDelete: () => void
      vi.mocked(api.todos.delete).mockImplementation(() =>
        new Promise(resolve => {
          resolveDelete = resolve
        })
      )

      renderWithProvider()

      await user.click(screen.getByText('Load Todos'))
      await waitFor(() => {
        expect(screen.getByTestId('todo-todo-1')).toBeInTheDocument()
      })

      await user.click(screen.getByTestId('delete-todo-1'))

      // Todo should disappear immediately (optimistic)
      await waitFor(() => {
        expect(screen.queryByTestId('todo-todo-1')).not.toBeInTheDocument()
        expect(screen.getByTestId('todo-count')).toHaveTextContent('0')
      })

      // Complete API call
      act(() => {
        resolveDelete!()
      })

      // Todo should remain deleted
      expect(screen.queryByTestId('todo-todo-1')).not.toBeInTheDocument()
    })

    it('should restore deleted todo if API call fails', async () => {
      const user = userEvent.setup()
      const todo = createMockTodo({ id: 'todo-1', title: 'Important Todo' })

      vi.mocked(api.todos.getAll).mockResolvedValue([todo])
      vi.mocked(api.todos.delete).mockRejectedValue(new Error('Network error'))

      renderWithProvider()

      await user.click(screen.getByText('Load Todos'))
      await waitFor(() => {
        expect(screen.getByTestId('todo-todo-1')).toBeInTheDocument()
      })

      await user.click(screen.getByTestId('delete-todo-1'))

      // Todo should disappear immediately
      await waitFor(() => {
        expect(screen.queryByTestId('todo-todo-1')).not.toBeInTheDocument()
      })

      // After API fails, todo should be restored
      await waitFor(() => {
        expect(screen.getByTestId('todo-todo-1')).toBeInTheDocument()
        expect(screen.getByTestId('todo-title-todo-1')).toHaveTextContent('Important Todo')
        expect(screen.getByTestId('error')).toHaveTextContent('Network error')
      })
    })
  })

  describe.skip('Multiple Optimistic Updates (TODO)', () => {
    it('should handle multiple optimistic creates correctly', async () => {
      const user = userEvent.setup()
      const todos = [
        createMockTodo({ id: 'server-1', title: 'Server Todo 1' }),
        createMockTodo({ id: 'server-2', title: 'Server Todo 2' }),
      ]

      let createCount = 0
      vi.mocked(api.todos.create).mockImplementation(() =>
        new Promise(resolve => setTimeout(() => resolve(todos[createCount++]), 100))
      )

      renderWithProvider()

      // Create two todos rapidly
      await user.click(screen.getByText('Create Todo'))
      await user.click(screen.getByText('Create Todo'))

      // Both should appear immediately
      await waitFor(() => {
        expect(screen.getByTestId('todo-count')).toHaveTextContent('2')
      })

      // Wait for both API calls to complete
      await waitFor(() => {
        expect(api.todos.create).toHaveBeenCalledTimes(2)
      }, { timeout: 3000 })
    })

    it('should handle optimistic update followed by another operation', async () => {
      const user = userEvent.setup()
      const todo = createMockTodo({ id: 'todo-1' })

      vi.mocked(api.todos.getAll).mockResolvedValue([todo])
      vi.mocked(api.todos.toggleComplete).mockImplementation((id, completed) =>
        new Promise(resolve =>
          setTimeout(() => resolve({ ...todo, completed }), 100)
        )
      )
      vi.mocked(api.todos.delete).mockImplementation(() =>
        new Promise(resolve => setTimeout(() => resolve(), 100))
      )

      renderWithProvider()

      await user.click(screen.getByText('Load Todos'))
      await waitFor(() => {
        expect(screen.getByTestId('todo-todo-1')).toBeInTheDocument()
      })

      // Toggle complete
      await user.click(screen.getByTestId('toggle-todo-1'))

      // Should update immediately
      await waitFor(() => {
        expect(screen.getByTestId('todo-completed-todo-1')).toHaveTextContent('Completed')
      })

      // Delete while toggle is in-flight
      await user.click(screen.getByTestId('delete-todo-1'))

      // Should disappear immediately
      await waitFor(() => {
        expect(screen.queryByTestId('todo-todo-1')).not.toBeInTheDocument()
      })
    })
  })

  describe.skip('Optimistic Update Performance (TODO)', () => {
    it('should not cause UI blocking during optimistic updates', async () => {
      const user = userEvent.setup()
      const startTime = Date.now()

      vi.mocked(api.todos.create).mockImplementation(() =>
        new Promise(resolve =>
          setTimeout(() => resolve(createMockTodo()), 1000)
        )
      )

      renderWithProvider()

      await user.click(screen.getByText('Create Todo'))

      const optimisticUpdateTime = Date.now() - startTime

      // Optimistic update should happen quickly (< 100ms)
      expect(optimisticUpdateTime).toBeLessThan(100)

      // UI should be responsive
      await waitFor(() => {
        expect(screen.getByTestId('todo-count')).toHaveTextContent('1')
      })
    })
  })
})

describe('Optimistic Updates - Edge Cases', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(api.todos.getAll).mockResolvedValue([])
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Current Behavior - Edge Cases', () => {
    it('should handle slow network without freezing UI', async () => {
      const user = userEvent.setup()
      const newTodo = createMockTodo({ id: 'new-1' })

      // 5 second delay
      vi.mocked(api.todos.create).mockImplementation(() =>
        new Promise(resolve => setTimeout(() => resolve(newTodo), 5000))
      )

      renderWithProvider()

      await user.click(screen.getByText('Create Todo'))

      // Should show loading
      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('Loading')
      })

      // Loading should persist
      await new Promise(resolve => setTimeout(resolve, 100))
      expect(screen.getByTestId('loading')).toHaveTextContent('Loading')
    }, 10000)

    it('should handle API returning different data than expected', async () => {
      const user = userEvent.setup()
      const serverTodo = createMockTodo({
        id: 'server-123',
        title: 'Server Modified Title', // Server modified the title
      })

      vi.mocked(api.todos.create).mockResolvedValue(serverTodo)

      renderWithProvider()

      await user.click(screen.getByText('Create Todo'))

      await waitFor(() => {
        expect(screen.getByTestId('todo-count')).toHaveTextContent('1')
      })

      // Should use server data
      expect(screen.getByTestId('todo-title-server-123')).toHaveTextContent('Server Modified Title')
    })

    it('should handle concurrent operations correctly', async () => {
      const user = userEvent.setup()
      const todo1 = createMockTodo({ id: 'todo-1' })
      const todo2 = createMockTodo({ id: 'todo-2' })

      vi.mocked(api.todos.getAll).mockResolvedValue([todo1, todo2])

      // Both operations resolve at different times
      vi.mocked(api.todos.delete)
        .mockImplementationOnce(() =>
          new Promise(resolve => setTimeout(() => resolve(), 200))
        )
        .mockImplementationOnce(() =>
          new Promise(resolve => setTimeout(() => resolve(), 100))
        )

      renderWithProvider()

      await user.click(screen.getByText('Load Todos'))
      await waitFor(() => {
        expect(screen.getByTestId('todo-count')).toHaveTextContent('2')
      })

      // Delete first todo
      await user.click(screen.getByTestId('delete-todo-1'))

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('Loading')
      })

      // First delete completes
      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('Not Loading')
        expect(screen.getByTestId('todo-count')).toHaveTextContent('1')
      })
    })
  })
})
