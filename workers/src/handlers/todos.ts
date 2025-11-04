/**
 * Todos CRUD handlers for Cloudflare Workers
 * Implements create, read, update, delete operations for todos
 */

import type { Env, Todo, CreateTodoInput, UpdateTodoInput } from "../types";
import {
  validateTodoTitle,
  validateTodoDescription,
  validateTodoPriority,
  parseAndValidateJSON,
  validateRequiredFields,
  isValidUUID,
} from "../utils/validation";
import { generateUUID } from "../utils/crypto";

/**
 * Success response helper
 */
function successResponse(data: any, status: number = 200): Response {
  return new Response(
    JSON.stringify({
      success: true,
      data,
    }),
    {
      status,
      headers: { "Content-Type": "application/json" },
    },
  );
}

/**
 * Error response helper
 */
function errorResponse(error: string, status: number = 400): Response {
  return new Response(
    JSON.stringify({
      success: false,
      error,
    }),
    {
      status,
      headers: { "Content-Type": "application/json" },
    },
  );
}

/**
 * Convert database row to Todo object
 */
function rowToTodo(row: any): Todo {
  return {
    id: row.id as string,
    title: row.title as string,
    description: row.description as string | undefined,
    completed: Boolean(row.completed),
    priority: row.priority as "low" | "medium" | "high",
    user_id: row.user_id as string,
    created_at: row.created_at as number,
    updated_at: row.updated_at as number,
  };
}

/**
 * Get all todos for authenticated user
 * GET /api/todos
 */
export async function handleGetTodos(
  _request: Request,
  env: Env,
  userId: string,
): Promise<Response> {
  try {
    // Get all todos for user, ordered by created_at desc
    const { results } = await env.DB.prepare(
      "SELECT id, title, description, completed, priority, user_id, created_at, updated_at FROM todos WHERE user_id = ? ORDER BY created_at DESC",
    )
      .bind(userId)
      .all();

    const todos = results.map(rowToTodo);

    return successResponse(todos, 200);
  } catch (error) {
    console.error("Get todos error:", error);
    return errorResponse("Failed to fetch todos", 500);
  }
}

/**
 * Get single todo by ID
 * GET /api/todos/:id
 */
export async function handleGetTodoById(
  _request: Request,
  env: Env,
  userId: string,
  todoId: string,
): Promise<Response> {
  try {
    // Validate UUID format
    if (!isValidUUID(todoId)) {
      return errorResponse("Invalid todo ID format", 400);
    }

    // Get todo from database
    const todo = await env.DB.prepare(
      "SELECT id, title, description, completed, priority, user_id, created_at, updated_at FROM todos WHERE id = ? AND user_id = ?",
    )
      .bind(todoId, userId)
      .first();

    if (!todo) {
      return errorResponse("Todo not found", 404);
    }

    return successResponse(rowToTodo(todo), 200);
  } catch (error) {
    console.error("Get todo by ID error:", error);
    return errorResponse("Failed to fetch todo", 500);
  }
}

/**
 * Create new todo
 * POST /api/todos
 */
export async function handleCreateTodo(
  request: Request,
  env: Env,
  userId: string,
): Promise<Response> {
  try {
    // Parse and validate JSON body
    const body = await parseAndValidateJSON(request);

    // Validate required fields
    const requiredValidation = validateRequiredFields(body, [
      "title",
      "priority",
    ]);
    if (!requiredValidation.isValid) {
      return errorResponse(requiredValidation.errors.join(", "), 400);
    }

    const { title, description, priority, completed } = body as CreateTodoInput;

    // Validate title
    const titleValidation = validateTodoTitle(title);
    if (!titleValidation.isValid) {
      return errorResponse(titleValidation.errors.join(", "), 400);
    }

    // Validate description (optional)
    if (description) {
      const descriptionValidation = validateTodoDescription(description);
      if (!descriptionValidation.isValid) {
        return errorResponse(descriptionValidation.errors.join(", "), 400);
      }
    }

    // Validate priority
    const priorityValidation = validateTodoPriority(priority);
    if (!priorityValidation.isValid) {
      return errorResponse(priorityValidation.errors.join(", "), 400);
    }

    // Generate ID and timestamps
    const todoId = generateUUID();
    const now = Math.floor(Date.now() / 1000);
    const isCompleted = completed === true ? 1 : 0;

    // Insert todo into database
    await env.DB.prepare(
      "INSERT INTO todos (id, title, description, completed, priority, user_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    )
      .bind(
        todoId,
        title.trim(),
        description?.trim() || null,
        isCompleted,
        priority,
        userId,
        now,
        now,
      )
      .run();

    // Fetch the created todo
    const createdTodo = await env.DB.prepare(
      "SELECT id, title, description, completed, priority, user_id, created_at, updated_at FROM todos WHERE id = ?",
    )
      .bind(todoId)
      .first();

    if (!createdTodo) {
      return errorResponse("Failed to create todo", 500);
    }

    return successResponse(rowToTodo(createdTodo), 201);
  } catch (error) {
    console.error("Create todo error:", error);
    return errorResponse("Failed to create todo", 500);
  }
}

/**
 * Update todo
 * PATCH /api/todos/:id or PUT /api/todos/:id
 */
export async function handleUpdateTodo(
  request: Request,
  env: Env,
  userId: string,
  todoId: string,
): Promise<Response> {
  try {
    // Validate UUID format
    if (!isValidUUID(todoId)) {
      return errorResponse("Invalid todo ID format", 400);
    }

    // Check if todo exists and belongs to user
    const existingTodo = await env.DB.prepare(
      "SELECT id FROM todos WHERE id = ? AND user_id = ?",
    )
      .bind(todoId, userId)
      .first();

    if (!existingTodo) {
      return errorResponse("Todo not found", 404);
    }

    // Parse and validate JSON body
    const body = await parseAndValidateJSON(request);
    const updates = body as UpdateTodoInput;

    // Build dynamic update query
    const fields: string[] = [];
    const values: any[] = [];

    // Validate and add title if provided
    if (updates.title !== undefined) {
      const titleValidation = validateTodoTitle(updates.title);
      if (!titleValidation.isValid) {
        return errorResponse(titleValidation.errors.join(", "), 400);
      }
      fields.push("title = ?");
      values.push(updates.title.trim());
    }

    // Validate and add description if provided
    if (updates.description !== undefined) {
      const descriptionValidation = validateTodoDescription(
        updates.description,
      );
      if (!descriptionValidation.isValid) {
        return errorResponse(descriptionValidation.errors.join(", "), 400);
      }
      fields.push("description = ?");
      values.push(updates.description?.trim() || null);
    }

    // Add completed if provided
    if (updates.completed !== undefined) {
      fields.push("completed = ?");
      values.push(updates.completed ? 1 : 0);
    }

    // Validate and add priority if provided
    if (updates.priority !== undefined) {
      const priorityValidation = validateTodoPriority(updates.priority);
      if (!priorityValidation.isValid) {
        return errorResponse(priorityValidation.errors.join(", "), 400);
      }
      fields.push("priority = ?");
      values.push(updates.priority);
    }

    // Check if there are any fields to update
    if (fields.length === 0) {
      return errorResponse("No fields to update", 400);
    }

    // Always update updated_at timestamp
    fields.push("updated_at = ?");
    values.push(Math.floor(Date.now() / 1000));

    // Add todoId and userId to values
    values.push(todoId, userId);

    // Execute update
    await env.DB.prepare(
      `UPDATE todos SET ${fields.join(", ")} WHERE id = ? AND user_id = ?`,
    )
      .bind(...values)
      .run();

    // Fetch updated todo
    const updatedTodo = await env.DB.prepare(
      "SELECT id, title, description, completed, priority, user_id, created_at, updated_at FROM todos WHERE id = ?",
    )
      .bind(todoId)
      .first();

    if (!updatedTodo) {
      return errorResponse("Failed to update todo", 500);
    }

    return successResponse(rowToTodo(updatedTodo), 200);
  } catch (error) {
    console.error("Update todo error:", error);
    return errorResponse("Failed to update todo", 500);
  }
}

/**
 * Delete todo
 * DELETE /api/todos/:id
 */
export async function handleDeleteTodo(
  _request: Request,
  env: Env,
  userId: string,
  todoId: string,
): Promise<Response> {
  try {
    // Validate UUID format
    if (!isValidUUID(todoId)) {
      return errorResponse("Invalid todo ID format", 400);
    }

    // Check if todo exists and belongs to user
    const existingTodo = await env.DB.prepare(
      "SELECT id FROM todos WHERE id = ? AND user_id = ?",
    )
      .bind(todoId, userId)
      .first();

    if (!existingTodo) {
      return errorResponse("Todo not found", 404);
    }

    // Delete todo
    await env.DB.prepare("DELETE FROM todos WHERE id = ? AND user_id = ?")
      .bind(todoId, userId)
      .run();

    return new Response(null, { status: 204 });
  } catch (error) {
    console.error("Delete todo error:", error);
    return errorResponse("Failed to delete todo", 500);
  }
}

/**
 * Toggle todo completion status
 * PATCH /api/todos/:id/toggle
 */
export async function handleToggleTodo(
  _request: Request,
  env: Env,
  userId: string,
  todoId: string,
): Promise<Response> {
  try {
    // Validate UUID format
    if (!isValidUUID(todoId)) {
      return errorResponse("Invalid todo ID format", 400);
    }

    // Get current todo
    const todo = await env.DB.prepare(
      "SELECT id, completed FROM todos WHERE id = ? AND user_id = ?",
    )
      .bind(todoId, userId)
      .first();

    if (!todo) {
      return errorResponse("Todo not found", 404);
    }

    // Toggle completed status
    const newCompletedStatus = todo.completed === 1 ? 0 : 1;
    const now = Math.floor(Date.now() / 1000);

    // Update todo
    await env.DB.prepare(
      "UPDATE todos SET completed = ?, updated_at = ? WHERE id = ? AND user_id = ?",
    )
      .bind(newCompletedStatus, now, todoId, userId)
      .run();

    // Fetch updated todo
    const updatedTodo = await env.DB.prepare(
      "SELECT id, title, description, completed, priority, user_id, created_at, updated_at FROM todos WHERE id = ?",
    )
      .bind(todoId)
      .first();

    if (!updatedTodo) {
      return errorResponse("Failed to toggle todo", 500);
    }

    return successResponse(rowToTodo(updatedTodo), 200);
  } catch (error) {
    console.error("Toggle todo error:", error);
    return errorResponse("Failed to toggle todo", 500);
  }
}
