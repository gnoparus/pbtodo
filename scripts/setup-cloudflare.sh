#!/bin/bash
set -euo pipefail

# Cloudflare Setup Script
# Automates creation of D1 database and KV namespaces for PBTodo

echo "🚀 PBTodo Cloudflare Setup Script"
echo "=================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if wrangler is installed
if ! command -v wrangler &> /dev/null; then
    echo -e "${RED}❌ Error: wrangler CLI is not installed${NC}"
    echo "Please install it with: npm install -g wrangler"
    exit 1
fi

echo -e "${GREEN}✓ Wrangler CLI found${NC}"
echo ""

# Check if user is logged in
echo "📋 Checking Wrangler authentication..."
if ! wrangler whoami &> /dev/null; then
    echo -e "${YELLOW}⚠️  Not logged in to Cloudflare${NC}"
    echo "Please login with: wrangler login"
    echo ""
    read -p "Do you want to login now? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        wrangler login
    else
        echo -e "${RED}❌ Aborting setup${NC}"
        exit 1
    fi
fi

echo -e "${GREEN}✓ Authenticated with Cloudflare${NC}"
echo ""

# Create D1 Database
echo "📦 Creating D1 Database..."
echo ""

DB_NAME="pbtodo-db"

# Check if database already exists
if wrangler d1 list 2>/dev/null | grep -q "$DB_NAME"; then
    echo -e "${YELLOW}⚠️  Database '$DB_NAME' already exists${NC}"
    read -p "Do you want to use the existing database? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${RED}❌ Aborting setup${NC}"
        exit 1
    fi

    # Get existing database ID
    DB_ID=$(wrangler d1 list 2>/dev/null | grep "$DB_NAME" | awk '{print $2}' | head -1)
    echo -e "${GREEN}✓ Using existing database: $DB_ID${NC}"
else
    # Create new database
    echo "Creating new D1 database: $DB_NAME"
    DB_OUTPUT=$(wrangler d1 create "$DB_NAME" 2>&1)
    DB_ID=$(echo "$DB_OUTPUT" | grep -oE '[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}' | head -1)

    if [ -z "$DB_ID" ]; then
        echo -e "${RED}❌ Failed to create database${NC}"
        echo "$DB_OUTPUT"
        exit 1
    fi

    echo -e "${GREEN}✓ Database created: $DB_ID${NC}"
fi

echo ""

# Apply migrations
echo "📝 Applying database migrations..."
echo ""

MIGRATIONS_DIR="migrations"

if [ -d "$MIGRATIONS_DIR" ]; then
    for migration in "$MIGRATIONS_DIR"/*.sql; do
        if [ -f "$migration" ]; then
            echo "Applying migration: $(basename "$migration")"
            wrangler d1 execute "$DB_NAME" --file="$migration" --remote || {
                echo -e "${YELLOW}⚠️  Migration may have already been applied${NC}"
            }
        fi
    done
    echo -e "${GREEN}✓ Migrations applied${NC}"
else
    echo -e "${YELLOW}⚠️  No migrations directory found${NC}"
fi

echo ""

# Create KV Namespaces
echo "🗄️  Creating KV Namespaces..."
echo ""

# Sessions KV
SESSIONS_NAME="pbtodo-sessions"
echo "Creating KV namespace: $SESSIONS_NAME"
SESSIONS_OUTPUT=$(wrangler kv:namespace create "$SESSIONS_NAME" 2>&1)
SESSIONS_ID=$(echo "$SESSIONS_OUTPUT" | grep -oE 'id = "[a-f0-9]{32}"' | grep -oE '[a-f0-9]{32}')

if [ -z "$SESSIONS_ID" ]; then
    echo -e "${YELLOW}⚠️  Sessions KV may already exist or creation failed${NC}"
    # Try to list and find it
    SESSIONS_ID=$(wrangler kv:namespace list 2>/dev/null | grep "$SESSIONS_NAME" | grep -oE '[a-f0-9]{32}' | head -1)
fi

echo -e "${GREEN}✓ Sessions KV: $SESSIONS_ID${NC}"

# Sessions KV Preview
echo "Creating KV namespace: ${SESSIONS_NAME}-preview"
SESSIONS_PREVIEW_OUTPUT=$(wrangler kv:namespace create "${SESSIONS_NAME}-preview" 2>&1)
SESSIONS_PREVIEW_ID=$(echo "$SESSIONS_PREVIEW_OUTPUT" | grep -oE 'id = "[a-f0-9]{32}"' | grep -oE '[a-f0-9]{32}')

if [ -z "$SESSIONS_PREVIEW_ID" ]; then
    echo -e "${YELLOW}⚠️  Sessions Preview KV may already exist${NC}"
    SESSIONS_PREVIEW_ID=$(wrangler kv:namespace list 2>/dev/null | grep "${SESSIONS_NAME}-preview" | grep -oE '[a-f0-9]{32}' | head -1)
fi

echo -e "${GREEN}✓ Sessions Preview KV: $SESSIONS_PREVIEW_ID${NC}"
echo ""

# Rate Limits KV
RATE_LIMITS_NAME="pbtodo-rate-limits"
echo "Creating KV namespace: $RATE_LIMITS_NAME"
RATE_LIMITS_OUTPUT=$(wrangler kv:namespace create "$RATE_LIMITS_NAME" 2>&1)
RATE_LIMITS_ID=$(echo "$RATE_LIMITS_OUTPUT" | grep -oE 'id = "[a-f0-9]{32}"' | grep -oE '[a-f0-9]{32}')

if [ -z "$RATE_LIMITS_ID" ]; then
    echo -e "${YELLOW}⚠️  Rate Limits KV may already exist${NC}"
    RATE_LIMITS_ID=$(wrangler kv:namespace list 2>/dev/null | grep "$RATE_LIMITS_NAME" | grep -oE '[a-f0-9]{32}' | head -1)
fi

echo -e "${GREEN}✓ Rate Limits KV: $RATE_LIMITS_ID${NC}"

# Rate Limits KV Preview
echo "Creating KV namespace: ${RATE_LIMITS_NAME}-preview"
RATE_LIMITS_PREVIEW_OUTPUT=$(wrangler kv:namespace create "${RATE_LIMITS_NAME}-preview" 2>&1)
RATE_LIMITS_PREVIEW_ID=$(echo "$RATE_LIMITS_PREVIEW_OUTPUT" | grep -oE 'id = "[a-f0-9]{32}"' | grep -oE '[a-f0-9]{32}')

if [ -z "$RATE_LIMITS_PREVIEW_ID" ]; then
    echo -e "${YELLOW}⚠️  Rate Limits Preview KV may already exist${NC}"
    RATE_LIMITS_PREVIEW_ID=$(wrangler kv:namespace list 2>/dev/null | grep "${RATE_LIMITS_NAME}-preview" | grep -oE '[a-f0-9]{32}' | head -1)
fi

echo -e "${GREEN}✓ Rate Limits Preview KV: $RATE_LIMITS_PREVIEW_ID${NC}"
echo ""

# Update wrangler.toml
echo "📝 Updating wrangler.toml..."
echo ""

WRANGLER_CONFIG="workers/wrangler.toml"

if [ -f "$WRANGLER_CONFIG" ]; then
    # Create backup
    cp "$WRANGLER_CONFIG" "${WRANGLER_CONFIG}.backup"

    # Update D1 database ID
    sed -i.tmp "s/database_id = \"placeholder-d1-id\"/database_id = \"$DB_ID\"/g" "$WRANGLER_CONFIG"

    # Update KV namespace IDs
    sed -i.tmp "s/id = \"placeholder-sessions-kv-id\"/id = \"$SESSIONS_ID\"/g" "$WRANGLER_CONFIG"
    sed -i.tmp "s/preview_id = \"placeholder-sessions-preview-id\"/preview_id = \"$SESSIONS_PREVIEW_ID\"/g" "$WRANGLER_CONFIG"
    sed -i.tmp "s/id = \"placeholder-rate-limits-kv-id\"/id = \"$RATE_LIMITS_ID\"/g" "$WRANGLER_CONFIG"
    sed -i.tmp "s/preview_id = \"placeholder-rate-limits-preview-id\"/preview_id = \"$RATE_LIMITS_PREVIEW_ID\"/g" "$WRANGLER_CONFIG"
    sed -i.tmp "s/id = \"placeholder-sessions-kv-id-prod\"/id = \"$SESSIONS_ID\"/g" "$WRANGLER_CONFIG"
    sed -i.tmp "s/id = \"placeholder-rate-limits-kv-id-prod\"/id = \"$RATE_LIMITS_ID\"/g" "$WRANGLER_CONFIG"

    # Remove temp files
    rm -f "${WRANGLER_CONFIG}.tmp"

    echo -e "${GREEN}✓ wrangler.toml updated${NC}"
else
    echo -e "${YELLOW}⚠️  wrangler.toml not found at $WRANGLER_CONFIG${NC}"
fi

echo ""

# Set secrets
echo "🔐 Setting up secrets..."
echo ""

read -p "Do you want to set JWT_SECRET now? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "Enter JWT_SECRET (or press Enter to generate a random one):"
    read -s JWT_SECRET

    if [ -z "$JWT_SECRET" ]; then
        # Generate random JWT secret
        JWT_SECRET=$(openssl rand -base64 32)
        echo -e "${GREEN}✓ Generated random JWT_SECRET${NC}"
    fi

    cd workers
    echo "$JWT_SECRET" | wrangler secret put JWT_SECRET
    cd ..

    echo -e "${GREEN}✓ JWT_SECRET set${NC}"
else
    echo -e "${YELLOW}⚠️  Skipping JWT_SECRET setup${NC}"
    echo "You can set it later with: cd workers && wrangler secret put JWT_SECRET"
fi

echo ""
echo "=================================="
echo -e "${GREEN}✅ Cloudflare Setup Complete!${NC}"
echo "=================================="
echo ""
echo "📋 Summary:"
echo "  D1 Database: $DB_ID"
echo "  Sessions KV: $SESSIONS_ID"
echo "  Rate Limits KV: $RATE_LIMITS_ID"
echo ""
echo "🚀 Next steps:"
echo "  1. Review workers/wrangler.toml"
echo "  2. Install dependencies: cd workers && npm install"
echo "  3. Test locally: cd workers && npm run dev"
echo "  4. Deploy: cd workers && npm run deploy"
echo ""
