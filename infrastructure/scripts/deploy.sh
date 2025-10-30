#!/bin/bash

# 🚀 pbtodo Deployment Script
#
# This script provides automated deployment for pbtodo application
# with security hardening, monitoring, and infrastructure setup.
#
# Usage:
#   ./deploy.sh [development|staging|production] [domain]
#
# Features:
# - Automated SSL certificate generation
# - Secure Nginx configuration
# - PocketBase security hardening
# - Database setup and migration
# - Monitoring and backup configuration
# - Health checks and validation

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$(dirname "$SCRIPT_DIR")")"
INFRA_DIR="$(dirname "$SCRIPT_DIR")"
ENVIRONMENT="${1:-development}"
DOMAIN="${2:-localhost}"

# Paths
NGINX_DIR="$INFRA_DIR/nginx"
SSL_DIR="$INFRA_DIR/ssl"
POCKETBASE_DIR="$PROJECT_ROOT/pocketbase"
FRONTEND_DIR="$PROJECT_ROOT/frontend"
BACKUP_DIR="$PROJECT_ROOT/backups"

# Deployment settings
NGINX_SITES_DIR="/etc/nginx/sites-available"
NGINX_ENABLED_DIR="/etc/nginx/sites-enabled"
SERVICE_USER="pocketbase"
SERVICE_GROUP="pocketbase"

# Function to print colored output with timestamp
print_status() {
    local color="$1"
    local icon="$2"
    local message="$3"
    local timestamp=$(date '+%H:%M:%S')
    echo -e "${color}[$timestamp] $icon $message${NC}"
}

print_info() {
    print_status "$BLUE" "ℹ️" "$1"
}

print_success() {
    print_status "$GREEN" "✅" "$1"
}

print_warning() {
    print_status "$YELLOW" "⚠️" "$1"
}

print_error() {
    print_status "$RED" "❌" "$1"
}

print_step() {
    print_status "$PURPLE" "🔄" "$1"
}

print_deploy() {
    print_status "$CYAN" "🚀" "$1"
}

# Function to check if running as root
check_root() {
    if [[ $EUID -ne 0 ]]; then
        print_error "This script must be run as root for system installation"
        print_info "Use: sudo ./deploy.sh $ENVIRONMENT $DOMAIN"
        exit 1
    fi
}

# Function to validate environment
validate_environment() {
    print_step "Validating deployment environment..."

    case "$ENVIRONMENT" in
        development|staging|production)
            print_success "Environment validated: $ENVIRONMENT"
            ;;
        *)
            print_error "Invalid environment. Use: development, staging, or production"
            exit 1
            ;;
    esac

    if [[ "$ENVIRONMENT" == "production" && "$DOMAIN" == "localhost" ]]; then
        print_error "Production deployment requires a valid domain name"
        exit 1
    fi

    print_success "Domain validated: $DOMAIN"
}

# Function to install system dependencies
install_dependencies() {
    print_step "Installing system dependencies..."

    # Update package lists
    apt-get update

    # Install required packages
    apt-get install -y \
        nginx \
        certbot \
        python3-certbot-nginx \
        openssl \
        sqlite3 \
        curl \
        wget \
        unzip \
        htop \
        fail2ban \
        ufw \
        jq \
        bc \
        cron

    print_success "Dependencies installed"
}

# Function to create system user
create_service_user() {
    print_step "Creating system user for PocketBase..."

    if ! id "$SERVICE_USER" &>/dev/null; then
        useradd \
            --system \
            --home "$POCKETBASE_DIR" \
            --shell /bin/false \
            --group "$SERVICE_USER" \
            "$SERVICE_USER"
        print_success "System user created: $SERVICE_USER"
    else
        print_info "System user already exists: $SERVICE_USER"
    fi
}

# Function to setup directory structure
setup_directories() {
    print_step "Setting up directory structure..."

    # Create required directories
    mkdir -p "$BACKUP_DIR"/{databases,configs,logs,reports}
    mkdir -p "$SSL_DIR"/{certs,private,csr}
    mkdir -p "$POCKETBASE_DIR"/{pb_data,pb_migrations,pb_public}
    mkdir -p "/var/log/pocketbase"
    mkdir -p "/var/lib/pocketbase"

    # Set ownership and permissions
    chown -R "$SERVICE_USER:$SERVICE_GROUP" "$POCKETBASE_DIR"
    chown -R "$SERVICE_USER:$SERVICE_GROUP" "$BACKUP_DIR"
    chown -R "$SERVICE_USER:$SERVICE_GROUP" "/var/log/pocketbase"
    chown -R "$SERVICE_USER:$SERVICE_GROUP" "/var/lib/pocketbase"

    # Set permissions
    chmod 755 "$POCKETBASE_DIR"
    chmod 700 "$POCKETBASE_DIR/pb_data"
    chmod 755 "$BACKUP_DIR"
    chmod 755 "$SSL_DIR"
    chmod 700 "$SSL_DIR/private"

    print_success "Directory structure created and secured"
}

# Function to generate SSL certificates
setup_ssl() {
    print_step "Setting up SSL certificates..."

    cd "$INFRA_DIR/scripts"

    if [[ "$ENVIRONMENT" == "development" ]]; then
        ./generate-ssl.sh development
        print_success "Development SSL certificates generated"
    elif [[ "$ENVIRONMENT" == "production" ]]; then
        ./generate-ssl.sh production "$DOMAIN"

        # Setup Let's Encrypt renewal
        echo "0 12 * * * /usr/bin/certbot renew --quiet" | crontab -
        print_success "Production SSL certificates generated with auto-renewal"
    else
        # Staging - use self-signed for now
        ./generate-ssl.sh development
        print_warning "Staging using self-signed certificates"
    fi

    cd - > /dev/null
}

# Function to secure PocketBase
setup_pocketbase() {
    print_step "Configuring PocketBase security..."

    cd "$INFRA_DIR/scripts"

    # Run PocketBase security script
    ./secure-pocketbase.sh "$ENVIRONMENT" "$DOMAIN"

    # Update configuration for deployment
    if [[ "$ENVIRONMENT" == "production" ]]; then
        # Update production settings
        jq '.app.debug = false' "$POCKETBASE_DIR/pb_config.json" > "$POCKETBASE_DIR/pb_config.json.tmp"
        jq '.logs.console.level = "warn"' "$POCKETBASE_DIR/pb_config.json.tmp" > "$POCKETBASE_DIR/pb_config.json"
        rm "$POCKETBASE_DIR/pb_config.json.tmp"
    fi

    cd - > /dev/null

    print_success "PocketBase security configured"
}

# Function to setup Nginx configuration
setup_nginx() {
    print_step "Configuring Nginx reverse proxy..."

    # Backup existing configuration
    if [[ -f "/etc/nginx/nginx.conf" ]]; then
        cp "/etc/nginx/nginx.conf" "/etc/nginx/nginx.conf.backup.$(date +%Y%m%d_%H%M%S)"
    fi

    # Copy main Nginx configuration
    cp "$NGINX_DIR/nginx.conf" "/etc/nginx/nginx.conf"

    # Replace domain placeholders
    sed -i "s/your-domain.com/$DOMAIN/g" "/etc/nginx/nginx.conf"
    sed -i "s|/etc/ssl/certs|$SSL_DIR/certs|g" "/etc/nginx/nginx.conf"
    sed -i "s|/etc/ssl/private|$SSL_DIR/private|g" "/etc/nginx/nginx.conf"

    # Test Nginx configuration
    if nginx -t; then
        print_success "Nginx configuration validated"
    else
        print_error "Nginx configuration failed validation"
        exit 1
    fi

    # Enable and restart Nginx
    systemctl enable nginx
    systemctl restart nginx

    print_success "Nginx configured and started"
}

# Function to build and deploy frontend
deploy_frontend() {
    print_step "Building and deploying frontend..."

    cd "$FRONTEND_DIR"

    # Install dependencies
    npm ci --production=false

    # Build for production
    if [[ "$ENVIRONMENT" == "production" ]]; then
        npm run build
        print_success "Frontend built for production"
    else
        npm run build -- --mode development
        print_success "Frontend built for $ENVIRONMENT"
    fi

    # Copy built files to web root
    WEB_ROOT="/var/www/pbtodo"
    mkdir -p "$WEB_ROOT"
    rm -rf "$WEB_ROOT"/*
    cp -r dist/* "$WEB_ROOT/"

    # Set permissions
    chown -R www-data:www-data "$WEB_ROOT"
    chmod -R 755 "$WEB_ROOT"

    cd - > /dev/null

    print_success "Frontend deployed to web root"
}

# Function to setup PocketBase service
setup_pocketbase_service() {
    print_step "Setting up PocketBase as system service..."

    cd "$INFRA_DIR/scripts"

    # Create systemd service
    ./secure-pocketbase.sh "$ENVIRONMENT" "$DOMAIN"

    # Create service file manually to ensure proper paths
    cat > "/etc/systemd/system/pocketbase.service" << EOF
[Unit]
Description=PocketBase Server
After=network.target
Wants=network.target

[Service]
Type=simple
User=$SERVICE_USER
Group=$SERVICE_GROUP
WorkingDirectory=$POCKETBASE_DIR
ExecStart=$POCKETBASE_DIR/pocketbase serve --config=$POCKETBASE_DIR/pb_config.json
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
ReadWritePaths=$POCKETBASE_DIR/pb_data
ReadWritePaths=/var/log/pocketbase
ReadWritePaths=/var/lib/pocketbase

# Resource limits
LimitNOFILE=65536
LimitNPROC=4096

[Install]
WantedBy=multi-user.target
EOF

    # Reload systemd and enable service
    systemctl daemon-reload
    systemctl enable pocketbase

    cd - > /dev/null

    print_success "PocketBase service configured"
}

# Function to setup monitoring and backup
setup_monitoring() {
    print_step "Setting up monitoring and backup systems..."

    cd "$INFRA_DIR/scripts"

    # Setup backup and monitoring
    ./backup-monitor.sh schedule

    # Create monitoring script wrapper
    cat > "/usr/local/bin/pbtodo-monitor" << 'EOF'
#!/bin/bash
/usr/local/bin/backup-monitor.sh monitor
EOF
    chmod +x "/usr/local/bin/pbtodo-monitor"

    # Create backup script wrapper
    cat > "/usr/local/bin/pbtodo-backup" << 'EOF'
#!/bin/bash
/usr/local/bin/backup-monitor.sh backup
EOF
    chmod +x "/usr/local/bin/pbtodo-backup"

    cd - > /dev/null

    print_success "Monitoring and backup systems configured"
}

# Function to setup firewall
setup_firewall() {
    print_step "Configuring firewall..."

    # Configure UFW
    ufw --force reset

    # Default policies
    ufw default deny incoming
    ufw default allow outgoing

    # Allow SSH
    ufw allow ssh

    # Allow HTTP/HTTPS
    ufw allow 80/tcp
    ufw allow 443/tcp

    # Block direct PocketBase access
    ufw deny 8090/tcp

    # Enable firewall
    ufw --force enable

    # Setup fail2ban
    cat > "/etc/fail2ban/jail.local" << EOF
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 5
destemail = root@localhost
action = %(action_mw)s

[sshd]
enabled = true
port = ssh
logpath = /var/log/auth.log

[nginx-http-auth]
enabled = true
port = http,https
logpath = /var/log/nginx/error.log

[nginx-limit-req]
enabled = true
port = http,https
logpath = /var/log/nginx/error.log
EOF

    systemctl enable fail2ban
    systemctl restart fail2ban

    print_success "Firewall and fail2ban configured"
}

# Function to run health checks
run_health_checks() {
    print_step "Running deployment health checks..."

    local issues=0

    # Check Nginx
    if ! systemctl is-active --quiet nginx; then
        print_error "Nginx service is not running"
        ((issues++))
    else
        print_success "Nginx service is running"
    fi

    # Check PocketBase
    if ! systemctl is-active --quiet pocketbase; then
        print_error "PocketBase service is not running"
        ((issues++))
    else
        print_success "PocketBase service is running"
    fi

    # Check SSL certificates
    if [[ "$ENVIRONMENT" == "production" ]]; then
        if [[ ! -f "$SSL_DIR/certs/$DOMAIN.crt" ]]; then
            print_error "SSL certificate not found"
            ((issues++))
        else
            # Check certificate validity
            if openssl x509 -checkend 86400 -noout -in "$SSL_DIR/certs/$DOMAIN.crt"; then
                print_success "SSL certificate is valid"
            else
                print_warning "SSL certificate expires soon"
            fi
        fi
    fi

    # Check web accessibility
    if curl -s -o /dev/null -w "%{http_code}" "http://localhost" | grep -q "200\|301"; then
        print_success "Web server is accessible"
    else
        print_error "Web server is not accessible"
        ((issues++))
    fi

    # Check API connectivity
    if curl -s -o /dev/null -w "%{http_code}" "http://localhost/api/health" | grep -q "200"; then
        print_success "API endpoint is accessible"
    else
        print_warning "API endpoint health check failed (may not be configured)"
    fi

    return $issues
}

# Function to create admin user
create_admin_user() {
    print_step "Creating admin user..."

    # Check if admin already exists
    if sudo -u "$SERVICE_USER" "$POCKETBASE_DIR/pocketbase" admin list 2>/dev/null | grep -q "admin@"; then
        print_info "Admin user already exists"
        return 0
    fi

    print_info "Please create admin user:"
    print_info "Run: sudo -u $SERVICE_USER $POCKETBASE_DIR/pocketbase admin create"
    print_info "Use a strong password (16+ characters with complexity)"

    # Interactive prompt for admin creation
    read -p "Press Enter after creating admin user..."

    print_success "Admin user creation completed"
}

# Function to run database migrations
run_migrations() {
    print_step "Running database migrations..."

    cd "$POCKETBASE_DIR"

    # Check if migrations exist
    if [[ -d "pb_migrations" && $(find pb_migrations -name "*.js" | wc -l) -gt 0 ]]; then
        sudo -u "$SERVICE_USER" ./pocketbase migrate
        print_success "Database migrations completed"
    else
        print_info "No migrations to run"
    fi

    cd - > /dev/null
}

# Function to generate deployment report
generate_deployment_report() {
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    local report_file="$BACKUP_DIR/reports/deployment_report_$(date '+%Y%m%d_%H%M%S').json"

    print_step "Generating deployment report..."

    # Create deployment report
    cat > "$report_file" << EOF
{
    "deployment": {
        "timestamp": "$timestamp",
        "environment": "$ENVIRONMENT",
        "domain": "$DOMAIN",
        "version": "1.0.0"
    },
    "services": {
        "nginx": "$(systemctl is-active nginx)",
        "pocketbase": "$(systemctl is-active pocketbase)",
        "fail2ban": "$(systemctl is-active fail2ban)",
        "ufw": "$(ufw status | head -1)"
    },
    "ssl": {
        "certificate_exists": $([ -f "$SSL_DIR/certs/$DOMAIN.crt" ] && echo "true" || echo "false"),
        "certificate_path": "$SSL_DIR/certs/$DOMAIN.crt"
    },
    "paths": {
        "web_root": "/var/www/pbtodo",
        "pocketbase_dir": "$POCKETBASE_DIR",
        "nginx_config": "/etc/nginx/nginx.conf",
        "backup_dir": "$BACKUP_DIR"
    },
    "security": {
        "firewall_enabled": "$(ufw status | grep -q "Status: active" && echo "true" || echo "false")",
        "fail2ban_enabled": "$(systemctl is-enabled fail2ban)",
        "ssl_configured": $([ "$ENVIRONMENT" == "development" ] || [ -f "$SSL_DIR/certs/$DOMAIN.crt" ] && echo "true" || echo "false")
    }
}
EOF

    print_success "Deployment report generated: $report_file"
}

# Function to show deployment summary
show_deployment_summary() {
    print_deploy "🎉 pbtodo Deployment Complete!"
    echo ""
    echo "📊 Deployment Summary:"
    echo "=========================================="
    echo "Environment: $ENVIRONMENT"
    echo "Domain: $DOMAIN"
    echo "Web Root: /var/www/pbtodo"
    echo "PocketBase: $POCKETBASE_DIR"
    echo "Nginx Config: /etc/nginx/nginx.conf"
    echo "SSL Certs: $SSL_DIR/certs"
    echo "Backups: $BACKUP_DIR"
    echo ""

    echo "🚀 Service Commands:"
    echo "systemctl status nginx"
    echo "systemctl status pocketbase"
    echo "systemctl restart nginx"
    echo "systemctl restart pocketbase"
    echo ""

    echo "📈 Monitoring Commands:"
    echo "pbtodo-monitor      # Run health checks"
    echo "pbtodo-backup      # Create backup"
    echo "tail -f /var/log/nginx/access.log"
    echo "tail -f /var/log/pocketbase/logs.txt"
    echo ""

    if [[ "$ENVIRONMENT" == "production" ]]; then
        echo "🔐 Security Reminders:"
        echo "1. Update admin_allowed_ips in Nginx config"
        echo "2. Configure email notifications in PocketBase"
        echo "3. Set up external monitoring"
        echo "4. Regularly check security logs"
        echo "5. Keep system updated"
        echo ""
    fi

    echo "🌐 Access URLs:"
    echo "Website: https://$DOMAIN"
    if [[ "$ENVIRONMENT" == "production" ]]; then
        echo "Admin: https://admin.$DOMAIN/_ (IP restricted)"
    else
        echo "Admin: http://localhost:8090/_"
    fi
    echo "=========================================="
}

# Function to cleanup on exit
cleanup() {
    print_info "Cleaning up temporary files..."
}

# Main deployment function
main() {
    print_deploy "🚀 pbtodo Deployment Script"
    print_info "Environment: $ENVIRONMENT"
    print_info "Domain: $DOMAIN"
    print_info "Project Root: $PROJECT_ROOT"

    # Trap cleanup
    trap cleanup EXIT

    # Validate environment
    validate_environment

    # Root check for system installation
    if [[ "$ENVIRONMENT" == "production" ]]; then
        check_root
        install_dependencies
        create_service_user
        setup_firewall
    fi

    # Core deployment steps
    setup_directories
    setup_ssl
    setup_pocketbase
    deploy_frontend

    if [[ "$ENVIRONMENT" == "production" ]]; then
        setup_nginx
        setup_pocketbase_service
        setup_monitoring
    fi

    # Post-deployment tasks
    run_migrations
    create_admin_user

    # Health checks
    local issues=0
    run_health_checks || issues=$?

    if [[ $issues -eq 0 ]]; then
        print_success "All health checks passed"
    else
        print_warning "$issues health check issues found"
    fi

    # Generate report and show summary
    generate_deployment_report
    show_deployment_summary

    if [[ $issues -eq 0 ]]; then
        print_success "Deployment completed successfully! 🎉"
        exit 0
    else
        print_error "Deployment completed with $issues issues"
        exit 1
    fi
}

# Function to show usage
show_usage() {
    echo "Usage: $0 [development|staging|production] [domain]"
    echo ""
    echo "Examples:"
    echo "  $0 development              # Development deployment"
    echo "  $0 production your-domain.com  # Production deployment"
    echo ""
    echo "Environment Notes:"
    echo "  development  - Local development with self-signed SSL"
    echo "  staging     - Staging environment with test SSL"
    echo "  production  - Production deployment with Let's Encrypt SSL"
}

# Check for help flag
if [[ "${1:-}" == "-h" || "${1:-}" == "--help" ]]; then
    show_usage
    exit 0
fi

# Validate arguments
if [[ $# -lt 1 ]]; then
    print_error "Missing environment argument"
    show_usage
    exit 1
fi

# Run main function
main "$@"
```

</file_path>
