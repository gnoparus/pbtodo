# PocketBase Server Setup

This directory contains the PocketBase server configuration for the Todo SaaS application.

## Quick Start

1. **Download PocketBase** from https://pocketbase.io/docs/
2. **Extract** the `pocketbase` executable to this directory
3. **Run migrations** to set up the database schema:
   ```bash
   ./pocketbase migrate up
   ```
4. **Start the server**:
   ```bash
   ./pocketbase serve
   ```
5. The server will be available at `http://localhost:8090`
6. (Optional) Visit `http://localhost:8090/_/` to access the admin dashboard

## Database Migrations

This project uses PocketBase's JavaScript migrations to manage database schema and permissions. Migrations are automatically applied when the server starts, or you can apply them manually.

### Available Migrations

Located in `pb_migrations/`:

- `001_create_todos_collection.js` - Initial todos collection (deprecated)
- `002_check_collections.js` - Collection verification (deprecated)
- `003_recreate_todos_collection.js` - Collection recreation (deprecated)
- `005_debug_schema.js` - Schema debugging (deprecated)
- `006_final_fix.js` - Schema fixes (deprecated)
- **`007_add_todos_permissions.js`** - Current migration with complete schema and permissions

### Migration Commands

```bash
# Apply all pending migrations
./pocketbase migrate up

# Revert the last migration
./pocketbase migrate down

# Create a new migration
./pocketbase migrate create "migration_name"

# Generate snapshot of current collections
./pocketbase migrate collections

# Sync migration history (remove missing migrations)
./pocketbase migrate history-sync
```

## Database Schema

### Collections

The database has two main collections:

#### 1. Users Collection (built-in auth collection)
- **Type:** `auth`
- **Name:** `users` (or `_pb_users_auth_`)
- **Fields:**
  - `id` - Auto-generated unique identifier
  - `email` - User's email (unique, required)
  - `name` - User's display name (required)
  - `avatar` - Profile picture (optional)
  - `password` - Hashed password (required, hidden)
  - `emailVisibility` - Show email in API responses (default: false)
  - `verified` - Email verification status (default: false)

#### 2. Todos Collection (created by migration)
- **Type:** `base`
- **Name:** `todos`
- **Fields:**
  - `id` - Auto-generated unique identifier
  - `title` - Todo title (text, required, max: 200 chars)
  - `description` - Todo description (text, optional, max: 1000 chars)
  - `completed` - Completion status (boolean, default: false)
  - `priority` - Priority level (select: low|medium|high, required)
  - `user` - Owner user ID (relation to users, required)
  - `created` - Creation timestamp (autodate)
  - `updated` - Last update timestamp (autodate)

### API Rules

All API rules are configured automatically via migrations.

#### Todos Collection Rules:
```javascript
// List rule: Users can only see their own todos
listRule: "@request.auth.id != '' && user = @request.auth.id"

// View rule: Users can only view their own todos
viewRule: "@request.auth.id != '' && user = @request.auth.id"

// Create rule: Authenticated users can create todos
createRule: "@request.auth.id != ''"

// Update rule: Users can only update their own todos
updateRule: "@request.auth.id != '' && user = @request.auth.id"

// Delete rule: Users can only delete their own todos
deleteRule: "@request.auth.id != '' && user = @request.auth.id"
```

**Note:** The `user` field is automatically populated by the frontend service layer with the authenticated user's ID.

## API Endpoints

### Authentication
- `POST /api/collections/users/records` - Register new user
- `POST /api/collections/users/auth-with-password` - Login
- `POST /api/collections/users/auth-refresh` - Refresh auth token
- `POST /api/collections/users/request-password-reset` - Request password reset
- `POST /api/collections/users/confirm-password-reset` - Confirm password reset

### Todos CRUD
- `GET /api/collections/todos/records` - List todos (filtered by auth user)
- `GET /api/collections/todos/records/:id` - Get single todo
- `POST /api/collections/todos/records` - Create todo
- `PATCH /api/collections/todos/records/:id` - Update todo
- `DELETE /api/collections/todos/records/:id` - Delete todo

## Development Setup

### First Time Setup

```bash
# 1. Download PocketBase (if not already done)
# Download from https://pocketbase.io and place executable here

# 2. Apply migrations
./pocketbase migrate up

# 3. Start server
./pocketbase serve
```

### Starting the Server

```bash
# Standard mode (foreground)
./pocketbase serve

# With custom port
./pocketbase serve --http=127.0.0.1:9090

# In background
nohup ./pocketbase serve > pocketbase.log 2>&1 &
```

### Resetting the Database

If you need to start fresh:

```bash
# Stop the server
killall pocketbase

# Remove the database
rm -rf pb_data/data.db pb_data/logs.db

# Reapply migrations
./pocketbase migrate up

# Start server
./pocketbase serve
```

## CORS Configuration

For development, CORS is handled automatically. For production:

1. Access Admin Dashboard: `http://localhost:8090/_/`
2. Go to Settings → Application
3. Add your frontend URL to allowed origins:
   - Development: `http://localhost:5173`
   - Production: `https://yourdomain.com`

## Admin Dashboard

Access the admin dashboard at `http://localhost:8090/_/`

**Features:**
- View and manage collections
- Browse and edit records
- View logs and analytics
- Configure settings
- Manage admin accounts
- Test API requests

## Backup and Restore

### Backup
```bash
# Backup the entire data directory
tar -czf backup-$(date +%Y%m%d).tar.gz pb_data/

# Backup just the database
cp pb_data/data.db backups/data-$(date +%Y%m%d).db
```

### Restore
```bash
# Stop the server
killall pocketbase

# Restore from backup
tar -xzf backup-20231025.tar.gz

# Start the server
./pocketbase serve
```

## Troubleshooting

### Port Already in Use
```bash
# Find process using port 8090
lsof -i :8090

# Kill the process
kill -9 <PID>
```

### Migration Issues
```bash
# Check migration status
./pocketbase migrate

# Force reapply last migration
./pocketbase migrate down
./pocketbase migrate up
```

### Permission Denied
```bash
# Make executable
chmod +x pocketbase
```

### Database Locked
```bash
# Stop all PocketBase instances
killall pocketbase

# Wait a few seconds and restart
./pocketbase serve
```

## Production Deployment

### Recommended Setup

1. **Use a reverse proxy** (nginx/Caddy) for HTTPS
2. **Run as a systemd service** for auto-restart
3. **Set up regular backups** of `pb_data/`
4. **Use environment variables** for configuration
5. **Monitor logs** in `pb_data/logs/`

### Example Systemd Service

Create `/etc/systemd/system/pocketbase.service`:

```ini
[Unit]
Description=PocketBase
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/var/www/pocketbase
ExecStart=/var/www/pocketbase/pocketbase serve --http=127.0.0.1:8090
Restart=always

[Install]
WantedBy=multi-user.target
```

Then:
```bash
sudo systemctl daemon-reload
sudo systemctl enable pocketbase
sudo systemctl start pocketbase
```

## Resources

- Official Documentation: https://pocketbase.io/docs/
- JavaScript Migrations: https://pocketbase.io/docs/js-migrations/
- API Rules: https://pocketbase.io/docs/api-rules-and-filters/
- Go API Reference: https://pocketbase.io/docs/go-overview/