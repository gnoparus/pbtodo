import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react'
import { api, Todo } from '../services/api'

interface TodoContextType {
  todos: Todo[]
  loading: boolean
  error: string | null
  loadTodos: () => Promise<void>
  createTodo: (title: string, description?: string, priority?: 'low' | 'medium' | 'high') => Promise<void>
  updateTodo: (id: string, data: Partial<Todo>) => Promise<void>
  toggleTodoComplete: (id: string, completed: boolean) => Promise<void>
  deleteTodo: (id: string) => Promise<void>
  clearError: () => void
}

const TodoContext = createContext<TodoContextType | undefined>(undefined)
export { TodoContext }

export const useTodos = () => {
  const context = useContext(TodoContext)
  if (context === undefined) {
    throw new Error('useTodos must be used within a TodoProvider')
  }
  return context
}

interface TodoProviderProps {
  children: ReactNode
}

export const TodoProvider: React.FC<TodoProviderProps> = ({ children }) => {
  const [todos, setTodos] = useState<Todo[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadTodos = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const todosData = await api.todos.getAll()
      setTodos(todosData)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load todos'
      setError(message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const createTodo = useCallback(async (
    title: string,
    description?: string,
    priority: 'low' | 'medium' | 'high' = 'medium'
  ) => {
    setLoading(true)
    setError(null)
    try {
      const newTodo = await api.todos.create({
        title,
        description,
        priority,
        completed: false,
      })
      setTodos(prev => [newTodo, ...prev])
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create todo'
      setError(message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const updateTodo = useCallback(async (id: string, data: Partial<Todo>) => {
    setLoading(true)
    setError(null)
    try {
      const updatedTodo = await api.todos.update(id, data)
      setTodos(prev => prev.map(todo =>
        todo.id === id ? updatedTodo : todo
      ))
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update todo'
      setError(message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const toggleTodoComplete = useCallback(async (id: string) => {
    setLoading(true)
    setError(null)
    try {
      const updatedTodo = await api.todos.toggleComplete(id)
      setTodos(prev => prev.map(todo =>
        todo.id === id ? updatedTodo : todo
      ))
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to toggle completion'
      setError(message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const deleteTodo = useCallback(async (id: string) => {
    setLoading(true)
    setError(null)
    try {
      await api.todos.delete(id)
      setTodos(prev => prev.filter(todo => todo.id !== id))
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete todo'
      setError(message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  const value: TodoContextType = {
    todos,
    loading,
    error,
    loadTodos,
    createTodo,
    updateTodo,
    toggleTodoComplete,
    deleteTodo,
    clearError,
  }

  return <TodoContext.Provider value={value}>{children}</TodoContext.Provider>
}
