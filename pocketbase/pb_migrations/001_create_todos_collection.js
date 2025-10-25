/// <reference path="../pb_data/types.d.ts" />

migrate(
  (app) => {
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

    app.save(todos);
  },
  (app) => {
    const collection = app.findCollectionByNameOrId("todos");
    if (collection) {
      app.delete(collection);
    }
  },
);
