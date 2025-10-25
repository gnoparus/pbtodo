/// <reference path="../pb_data/types.d.ts" />

migrate(
  (app) => {
    console.log("=== Final Fix for Todos Collection ===");

    // Delete existing collection to start fresh
    const existingCollection = app.findCollectionByNameOrId("todos");
    if (existingCollection) {
      console.log("Deleting existing todos collection...");
      app.delete(existingCollection);
    }

    // Create new collection with complete schema (no rules for now)
    const todos = new Collection({
      name: "todos",
      type: "base",
      schema: [
        {
          name: "title",
          type: "text",
          required: true,
          presentable: false,
          options: {
            min: 1,
            max: 200,
          },
        },
        {
          name: "description",
          type: "text",
          required: false,
          presentable: false,
          options: {
            max: 1000,
          },
        },
        {
          name: "completed",
          type: "bool",
          required: true,
          presentable: false,
          options: {
            default: false,
          },
        },
        {
          name: "priority",
          type: "select",
          required: true,
          presentable: false,
          options: {
            maxSelect: 1,
            values: ["low", "medium", "high"],
          },
        },
        {
          name: "user",
          type: "relation",
          required: true,
          presentable: false,
          options: {
            collectionId: "_pb_users_auth_",
            cascadeDelete: false,
            minSelect: 1,
            maxSelect: 1,
          },
        },
      ],
    });

    // Save collection with schema only
    app.save(todos);
    console.log("Todos collection created with schema successfully");
  },
  (app) => {
    // Rollback - delete the collection
    const collection = app.findCollectionByNameOrId("todos");
    if (collection) {
      app.delete(collection);
      console.log("Rollback: Todos collection deleted");
    }
  },
);
