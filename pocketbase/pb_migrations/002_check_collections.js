/// <reference path="../pb_data/types.d.ts" />

migrate(
  (app) => {
    console.log("=== Checking existing collections ===");

    try {
      // Try to find the todos collection
      const todosCollection = app.findCollectionByNameOrId("todos");

      if (todosCollection) {
        console.log("\n=== Todos Collection Found ===");
        console.log("ID:", todosCollection.id);
        console.log("Name:", todosCollection.name);
        console.log("Type:", todosCollection.type);

        if (todosCollection.schema) {
          console.log("Schema fields:");
          todosCollection.schema.forEach((field, index) => {
            console.log(`  ${index + 1}. ${field.name} (${field.type})`);
          });
        }

        console.log("Rules:", {
          list: todosCollection.listRule,
          view: todosCollection.viewRule,
          create: todosCollection.createRule,
          update: todosCollection.updateRule,
          delete: todosCollection.deleteRule,
        });
      } else {
        console.log("\n=== Todos Collection NOT Found ===");
      }

      // Try to list some basic system collections
      const usersCollection = app.findCollectionByNameOrId("_pb_users_auth_");
      if (usersCollection) {
        console.log("\n=== Users Collection Found ===");
        console.log("ID:", usersCollection.id);
        console.log("Name:", usersCollection.name);
      } else {
        console.log("\n=== Users Collection NOT Found ===");
      }
    } catch (error) {
      console.error("Error during collection check:", error);
    }
  },
  (app) => {
    console.log("Debug migration completed");
  },
);
