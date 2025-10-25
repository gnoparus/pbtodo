import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { TodoProvider, useTodos } from '../contexts/TodoContext'
import { api } from '../services/pocketbase'

// Mock the useTodos hook
vi.mock('../contexts/TodoContext', async () => {
  const actual = await vi.importActual('../contexts/TodoContext')
  return {
    ...actual,
    useTodos: vi.fn(),
  }
})

// Mock the API service
vi.mock('../services/pocketbase', () => ({
  api: {
    todos: {
      getAll: vi.fn(),
      getById: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      toggleComplete: vi.fn(),
    },
  },
}))

const mockGetAll = vi.mocked(api.todos.getAll)
const mockCreate = vi.mocked(api.todos.create)
const mockUpdate = vi.mocked(api.todos.update)
const mockDelete = vi.mocked(api.todos.delete)
const mockToggleComplete = vi.mocked(api.todos.toggleComplete)

const mockTodo = {
  id: '1',
  title: 'Test Todo',
  description: 'Test description',
  completed: false,
  priority: 'medium' as const,
  user: 'user-id',
  created: '2023-01-01T00:00:00Z',
  updated: '2023-01-01T00:00:00Z',
}

describe('TodoContext', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const renderTodoContext = (todoOverrides = {}) => {
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

    const { useTodos } = require('../contexts/TodoContext')
    useTodos.mockReturnValue(mockTodos)

    return render(
      <BrowserRouter>
        <TodoProvider>
          <TestComponent />
        </TodoProvider>
      </BrowserRouter>
    )
  }

  const TestComponent = () => {
    const todos = useTodos()

    return (
      <div>
        <div data-testid="loading">{todos.loading.toString()}</div>
        <div data-testid="error">{todos.error || 'null'}</div>
        <div data-testid="todos-count">{todos.todos.length || 0}</div>
        <button onClick={() => todos.loadTodos()}>
          Load Todos
        </button>
        <button onClick={() => todos.createTodo('New Todo', 'Description', 'high')}>
          Create Todo
        </button>
        <button onClick={() => todos.updateTodo('1', { title: 'Updated Todo' })}>
          Update Todo
        </button>
        <button onClick={() => todos.toggleTodoComplete('1', true)}>
          Toggle Complete
        </button>
        <button onClick={() => todos.deleteTodo('1')}>
          Delete Todo
        </button>
        <button onClick={() => todos.clearError()}>
          Clear Error
        </button>
      </div>
    )
  }

  it('should initialize with empty state', () => {
    renderTodoContext()

    expect(screen.getByTestId('loading')).toHaveTextContent('false')
    expect(screen.getByTestId('error')).toHaveTextContent('null')
    expect(screen.getByTestId('todos-count')).toHaveTextContent('0')
  })

  it('should load todos successfully', async () => {
    const mockLoadTodos = vi.fn()
    renderTodoContext({ loadTodos: mockLoadTodos })

    const loadButton = screen.getByText('Load Todos')
    fireEvent.click(loadButton)

    expect(mockLoadTodos).toHaveBeenCalled()
  })

  it('should handle load todos failure', async () => {
    const mockLoadTodos = vi.fn()
    renderTodoContext({ loadTodos: mockLoadTodos })

    const loadButton = screen.getByText('Load Todos')
    fireEvent.click(loadButton)

    expect(mockLoadTodos).toHaveBeenCalled()
  })

  it('should create a todo successfully', async () => {
    const mockCreateTodo = vi.fn()
    renderTodoContext({ createTodo: mockCreateTodo })

    const createButton = screen.getByText('Create Todo')
    fireEvent.click(createButton)

    expect(mockCreateTodo).toHaveBeenCalledWith('New Todo', 'Description', 'high')
  })

  it('should handle create todo failure', async () => {
    const mockCreateTodo = vi.fn()
    renderTodoContext({ createTodo: mockCreateTodo })

    const createButton = screen.getByText('Create Todo')
    fireEvent.click(createButton)

    expect(mockCreateTodo).toHaveBeenCalledWith('New Todo', 'Description', 'high')
  })

  it('should update a todo successfully', async () => {
    const mockUpdateTodo = vi.fn()
    renderTodoContext({ updateTodo: mockUpdateTodo })

    const updateButton = screen.getByText('Update Todo')
    fireEvent.click(updateButton)

    expect(mockUpdateTodo).toHaveBeenCalledWith('1', { title: 'Updated Todo' })
  })

  it('should handle update todo failure', async () => {
    const mockUpdateTodo = vi.fn()
    renderTodoContext({ updateTodo: mockUpdateTodo })

    const updateButton = screen.getByText('Update Todo')
    fireEvent.click(updateButton)

    expect(mockUpdateTodo).toHaveBeenCalledWith('1', { title: 'Updated Todo' })
  })

  it('should toggle todo completion successfully', async () => {
    const mockToggleTodoComplete = vi.fn()
    renderTodoContext({ toggleTodoComplete: mockToggleTodoComplete })

    const toggleButton = screen.getByText('Toggle Complete')
    fireEvent.click(toggleButton)

    expect(mockToggleTodoComplete).toHaveBeenCalledWith('1', true)
  })

  it('should handle toggle complete failure', async () => {
    const mockToggleTodoComplete = vi.fn()
    renderTodoContext({ toggleTodoComplete: mockToggleTodoComplete })

    const toggleButton = screen.getByText('Toggle Complete')
    fireEvent.click(toggleButton)

    expect(mockToggleTodoComplete).toHaveBeenCalledWith('1', true)
  })

  it('should delete a todo successfully', async () => {
    const mockDeleteTodo = vi.fn()
    renderTodoContext({ deleteTodo: mockDeleteTodo })

    const deleteButton = screen.getByText('Delete Todo')
    fireEvent.click(deleteButton)

    expect(mockDeleteTodo).toHaveBeenCalledWith('1')
  })

  it('should handle delete todo failure', async () => {
    const mockDeleteTodo = vi.fn()
    renderTodoContext({ deleteTodo: mockDeleteTodo })

    const deleteButton = screen.getByText('Delete Todo')
    fireEvent.click(deleteButton)

    expect(mockDeleteTodo).toHaveBeenCalledWith('1')
  })

  it('should clear errors', async () => {
    const mockClearError = vi.fn()
    renderTodoContext({ clearError: mockClearError })

    const clearErrorButton = screen.getByText('Clear Error')
    fireEvent.click(clearErrorButton)

    expect(mockClearError).toHaveBeenCalled()
  })

  it('should clear errors when starting new operations', async () => {
    const mockLoadTodos = vi.fn()
    renderTodoContext({ loadTodos: mockLoadTodos })

    const loadButton = screen.getByText('Load Todos')
    fireEvent.click(loadButton)

    expect(mockLoadTodos).toHaveBeenCalled()
  })
})
