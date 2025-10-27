#!/bin/bash

# 🚀 CI Environment Setup Script
# Sets up environment variables and configuration for CI/CD pipelines
#
# Usage:
#   ./setup-environment.sh [environment]
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
ENVIRONMENT="${1:-development}"

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
    log_info "Validating environment: $ENVIRONMENT"

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

# Function to validate required environment variables
validate_required_variables() {
    log_info "Validating required environment variables"

    local required_vars=(
        "VITE_POCKETBASE_URL"
        "VITE_HTTPS_ENABLED"
        "VITE_ENABLE_SECURITY_HEADERS"
        "VITE_ENABLE_CSP"
    )

    local missing_vars=0

    for var in "${required_vars[@]}"; do
        if [ -z "${!var:-}" ]; then
            log_error "Missing required environment variable: $var"
            missing_vars=$((missing_vars + 1))
        else
            log_info "✓ $var is set"
        fi
    done

    if [ $missing_vars -gt 0 ]; then
        log_error "Validation failed: $missing_vars missing environment variables"
        exit 1
    fi

    log_success "All required environment variables are set"
}

# Function to setup Node.js environment
setup_node_environment() {
    log_info "Setting up Node.js environment"

    # Verify Node.js version
    if command -v node >/dev/null 2>&1; then
        local node_version=$(node --version)
        log_info "Node.js version: $node_version"

        # Check if Node.js version is >= 18
        local node_major_version=$(echo "$node_version" | cut -d'.' -f1 | sed 's/v//')
        if [ "$node_major_version" -lt 18 ]; then
            log_error "Node.js version 18 or higher is required (found: $node_version)"
            exit 1
        fi

        log_success "Node.js version check passed"
    else
        log_error "Node.js is not installed"
        exit 1
    fi

    # Verify npm version
    if command -v npm >/dev/null 2>&1; then
        local npm_version=$(npm --version)
        log_info "npm version: $npm_version"
        log_success "npm check passed"
    else
        log_error "npm is not installed"
        exit 1
    fi
}

# Function to setup build environment
setup_build_environment() {
    log_info "Setting up build environment"

    # Create build directories if they don't exist
    mkdir -p "$PROJECT_ROOT/frontend/dist"
    mkdir -p "$PROJECT_ROOT/build"
    mkdir -p "$PROJECT_ROOT/artifacts"
    mkdir -p "$PROJECT_ROOT/reports"

    # Set build permissions
    chmod 755 "$PROJECT_ROOT/frontend/dist"
    chmod 755 "$PROJECT_ROOT/build"
    chmod 755 "$PROJECT_ROOT/artifacts"
    chmod 755 "$PROJECT_ROOT/reports"

    log_success "Build environment setup completed"
}

# Function to setup security environment
setup_security_environment() {
    log_info "Setting up security environment"

    # Set secure umask
    umask 022

    # Create security directories
    mkdir -p "$PROJECT_ROOT/security"
    mkdir -p "$PROJECT_ROOT/security/reports"
    mkdir -p "$PROJECT_ROOT/security/scans"

    # Set security directory permissions
    chmod 700 "$PROJECT_ROOT/security"
    chmod 700 "$PROJECT_ROOT/security/reports"
    chmod 700 "$PROJECT_ROOT/security/scans"

    # Export security environment variables
    export NODE_ENV="${ENVIRONMENT}"
    export CI=true
    export BUILD_NUMBER="${BUILD_NUMBER:-$RANDOM}"
    export BUILD_ID="${BUILD_ID:-$(date +%Y%m%d%H%M%S)}"

    log_success "Security environment setup completed"
}

# Function to generate environment report
generate_environment_report() {
    log_info "Generating environment report"

    local report_file="$PROJECT_ROOT/reports/environment-report-${BUILD_ID}.json"

    cat > "$report_file" << EOF
{
    "environment": "$ENVIRONMENT",
    "node_version": "$(node --version)",
    "npm_version": "$(npm --version)",
    "build_id": "$BUILD_ID",
    "build_number": "$BUILD_NUMBER",
    "timestamp": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
    "pocketbase_url": "$VITE_POCKETBASE_URL",
    "https_enabled": "$VITE_HTTPS_ENABLED",
    "security_headers_enabled": "$VITE_ENABLE_SECURITY_HEADERS",
    "csp_enabled": "$VITE_ENABLE_CSP",
    "hsts_enabled": "$VITE_ENABLE_HSTS",
    "working_directory": "$PWD",
    "project_root": "$PROJECT_ROOT",
    "git_branch": "${GIT_BRANCH:-$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo 'unknown')}",
    "git_commit": "${GIT_COMMIT:-$(git rev-parse HEAD 2>/dev/null || echo 'unknown')}"
}
EOF

    log_success "Environment report generated: $report_file"
}

# Function to setup monitoring
setup_monitoring() {
    log_info "Setting up monitoring environment"

    # Create monitoring directories
    mkdir -p "$PROJECT_ROOT/monitoring"
    mkdir -p "$PROJECT_ROOT/monitoring/metrics"
    mkdir -p "$PROJECT_ROOT/monitoring/logs"
    mkdir -p "$PROJECT_ROOT/monitoring/traces"

    # Set monitoring environment variables
    export MONITORING_ENABLED="${MONITORING_ENABLED:-true}"
    export METRICS_ENABLED="${METRICS_ENABLED:-true}"
    export LOG_LEVEL="${LOG_LEVEL:-info}"

    log_success "Monitoring environment setup completed"
}

# Function to validate system requirements
validate_system_requirements() {
    log_info "Validating system requirements"

    # Check available disk space (require at least 1GB)
    local available_space=$(df . | tail -1 | awk '{print $4}')
    local required_space=1048576  # 1GB in KB

    if [ "$available_space" -lt "$required_space" ]; then
        log_warning "Low disk space: ${available_space}KB available, ${required_space}KB recommended"
    fi

    # Check available memory
    if command -v free >/dev/null 2>&1; then
        local available_memory=$(free -m | awk 'NR==2{printf "%.0f", $7}')
        if [ "$available_memory" -lt 512 ]; then
            log_warning "Low memory: ${available_memory}MB available, 512MB recommended"
        fi
    fi

    # Check network connectivity if PocketBase URL is external
    if [[ "$VITE_POCKETBASE_URL" == http* ]] && [[ "$VITE_POCKETBASE_URL" != *"localhost"* ]] && [[ "$VITE_POCKETBASE_URL" != *"127.0.0.1"* ]]; then
        log_info "Testing connectivity to PocketBase server: $VITE_POCKETBASE_URL"
        if curl -f -s --connect-timeout 5 "$VITE_POCKETBASE_URL/api/health" >/dev/null 2>&1; then
            log_success "PocketBase server is reachable"
        else
            log_warning "PocketBase server may not be reachable"
        fi
    fi

    log_success "System requirements validation completed"
}

# Main execution
main() {
    log_info "Starting CI environment setup for: $ENVIRONMENT"
    log_info "Project root: $PROJECT_ROOT"

    # Change to project root
    cd "$PROJECT_ROOT"

    # Execute setup steps
    validate_environment
    load_environment_config
    validate_required_variables
    setup_node_environment
    setup_build_environment
    setup_security_environment
    setup_monitoring
    validate_system_requirements
    generate_environment_report

    # Create success indicator file
    touch ".environment-setup-complete"

    log_success "✅ CI environment setup completed successfully!"
    log_info "Environment: $ENVIRONMENT"
    log_info "Build ID: $BUILD_ID"
    log_info "Ready to start CI/CD pipeline"
}

# Handle script execution
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi
