#!/bin/bash

# 🛡️ PocketBase Security Configuration Script
#
# This script configures PocketBase with comprehensive security settings
# including SSL, authentication, rate limiting, and monitoring.
#
# Usage:
#   ./secure-pocketbase.sh [development|production] [domain]

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
POCKETBASE_DIR="../../pocketbase"
CONFIG_FILE="$POCKETBASE_DIR/pb_config.json"
SSL_DIR="../ssl"
ENVIRONMENT="${1:-development}"
DOMAIN="${2:-localhost}"
ENCRYPTION_KEY_FILE="$POCKETBASE_DIR/.encryption_key"

# Function to print colored output
print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Function to check if PocketBase binary exists
check_pocketbase() {
    if [[ ! -f "$POCKETBASE_DIR/pocketbase" ]]; then
        print_error "PocketBase binary not found at $POCKETBASE_DIR/pocketbase"
        print_info "Download PocketBase from: https://pocketbase.io/docs/"
        exit 1
    fi
}

# Function to generate encryption key
generate_encryption_key() {
    if [[ ! -f "$ENCRYPTION_KEY_FILE" ]]; then
        print_info "Generating encryption key..."

        # Generate 32-byte (256-bit) key
        openssl rand -hex 32 > "$ENCRYPTION_KEY_FILE"
        chmod 600 "$ENCRYPTION_KEY_FILE"

        print_success "Encryption key generated and secured"
    else
        print_info "Encryption key already exists"
    fi
}

# Function to read encryption key
read_encryption_key() {
    if [[ -f "$ENCRYPTION_KEY_FILE" ]]; then
        local key=$(cat "$ENCRYPTION_KEY_FILE")
        echo "$key"
    else
        print_error "Encryption key not found"
        return 1
    fi
}

# Function to create secure configuration
create_config() {
    local encryption_key=$(read_encryption_key)
    local admin_ips="'127.0.0.1', '::1'"

    # Add production admin IPs if provided
    if [[ "$ENVIRONMENT" == "production" ]]; then
        admin_ips="$admin_ips, 'YOUR_OFFICE_IP_HERE'"
    fi

    print_info "Creating secure PocketBase configuration..."

    cat > "$CONFIG_FILE" << EOF
{
  "app": {
    "name": "pbtodo",
    "version": "1.0.0",
    "debug": false,
    "logLevel": "info",
    "dataDir": "./pb_data",
    "publicDir": "./pb_public"
  },
  "http": {
    "enabled": true,
    "address": "127.0.0.1",
    "port": 8090,
    "https": {
      "enabled": $([ "$ENVIRONMENT" == "production" ] && echo "true" || echo "false"),
      "certFile": "$SSL_DIR/certs/${DOMAIN}.crt",
      "keyFile": "$SSL_DIR/private/${DOMAIN}.key",
      "redirectHTTP": $([ "$ENVIRONMENT" == "production" ] && echo "true" || echo "false"),
      "minVersion": "1.2",
      "maxVersion": "1.3"
    },
    "compression": {
      "enabled": true,
      "level": 6
    },
    "request": {
      "timeout": 30,
      "maxBodySize": 10485760,
      "maxHeaderSize": 1048576,
      "maxFormDataSize": 10485760
    },
    "cors": {
      "enabled": true,
      "allowedOrigins": [
        "https://${DOMAIN}",
        "https://www.${DOMAIN}",
        "https://app.${DOMAIN}"
      ],
      "allowedMethods": [
        "GET",
        "POST",
        "PATCH",
        "DELETE",
        "OPTIONS"
      ],
      "allowedHeaders": [
        "Content-Type",
        "Authorization",
        "X-Requested-With"
      ],
      "exposedHeaders": [],
      "allowCredentials": true,
      "maxAge": 86400
    },
    "rateLimit": {
      "enabled": true,
      "rules": [
        {
          "path": "/api/collections/users/auth-with-password",
          "maxRequests": 5,
          "duration": 60,
          "blockDuration": 900
        },
        {
          "path": "/api/collections/users/records",
          "maxRequests": 3,
          "duration": 60,
          "blockDuration": 1800
        },
        {
          "path": "/api/collections/todos/records",
          "maxRequests": 100,
          "duration": 60,
          "blockDuration": 300
        },
        {
          "path": "/api/files",
          "maxRequests": 10,
          "duration": 60,
          "blockDuration": 600
        }
      ]
    },
    "securityHeaders": {
      "enabled": true,
      "xssProtection": "1; mode=block",
      "contentTypeOptions": "nosniff",
      "frameOptions": "DENY",
      "referrerPolicy": "strict-origin-when-cross-origin",
      "contentSecurityPolicy": "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'",
      "strictTransportSecurity": {
        "enabled": $([ "$ENVIRONMENT" == "production" ] && echo "true" || echo "false"),
        "maxAge": 31536000,
        "includeSubDomains": true,
        "preload": true
      }
    }
  },
  "logs": {
    "console": {
      "enabled": true,
      "level": "info"
    },
    "file": {
      "enabled": true,
      "path": "./pb_data/logs.txt",
      "maxSize": 104857600,
      "maxBackups": 10
    },
    "audit": {
      "enabled": true,
      "path": "./pb_data/audit.log",
      "maxSize": 52428800,
      "maxBackups": 30,
      "includeRequestBody": false,
      "excludePaths": [
        "/api/collections/todos/records"
      ]
    }
  },
  "encryption": {
    "enabled": true,
    "key": "$encryption_key",
    "algorithm": "aes-256-gcm"
  },
  "admin": {
    "enabled": true,
    "path": "/_",
    "requireAuth": true,
    "allowedIps": [
      $admin_ips
    ],
    "sessionTimeout": 1800,
    "maxLoginAttempts": 3,
    "lockoutDuration": 900
  },
  "database": {
    "maxConnections": 25,
    "connectionTimeout": 30,
    "queryTimeout": 30,
    "vacuum": {
      "enabled": true,
      "schedule": "0 3 * * 0"
    },
    "optimizations": {
      "enabled": true,
      "analyzeThreshold": 1000
    }
  },
  "security": {
    "passwordPolicy": {
      "minLength": 12,
      "requireUppercase": true,
      "requireLowercase": true,
      "requireNumbers": true,
      "requireSymbols": true,
      "preventReuse": 5,
      "expiryDays": 90
    },
    "session": {
      "duration": 28800,
      "refreshThreshold": 3600,
      "maxSessions": 3,
      "revokeOnPasswordChange": true,
      "requireReauth": {
        "sensitiveActions": true,
        "threshold": 86400
      }
    },
    "authentication": {
      "rateLimiting": {
        "enabled": true,
        "maxAttempts": 5,
        "windowMinutes": 15,
        "lockoutDuration": 1800,
        "exponentialBackoff": true
      },
      "twoFactor": {
        "enabled": false,
        "required": false,
        "issuer": "pbtodo",
        "backupCodes": {
          "enabled": false,
          "count": 10
        }
      }
    },
    "monitoring": {
      "enabled": true,
      "alertThresholds": {
        "failedLogins": 10,
        "errorRate": 0.05,
        "responseTime": 2000
      },
      "notifications": {
        "email": {
          "enabled": false,
          "smtp": {
            "host": "",
            "port": 587,
            "username": "",
            "password": "",
            "from": ""
          }
        },
        "webhook": {
          "enabled": false,
          "url": "",
          "secret": ""
        }
      }
    }
  },
  "performance": {
    "cache": {
      "enabled": true,
      "type": "memory",
      "ttl": 300,
      "maxSize": 104857600
    },
    "compression": {
      "enabled": true,
      "level": 6,
      "minSize": 1024
    },
    "static": {
      "enabled": true,
      "cacheControl": "public, max-age=31536000",
      "etag": true
    }
  },
  "maintenance": {
    "enabled": true,
    "schedule": "0 4 * * *",
    "tasks": {
      "cleanupLogs": true,
      "optimizeDatabase": true,
      "cleanupTempFiles": true,
      "updateStatistics": true
    }
  }
}
EOF

    print_success "Secure configuration created: $CONFIG_FILE"
}

# Function to secure file permissions
secure_permissions() {
    print_info "Setting secure file permissions..."

    # Configuration file
    chmod 600 "$CONFIG_FILE"

    # Encryption key
    chmod 600 "$ENCRYPTION_KEY_FILE"

    # PocketBase binary
    chmod 755 "$POCKETBASE_DIR/pocketbase"

    # Data directory
    if [[ -d "$POCKETBASE_DIR/pb_data" ]]; then
        chmod 700 "$POCKETBASE_DIR/pb_data"
        find "$POCKETBASE_DIR/pb_data" -type f -name "*.db" -exec chmod 600 {} \;
    fi

    print_success "File permissions secured"
}

# Function to setup admin user
setup_admin() {
    print_info "Setting up secure admin user..."

    cd "$POCKETBASE_DIR"

    # Create or update admin user
    if ./pocketbase admin create 2>/dev/null; then
        print_success "Admin user created successfully"
    else
        print_info "Admin user already exists, you may need to update password manually"
        print_info "Run: ./pocketbase admin update"
    fi

    cd - > /dev/null
}

# Function to create systemd service
create_systemd_service() {
    local service_file="/etc/systemd/system/pocketbase.service"

    if [[ "$EUID" -ne 0 ]]; then
        print_warning "Run with sudo to create systemd service"
        return
    fi

    print_info "Creating systemd service..."

    cat > "$service_file" << EOF
[Unit]
Description=PocketBase Server
After=network.target

[Service]
Type=simple
User=pocketbase
Group=pocketbase
WorkingDirectory=$(realpath "$POCKETBASE_DIR")
ExecStart=$(realpath "$POCKETBASE_DIR/pocketbase") serve --config=pb_config.json
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal
SyslogIdentifier=pocketbase

# Security settings
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=$(realpath "$POCKETBASE_DIR/pb_data")

[Install]
WantedBy=multi-user.target
EOF

    systemctl daemon-reload
    systemctl enable pocketbase

    print_success "Systemd service created: $service_file"
}

# Function to create startup script
create_startup_script() {
    local startup_script="$POCKETBASE_DIR/start.sh"

    print_info "Creating startup script..."

    cat > "$startup_script" << 'EOF'
#!/bin/bash

# PocketBase startup script with security checks
set -euo pipefail

# Configuration
POCKETBASE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONFIG_FILE="$POCKETBASE_DIR/pb_config.json"
PID_FILE="$POCKETBASE_DIR/pocketbase.pid"

# Function to check if PocketBase is running
is_running() {
    [[ -f "$PID_FILE" ]] && kill -0 "$(cat "$PID_FILE)" 2>/dev/null
}

# Function to start PocketBase
start_pocketbase() {
    echo "Starting PocketBase..."

    # Check if configuration exists
    if [[ ! -f "$CONFIG_FILE" ]]; then
        echo "Error: Configuration file not found: $CONFIG_FILE"
        exit 1
    fi

    # Start PocketBase in background
    ./pocketbase serve --config=pb_config.json &
    echo $! > "$PID_FILE"

    echo "PocketBase started with PID $(cat "$PID_FILE")"
}

# Function to stop PocketBase
stop_pocketbase() {
    echo "Stopping PocketBase..."

    if is_running; then
        kill "$(cat "$PID_FILE")"
        rm -f "$PID_FILE"
        echo "PocketBase stopped"
    else
        echo "PocketBase is not running"
    fi
}

# Function to restart PocketBase
restart_pocketbase() {
    stop_pocketbase
    sleep 2
    start_pocketbase
}

# Main logic
case "${1:-start}" in
    start)
        if is_running; then
            echo "PocketBase is already running"
            exit 1
        fi
        start_pocketbase
        ;;
    stop)
        stop_pocketbase
        ;;
    restart)
        restart_pocketbase
        ;;
    status)
        if is_running; then
            echo "PocketBase is running with PID $(cat "$PID_FILE")"
        else
            echo "PocketBase is not running"
        fi
        ;;
    *)
        echo "Usage: $0 {start|stop|restart|status}"
        exit 1
        ;;
esac
EOF

    chmod +x "$startup_script"
    print_success "Startup script created: $startup_script"
}

# Function to validate configuration
validate_config() {
    print_info "Validating PocketBase configuration..."

    if [[ ! -f "$CONFIG_FILE" ]]; then
        print_error "Configuration file not found: $CONFIG_FILE"
        return 1
    fi

    # Check JSON validity
    if ! python3 -m json.tool "$CONFIG_FILE" > /dev/null 2>&1; then
        print_error "Configuration file contains invalid JSON"
        return 1
    fi

    # Check encryption key
    if ! read_encryption_key > /dev/null 2>&1; then
        print_error "Encryption key not found or invalid"
        return 1
    fi

    # Check SSL files for production
    if [[ "$ENVIRONMENT" == "production" ]]; then
        local cert_file="$SSL_DIR/certs/${DOMAIN}.crt"
        local key_file="$SSL_DIR/private/${DOMAIN}.key"

        if [[ ! -f "$cert_file" || ! -f "$key_file" ]]; then
            print_error "SSL certificates not found for production"
            print_info "Run: ./generate-ssl.sh production $DOMAIN"
            return 1
        fi
    fi

    print_success "Configuration validation passed"
}

# Function to show security summary
show_security_summary() {
    print_info "🛡️ PocketBase Security Configuration Summary"
    echo "=============================================="
    echo "Environment: $ENVIRONMENT"
    echo "Domain: $DOMAIN"
    echo "Configuration: $CONFIG_FILE"
    echo "Encryption: Enabled (AES-256-GCM)"
    echo "Rate Limiting: Enabled"
    echo "Admin Access: Restricted"
    echo "Security Headers: Enabled"
    echo "Audit Logging: Enabled"
    echo ""

    if [[ "$ENVIRONMENT" == "production" ]]; then
        print_warning "⚠️  Production Security Reminders:"
        print_warning "1. Update admin_allowed_ips with your office IP"
        print_warning "2. Configure email/webhook notifications"
        print_warning "3. Set up automated backups"
        print_warning "4. Monitor logs regularly"
        print_warning "5. Keep PocketBase updated"
    fi

    echo "=============================================="
}

# Function to cleanup temporary files
cleanup() {
    print_info "Cleaning up temporary files..."
}

# Main execution
main() {
    print_info "🛡️ PocketBase Security Configuration Script"
    print_info "Environment: $ENVIRONMENT"

    check_pocketbase
    generate_encryption_key
    create_config
    secure_permissions
    validate_config
    setup_admin
    create_startup_script

    if [[ "$EUID" -eq 0 ]]; then
        create_systemd_service
    fi

    show_security_summary

    print_success "PocketBase security configuration completed!"

    if [[ "$ENVIRONMENT" == "development" ]]; then
        print_info "Start PocketBase with: cd $POCKETBASE_DIR && ./start.sh"
    else
        print_info "Start PocketBase with: sudo systemctl start pocketbase"
    fi

    print_info "Access admin dashboard: https://$DOMAIN/_ (if allowed by IP)"
}

# Trap to handle script interruption
trap cleanup EXIT

# Run main function with all arguments
main "$@"
