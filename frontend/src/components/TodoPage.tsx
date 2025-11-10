import React, { useState, useEffect, FormEvent, useCallback, useMemo } from 'react'
import { useTodos } from '../contexts/TodoContext'
import { useAuth } from '../contexts/AuthContext'
import { Todo } from '../services/api'

interface TodoFilters {
  status: 'all' | 'active' | 'completed'
  priority: 'all' | 'low' | 'medium' | 'high'
  searchTerm: string
}

type SortField = 'created_at' | 'updated_at' | 'priority' | 'title'
type SortDirection = 'asc' | 'desc'

const TodoPage: React.FC = () => {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium')
  const [errors, setErrors] = useState<{ title?: string }>({})

  // Advanced functionality state
  const [selectedTodos, setSelectedTodos] = useState<Set<string>>(new Set())
  const [filters, setFilters] = useState<TodoFilters>({
    status: 'all',
    priority: 'all',
    searchTerm: ''
  })
  const [sortField, setSortField] = useState<SortField>('created_at')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
  const [showBulkActions, setShowBulkActions] = useState(false)
  const [showKeyboardShortcuts, setShowKeyboardShortcuts] = useState(false)

  // Inline edit state
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editPriority, setEditPriority] = useState<'low' | 'medium' | 'high'>('medium')
  const [editErrors, setEditErrors] = useState<{ title?: string }>({})

  const {
    todos,
    loading,
    error,
    loadTodos,
    createTodo,
    updateTodo,
    toggleTodoComplete,
    deleteTodo,
    clearError
  } = useTodos()

  const { user } = useAuth()

  useEffect(() => {
    loadTodos()
  }, [loadTodos])

  // Keyboard shortcuts handler
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Ignore shortcuts when typing in input fields
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement) {
      if (e.key === 'Escape') {
        // Clear form on Escape
        setTitle('')
        setDescription('')
        setPriority('medium')
        setErrors({})
        return
      }
      return
    }

    // Global shortcuts
    if (e.key === '?' && !e.shiftKey) {
      e.preventDefault()
      setShowKeyboardShortcuts(prev => !prev)
      return
    }

    if (e.key === 'n' && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
      e.preventDefault()
      document.getElementById('title')?.focus()
      return
    }

    // Bulk action shortcuts
    if (selectedTodos.size > 0) {
      if (e.key === 'Delete') {
        e.preventDefault()
        handleBulkDelete()
        return
      }
      if (e.key === 'Enter') {
        e.preventDefault()
        handleBulkToggleComplete()
        return
      }
      if (e.key === 'Escape') {
        e.preventDefault()
        setSelectedTodos(new Set())
        setShowBulkActions(false)
        return
      }
    }
  }, [selectedTodos])

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  // Memoized filtered and sorted todos
  const filteredAndSortedTodos = useMemo(() => {
    let filtered = todos.filter(todo => {
      // Status filter
      if (filters.status === 'active' && todo.completed) return false
      if (filters.status === 'completed' && !todo.completed) return false

      // Priority filter
      if (filters.priority !== 'all' && todo.priority !== filters.priority) return false

      // Search filter
      if (filters.searchTerm) {
        const searchLower = filters.searchTerm.toLowerCase()
        return todo.title.toLowerCase().includes(searchLower) ||
               (todo.description && todo.description.toLowerCase().includes(searchLower))
      }

      return true
    })

    // Sort todos
    filtered.sort((a, b) => {
      let aValue: any = a[sortField]
      let bValue: any = b[sortField]

      if (sortField === 'priority') {
        const priorityOrder = { high: 3, medium: 2, low: 1 }
        aValue = priorityOrder[a.priority]
        bValue = priorityOrder[b.priority]
      }

      if (sortField === 'title') {
        aValue = a.title.toLowerCase()
        bValue = b.title.toLowerCase()
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1
      return 0
    })

    return filtered
  }, [todos, filters, sortField, sortDirection])

  // Bulk operations
  const handleSelectTodo = useCallback((todoId: string, isSelected: boolean) => {
    setSelectedTodos(prev => {
      const newSet = new Set(prev)
      if (isSelected) {
        newSet.add(todoId)
      } else {
        newSet.delete(todoId)
      }
      return newSet
    })
  }, [])

  const handleSelectAll = useCallback(() => {
    if (selectedTodos.size === filteredAndSortedTodos.length) {
      setSelectedTodos(new Set())
      setShowBulkActions(false)
    } else {
      setSelectedTodos(new Set(filteredAndSortedTodos.map(todo => todo.id)))
      setShowBulkActions(true)
    }
  }, [selectedTodos.size, filteredAndSortedTodos])

  const handleBulkDelete = useCallback(async () => {
    for (const todoId of selectedTodos) {
      await deleteTodo(todoId)
    }
    setSelectedTodos(new Set())
    setShowBulkActions(false)
  }, [selectedTodos, deleteTodo])

  const handleBulkToggleComplete = useCallback(async () => {
    const todosToToggle = filteredAndSortedTodos.filter(todo => selectedTodos.has(todo.id))
    const shouldComplete = !todosToToggle.every(todo => todo.completed)

    for (const todo of todosToToggle) {
      // Only toggle if the todo's completion state differs from the target state
      if (todo.completed !== shouldComplete) {
        await toggleTodoComplete(todo.id)
      }
    }
    setSelectedTodos(new Set())
    setShowBulkActions(false)
  }, [selectedTodos, filteredAndSortedTodos, toggleTodoComplete])

  // Inline edit functions
  const validateEditForm = (): boolean => {
    const newErrors: { title?: string } = {}

    if (!editTitle.trim()) {
      newErrors.title = 'Title is required'
    } else if (editTitle.trim().length < 2) {
      newErrors.title = 'Title must be at least 2 characters'
    } else if (editTitle.trim().length > 100) {
      newErrors.title = 'Title must be less than 100 characters'
    }

    setEditErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const startEdit = useCallback((todo: Todo) => {
    setEditingId(todo.id)
    setEditTitle(todo.title)
    setEditDescription(todo.description || '')
    setEditPriority(todo.priority)
    setEditErrors({})
  }, [])

  const cancelEdit = useCallback(() => {
    setEditingId(null)
    setEditTitle('')
    setEditDescription('')
    setEditPriority('medium')
    setEditErrors({})
  }, [])

  const saveEdit = useCallback(async () => {
    if (!editingId || !validateEditForm()) {
      return
    }

    try {
      await updateTodo(editingId, {
        title: editTitle.trim(),
        description: editDescription.trim() || undefined,
        priority: editPriority,
      })
      cancelEdit()
    } catch (err) {
      // Error is handled by the todo context
    }
  }, [editingId, editTitle, editDescription, editPriority, updateTodo, cancelEdit])

  const handleEditKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      saveEdit()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      cancelEdit()
    }
  }, [saveEdit, cancelEdit])

  const handleSort = useCallback((field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }, [sortField])

  const validateForm = (): boolean => {
    const newErrors: { title?: string } = {}

    if (!title.trim()) {
      newErrors.title = 'Title is required'
    } else if (title.trim().length < 2) {
      newErrors.title = 'Title must be at least 2 characters'
    } else if (title.trim().length > 100) {
      newErrors.title = 'Title must be less than 100 characters'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    try {
      await createTodo(title.trim(), description.trim() || undefined, priority)
      setTitle('')
      setDescription('')
      setPriority('medium')
      setErrors({})
    } catch (err) {
      // Error is handled by the todo context
    }
  }

  // Update bulk actions visibility when selection changes
  useEffect(() => {
    setShowBulkActions(selectedTodos.size > 0)
  }, [selectedTodos])

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800 border-red-200'
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'low':
        return 'bg-green-100 text-green-800 border-green-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return '↕️'
    return sortDirection === 'asc' ? '↑' : '↓'
  }

  return (
    <main className="max-w-4xl mx-auto">
      <div className="mb-8">
        <div className="flex justify-between items-center mb-2">
          <h1 className="text-3xl font-bold text-gray-900">My Todos</h1>
          <button
            onClick={() => setShowKeyboardShortcuts(true)}
            className="text-gray-500 hover:text-gray-700 px-2 py-1 text-sm"
            aria-label="Show keyboard shortcuts"
          >
            ⌨️ Shortcuts
          </button>
        </div>
        <p className="text-gray-600">
          Welcome back, {user?.name}! You have {todos.filter(t => !t.completed).length} active todo{todos.filter(t => !t.completed).length !== 1 ? 's' : ''}
          {todos.filter(t => t.completed).length > 0 && ` and ${todos.filter(t => t.completed).length} completed`}
        </p>
      </div>

      {/* Keyboard Shortcuts Modal */}
      {showKeyboardShortcuts && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowKeyboardShortcuts(false)
            }
          }}
          data-testid="keyboard-shortcuts-backdrop"
        >
          <div className="bg-white rounded-lg p-6 max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold mb-4">Keyboard Shortcuts</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span>n</span><span>Focus new todo input</span></div>
              <div className="flex justify-between"><span>Escape (in form)</span><span>Clear form</span></div>
              <div className="flex justify-between"><span>?</span><span>Show/hide shortcuts</span></div>
              <div className="flex justify-between"><span>Select todos + Delete</span><span>Bulk delete</span></div>
              <div className="flex justify-between"><span>Select todos + Enter</span><span>Bulk toggle complete</span></div>
              <div className="flex justify-between"><span>Escape (with selection)</span><span>Clear selection</span></div>
            </div>
            <button
              onClick={() => setShowKeyboardShortcuts(false)}
              className="mt-4 w-full btn btn-primary"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Bulk Actions Bar */}
      {showBulkActions && (
        <div className="bg-blue-50 border border-blue-200 rounded-md p-4 mb-6">
          <div className="flex items-center justify-between">
            <span className="text-blue-800 font-medium">
              {selectedTodos.size} todo{selectedTodos.size !== 1 ? 's' : ''} selected
            </span>
            <div className="space-x-2">
              <button
                onClick={handleBulkToggleComplete}
                className="btn btn-secondary text-sm"
                disabled={selectedTodos.size === 0}
              >
                Toggle Complete
              </button>
              <button
                onClick={handleBulkDelete}
                className="btn btn-danger text-sm bg-red-600 hover:bg-red-700 text-white"
                disabled={selectedTodos.size === 0}
              >
                Delete Selected
              </button>
              <button
                onClick={() => setSelectedTodos(new Set())}
                className="btn btn-secondary text-sm"
              >
                Clear Selection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Filters and Search */}
      <div className="card mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Filter & Search</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-1">
              Search
            </label>
            <input
              id="search"
              type="text"
              className="input"
              placeholder="Search todos..."
              value={filters.searchTerm}
              onChange={(e) => setFilters(prev => ({ ...prev, searchTerm: e.target.value }))}
            />
          </div>
          <div>
            <label htmlFor="status-filter" className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              id="status-filter"
              className="input"
              value={filters.status}
              onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value as TodoFilters['status'] }))}
            >
              <option value="all">All</option>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
            </select>
          </div>
          <div>
            <label htmlFor="priority-filter" className="block text-sm font-medium text-gray-700 mb-1">
              Priority
            </label>
            <select
              id="priority-filter"
              className="input"
              value={filters.priority}
              onChange={(e) => setFilters(prev => ({ ...prev, priority: e.target.value as TodoFilters['priority'] }))}
            >
              <option value="all">All</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Sort</label>
            <div className="space-y-1">
              <button
                onClick={() => handleSort('created_at')}
                className={`w-full text-left px-2 py-1 text-sm rounded hover:bg-gray-100 ${sortField === 'created_at' ? 'bg-gray-200' : ''}`}
              >
                Created {getSortIcon('created_at')}
              </button>
              <button
                onClick={() => handleSort('priority')}
                className={`w-full text-left px-2 py-1 text-sm rounded hover:bg-gray-100 ${sortField === 'priority' ? 'bg-gray-200' : ''}`}
              >
                Priority {getSortIcon('priority')}
              </button>
              <button
                onClick={() => handleSort('title')}
                className={`w-full text-left px-2 py-1 text-sm rounded hover:bg-gray-100 ${sortField === 'title' ? 'bg-gray-200' : ''}`}
              >
                Title {getSortIcon('title')}
              </button>
            </div>
          </div>
        </div>
        <div className="mt-4 flex justify-between items-center">
          <span className="text-sm text-gray-600">
            Showing {filteredAndSortedTodos.length} of {todos.length} todos
          </span>
          <button
            onClick={() => setFilters({ status: 'all', priority: 'all', searchTerm: '' })}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            Clear Filters
          </button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div
          className="bg-red-50 border border-red-200 rounded-md p-4 mb-6"
          role="alert"
          aria-live="polite"
        >
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3 flex-1">
              <p className="text-sm text-red-800">{error}</p>
            </div>
            <div className="ml-auto pl-3">
              <div className="-mx-1.5 -my-1.5">
                <button
                  onClick={clearError}
                  className="inline-flex bg-red-50 rounded-md p-1.5 text-red-500 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-red-50 focus:ring-red-600"
                  aria-label="Dismiss error"
                >
                  <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path
                      fillRule="evenodd"
                      d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Todo Form */}
      <div className="card mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Create New Todo</h2>
        <form onSubmit={handleSubmit} aria-label="Create new todo">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-1">
              <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
                Todo Title *
              </label>
              <input
                id="title"
                type="text"
                className={`input ${errors.title ? 'border-red-500 focus:ring-red-500' : ''}`}
                placeholder="Enter todo title"
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value)
                  if (errors.title) {
                    setErrors(prev => ({ ...prev, title: undefined }))
                  }
                }}
                onBlur={() => {
                  if (title && title.trim().length < 2) {
                    setErrors(prev => ({ ...prev, title: 'Title must be at least 2 characters' }))
                  }
                }}
                aria-invalid={!!errors.title}
                aria-describedby={errors.title ? 'title-error' : undefined}
              />
              {errors.title && (
                <p id="title-error" className="mt-1 text-sm text-red-600">
                  {errors.title}
                </p>
              )}
            </div>

            <div className="md:col-span-1">
              <label htmlFor="priority" className="block text-sm font-medium text-gray-700 mb-1">
                Priority
              </label>
              <select
                id="priority"
                className="input"
                value={priority}
                onChange={(e) => setPriority(e.target.value as 'low' | 'medium' | 'high')}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
          </div>

          <div className="mt-4">
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              id="description"
              className="input"
              rows={3}
              placeholder="Enter description (optional)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="mt-4">
            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Adding Todo...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Add Todo
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Loading State */}
      {loading && todos.length === 0 && (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading todos...</p>
        </div>
      )}

      {/* Todo Lists */}
      {!loading && todos.length === 0 ? (
        <div className="text-center py-12">
          <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No todos yet</h3>
          <p className="text-gray-600">Create a new todo to get started</p>
        </div>
      ) : filteredAndSortedTodos.length === 0 ? (
        <div className="text-center py-12">
          <h3 className="text-lg font-medium text-gray-900 mb-2">No todos match your filters</h3>
          <p className="text-gray-600">Try adjusting your search or filter criteria</p>
        </div>
      ) : (
        <div>
          {/* Select All Controls */}
          {filteredAndSortedTodos.length > 0 && (
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={selectedTodos.size === filteredAndSortedTodos.length && filteredAndSortedTodos.length > 0}
                  onChange={handleSelectAll}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  aria-label="Select all todos"
                />
                <span className="text-sm text-gray-600">
                  Select all ({filteredAndSortedTodos.length})
                </span>
              </div>
              <span className="text-sm text-gray-600">
                {selectedTodos.size > 0 && `${selectedTodos.size} selected`}
              </span>
            </div>
          )}

          <div className="space-y-3">
            {filteredAndSortedTodos.map(todo => (
              <div
                key={todo.id}
                className={`card hover:shadow-md transition-shadow ${selectedTodos.has(todo.id) ? 'ring-2 ring-blue-500' : ''} ${todo.completed ? 'opacity-75 hover:opacity-100' : ''}`}
              >
                <div className="flex items-start space-x-4">
                  {/* Selection checkbox - for bulk operations */}
                  <div className="flex flex-col items-center pt-1">
                    <input
                      type="checkbox"
                      checked={selectedTodos.has(todo.id)}
                      onChange={(e) => handleSelectTodo(todo.id, e.target.checked)}
                      className="checkbox-selection"
                      aria-label={`Select ${todo.title}`}
                    />
                    <span className="text-xs text-gray-500 mt-1 hidden sm:block">Select</span>
                  </div>

                  {/* Completion checkbox - for marking todo as complete */}
                  <div className="flex flex-col items-center pt-1">
                    <input
                      type="checkbox"
                      checked={todo.completed}
                      onChange={() => toggleTodoComplete(todo.id)}
                      className="checkbox-completion"
                      aria-label={`Mark ${todo.title} as ${todo.completed ? 'active' : 'complete'}`}
                    />
                    <span className="text-xs text-gray-500 mt-1 hidden sm:block">
                      {todo.completed ? 'Done' : 'Do'}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    {editingId === todo.id ? (
                      <div className="space-y-3">
                        <div>
                          <input
                            type="text"
                            className={`w-full input ${editErrors.title ? 'border-red-500 focus:ring-red-500' : ''}`}
                            value={editTitle}
                            onChange={(e) => {
                              setEditTitle(e.target.value)
                              if (editErrors.title) {
                                setEditErrors(prev => ({ ...prev, title: undefined }))
                              }
                            }}
                            onKeyDown={handleEditKeyDown}
                            placeholder="Todo title"
                            autoFocus
                          />
                          {editErrors.title && (
                            <p className="mt-1 text-sm text-red-600">{editErrors.title}</p>
                          )}
                        </div>

                        <div>
                          <textarea
                            className="w-full input"
                            rows={2}
                            value={editDescription}
                            onChange={(e) => setEditDescription(e.target.value)}
                            onKeyDown={handleEditKeyDown}
                            placeholder="Description (optional)"
                          />
                        </div>

                        <div>
                          <select
                            className="input"
                            value={editPriority}
                            onChange={(e) => setEditPriority(e.target.value as 'low' | 'medium' | 'high')}
                          >
                            <option value="low">Low</option>
                            <option value="medium">Medium</option>
                            <option value="high">High</option>
                          </select>
                        </div>

                        <div className="flex space-x-2">
                          <button
                            onClick={saveEdit}
                            disabled={loading}
                            className="btn btn-primary text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Save
                          </button>
                          <button
                            onClick={cancelEdit}
                            className="btn btn-secondary text-sm"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className={`text-lg font-medium text-gray-900 ${todo.completed ? 'line-through text-gray-500' : ''}`}>
                            {todo.title}
                          </h3>
                          {todo.description && (
                            <p className="mt-1 text-sm text-gray-600">{todo.description}</p>
                          )}
                          <div className="mt-2 flex items-center space-x-2">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getPriorityColor(todo.priority)}`}>
                              {todo.priority}
                            </span>
                            <span className="text-xs text-gray-500">
                              Created {new Date(todo.created_at).toLocaleDateString()}
                            </span>
                            {todo.completed && (
                              <span className="text-xs text-gray-500">
                                • Completed {new Date(todo.updated_at).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex space-x-1 ml-2">
                          <button
                            onClick={() => startEdit(todo)}
                            className="text-blue-600 hover:text-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded p-1"
                            aria-label={`Edit ${todo.title}`}
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => deleteTodo(todo.id)}
                            className="text-red-600 hover:text-red-800 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 rounded p-1"
                            aria-label={`Delete ${todo.title}`}
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </main>
  )
}

export default TodoPage
