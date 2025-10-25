/// <reference path="../pb_data/types.d.ts" />

migrate((app) => {
  console.log("=== Debugging Todos Collection Schema ===");

  const collection = app.findCollectionByNameOrId("todos");

  if (collection) {
    console.log("Collection found:");
    console.log("ID:", collection.id);
    console.log("Name:", collection.name);
    console.log("Type:", collection.type);

    if (collection.schema) {
      console.log("Schema fields:");
      collection.schema.forEach((field, index) => {
        console.log(`  ${index + 1}. ${field.name} (${field.type})`);
        console.log(`     Required: ${field.required}`);
        if (field.options) {
          console.log(`     Options:`, JSON.stringify(field.options, null, 6));
        }
      });
    } else {
      console.log("No schema found!");
    }

    console.log("Current rules:", {
      list: collection.listRule,
      view: collection.viewRule,
      create: collection.createRule,
      update: collection.updateRule,
      delete: collection.deleteRule
    });
  } else {
    console.log("Collection not found!");
  }
}, (app) => {
  console.log("Debug completed");
});
