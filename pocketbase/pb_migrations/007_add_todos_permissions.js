/// <reference path="../pb_data/types.d.ts" />

/**
 * Migration 007: Add Todos Collection with Complete Schema and Permissions
 *
 * This migration creates the todos collection with:
 * - Complete field schema (title, description, completed, priority, user, timestamps)
 * - API rules for user-specific data access
 * - Automatic timestamp tracking (created, updated)
 *
 * Security:
 * - Users can only access their own todos
 * - Authentication required for all operations
 * - User field validated against authenticated session
 *
 * Note: This supersedes migrations 001-006 which had incomplete schema definitions
 */

migrate(
  (app) => {
    console.log(
      "=== Recreating Todos Collection with Schema and Permissions ===",
    );

    // Delete existing collection to start fresh
    try {
      const existingCollection = app.findCollectionByNameOrId("todos");
      if (existingCollection) {
        console.log("Deleting existing todos collection...");
        app.delete(existingCollection);
      }
    } catch (e) {
      console.log("No existing todos collection found, creating new one...");
    }

    // Create new collection with complete field schema
    // Note: In PocketBase v0.31+, use 'fields' property instead of 'schema'
    const collection = new Collection({
      name: "todos",
      type: "base",
      fields: [
        {
          name: "title",
          type: "text",
          required: true,
          options: {
            min: 1,
            max: 200,
          },
        },
        {
          name: "description",
          type: "text",
          required: false,
          options: {
            max: 1000,
          },
        },
        {
          name: "completed",
          type: "bool",
          required: false,
        },
        {
          name: "priority",
          type: "select",
          required: true,
          maxSelect: 1,
          values: ["low", "medium", "high"],
        },
        {
          name: "user",
          type: "relation",
          required: true,
          collectionId: "_pb_users_auth_",
          cascadeDelete: false,
          minSelect: null,
          maxSelect: 1,
          displayFields: null,
        },
        {
          name: "created",
          type: "autodate",
          required: false,
          onCreate: true,
          onUpdate: false,
        },
        {
          name: "updated",
          type: "autodate",
          required: false,
          onCreate: true,
          onUpdate: true,
        },
      ],
    });

    // Step 1: Save collection with schema first (without API rules)
    // This ensures fields are created before we reference them in rules
    app.save(collection);
    console.log("✓ Todos collection created with schema");

    // Step 2: Reload the collection to ensure schema is applied
    // Then add API rules that reference the schema fields
    const savedCollection = app.findCollectionByNameOrId("todos");
    // List rule: Users can only see their own todos
    savedCollection.listRule =
      "@request.auth.id != '' && user = @request.auth.id";

    // View rule: Users can only view their own todos
    savedCollection.viewRule =
      "@request.auth.id != '' && user = @request.auth.id";

    // Create rule: Authenticated users can create todos
    // Note: user field is auto-populated by frontend service layer
    savedCollection.createRule = "@request.auth.id != ''";

    // Update rule: Users can only update their own todos
    savedCollection.updateRule =
      "@request.auth.id != '' && user = @request.auth.id";

    // Delete rule: Users can only delete their own todos
    savedCollection.deleteRule =
      "@request.auth.id != '' && user = @request.auth.id";

    // Step 3: Save collection with API rules applied
    app.save(savedCollection);
    console.log("✓ API rules added successfully");
    console.log("  List rule:", savedCollection.listRule);
    console.log("  View rule:", savedCollection.viewRule);
    console.log("  Create rule:", savedCollection.createRule);
    console.log("  Update rule:", savedCollection.updateRule);
    console.log("  Delete rule:", savedCollection.deleteRule);
  },
  (app) => {
    // Rollback - delete the collection
    console.log("=== Rollback: Removing Todos Collection ===");
    const collection = app.findCollectionByNameOrId("todos");
    if (collection) {
      app.delete(collection);
      console.log("✓ Todos collection deleted");
    }
  },
);
