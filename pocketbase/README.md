# PocketBase Server Setup

This directory contains the PocketBase server configuration for the Todo SaaS application.

## Quick Start

1. Download PocketBase from https://pocketbase.io/docs/
2. Extract the `pocketbase` executable to this directory
3. Run the server: `./pocketbase serve`
4. Visit http://localhost:8090/_/ to set up admin
5. Configure collections using the settings below

## Database Collections

### Users Collection
```
Name: users
Fields:
- email (email, unique, required)
- name (text, required) 
- avatar (file, optional)
- password (password, required, hidden)
```

**Collection Rules:**
- List: `id = @request.auth.id`
- Create: `email != "" && name != "" && password != ""`
- Update: `id = @request.auth.id`
- Delete: `id = @request.auth.id`

### Todos Collection
```
Name: todos
Fields:
- title (text, required)
- description (text, optional)
- completed (bool, default: false)
- priority (select, options: low|medium|high, default: medium)
- user (relation -> users.id, required)
```

**Collection Rules:**
- List: `user = @request.auth.id`
- Create: `user = @request.auth.id && title != ""`
- Update: `user = @request.auth.id`
- Delete: `user = @request.auth.id`

## API Endpoints

The frontend will connect to these endpoints:
- `POST /api/collections/users/auth-with-password` - Login
- `POST /api/collections/users` - Register
- `GET /api/collections/todos` - List todos
- `POST /api/collections/todos` - Create todo
- `PATCH /api/collections/todos/:id` - Update todo
- `DELETE /api/collections/todos/:id` - Delete todo

## CORS Configuration

In Admin Dashboard → Settings → CORS:
- Add `http://localhost:5173` (Vite dev server)
- Enable: GET, POST, PUT, DELETE, OPTIONS