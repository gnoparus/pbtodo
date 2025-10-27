import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BrowserRouter } from 'react-router-dom'
import { TodoProvider } from '../../contexts/TodoContext'
import { AuthProvider } from '../../contexts/AuthContext'
import TodoPage from '../../components/TodoPage'

// Mock the useTodos hook
vi.mock('../../contexts/TodoContext', async () => {
  const actual = await vi.importActual('../../contexts/TodoContext')
  return {
    ...actual,
    useTodos: vi.fn(),
  }
})

// Mock the useAuth hook
vi.mock('../../contexts/AuthContext', async () => {
  const actual = await vi.importActual('../../contexts/AuthContext')
  return {
    ...actual,
    useAuth: vi.fn(),
  }
})

const { useTodos } = await import('../../contexts/TodoContext')
const { useAuth } = await import('../../contexts/AuthContext')

const renderTodoPage = (todoOverrides = {}, authOverrides = {}) => {
  const mockTodos = {
    todos: [],
    loading: false,
    error: null,
    loadTodos: vi.fn(),
    createTodo: vi.fn(),
    updateTodo: vi.fn(),
    toggleTodoComplete: vi.fn(),
    deleteTodo: vi.fn(),
    clearError: vi.fn(),
    ...todoOverrides,
  }

  const mockAuth = {
    user: { id: '1', name: 'Test User' },
    isAuthenticated: true,
    loading: false,
    error: null,
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
    refreshAuth: vi.fn(),
    clearError: vi.fn(),
    ...authOverrides,
  }

  useTodos.mockReturnValue(mockTodos)
  useAuth.mockReturnValue(mockAuth)

  return render(
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AuthProvider>
        <TodoProvider>
          <TodoPage />
        </TodoProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}

const mockTodos = [
  {
    id: '1',
    title: 'High Priority Task',
    description: 'Important task to complete',
    priority: 'high' as const,
    completed: false,
    created: '2024-01-01T10:00:00Z',
    updated: '2024-01-01T10:00:00Z'
  },
  {
    id: '2',
    title: 'Medium Priority Task',
    description: 'Normal priority task',
    priority: 'medium' as const,
    completed: false,
    created: '2024-01-02T10:00:00Z',
    updated: '2024-01-02T10:00:00Z'
  },
  {
    id: '3',
    title: 'Low Priority Task',
    description: 'Low priority task',
    priority: 'low' as const,
    completed: true,
    created: '2024-01-03T10:00:00Z',
    updated: '2024-01-04T10:00:00Z'
  },
  {
    id: '4',
    title: 'Another High Priority Task',
    description: 'Another important task',
    priority: 'high' as const,
    completed: false,
    created: '2024-01-04T11:00:00Z',
    updated: '2024-01-04T11:00:00Z'
  }
]

describe('TodoPage Functional Tests - Phase 2.3', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Advanced Keyboard Navigation', () => {
    it('should focus title input when "n" key is pressed', async () => {
      const user = userEvent.setup()
      renderTodoPage({ todos: mockTodos })

      // Press 'n' key to focus new todo input
      await user.keyboard('n')

      expect(screen.getByLabelText(/todo title/i)).toHaveFocus()
    })

    it('should clear form when Escape is pressed in title input', async () => {
      const user = userEvent.setup()
      renderTodoPage({ todos: mockTodos })

      const titleInput = screen.getByLabelText(/todo title/i)
      const descriptionInput = screen.getByLabelText(/description/i)

      // Fill out form
      await user.type(titleInput, 'Test Todo')
      await user.type(descriptionInput, 'Test Description')

      // Change priority to high (use ID to target form priority select specifically)
      const prioritySelect = document.getElementById('priority') as HTMLSelectElement
      await user.selectOptions(prioritySelect, 'high')

      // Press Escape to clear form
      await user.keyboard('{Escape}')

      await waitFor(() => {
        expect(titleInput).toHaveValue('')
        expect(descriptionInput).toHaveValue('')
        expect(prioritySelect).toHaveValue('medium')
      })
    })

    it('should show keyboard shortcuts modal when "?" is pressed', async () => {
      const user = userEvent.setup()
      renderTodoPage({ todos: mockTodos })

      // Press '?' key
      await user.keyboard('?')

      expect(screen.getByText('Keyboard Shortcuts')).toBeInTheDocument()
      expect(screen.getByText('Focus new todo input')).toBeInTheDocument()
      expect(screen.getByText('Show/hide shortcuts')).toBeInTheDocument()
    })

    it('should close keyboard shortcuts modal when clicking close button', async () => {
      const user = userEvent.setup()
      renderTodoPage({ todos: mockTodos })

      // Show shortcuts modal
      await user.keyboard('?')
      expect(screen.getByText('Keyboard Shortcuts')).toBeInTheDocument()

      // Click close button
      await user.click(screen.getByRole('button', { name: 'Close' }))

      await waitFor(() => {
        expect(screen.queryByText('Keyboard Shortcuts')).not.toBeInTheDocument()
      })
    })

    it('should close keyboard shortcuts modal when clicking outside', async () => {
      const user = userEvent.setup()
      renderTodoPage({ todos: mockTodos })

      // Show shortcuts modal
      await user.keyboard('?')
      expect(screen.getByText('Keyboard Shortcuts')).toBeInTheDocument()

      // Click outside modal (on backdrop)
      const backdrop = screen.getByTestId('keyboard-shortcuts-backdrop')
      await user.click(backdrop, { clientX: 0, clientY: 0 })

      await waitFor(() => {
        expect(screen.queryByText('Keyboard Shortcuts')).not.toBeInTheDocument()
      })
    })
  })

  describe('Bulk Operations', () => {
    it('should show bulk actions bar when todos are selected', async () => {
      const user = userEvent.setup()
      renderTodoPage({ todos: mockTodos })

      // Find select all checkbox and individual todo checkboxes
      const selectAllCheckbox = screen.getByRole('checkbox', { name: /Select all todos/i })
      const individualSelectCheckboxes = screen.getAllByRole('checkbox', { name: /Select/i })
        .filter(checkbox => checkbox !== selectAllCheckbox)

      // Select first individual todo (not select all)
      await user.click(individualSelectCheckboxes[0])

      expect(screen.getByText((content, element) => {
        return content.includes('1') && content.includes('todo') && content.includes('selected')
      })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Toggle Complete' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Delete Selected' })).toBeInTheDocument()
    })

    it('should select all todos when select all checkbox is clicked', async () => {
      const user = userEvent.setup()
      renderTodoPage({ todos: mockTodos })

      // Click select all checkbox
      const selectAllCheckbox = screen.getByRole('checkbox', { name: /Select all todos/i })
      await user.click(selectAllCheckbox)

      // All individual select checkboxes should be checked
      const individualSelectCheckboxes = screen.getAllByRole('checkbox', { name: /Select/i })
        .filter(checkbox => checkbox !== selectAllCheckbox)
      individualSelectCheckboxes.forEach(checkbox => {
        expect(checkbox).toBeChecked()
      })

      expect(screen.getByText((content, element) => {
        return content.includes('4') && content.includes('todos') && content.includes('selected')
      })).toBeInTheDocument()
    })

    it('should deselect all todos when select all is clicked twice', async () => {
      const user = userEvent.setup()
      renderTodoPage({ todos: mockTodos })

      const selectAllCheckbox = screen.getByRole('checkbox', { name: /Select all todos/i })

      // First click - select all
      await user.click(selectAllCheckbox)
      expect(screen.getByText((content, element) => {
        return content.includes('4') && content.includes('todos') && content.includes('selected')
      })).toBeInTheDocument()

      // Second click - deselect all
      await user.click(selectAllCheckbox)
      expect(screen.queryByText((content, element) => {
        return content.includes('selected') && content.includes('todos')
      })).not.toBeInTheDocument()

      const selectCheckboxes = screen.getAllByRole('checkbox', { name: /Select/i })
      selectCheckboxes.forEach(checkbox => {
        expect(checkbox).not.toBeChecked()
      })
    })

    it('should perform bulk delete operation', async () => {
      const mockDeleteTodo = vi.fn()
      const user = userEvent.setup()
      renderTodoPage({ todos: mockTodos, deleteTodo: mockDeleteTodo })

      // Select specific todos (filter out select all checkbox)
      const selectAllCheckbox = screen.getByRole('checkbox', { name: /Select all todos/i })
      const individualSelectCheckboxes = screen.getAllByRole('checkbox', { name: /Select/i })
        .filter(checkbox => checkbox !== selectAllCheckbox)

      await user.click(individualSelectCheckboxes[0]) // Select first todo (id: '1')
      await user.click(individualSelectCheckboxes[3]) // Select fourth todo (id: '4')

      // Click bulk delete
      await user.click(screen.getByRole('button', { name: 'Delete Selected' }))

      expect(mockDeleteTodo).toHaveBeenCalledWith('1')
      expect(mockDeleteTodo).toHaveBeenCalledWith('4')
    })

    it('should perform bulk toggle complete operation', async () => {
      const mockToggleTodoComplete = vi.fn()
      const user = userEvent.setup()
      renderTodoPage({ todos: mockTodos, toggleTodoComplete: mockToggleTodoComplete })

      // Select first two todos (both incomplete) - filter out select all checkbox
      const selectAllCheckbox = screen.getByRole('checkbox', { name: /Select all todos/i })
      const individualSelectCheckboxes = screen.getAllByRole('checkbox', { name: /Select/i })
        .filter(checkbox => checkbox !== selectAllCheckbox)

      await user.click(individualSelectCheckboxes[0]) // Select first todo (id: '4' - newest)
      await user.click(individualSelectCheckboxes[1]) // Select second todo (id: '3' - second newest)

      // Click bulk toggle complete
      await user.click(screen.getByRole('button', { name: 'Toggle Complete' }))

      expect(mockToggleTodoComplete).toHaveBeenCalledWith('4', true) // Should complete them
      expect(mockToggleTodoComplete).toHaveBeenCalledWith('3', true)
    })

    it('should clear selection when clear selection button is clicked', async () => {
      const user = userEvent.setup()
      renderTodoPage({ todos: mockTodos })

      // Select some todos - filter out select all checkbox
      const selectAllCheckbox = screen.getByRole('checkbox', { name: /Select all todos/i })
      const individualSelectCheckboxes = screen.getAllByRole('checkbox', { name: /Select/i })
        .filter(checkbox => checkbox !== selectAllCheckbox)

      await user.click(individualSelectCheckboxes[0])
      await user.click(individualSelectCheckboxes[1])

      expect(screen.getByText((content, element) => {
        return content.includes('2') && content.includes('todos') && content.includes('selected')
      })).toBeInTheDocument()

      // Click clear selection
      await user.click(screen.getByRole('button', { name: 'Clear Selection' }))

      expect(screen.queryByText((content, element) => {
        return content.includes('selected') && content.includes('todos')
      })).not.toBeInTheDocument()
      individualSelectCheckboxes.forEach(checkbox => {
        expect(checkbox).not.toBeChecked()
      })
    })

    it('should handle keyboard shortcuts for bulk operations', async () => {
      const mockDeleteTodo = vi.fn()
      const mockToggleTodoComplete = vi.fn()
      const user = userEvent.setup()
      renderTodoPage({ todos: mockTodos, deleteTodo: mockDeleteTodo, toggleTodoComplete: mockToggleTodoComplete })

      // Select first todo - filter out select all checkbox
      const selectAllCheckbox = screen.getByRole('checkbox', { name: /Select all todos/i })
      const individualSelectCheckboxes = screen.getAllByRole('checkbox', { name: /Select/i })
        .filter(checkbox => checkbox !== selectAllCheckbox)

      const selectCheckbox = individualSelectCheckboxes[0]
      await user.click(selectCheckbox)

      expect(screen.getByText((content, element) => {
        return content.includes('1') && content.includes('todo') && content.includes('selected')
      })).toBeInTheDocument()

      // Move focus away from the checkbox so keyboard shortcuts work
      await user.click(document.body) // Click body to remove focus from checkbox

      // Press Delete key for bulk delete
      await user.keyboard('{Delete}')

      expect(mockDeleteTodo).toHaveBeenCalledWith('4') // First todo in sorted order

      // Select todo again and press Enter for bulk toggle
      await user.click(selectCheckbox)
      await user.click(document.body) // Click body to remove focus from checkbox
      await user.keyboard('{Enter}')

      expect(mockToggleTodoComplete).toHaveBeenCalled()

      // Press Escape to clear selection
      await user.keyboard('{Escape}')

      expect(screen.queryByText((content, element) => {
        return content.includes('selected') && content.includes('todos')
      })).not.toBeInTheDocument()
    })
  })

  describe('Filtering and Search', () => {
    it('should filter todos by search term', async () => {
      const user = userEvent.setup()
      renderTodoPage({ todos: mockTodos })

      // Search for "High"
      const searchInput = screen.getByPlaceholderText('Search todos...')
      await user.type(searchInput, 'High')

      // Should show only high priority tasks
      expect(screen.getByText('High Priority Task')).toBeInTheDocument()
      expect(screen.getByText('Another High Priority Task')).toBeInTheDocument()
      expect(screen.queryByText('Medium Priority Task')).not.toBeInTheDocument()
    })

    it('should filter todos by status', async () => {
      const user = userEvent.setup()
      renderTodoPage({ todos: mockTodos })

      // Filter by active todos
      const statusFilter = document.getElementById('status-filter') as HTMLSelectElement
      await user.selectOptions(statusFilter, 'active')

      expect(screen.getByText('High Priority Task')).toBeInTheDocument()
      expect(screen.getByText('Medium Priority Task')).toBeInTheDocument()
      expect(screen.queryByText('Low Priority Task')).not.toBeInTheDocument() // This is completed
    })

    it('should filter todos by priority', async () => {
      const user = userEvent.setup()
      renderTodoPage({ todos: mockTodos })

      // Filter by high priority
      const priorityFilter = document.getElementById('priority-filter') as HTMLSelectElement
      await user.selectOptions(priorityFilter, 'high')

      expect(screen.getByText('High Priority Task')).toBeInTheDocument()
      expect(screen.getByText('Another High Priority Task')).toBeInTheDocument()
      expect(screen.queryByText('Medium Priority Task')).not.toBeInTheDocument()
      expect(screen.queryByText('Low Priority Task')).not.toBeInTheDocument()
    })

    it('should combine multiple filters', async () => {
      const user = userEvent.setup()
      renderTodoPage({ todos: mockTodos })

      // Search for "Task" and filter by high priority
      await user.type(screen.getByPlaceholderText('Search todos...'), 'Task')
      await user.selectOptions(document.getElementById('status-filter') as HTMLSelectElement, 'active')
      const priorityFilter = document.getElementById('priority-filter') as HTMLSelectElement
      await user.selectOptions(priorityFilter, 'high')

      expect(screen.getByText('High Priority Task')).toBeInTheDocument()
      expect(screen.getByText('Another High Priority Task')).toBeInTheDocument()
      expect(screen.queryByText('Medium Priority Task')).not.toBeInTheDocument()
    })

    it('should clear all filters when clear filters button is clicked', async () => {
      const user = userEvent.setup()
      renderTodoPage({ todos: mockTodos })

      // Apply filters
      await user.type(screen.getByPlaceholderText('Search todos...'), 'High')
      await user.selectOptions(document.getElementById('status-filter') as HTMLSelectElement, 'active')
      const priorityFilter = document.getElementById('priority-filter') as HTMLSelectElement
      await user.selectOptions(priorityFilter, 'high')

      // Click clear filters
      await user.click(screen.getByRole('button', { name: 'Clear Filters' }))

      await waitFor(() => {
        expect(screen.getByPlaceholderText('Search todos...')).toHaveValue('')
        expect(document.getElementById('status-filter')).toHaveValue('all')
        const priorityFilter = document.getElementById('priority-filter') as HTMLSelectElement
        expect(priorityFilter).toHaveValue('all')
      })

      // All todos should be visible again
      expect(screen.getByText('High Priority Task')).toBeInTheDocument()
      expect(screen.getByText('Medium Priority Task')).toBeInTheDocument()
      expect(screen.getByText('Low Priority Task')).toBeInTheDocument()
    })

    it('should show correct todo count after filtering', async () => {
      const user = userEvent.setup()
      renderTodoPage({ todos: mockTodos })

      // Filter by high priority
      const priorityFilter = document.getElementById('priority-filter') as HTMLSelectElement
      await user.selectOptions(priorityFilter, 'high')

      expect(screen.getByText('Showing 2 of 4 todos')).toBeInTheDocument()
    })

    it('should show no results message when no todos match filters', async () => {
      const user = userEvent.setup()
      renderTodoPage({ todos: mockTodos })

      // Search for non-existent term
      await user.type(screen.getByPlaceholderText('Search todos...'), 'NonExistent')

      expect(screen.getByText('No todos match your filters')).toBeInTheDocument()
      expect(screen.getByText('Try adjusting your search or filter criteria')).toBeInTheDocument()
    })
  })

  describe('Sorting and Pagination', () => {
    it('should sort todos by created date', async () => {
      const user = userEvent.setup()
      renderTodoPage({ todos: mockTodos })

      // Click sort by created
      await user.click(screen.getByRole('button', { name: /Created/i }))

      const todoElements = screen.getAllByText(/Priority Task/)
      expect(todoElements[0]).toHaveTextContent('Another High Priority Task') // 2024-01-04
      expect(todoElements[1]).toHaveTextContent('Low Priority Task') // 2024-01-03
    })

    it('should sort todos by priority', async () => {
      const user = userEvent.setup()
      renderTodoPage({ todos: mockTodos })

      // Click sort by priority
      await user.click(screen.getByRole('button', { name: /Priority/i }))

      const todoElements = screen.getAllByText(/Priority Task/)
      // High priority should come first
      expect(todoElements[0]).toHaveTextContent('High Priority Task')
      expect(todoElements[1]).toHaveTextContent('Another High Priority Task')
    })

    it('should sort todos by title', async () => {
      const user = userEvent.setup()
      renderTodoPage({ todos: mockTodos })

      // Click sort by title
      await user.click(screen.getByRole('button', { name: /Title/i }))

      const todoElements = screen.getAllByText(/Priority Task/)
      expect(todoElements[0]).toHaveTextContent('Another High Priority Task') // A...
      expect(todoElements[1]).toHaveTextContent('High Priority Task') // H...
      expect(todoElements[2]).toHaveTextContent('Low Priority Task') // L...
      expect(todoElements[3]).toHaveTextContent('Medium Priority Task') // M...
    })

    it('should toggle sort direction when clicking same field', async () => {
      const user = userEvent.setup()
      renderTodoPage({ todos: mockTodos })

      const createdSortButton = screen.getByRole('button', { name: /Created/i })

      // First click - should show descending (newest first)
      await user.click(createdSortButton)
      expect(createdSortButton).toHaveTextContent('Created ↓')

      // Second click - should show ascending (oldest first)
      await user.click(createdSortButton)
      expect(createdSortButton).toHaveTextContent('Created ↑')
    })
  })

  describe('Complex User Workflows', () => {
    it('should handle complete workflow: search, filter, sort, select, and bulk action', async () => {
      const mockDeleteTodo = vi.fn()
      const user = userEvent.setup()
      renderTodoPage({ todos: mockTodos, deleteTodo: mockDeleteTodo })

      // Step 1: Search for "Task"
      await user.type(screen.getByPlaceholderText('Search todos...'), 'Task')

      // Step 2: Filter by active status
      await user.selectOptions(screen.getByDisplayValue('All'), 'active')

      // Step 3: Sort by priority (high first)
      await user.click(screen.getByRole('button', { name: /Priority/i }))

      // Step 4: Select all high priority active todos
      const selectCheckboxes = screen.getAllByRole('checkbox', { name: /Select/i })
      await user.click(selectCheckboxes[0]) // First high priority
      await user.click(selectCheckboxes[1]) // Second high priority

      // Step 5: Perform bulk delete
      await user.click(screen.getByRole('button', { name: 'Delete Selected' }))

      expect(mockDeleteTodo).toHaveBeenCalledTimes(2)
    })

    it('should handle workflow with keyboard shortcuts only', async () => {
      const mockCreateTodo = vi.fn().mockResolvedValue(undefined)
      const mockToggleTodoComplete = vi.fn()
      const user = userEvent.setup()
      renderTodoPage({
        todos: mockTodos,
        createTodo: mockCreateTodo,
        toggleTodoComplete: mockToggleTodoComplete
      })

      // Step 1: Press 'n' to focus new todo input
      await user.keyboard('n')
      expect(screen.getByLabelText(/todo title/i)).toHaveFocus()

      // Step 2: Fill out form
      const titleInput = screen.getByLabelText(/todo title/i)
      await user.type(titleInput, 'New Task from Keyboard')

      const descriptionInput = screen.getByLabelText(/description/i)
      await user.type(descriptionInput, 'Created using keyboard shortcuts')

      // Step 3: Submit form
      await user.click(screen.getByRole('button', { name: 'Add Todo' }))

      expect(mockCreateTodo).toHaveBeenCalledWith('New Task from Keyboard', 'Created using keyboard shortcuts', 'medium')

      // Step 4: Select a todo and complete it with keyboard
      const selectCheckbox = screen.getAllByRole('checkbox', { name: /Select/i })[0]
      await user.click(selectCheckbox)

      await user.keyboard('{Enter}') // Bulk complete
      expect(mockToggleTodoComplete).toHaveBeenCalled()
    })

    it('should handle edge case: no todos with filters applied then create new todo', async () => {
      const mockCreateTodo = vi.fn().mockResolvedValue(undefined)
      const user = userEvent.setup()
      renderTodoPage({ todos: mockTodos, createTodo: mockCreateTodo })

      // Apply filter that shows no results
      await user.type(screen.getByPlaceholderText('Search todos...'), 'NonExistent')

      // Verify no results
      expect(screen.getByText('No todos match your filters')).toBeInTheDocument()

      // Create new todo (should still work)
      await user.click(screen.getByRole('button', { name: /Shortcuts/i })) // Focus on shortcuts button
      await user.keyboard('{Escape}') // Close shortcuts modal if open

      // Create new todo using keyboard shortcut
      await user.keyboard('n') // Focus title input
      const titleInput = screen.getByLabelText(/todo title/i)
      await user.type(titleInput, 'New Todo')

      await user.click(screen.getByRole('button', { name: 'Add Todo' }))

      expect(mockCreateTodo).toHaveBeenCalledWith('New Todo', '', 'medium')
    })

    it('should handle rapid state changes without errors', async () => {
      const mockToggleTodoComplete = vi.fn()
      const user = userEvent.setup()
      renderTodoPage({ todos: mockTodos, toggleTodoComplete: mockToggleTodoComplete })

      // Rapidly change filters
      // Apply filters
      await user.selectOptions(document.getElementById('status-filter') as HTMLSelectElement, 'active')
      const priorityFilter = document.getElementById('priority-filter') as HTMLSelectElement
      await user.selectOptions(priorityFilter, 'high')
      await user.type(screen.getByPlaceholderText('Search todos...'), 'High')

      // Rapidly change sort
      await user.click(screen.getByRole('button', { name: /Priority/i }))
      await user.click(screen.getByRole('button', { name: /Created/i }))
      await user.click(screen.getByRole('button', { name: /Title/i }))

      // Rapidly select/deselect todos
      const selectCheckboxes = screen.getAllByRole('checkbox', { name: /Select/i })
      for (let i = 0; i < Math.min(3, selectCheckboxes.length); i++) {
        await user.click(selectCheckboxes[i])
        await user.click(selectCheckboxes[i]) // Deselect
      }

      // Verify no errors occurred and UI is consistent
      expect(screen.getByText('Showing 2 of 4 todos')).toBeInTheDocument()
    })

    it('should handle form submission while filters are active', async () => {
      const mockCreateTodo = vi.fn().mockResolvedValue(undefined)
      const user = userEvent.setup()
      renderTodoPage({ todos: mockTodos, createTodo: mockCreateTodo })

      // Apply filters
      await user.selectOptions(document.getElementById('status-filter') as HTMLSelectElement, 'active')

      // Create new todo
      await user.keyboard('n')
      const titleInput = screen.getByLabelText(/todo title/i)
      await user.type(titleInput, 'New Completed Task')

      await user.click(screen.getByRole('button', { name: 'Add Todo' }))

      expect(mockCreateTodo).toHaveBeenCalledWith('New Completed Task', '', 'medium')

      // Verify filters are still applied
      expect(document.getElementById('status-filter')).toHaveValue('completed')
    })
  })

  describe('Accessibility and Error Handling', () => {
    it('should maintain focus management with keyboard shortcuts', async () => {
      const user = userEvent.setup()
      renderTodoPage({ todos: mockTodos })

      // Focus title input
      const titleInput = screen.getByLabelText(/todo title/i)
      await user.click(titleInput)
      expect(titleInput).toHaveFocus()

      // Press Escape to clear form
      await user.keyboard('{Escape}')
      expect(titleInput).toHaveFocus() // Focus should return to input

      // Open keyboard shortcuts
      await user.keyboard('?')
      expect(screen.getByRole('button', { name: 'Close' })).toHaveFocus() // Focus should move to modal
    })

    it('should provide proper ARIA labels for bulk operations', async () => {
      const user = userEvent.setup()
      renderTodoPage({ todos: mockTodos })

      // Select a todo
      const selectCheckbox = screen.getAllByRole('checkbox', { name: /Select/i })[0]
      await user.click(selectCheckbox)

      // Verify bulk actions are properly labeled
      expect(screen.getByRole('button', { name: 'Toggle Complete' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Delete Selected' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Clear Selection' })).toBeInTheDocument()
    })

    it('should handle async operations gracefully', async () => {
      const mockDeleteTodo = vi.fn().mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)))
      const user = userEvent.setup()
      renderTodoPage({ todos: mockTodos, deleteTodo: mockDeleteTodo })

      // Select todo and delete
      const selectCheckbox = screen.getAllByRole('checkbox', { name: /Select/i })[0]
      await user.click(selectCheckbox)

      await user.click(screen.getByRole('button', { name: 'Delete Selected' }))

      // Should not crash and should handle the async operation
      expect(mockDeleteTodo).toHaveBeenCalled()
    })
  })
})
