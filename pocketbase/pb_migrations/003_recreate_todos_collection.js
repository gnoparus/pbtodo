/// <reference path="../pb_data/types.d.ts" />

migrate(
  (app) => {
    console.log("=== Recreating Todos Collection ===");

    // Delete existing collection if it exists
    const existingCollection = app.findCollectionByNameOrId("todos");
    if (existingCollection) {
      console.log("Deleting existing todos collection...");
      app.delete(existingCollection);
    }

    // Create new collection with proper schema
    const todos = new Collection({
      id: "todos",
      name: "todos",
      type: "base",
      schema: [
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
          required: true,
          options: {
            default: false,
          },
        },
        {
          name: "priority",
          type: "select",
          required: true,
          options: {
            maxSelect: 1,
            values: ["low", "medium", "high"],
          },
        },
        {
          name: "user",
          type: "relation",
          required: true,
          options: {
            collectionId: "_pb_users_auth_",
            cascadeDelete: false,
            minSelect: 1,
            maxSelect: 1,
          },
        },
      ],
    });

    // Save collection first (without rules)
    app.save(todos);
    console.log("Todos collection created with schema");
  },
  (app) => {
    // Rollback - delete the collection
    const collection = app.findCollectionByNameOrId("todos");
    if (collection) {
      app.delete(collection);
    }
  },
);
