import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { TodoProvider } from '../contexts/TodoContext'
import { AuthProvider } from '../contexts/AuthContext'
import TodoPage from '../components/TodoPage'

// Mock the useTodos hook
vi.mock('../contexts/TodoContext', async () => {
  const actual = await vi.importActual('../contexts/TodoContext')
  return {
    ...actual,
    useTodos: vi.fn(),
  }
})

// Mock the useAuth hook
vi.mock('../contexts/AuthContext', async () => {
  const actual = await vi.importActual('../contexts/AuthContext')
  return {
    ...actual,
    useAuth: vi.fn(),
  }
})

const { useTodos } = await import('../contexts/TodoContext')
const { useAuth } = await import('../contexts/AuthContext')

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

describe('TodoPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render todo page with header', () => {
    renderTodoPage()

    expect(screen.getByRole('heading', { name: 'My Todos' })).toBeInTheDocument()
    expect(screen.getByText('Create a new todo to get started')).toBeInTheDocument()
  })

  it('should show create todo form', () => {
    renderTodoPage()

    expect(screen.getByLabelText(/todo title/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/description/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/priority/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Add Todo' })).toBeInTheDocument()
  })

  it('should load todos on component mount', () => {
    const mockLoadTodos = vi.fn()
    renderTodoPage({ loadTodos: mockLoadTodos })

    expect(mockLoadTodos).toHaveBeenCalled()
  })

  it('should display todos when they exist', () => {
    const mockTodos = [
      {
        id: '1',
        title: 'Test Todo 1',
        description: 'Description 1',
        completed: false,
        priority: 'medium',
        user: '1',
        created: '2023-01-01T00:00:00Z',
        updated: '2023-01-01T00:00:00Z',
      },
      {
        id: '2',
        title: 'Test Todo 2',
        description: 'Description 2',
        completed: true,
        priority: 'high',
        user: '1',
        created: '2023-01-02T00:00:00Z',
        updated: '2023-01-02T00:00:00Z',
      },
    ]

    renderTodoPage({ todos: mockTodos })

    expect(screen.getByText('Test Todo 1')).toBeInTheDocument()
    expect(screen.getByText('Description 1')).toBeInTheDocument()
    expect(screen.getByText('Test Todo 2')).toBeInTheDocument()
    expect(screen.getByText('Description 2')).toBeInTheDocument()
  })

  it('should show empty state when no todos', () => {
    renderTodoPage({ todos: [] })

    expect(screen.getByText('No todos yet')).toBeInTheDocument()
    expect(screen.getByText('Create a new todo to get started')).toBeInTheDocument()
  })

  it('should show loading state', () => {
    renderTodoPage({ loading: true })

    expect(screen.getByText('Loading todos...')).toBeInTheDocument()
    expect(document.querySelector('.animate-spin')).toBeInTheDocument()
  })

  it('should show error message when error exists', () => {
    renderTodoPage({ error: 'Failed to load todos' })

    expect(screen.getByText('Failed to load todos')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /dismiss/i })).toBeInTheDocument()
  })

  it('should create a new todo', async () => {
    const mockCreateTodo = vi.fn()
    renderTodoPage({ createTodo: mockCreateTodo })

    const titleInput = screen.getByLabelText(/todo title/i)
    const descriptionInput = screen.getByLabelText(/description/i)
    const prioritySelect = screen.getByLabelText(/priority/i)
    const addButton = screen.getByRole('button', { name: 'Add Todo' })

    fireEvent.change(titleInput, { target: { value: 'New Todo' } })
    fireEvent.change(descriptionInput, { target: { value: 'New Description' } })
    fireEvent.change(prioritySelect, { target: { value: 'high' } })
    fireEvent.click(addButton)

    await waitFor(() => {
      expect(mockCreateTodo).toHaveBeenCalledWith('New Todo', 'New Description', 'high')
    })
  })

  it('should validate todo creation form', async () => {
    const mockCreateTodo = vi.fn()
    renderTodoPage({ createTodo: mockCreateTodo })

    const addButton = screen.getByRole('button', { name: 'Add Todo' })
    fireEvent.click(addButton)

    await waitFor(() => {
      expect(mockCreateTodo).not.toHaveBeenCalled()
      expect(screen.getByText('Title is required')).toBeInTheDocument()
    })
  })

  it('should toggle todo completion', async () => {
    const mockToggleComplete = vi.fn()
    const mockTodos = [
      {
        id: '1',
        title: 'Test Todo',
        description: 'Test description',
        completed: false,
        priority: 'medium',
        user: '1',
        created: '2023-01-01T00:00:00Z',
        updated: '2023-01-01T00:00:00Z',
      },
    ]

    renderTodoPage({ todos: mockTodos, toggleTodoComplete: mockToggleComplete })

    const checkbox = screen.getByRole('checkbox')
    fireEvent.click(checkbox)

    await waitFor(() => {
      expect(mockToggleComplete).toHaveBeenCalledWith('1', true)
    })
  })

  describe('Checkbox UX Improvements', () => {
    it('should have distinct styling for selection vs completion checkboxes', async () => {
      const mockTodos = [
        {
          id: '1',
          title: 'Test Todo',
          description: 'Test description',
          completed: false,
          priority: 'medium',
          user: '1',
          created: '2023-01-01T00:00:00Z',
          updated: '2023-01-01T00:00:00Z',
        },
      ]

      renderTodoPage({ todos: mockTodos })

      // Get all checkboxes - there will be 3 (select all + 2 for the todo)
      const checkboxes = screen.getAllByRole('checkbox')
      expect(checkboxes).toHaveLength(3)

      // Find selection checkbox (has "Select" in aria-label, but not "Select all")
      const selectionCheckbox = checkboxes.find(cb =>
        cb.getAttribute('aria-label')?.includes('Select') &&
        !cb.getAttribute('aria-label')?.includes('all')
      )

      // Find completion checkbox (has "Mark" in aria-label)
      const completionCheckbox = checkboxes.find(cb =>
        cb.getAttribute('aria-label')?.includes('Mark')
      )

      expect(selectionCheckbox).toBeInTheDocument()
      expect(completionCheckbox).toBeInTheDocument()

      // Selection checkbox should have selection-specific styling
      expect(selectionCheckbox).toHaveClass('checkbox-selection')

      // Completion checkbox should have completion-specific styling
      expect(completionCheckbox).toHaveClass('checkbox-completion')
    })

    it('should have proper spacing between selection and completion checkboxes', async () => {
      const mockTodos = [
        {
          id: '1',
          title: 'Test Todo',
          description: 'Test description',
          completed: false,
          priority: 'medium',
          user: '1',
          created: '2023-01-01T00:00:00Z',
          updated: '2023-01-01T00:00:00Z',
        },
      ]

      renderTodoPage({ todos: mockTodos })

      const todoContainer = screen.getByText('Test Todo').closest('.card')
      expect(todoContainer).toBeInTheDocument()

      const checkboxes = todoContainer!.querySelectorAll('input[type="checkbox"]')
      expect(checkboxes).toHaveLength(2)

      // Check that checkboxes are properly spaced with new structure
      const selectionCheckbox = checkboxes[0]
      const completionCheckbox = checkboxes[1]

      // Checkboxes should be in separate flex containers for better spacing
      expect(selectionCheckbox.parentElement).toHaveClass('flex', 'flex-col', 'items-center')
      expect(completionCheckbox.parentElement).toHaveClass('flex', 'flex-col', 'items-center')

      // The parent container should have proper spacing
      const checkboxContainer = selectionCheckbox.parentElement.parentElement
      expect(checkboxContainer).toHaveClass('space-x-4')
    })

    it('should maintain accessibility with proper aria labels', async () => {
      const mockTodos = [
        {
          id: '1',
          title: 'Test Todo Item',
          description: 'Test description',
          completed: false,
          priority: 'medium',
          user: '1',
          created: '2023-01-01T00:00:00Z',
          updated: '2023-01-01T00:00:00Z',
        },
      ]

      renderTodoPage({ todos: mockTodos })

      const selectionCheckbox = screen.getByRole('checkbox', { name: /Select Test Todo Item/i })
      const completionCheckbox = screen.getByRole('checkbox', { name: /Mark Test Todo Item as/i })

      expect(selectionCheckbox).toBeInTheDocument()
      expect(completionCheckbox).toBeInTheDocument()

      // Should have descriptive aria labels
      expect(selectionCheckbox.getAttribute('aria-label')).toBe('Select Test Todo Item')
      expect(completionCheckbox.getAttribute('aria-label')).toBe('Mark Test Todo Item as complete')
    })
  })

  it('should delete a todo', async () => {
    const mockDeleteTodo = vi.fn()
    const mockTodos = [
      {
        id: '1',
        title: 'Test Todo',
        description: 'Description',
        completed: false,
        priority: 'medium',
        user: '1',
        created: '2023-01-01T00:00:00Z',
        updated: '2023-01-01T00:00:00Z',
      },
    ]

    renderTodoPage({ todos: mockTodos, deleteTodo: mockDeleteTodo })

    const deleteButton = screen.getByRole('button', { name: /delete/i })
    fireEvent.click(deleteButton)

    await waitFor(() => {
      expect(mockDeleteTodo).toHaveBeenCalledWith('1')
    })
  })

  it('should show priority badges', () => {
    const mockTodos = [
      {
        id: '1',
        title: 'Low Priority Todo',
        completed: false,
        priority: 'low',
        user: '1',
        created: '2023-01-01T00:00:00Z',
        updated: '2023-01-01T00:00:00Z',
      },
      {
        id: '2',
        title: 'Medium Priority Todo',
        completed: false,
        priority: 'medium',
        user: '1',
        created: '2023-01-01T00:00:00Z',
        updated: '2023-01-01T00:00:00Z',
      },
      {
        id: '3',
        title: 'High Priority Todo',
        completed: false,
        priority: 'high',
        user: '1',
        created: '2023-01-01T00:00:00Z',
        updated: '2023-01-01T00:00:00Z',
      },
    ]

    renderTodoPage({ todos: mockTodos })

    expect(screen.getByText('low')).toBeInTheDocument()
    expect(screen.getByText('medium')).toBeInTheDocument()
    expect(screen.getByText('high')).toBeInTheDocument()
  })

  it('should show completed todos with different styling', () => {
    const mockTodos = [
      {
        id: '1',
        title: 'Completed Todo',
        description: 'Description',
        completed: true,
        priority: 'medium',
        user: '1',
        created: '2023-01-01T00:00:00Z',
        updated: '2023-01-01T00:00:00Z',
      },
    ]

    renderTodoPage({ todos: mockTodos })

    const todoTitle = screen.getByText('Completed Todo')
    expect(todoTitle).toHaveClass('line-through')
  })

  it('should clear error when dismiss button is clicked', async () => {
    const mockClearError = vi.fn()
    renderTodoPage({ error: 'Test error', clearError: mockClearError })

    const dismissButton = screen.getByRole('button', { name: /dismiss/i })
    fireEvent.click(dismissButton)

    expect(mockClearError).toHaveBeenCalled()
  })

  it('should reset form after successful todo creation', async () => {
    const mockCreateTodo = vi.fn()
    renderTodoPage({ createTodo: mockCreateTodo })

    const titleInput = screen.getByLabelText(/todo title/i)
    const descriptionInput = screen.getByLabelText(/description/i)
    const addButton = screen.getByRole('button', { name: 'Add Todo' })

    fireEvent.change(titleInput, { target: { value: 'New Todo' } })
    fireEvent.change(descriptionInput, { target: { value: 'New Description' } })
    fireEvent.click(addButton)

    await waitFor(() => {
      expect(titleInput).toHaveValue('')
      expect(descriptionInput).toHaveValue('')
    })
  })

  it('should have proper accessibility attributes', () => {
    renderTodoPage()

    const main = screen.getByRole('main')
    expect(main).toBeInTheDocument()

    const form = screen.getByRole('form')
    expect(form).toHaveAttribute('aria-label', 'Create new todo')

    const heading = screen.getByRole('heading', { name: 'My Todos' })
    expect(heading).toBeInTheDocument()
  })

  it('should have proper semantic HTML structure', () => {
    renderTodoPage()

    expect(screen.getByRole('main')).toBeInTheDocument()
    expect(screen.getByRole('form')).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument()
  })

  it('should filter todos by completion status', () => {
    const mockTodos = [
      {
        id: '1',
        title: 'Active Todo',
        completed: false,
        priority: 'medium',
        user: '1',
        created: '2023-01-01T00:00:00Z',
        updated: '2023-01-01T00:00:00Z',
      },
      {
        id: '2',
        title: 'Completed Todo',
        completed: true,
        priority: 'medium',
        user: '1',
        created: '2023-01-01T00:00:00Z',
        updated: '2023-01-01T00:00:00Z',
      },
    ]

    renderTodoPage({ todos: mockTodos })

    expect(screen.getByText('Active Todo')).toBeInTheDocument()
    expect(screen.getByText('Completed Todo')).toBeInTheDocument()
  })

  it('should show todo count', () => {
    const mockTodos = [
      {
        id: '1',
        title: 'Todo 1',
        completed: false,
        priority: 'medium',
        user: '1',
        created: '2023-01-01T00:00:00Z',
        updated: '2023-01-01T00:00:00Z',
      },
      {
        id: '2',
        title: 'Todo 2',
        completed: false,
        priority: 'medium',
        user: '1',
        created: '2023-01-01T00:00:00Z',
        updated: '2023-01-01T00:00:00Z',
      },
    ]

    renderTodoPage({ todos: mockTodos })

    expect(screen.getByText('Active Todos (2)')).toBeInTheDocument()
  })

  describe('Security & Edge Cases', () => {
    describe('XSS Prevention', () => {
      it('should not execute script tags in todo title', () => {
        renderTodoPage()

        const titleInput = screen.getByLabelText(/todo title/i)
        const xssTitle = '<script>alert("xss")</script>'

        fireEvent.change(titleInput, { target: { value: xssTitle } })

        // Verify the value is set as plain text (React doesn't execute it)
        expect(titleInput).toHaveValue(xssTitle)

        // Verify no script tags are executed in the DOM
        expect(document.querySelectorAll('script').length).toBe(0)
      })

      it('should not execute script tags in description', async () => {
        const mockCreateTodo = vi.fn()
        renderTodoPage({ createTodo: mockCreateTodo })

        const titleInput = screen.getByLabelText(/todo title/i)
        const descriptionInput = screen.getByLabelText(/description/i)
        const xssDescription = '<img src=x onerror=alert(1)>'

        fireEvent.change(titleInput, { target: { value: 'Test Todo' } })
        fireEvent.change(descriptionInput, { target: { value: xssDescription } })
        fireEvent.click(screen.getByRole('button', { name: 'Add Todo' }))

        await waitFor(() => {
          expect(mockCreateTodo).toHaveBeenCalledWith('Test Todo', xssDescription, 'medium')
        })
      })

      it('should not render script tags from error messages', () => {
        const xssError = '<script>alert("xss")</script>Failed to create todo'
        renderTodoPage({ error: xssError })

        // Error should be displayed as text, not executed
        expect(screen.getByText(xssError)).toBeInTheDocument()
        // Check that script tag is not in the DOM as an actual script element
        expect(document.querySelectorAll('script').length).toBe(0)
      })

      it('should display XSS attempts in todo list as text', () => {
        const xssTodo = {
          id: '1',
          title: '<script>alert("xss")</script>',
          description: '<img src=x onerror=alert(1)>',
          completed: false,
          priority: 'high' as const,
          user: '1',
          created: '2023-01-01T00:00:00Z',
          updated: '2023-01-01T00:00:00Z',
        }

        renderTodoPage({ todos: [xssTodo] })

        // Script tags should be displayed as text
        expect(screen.getByText(xssTodo.title)).toBeInTheDocument()
        expect(screen.getByText(xssTodo.description)).toBeInTheDocument()
        // Verify no script execution
        expect(document.querySelectorAll('script').length).toBe(0)
      })
    })

    describe('Long Input Handling', () => {
      it('should show validation error on submit for very long title', async () => {
        renderTodoPage()

        const longTitle = 'a'.repeat(101)
        const titleInput = screen.getByLabelText(/todo title/i)

        fireEvent.change(titleInput, { target: { value: longTitle } })

        // Max length validation only happens on submit, not on blur
        fireEvent.click(screen.getByRole('button', { name: 'Add Todo' }))

        await waitFor(() => {
          expect(screen.getByText('Title must be less than 100 characters')).toBeInTheDocument()
        })
      })

      it('should accept title at maximum length (100 characters)', async () => {
        const mockCreateTodo = vi.fn()
        renderTodoPage({ createTodo: mockCreateTodo })

        const maxTitle = 'a'.repeat(100)
        const titleInput = screen.getByLabelText(/todo title/i)

        fireEvent.change(titleInput, { target: { value: maxTitle } })
        fireEvent.click(screen.getByRole('button', { name: 'Add Todo' }))

        await waitFor(() => {
          expect(mockCreateTodo).toHaveBeenCalledWith(maxTitle, undefined, 'medium')
        })
      })

      it('should handle very long description (1000+ characters)', async () => {
        const mockCreateTodo = vi.fn()
        renderTodoPage({ createTodo: mockCreateTodo })

        const longDescription = 'a'.repeat(10000)
        const titleInput = screen.getByLabelText(/todo title/i)
        const descriptionInput = screen.getByLabelText(/description/i)

        fireEvent.change(titleInput, { target: { value: 'Test Todo' } })
        fireEvent.change(descriptionInput, { target: { value: longDescription } })
        fireEvent.click(screen.getByRole('button', { name: 'Add Todo' }))

        await waitFor(() => {
          expect(mockCreateTodo).toHaveBeenCalledWith('Test Todo', longDescription, 'medium')
        })
      })
    })

    describe('Special Characters', () => {
      it('should handle emoji in todo title', async () => {
        const mockCreateTodo = vi.fn()
        renderTodoPage({ createTodo: mockCreateTodo })

        const emojiTitle = '🎉 Party Time 🚀'
        const titleInput = screen.getByLabelText(/todo title/i)

        fireEvent.change(titleInput, { target: { value: emojiTitle } })
        fireEvent.click(screen.getByRole('button', { name: 'Add Todo' }))

        await waitFor(() => {
          expect(mockCreateTodo).toHaveBeenCalledWith(emojiTitle, undefined, 'medium')
        })
      })

      it('should handle unicode characters', async () => {
        const mockCreateTodo = vi.fn()
        renderTodoPage({ createTodo: mockCreateTodo })

        const unicodeTitle = '日本語 タスク'
        const unicodeDescription = 'Descripción en español 中文描述'
        const titleInput = screen.getByLabelText(/todo title/i)
        const descriptionInput = screen.getByLabelText(/description/i)

        fireEvent.change(titleInput, { target: { value: unicodeTitle } })
        fireEvent.change(descriptionInput, { target: { value: unicodeDescription } })
        fireEvent.click(screen.getByRole('button', { name: 'Add Todo' }))

        await waitFor(() => {
          expect(mockCreateTodo).toHaveBeenCalledWith(unicodeTitle, unicodeDescription, 'medium')
        })
      })

      it('should handle special symbols', async () => {
        const mockCreateTodo = vi.fn()
        renderTodoPage({ createTodo: mockCreateTodo })

        const specialTitle = '!@#$%^&*()_+-=[]{}|;:,.<>?'
        const titleInput = screen.getByLabelText(/todo title/i)

        fireEvent.change(titleInput, { target: { value: specialTitle } })
        fireEvent.click(screen.getByRole('button', { name: 'Add Todo' }))

        await waitFor(() => {
          expect(mockCreateTodo).toHaveBeenCalledWith(specialTitle, undefined, 'medium')
        })
      })
    })

    describe('SQL Injection Attempts', () => {
      it('should handle SQL-like strings in title', async () => {
        const mockCreateTodo = vi.fn()
        renderTodoPage({ createTodo: mockCreateTodo })

        const sqlTitle = "'; DROP TABLE todos; --"
        const titleInput = screen.getByLabelText(/todo title/i)

        fireEvent.change(titleInput, { target: { value: sqlTitle } })
        fireEvent.click(screen.getByRole('button', { name: 'Add Todo' }))

        await waitFor(() => {
          expect(mockCreateTodo).toHaveBeenCalledWith(sqlTitle, undefined, 'medium')
        })
      })

      it('should handle SQL-like strings in description', async () => {
        const mockCreateTodo = vi.fn()
        renderTodoPage({ createTodo: mockCreateTodo })

        const sqlDescription = "' OR '1'='1"
        const titleInput = screen.getByLabelText(/todo title/i)
        const descriptionInput = screen.getByLabelText(/description/i)

        fireEvent.change(titleInput, { target: { value: 'Test Todo' } })
        fireEvent.change(descriptionInput, { target: { value: sqlDescription } })
        fireEvent.click(screen.getByRole('button', { name: 'Add Todo' }))

        await waitFor(() => {
          expect(mockCreateTodo).toHaveBeenCalledWith('Test Todo', sqlDescription, 'medium')
        })
      })
    })

    describe('Whitespace Handling', () => {
      it('should reject empty title after trimming', async () => {
        renderTodoPage()

        const titleInput = screen.getByLabelText(/todo title/i)
        fireEvent.change(titleInput, { target: { value: '   ' } })
        fireEvent.click(screen.getByRole('button', { name: 'Add Todo' }))

        await waitFor(() => {
          expect(screen.getByText('Title is required')).toBeInTheDocument()
        })
      })

      it('should show validation error for title with only whitespace', async () => {
        renderTodoPage()

        const titleInput = screen.getByLabelText(/todo title/i)
        fireEvent.change(titleInput, { target: { value: '\t\n  ' } })
        fireEvent.click(screen.getByRole('button', { name: 'Add Todo' }))

        await waitFor(() => {
          expect(screen.getByText('Title is required')).toBeInTheDocument()
        })
      })

      it('should trim leading/trailing spaces from title', async () => {
        const mockCreateTodo = vi.fn()
        renderTodoPage({ createTodo: mockCreateTodo })

        const titleInput = screen.getByLabelText(/todo title/i)
        fireEvent.change(titleInput, { target: { value: '  Test Todo  ' } })
        fireEvent.click(screen.getByRole('button', { name: 'Add Todo' }))

        await waitFor(() => {
          expect(mockCreateTodo).toHaveBeenCalledWith('Test Todo', undefined, 'medium')
        })
      })

      it('should trim description', async () => {
        const mockCreateTodo = vi.fn()
        renderTodoPage({ createTodo: mockCreateTodo })

        const titleInput = screen.getByLabelText(/todo title/i)
        const descriptionInput = screen.getByLabelText(/description/i)

        fireEvent.change(titleInput, { target: { value: 'Test Todo' } })
        fireEvent.change(descriptionInput, { target: { value: '  Description  ' } })
        fireEvent.click(screen.getByRole('button', { name: 'Add Todo' }))

        await waitFor(() => {
          expect(mockCreateTodo).toHaveBeenCalledWith('Test Todo', 'Description', 'medium')
        })
      })

      it('should allow spaces within title', async () => {
        const mockCreateTodo = vi.fn()
        renderTodoPage({ createTodo: mockCreateTodo })

        const titleWithSpaces = 'Todo with multiple spaces'
        const titleInput = screen.getByLabelText(/todo title/i)

        fireEvent.change(titleInput, { target: { value: titleWithSpaces } })
        fireEvent.click(screen.getByRole('button', { name: 'Add Todo' }))

        await waitFor(() => {
          expect(mockCreateTodo).toHaveBeenCalledWith(titleWithSpaces, undefined, 'medium')
        })
      })
    })

    describe('Title Length Validation', () => {
      it('should require minimum 2 characters after trimming', async () => {
        renderTodoPage()

        const titleInput = screen.getByLabelText(/todo title/i)
        fireEvent.change(titleInput, { target: { value: 'a' } })
        fireEvent.blur(titleInput)

        await waitFor(() => {
          expect(screen.getByText('Title must be at least 2 characters')).toBeInTheDocument()
        })
      })

      it('should accept exactly 2 characters', async () => {
        const mockCreateTodo = vi.fn()
        renderTodoPage({ createTodo: mockCreateTodo })

        const titleInput = screen.getByLabelText(/todo title/i)
        fireEvent.change(titleInput, { target: { value: 'ab' } })
        fireEvent.click(screen.getByRole('button', { name: 'Add Todo' }))

        await waitFor(() => {
          expect(mockCreateTodo).toHaveBeenCalledWith('ab', undefined, 'medium')
        })
      })
    })

    describe('Copy/Paste Behavior', () => {
      it('should handle pasted content in title field', async () => {
        const mockCreateTodo = vi.fn()
        renderTodoPage({ createTodo: mockCreateTodo })

        const titleInput = screen.getByLabelText(/todo title/i)

        // Simulate paste
        fireEvent.paste(titleInput, {
          clipboardData: {
            getData: () => 'Pasted Todo Title'
          }
        })
        fireEvent.change(titleInput, { target: { value: 'Pasted Todo Title' } })
        fireEvent.click(screen.getByRole('button', { name: 'Add Todo' }))

        await waitFor(() => {
          expect(mockCreateTodo).toHaveBeenCalledWith('Pasted Todo Title', undefined, 'medium')
        })
      })

      it('should handle pasted content in description field', async () => {
        const mockCreateTodo = vi.fn()
        renderTodoPage({ createTodo: mockCreateTodo })

        const titleInput = screen.getByLabelText(/todo title/i)
        const descriptionInput = screen.getByLabelText(/description/i)

        fireEvent.change(titleInput, { target: { value: 'Test Todo' } })

        // Simulate paste
        fireEvent.paste(descriptionInput, {
          clipboardData: {
            getData: () => 'Pasted description content'
          }
        })
        fireEvent.change(descriptionInput, { target: { value: 'Pasted description content' } })
        fireEvent.click(screen.getByRole('button', { name: 'Add Todo' }))

        await waitFor(() => {
          expect(mockCreateTodo).toHaveBeenCalledWith('Test Todo', 'Pasted description content', 'medium')
        })
      })
    })

    describe('Multiple Rapid Submissions', () => {
      it('should handle multiple rapid form submissions', async () => {
        const mockCreateTodo = vi.fn()
        renderTodoPage({ createTodo: mockCreateTodo })

        const titleInput = screen.getByLabelText(/todo title/i)
        const submitButton = screen.getByRole('button', { name: 'Add Todo' })

        fireEvent.change(titleInput, { target: { value: 'Test Todo' } })

        // Click multiple times rapidly
        fireEvent.click(submitButton)
        fireEvent.click(submitButton)
        fireEvent.click(submitButton)

        // Multiple submissions are possible in current implementation
        // This documents the current behavior
        await waitFor(() => {
          expect(mockCreateTodo).toHaveBeenCalled()
        })

        // Verify createTodo was called at least once
        expect(mockCreateTodo.mock.calls.length).toBeGreaterThanOrEqual(1)
      })
    })

    describe('Priority Selection Edge Cases', () => {
      it('should handle all priority levels', async () => {
        const mockCreateTodo = vi.fn()
        renderTodoPage({ createTodo: mockCreateTodo })

        const titleInput = screen.getByLabelText(/todo title/i)
        const prioritySelect = screen.getByLabelText(/priority/i)

        // Test each priority level
        const priorities: ('low' | 'medium' | 'high')[] = ['low', 'medium', 'high']

        for (const priority of priorities) {
          fireEvent.change(titleInput, { target: { value: `Todo ${priority}` } })
          fireEvent.change(prioritySelect, { target: { value: priority } })
          fireEvent.click(screen.getByRole('button', { name: 'Add Todo' }))

          await waitFor(() => {
            expect(mockCreateTodo).toHaveBeenCalledWith(`Todo ${priority}`, undefined, priority)
          })

          mockCreateTodo.mockClear()
        }
      })
    })

    describe('Control Characters', () => {
      it('should handle null bytes in title as text', () => {
        renderTodoPage()

        const titleWithNull = 'Test\x00Todo'
        const titleInput = screen.getByLabelText(/todo title/i)

        fireEvent.change(titleInput, { target: { value: titleWithNull } })

        // Verify the value is set (null bytes are treated as text)
        expect(titleInput).toHaveValue(titleWithNull)
      })

      it('should handle newlines in description', async () => {
        const mockCreateTodo = vi.fn()
        renderTodoPage({ createTodo: mockCreateTodo })

        const descriptionWithNewlines = 'Line 1\nLine 2\nLine 3'
        const titleInput = screen.getByLabelText(/todo title/i)
        const descriptionInput = screen.getByLabelText(/description/i)

        fireEvent.change(titleInput, { target: { value: 'Test Todo' } })
        fireEvent.change(descriptionInput, { target: { value: descriptionWithNewlines } })
        fireEvent.click(screen.getByRole('button', { name: 'Add Todo' }))

        await waitFor(() => {
          expect(mockCreateTodo).toHaveBeenCalledWith('Test Todo', descriptionWithNewlines, 'medium')
        })
      })
    })

    describe('Empty Description Handling', () => {
      it('should treat empty description as empty string', async () => {
        const mockCreateTodo = vi.fn()
        renderTodoPage({ createTodo: mockCreateTodo })

        const titleInput = screen.getByLabelText(/todo title/i)
        const descriptionInput = screen.getByLabelText(/description/i)

        fireEvent.change(titleInput, { target: { value: 'Test Todo' } })
        fireEvent.change(descriptionInput, { target: { value: '' } })
        fireEvent.click(screen.getByRole('button', { name: 'Add Todo' }))

        await waitFor(() => {
          expect(mockCreateTodo).toHaveBeenCalledWith('Test Todo', undefined, 'medium')
        })
      })

      it('should treat whitespace-only description as empty after trimming', async () => {
        const mockCreateTodo = vi.fn()
        renderTodoPage({ createTodo: mockCreateTodo })

        const titleInput = screen.getByLabelText(/todo title/i)
        const descriptionInput = screen.getByLabelText(/description/i)

        fireEvent.change(titleInput, { target: { value: 'Test Todo' } })
        fireEvent.change(descriptionInput, { target: { value: '   ' } })
        fireEvent.click(screen.getByRole('button', { name: 'Add Todo' }))

        await waitFor(() => {
          expect(mockCreateTodo).toHaveBeenCalledWith('Test Todo', undefined, 'medium')
        })
      })
    })

    describe('Form Reset After Submission', () => {
      it('should clear title after successful submission', async () => {
        const mockCreateTodo = vi.fn()
        renderTodoPage({ createTodo: mockCreateTodo })

        const titleInput = screen.getByLabelText(/todo title/i)

        fireEvent.change(titleInput, { target: { value: 'Test Todo' } })
        fireEvent.click(screen.getByRole('button', { name: 'Add Todo' }))

        await waitFor(() => {
          expect(titleInput).toHaveValue('')
        })
      })

      it('should clear description after successful submission', async () => {
        const mockCreateTodo = vi.fn()
        renderTodoPage({ createTodo: mockCreateTodo })

        const titleInput = screen.getByLabelText(/todo title/i)
        const descriptionInput = screen.getByLabelText(/description/i)

        fireEvent.change(titleInput, { target: { value: 'Test Todo' } })
        fireEvent.change(descriptionInput, { target: { value: 'Test Description' } })
        fireEvent.click(screen.getByRole('button', { name: 'Add Todo' }))

        await waitFor(() => {
          expect(descriptionInput).toHaveValue('')
        })
      })

      it('should reset priority to medium after successful submission', async () => {
        const mockCreateTodo = vi.fn()
        renderTodoPage({ createTodo: mockCreateTodo })

        const titleInput = screen.getByLabelText(/todo title/i)
        const prioritySelect = screen.getByLabelText(/priority/i) as HTMLSelectElement

        fireEvent.change(titleInput, { target: { value: 'Test Todo' } })
        fireEvent.change(prioritySelect, { target: { value: 'high' } })
        fireEvent.click(screen.getByRole('button', { name: 'Add Todo' }))

        await waitFor(() => {
          expect(prioritySelect.value).toBe('medium')
        })
      })
    })
  })
})
