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
    <BrowserRouter>
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
        description: 'Description',
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

    expect(screen.getByText(/2 todos?/)).toBeInTheDocument()
  })
})
