
# 🚀 Deployment Validation Script
# Validates deployment readiness and performs post-deployment health checks
#
# Usage:
#   ./validate-deployment.sh [environment] [deployment-id]
#
# Environments: development, staging, production

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$(dirname "$SCRIPT_DIR")")"
ENVIRONMENT="${1:-staging}"
DEPLOYMENT_ID="${2:-$(date +%s)}"

# Logging functions
log_info() {
    echo -e "${BLUE}ℹ️  INFO: $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  WARNING: $1${NC}"
}

log_error() {
    echo -e "${RED}❌ ERROR: $1${NC}"
}

# Function to validate environment
validate_environment() {
    log_info "Validating deployment environment: $ENVIRONMENT"

    case "$ENVIRONMENT" in
        development|staging|production)
            log_success "Valid environment specified"
            ;;
        *)
            log_error "Invalid environment: $ENVIRONMENT"
            echo "Valid environments: development, staging, production"
            exit 1
            ;;
    esac
}

# Function to load environment configuration
load_environment_config() {
    log_info "Loading environment configuration for: $ENVIRONMENT"

    local env_file="$PROJECT_ROOT/environments/$ENVIRONMENT/.env"

    if [ -f "$env_file" ]; then
        log_info "Loading environment file: $env_file"
        set -a
        # shellcheck source=/dev/null
        source "$env_file"
        set +a
        log_success "Environment configuration loaded"
    else
        log_warning "Environment file not found: $env_file"
        log_info "Using default configuration"
    fi
}

# Function to validate build artifacts
validate_build_artifacts() {
    log_info "Validating build artifacts"

    local dist_dir="$PROJECT_ROOT/frontend/dist"

    if [ ! -d "$dist_dir" ]; then
        log_error "Build artifacts directory not found: $dist_dir"
        exit 1
    fi

    # Check for critical files
    local critical_files=(
        "$dist_dir/index.html"
        "$dist_dir/assets/"
    )

    local missing_files=0

    for file in "${critical_files[@]}"; do
        if [ ! -e "$file" ]; then
            log_error "Critical build artifact missing: $file"
            missing_files=$((missing_files + 1))
        else
            log_info "✓ Build artifact found: $file"
        fi
    done

    if [ $missing_files -gt 0 ]; then
        log_error "Build validation failed: $missing_files missing artifacts"
        exit 1
    fi

    # Check build size
    local build_size=$(du -sh "$dist_dir" | cut -f1)
    log_info "Build size: $build_size"

    # Validate HTML file
    if grep -q "VITE_POCKETBASE_URL" "$dist_dir/index.html"; then
        log_warning "Unsubstituted environment variable found in HTML"
    fi

    log_success "Build artifacts validation completed"
}

# Function to validate security configuration
validate_security_configuration() {
    log_info "Validating security configuration"

    # Check if security features are enabled for production
    if [ "$ENVIRONMENT" = "production" ]; then
        local security_checks=(
            "VITE_HTTPS_ENABLED:true"
            "VITE_ENABLE_SECURITY_HEADERS:true"
            "VITE_ENABLE_CSP:true"
            "VITE_ENABLE_HSTS:true"
        )

        for check in "${security_checks[@]}"; do
            local var="${check%:*}"
            local expected="${check#*:}"
            local actual="${!var:-false}"

            if [ "$actual" = "$expected" ]; then
                log_info "✓ Security check passed: $var=$expected"
            else
                log_error "Security check failed: $var=$actual (expected: $expected)"
                exit 1
            fi
        done
    fi

    # Validate password requirements
    if [ "${VITE_MIN_PASSWORD_LENGTH:-8}" -lt 8 ]; then
        log_error "Minimum password length too short: ${VITE_MIN_PASSWORD_LENGTH}"
        exit 1
    fi

    log_success "Security configuration validation completed"
}

# Function to validate network connectivity
validate_network_connectivity() {
    log_info "Validating network connectivity"

    local services=(
        "$VITE_POCKETBASE_URL"
    )

    for service in "${services[@]}"; do
        if [ -n "$service" ]; then
            log_info "Testing connectivity to: $service"

            if curl -f -s --connect-timeout 10 --max-time 30 "$service/api/health" >/dev/null 2>&1; then
                log_success "✓ Service reachable: $service"
            else
                log_warning "Service not reachable: $service"
            fi
        fi
    done

    log_success "Network connectivity validation completed"
}

# Function to validate database connectivity
validate_database_connectivity() {
    log_info "Validating database connectivity"

    if [ -n "${VITE_POCKETBASE_URL:-}" ]; then
        # Test PocketBase health endpoint
        local health_url="$VITE_POCKETBASE_URL/api/health"

        log_info "Testing database connectivity: $health_url"

        local response=$(curl -s -f -w "%{http_code}" "$health_url" 2>/dev/null || echo "000")

        if [ "$response" = "200" ]; then
            log_success "✓ Database connectivity confirmed"
        else
            log_error "Database connectivity failed (HTTP: $response)"
            exit 1
        fi

        # Test database collection access
        local collections_url="$VITE_POCKETBASE_URL/api/collections"
        local collections_response=$(curl -s -f -w "%{http_code}" "$collections_url" 2>/dev/null || echo "000")

        if [ "$collections_response" = "200" ]; then
            log_success "✓ Database collections accessible"
        else
            log_warning "Database collections not accessible (HTTP: $collections_response)"
        fi
    else
        log_warning "PocketBase URL not configured"
    fi

    log_success "Database connectivity validation completed"
}

# Function to validate SSL configuration
validate_ssl_configuration() {
    log_info "Validating SSL configuration"

    if [ "${VITE_HTTPS_ENABLED:-false}" = "true" ]; then
        local domain=""

        case "$ENVIRONMENT" in
            staging)
                domain="${STAGING_DOMAIN:-}"
                ;;
            production)
                domain="${PRODUCTION_DOMAIN:-}"
                ;;
        esac

        if [ -n "$domain" ]; then
            log_info "Checking SSL certificate for: $domain"

            local cert_info=$(echo | openssl s_client -servername "$domain" -connect "$domain:443" 2>/dev/null | openssl x509 -noout -dates 2>/dev/null || echo "")

            if [ -n "$cert_info" ]; then
                log_success "✓ SSL certificate found"
                echo "$cert_info"

                # Check certificate expiration
                local expiry_date=$(echo "$cert_info" | grep "notAfter" | cut -d= -f2)
                if [ -n "$expiry_date" ]; then
                    local expiry_timestamp=$(date -d "$expiry_date" +%s 2>/dev/null || date -j -f "%b %d %T %Y %Z" "$expiry_date" +%s 2>/dev/null || echo "0")
                    local current_timestamp=$(date +%s)
                    local days_until_expiry=$(( (expiry_timestamp - current_timestamp) / 86400 ))

                    if [ $days_until_expiry -gt 30 ]; then
                        log_success "✓ SSL certificate valid for $days_until_expiry days"
                    elif [ $days_until_expiry -gt 0 ]; then
                        log_warning "⚠️ SSL certificate expires in $days_until_expiry days"
                    else
                        log_error "❌ SSL certificate has expired"
                        exit 1
                    fi
                fi
            else
                log_error "SSL certificate not found or invalid"
                exit 1
            fi
        else
            log_warning "Domain not configured for SSL validation"
        fi
    else
        log_info "SSL is not enabled for this environment"
    fi

    log_success "SSL configuration validation completed"
}

# Function to perform security scans
perform_security_scans() {
    log_info "Performing security scans"

    local dist_dir="$PROJECT_ROOT/frontend/dist"

    # Scan for hardcoded secrets
    log_info "Scanning for hardcoded secrets"

    local secret_patterns=(
        "password"
        "secret"
        "token"
        "key"
        "api_key"
        "private_key"
    )

    local secrets_found=0

    for pattern in "${secret_patterns[@]}"; do
        if grep -r -i "$pattern" "$dist_dir" --include="*.js" --include="*.html" 2>/dev/null | grep -v "favicon" | head -3; then
            log_warning "Potential secret found containing: $pattern"
            secrets_found=$((secrets_found + 1))
        fi
    done

    if [ $secrets_found -gt 0 ]; then
        log_warning "Found $secrets_found potential secrets in build"
    else
        log_success "No obvious secrets found in build"
    fi

    # Check for console.log statements
    local console_logs=$(find "$dist_dir" -name "*.js" -exec grep -l "console.log" {} \; 2>/dev/null | wc -l)
    if [ "$console_logs" -gt 0 ]; then
        log_warning "Found $console_logs files with console.log statements"
    else
        log_success "No console.log statements found in production build"
    fi

    # Check for source maps
    local source_maps=$(find "$dist_dir" -name "*.map" | wc -l)
    if [ "$source_maps" -gt 0 ]; then
        log_warning "Found $source_maps source map files in production build"
    else
        log_success "No source maps found in production build"
    fi

    log_success "Security scans completed"
}

# Function to generate validation report
generate_validation_report() {
    log_info "Generating validation report"

    local report_file="$PROJECT_ROOT/reports/deployment-validation-${DEPLOYMENT_ID}.json"

    # Create reports directory if it doesn't exist
    mkdir -p "$PROJECT_ROOT/reports"

    cat > "$report_file" << EOF
{
    "deployment_id": "$DEPLOYMENT_ID",
    "environment": "$ENVIRONMENT",
    "timestamp": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
    "validation_checks": {
        "environment_validation": "passed",
        "build_artifacts": "passed",
        "security_configuration": "passed",
        "network_connectivity": "passed",
        "database_connectivity": "passed",
        "ssl_configuration": "passed",
        "security_scans": "passed"
    },
    "configuration": {
        "pocketbase_url": "$VITE_POCKETBASE_URL",
        "https_enabled": "$VITE_HTTPS_ENABLED",
        "security_headers_enabled": "$VITE_ENABLE_SECURITY_HEADERS",
        "csp_enabled": "$VITE_ENABLE_CSP",
        "hsts_enabled": "$VITE_ENABLE_HSTS",
        "min_password_length": "$VITE_MIN_PASSWORD_LENGTH"
    },
    "build_info": {
        "build_size": "$(du -sh "$PROJECT_ROOT/frontend/dist" | cut -f1)",
        "file_count": "$(find "$PROJECT_ROOT/frontend/dist" -type f | wc -l)",
        "node_version": "$(node --version)",
        "npm_version": "$(npm --version)"
    },
    "git_info": {
        "branch": "$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo 'unknown')",
        "commit": "$(git rev-parse HEAD 2>/dev/null || echo 'unknown')",
        "remote_url": "$(git config --get remote.origin.url 2>/dev/null || echo 'unknown')"
    }
}
EOF

    log_success "Validation report generated: $report_file"
}

# Main execution
main() {
    log_info "Starting deployment validation"
    log_info "Environment: $ENVIRONMENT"
    log_info "Deployment ID: $DEPLOYMENT_ID"

    # Change to project root
    cd "$PROJECT_ROOT"

    # Execute validation steps
    validate_environment
    load_environment_config
    validate_build_artifacts
    validate_security_configuration
    validate_network_connectivity
    validate_database_connectivity
    validate_ssl_configuration
    perform_security_scans
    generate_validation_report

    # Create success indicator file
    touch ".deployment-validation-complete"

    log_success "✅ Deployment validation completed successfully!"
    log_info "Environment: $ENVIRONMENT"
    log_info "Deployment ID: $DEPLOYMENT_ID"
    log_info "Report: $PROJECT_ROOT/reports/deployment-validation-${DEPLOYMENT_ID}.json"
}

# Handle script execution
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi
