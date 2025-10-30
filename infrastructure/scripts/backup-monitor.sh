#!/bin/bash

# 🛡️ Backup and Monitoring Script for pbtodo
#
# This script provides automated backups, monitoring, and health checks
# for the PocketBase database and application infrastructure.
#
# Usage:
#   ./backup-monitor.sh backup          # Create backup
#   ./backup-monitor.sh monitor         # Run monitoring checks
#   ./backup-monitor.sh cleanup         # Clean old backups
#   ./backup-monitor.sh schedule        # Setup cron jobs

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
POCKETBASE_DIR="../../pocketbase"
BACKUP_DIR="../../backups"
LOG_DIR="$POCKETBASE_DIR/pb_data"
CONFIG_FILE="$POCKETBASE_DIR/pb_config.json"
RETENTION_DAYS=30
BACKUP_TYPE="${1:-backup}"

# Monitoring thresholds
MAX_DB_SIZE_MB=1000
MAX_LOG_SIZE_MB=500
MAX_BACKUP_AGE_HOURS=72
MIN_DISK_SPACE_GB=5

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

print_alert() {
    echo -e "${RED}🚨 $1${NC}"
}

# Function to log events
log_event() {
    local level="$1"
    local message="$2"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')

    echo "[$timestamp] [$level] $message" >> "$BACKUP_DIR/monitoring.log"

    if [[ "$level" == "ERROR" || "$level" == "ALERT" ]]; then
        echo "[$timestamp] [$level] $message" >&2
    fi
}

# Function to check prerequisites
check_prerequisites() {
    if [[ ! -f "$CONFIG_FILE" ]]; then
        print_error "PocketBase configuration not found: $CONFIG_FILE"
        exit 1
    fi

    if [[ ! -d "$POCKETBASE_DIR/pb_data" ]]; then
        print_error "PocketBase data directory not found: $POCKETBASE_DIR/pb_data"
        exit 1
    fi

    mkdir -p "$BACKUP_DIR"
    mkdir -p "$BACKUP_DIR/databases"
    mkdir -p "$BACKUP_DIR/logs"
    mkdir -p "$BACKUP_DIR/configs"
    mkdir -p "$BACKUP_DIR/reports"

    print_success "Prerequisites checked"
}

# Function to get database size
get_database_size() {
    local db_file="$POCKETBASE_DIR/pb_data/data.db"
    if [[ -f "$db_file" ]]; then
        local size_bytes=$(stat -f%z "$db_file" 2>/dev/null || stat -c%s "$db_file" 2>/dev/null || echo 0)
        echo $((size_bytes / 1024 / 1024))  # Convert to MB
    else
        echo 0
    fi
}

# Function to check disk space
check_disk_space() {
    local available_gb=$(df . | tail -1 | awk '{print int($4/1024/1024)}')
    echo "$available_gb"
}

# Function to create database backup
create_database_backup() {
    local timestamp=$(date '+%Y%m%d_%H%M%S')
    local backup_file="$BACKUP_DIR/databases/pbtodo_db_$timestamp.gz"
    local db_file="$POCKETBASE_DIR/pb_data/data.db"

    print_info "Creating database backup..."

    if [[ ! -f "$db_file" ]]; then
        print_error "Database file not found: $db_file"
        return 1
    fi

    # Create compressed backup
    if gzip -c "$db_file" > "$backup_file"; then
        # Verify backup integrity
        if gunzip -t "$backup_file" 2>/dev/null; then
            local backup_size=$(stat -f%z "$backup_file" 2>/dev/null || stat -c%s "$backup_file" 2>/dev/null || echo 0)
            print_success "Database backup created: $backup_file ($(printf "%.1f" $(echo "$backup_size/1024/1024" | bc -l)) MB)"
            log_event "INFO" "Database backup created: $backup_file"

            # Create checksum
            sha256sum "$backup_file" > "$backup_file.sha256"

            return 0
        else
            print_error "Backup verification failed: $backup_file"
            rm -f "$backup_file"
            return 1
        fi
    else
        print_error "Failed to create database backup"
        return 1
    fi
}

# Function to create configuration backup
create_config_backup() {
    local timestamp=$(date '+%Y%m%d_%H%M%S')
    local backup_file="$BACKUP_DIR/configs/pbtodo_config_$timestamp.tar.gz"

    print_info "Creating configuration backup..."

    # Create tar archive of configuration files
    if tar -czf "$backup_file" -C "$POCKETBASE_DIR" \
        pb_config.json \
        .encryption_key \
        pb_migrations/ \
        2>/dev/null; then

        print_success "Configuration backup created: $backup_file"
        log_event "INFO" "Configuration backup created: $backup_file"

        # Create checksum
        sha256sum "$backup_file" > "$backup_file.sha256"

        return 0
    else
        print_error "Failed to create configuration backup"
        return 1
    fi
}

# Function to create log backup
create_log_backup() {
    local timestamp=$(date '+%Y%m%d_%H%M%S')
    local backup_file="$BACKUP_DIR/logs/pbtodo_logs_$timestamp.tar.gz"

    print_info "Creating log backup..."

    # Create tar archive of log files
    if tar -czf "$backup_file" -C "$POCKETBASE_DIR/pb_data" \
        logs.txt \
        audit.log \
        2>/dev/null; then

        print_success "Log backup created: $backup_file"
        log_event "INFO" "Log backup created: $backup_file"

        # Create checksum
        sha256sum "$backup_file" > "$backup_file.sha256"

        return 0
    else
        print_error "Failed to create log backup"
        return 1
    fi
}

# Function to verify backup integrity
verify_backup() {
    local backup_file="$1"

    if [[ -f "$backup_file.sha256" ]]; then
        local expected_hash=$(cat "$backup_file.sha256" | awk '{print $1}')
        local actual_hash=$(sha256sum "$backup_file" | awk '{print $1}')

        if [[ "$expected_hash" == "$actual_hash" ]]; then
            print_success "Backup integrity verified: $backup_file"
            return 0
        else
            print_error "Backup integrity check failed: $backup_file"
            return 1
        fi
    else
        print_warning "No checksum file found for: $backup_file"
        return 2
    fi
}

# Function to clean old backups
cleanup_old_backups() {
    print_info "Cleaning up old backups (older than $RETENTION_DAYS days)..."

    local cleaned_files=0
    local cleanup_time=$(date -d "$RETENTION_DAYS days ago" '+%Y%m%d%H%M%S' 2>/dev/null || date -v-${RETENTION_DAYS}d '+%Y%m%d%H%M%S')

    # Clean database backups
    for backup_file in "$BACKUP_DIR/databases"/*.gz; do
        if [[ -f "$backup_file" ]]; then
            local file_date=$(basename "$backup_file" | grep -o '[0-9]\{8\}_[0-9]\{6\}' || echo "")
            if [[ -n "$file_date" && "$file_date" < "$cleanup_time" ]]; then
                rm -f "$backup_file" "$backup_file.sha256"
                ((cleaned_files++))
                log_event "INFO" "Removed old backup: $backup_file"
            fi
        fi
    done

    # Clean configuration backups
    for backup_file in "$BACKUP_DIR/configs"/*.tar.gz; do
        if [[ -f "$backup_file" ]]; then
            local file_date=$(basename "$backup_file" | grep -o '[0-9]\{8\}_[0-9]\{6\}' || echo "")
            if [[ -n "$file_date" && "$file_date" < "$cleanup_time" ]]; then
                rm -f "$backup_file" "$backup_file.sha256"
                ((cleaned_files++))
                log_event "INFO" "Removed old config backup: $backup_file"
            fi
        fi
    done

    # Clean log backups
    for backup_file in "$BACKUP_DIR/logs"/*.tar.gz; do
        if [[ -f "$backup_file" ]]; then
            local file_date=$(basename "$backup_file" | grep -o '[0-9]\{8\}_[0-9]\{6\}' || echo "")
            if [[ -n "$file_date" && "$file_date" < "$cleanup_time" ]]; then
                rm -f "$backup_file" "$backup_file.sha256"
                ((cleaned_files++))
                log_event "INFO" "Removed old log backup: $backup_file"
            fi
        fi
    done

    if [[ $cleaned_files -gt 0 ]]; then
        print_success "Cleaned up $cleaned_files old backup files"
    else
        print_info "No old backup files to clean"
    fi
}

# Function to check database health
check_database_health() {
    local db_file="$POCKETBASE_DIR/pb_data/data.db"
    local issues=0

    print_info "Checking database health..."

    if [[ ! -f "$db_file" ]]; then
        print_alert "Database file not found!"
        log_event "ALERT" "Database file missing: $db_file"
        return 1
    fi

    # Check database size
    local db_size_mb=$(get_database_size)
    if [[ $db_size_mb -gt $MAX_DB_SIZE_MB ]]; then
        print_warning "Database size is large: ${db_size_mb} MB (threshold: ${MAX_DB_SIZE_MB} MB)"
        log_event "WARNING" "Database size exceeded threshold: ${db_size_mb} MB"
        ((issues++))
    fi

    # Check database file permissions
    local db_perms=$(stat -f "%A" "$db_file" 2>/dev/null || stat -c "%a" "$db_file" 2>/dev/null || echo "")
    if [[ "$db_perms" != "600" ]]; then
        print_warning "Database permissions are not secure: $db_perms (should be 600)"
        log_event "WARNING" "Database permissions not secure: $db_perms"
        ((issues++))
    fi

    # Check database file integrity (basic check)
    if ! file "$db_file" | grep -q "SQLite"; then
        print_error "Database file may be corrupted!"
        log_event "ERROR" "Database file corruption suspected"
        ((issues++))
    fi

    if [[ $issues -eq 0 ]]; then
        print_success "Database health check passed"
    else
        print_warning "Database health check found $issues issues"
    fi

    return $issues
}

# Function to check application logs
check_application_logs() {
    local log_file="$LOG_DIR/logs.txt"
    local audit_file="$LOG_DIR/audit.log"
    local issues=0

    print_info "Checking application logs..."

    # Check log file sizes
    for log_path in "$log_file" "$audit_file"; do
        if [[ -f "$log_path" ]]; then
            local log_size_mb=$(stat -f%z "$log_path" 2>/dev/null || stat -c%s "$log_path" 2>/dev/null || echo 0)
            log_size_mb=$((log_size_mb / 1024 / 1024))

            if [[ $log_size_mb -gt $MAX_LOG_SIZE_MB ]]; then
                print_warning "Log file is large: $(basename "$log_path") ${log_size_mb} MB"
                log_event "WARNING" "Log file size exceeded threshold: $(basename "$log_path") ${log_size_mb} MB"
                ((issues++))
            fi
        fi
    done

    # Check for recent errors in logs
    if [[ -f "$log_file" ]]; then
        local recent_errors=$(tail -100 "$log_file" 2>/dev/null | grep -c -i "error\|exception\|panic" || echo 0)
        if [[ $recent_errors -gt 5 ]]; then
            print_warning "High number of recent errors in logs: $recent_errors"
            log_event "WARNING" "High error rate detected: $recent_errors errors in last 100 lines"
            ((issues++))
        fi
    fi

    # Check for recent failed authentications
    if [[ -f "$audit_file" ]]; then
        local recent_failed_auth=$(tail -100 "$audit_file" 2>/dev/null | grep -c "auth-with-password.*401\|403" || echo 0)
        if [[ $recent_failed_auth -gt 10 ]]; then
            print_warning "High number of failed authentication attempts: $recent_failed_auth"
            log_event "WARNING" "High failed authentication rate: $recent_failed_auth in last 100 lines"
            ((issues++))
        fi
    fi

    if [[ $issues -eq 0 ]]; then
        print_success "Application logs check passed"
    else
        print_warning "Application logs check found $issues issues"
    fi

    return $issues
}

# Function to check system resources
check_system_resources() {
    local issues=0

    print_info "Checking system resources..."

    # Check disk space
    local available_gb=$(check_disk_space)
    if [[ $available_gb -lt $MIN_DISK_SPACE_GB ]]; then
        print_alert "Low disk space: ${available_gb} GB available (minimum: ${MIN_DISK_SPACE_GB} GB)"
        log_event "ALERT" "Low disk space: ${available_gb} GB available"
        ((issues++))
    fi

    # Check memory usage
    if command -v free >/dev/null 2>&1; then
        local mem_usage=$(free | awk 'NR==2{printf "%.0f", $3*100/$2}')
        if [[ $mem_usage -gt 90 ]]; then
            print_warning "High memory usage: ${mem_usage}%"
            log_event "WARNING" "High memory usage: ${mem_usage}%"
            ((issues++))
        fi
    fi

    # Check load average
    if command -v uptime >/dev/null 2>&1; then
        local load_avg=$(uptime | awk -F'load average:' '{print $2}' | awk '{print $1}' | sed 's/,//')
        local load_num=$(echo "$load_avg" | awk '{print int($1)}')
        if [[ $load_num -gt 4 ]]; then
            print_warning "High system load: $load_avg"
            log_event "WARNING" "High system load: $load_avg"
            ((issues++))
        fi
    fi

    if [[ $issues -eq 0 ]]; then
        print_success "System resources check passed"
    else
        print_warning "System resources check found $issues issues"
    fi

    return $issues
}

# Function to generate monitoring report
generate_monitoring_report() {
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    local report_file="$BACKUP_DIR/reports/monitoring_report_$(date '+%Y%m%d_%H%M%S').json"

    print_info "Generating monitoring report..."

    # Collect system information
    local db_size=$(get_database_size)
    local available_gb=$(check_disk_space)
    local backup_count=$(find "$BACKUP_DIR/databases" -name "*.gz" | wc -l)
    local last_backup=$(ls -t "$BACKUP_DIR/databases"/*.gz 2>/dev/null | head -1 | xargs basename 2>/dev/null || echo "None")

    # Create JSON report
    cat > "$report_file" << EOF
{
    "timestamp": "$timestamp",
    "database": {
        "size_mb": $db_size,
        "max_size_mb": $MAX_DB_SIZE_MB,
        "file_exists": $([ -f "$POCKETBASE_DIR/pb_data/data.db" ] && echo "true" || echo "false")
    },
    "system": {
        "available_disk_gb": $available_gb,
        "min_disk_gb": $MIN_DISK_SPACE_GB,
        "load_average": "$(uptime | awk -F'load average:' '{print $2}' | awk '{print $1}' | sed 's/,//' || echo 'N/A')"
    },
    "backups": {
        "total_count": $backup_count,
        "last_backup": "$last_backup",
        "retention_days": $RETENTION_DAYS
    },
    "status": "healthy",
    "alerts": []
}
EOF

    print_success "Monitoring report generated: $report_file"
    log_event "INFO" "Monitoring report generated: $report_file"
}

# Function to send alerts (placeholder for implementation)
send_alert() {
    local message="$1"
    local severity="$2"

    print_alert "ALERT: $message"
    log_event "ALERT" "$message"

    # TODO: Implement email, Slack, or webhook notifications
    # Example webhook implementation:
    # if [[ -n "${WEBHOOK_URL:-}" ]]; then
    #     curl -X POST "$WEBHOOK_URL" \
    #         -H "Content-Type: application/json" \
    #         -d "{\"text\": \"🚨 $severity: $message\", \"severity\": \"$severity\"}"
    # fi
}

# Function to setup cron jobs
setup_cron_jobs() {
    print_info "Setting up cron jobs for automated tasks..."

    local cron_file="$BACKUP_DIR/pbtodo.cron"
    local script_path="$(realpath "$0")"

    cat > "$cron_file" << EOF
# pbtodo Automated Tasks
# Backup database daily at 2 AM
0 2 * * * $script_path backup >/dev/null 2>&1

# Run monitoring checks every hour
0 * * * * $script_path monitor >/dev/null 2>&1

# Clean up old backups weekly on Sunday at 3 AM
0 3 * * 0 $script_path cleanup >/dev/null 2>&1

# Generate monitoring report daily at 6 AM
0 6 * * * $script_path report >/dev/null 2>&1
EOF

    print_info "Cron jobs configuration created: $cron_file"
    print_info "To install, run: crontab $cron_file"
    print_info "To view current crontab: crontab -l"

    # Install if running as root with flag
    if [[ "${INSTALL_CRON:-}" == "true" ]]; then
        crontab "$cron_file"
        print_success "Cron jobs installed"
    fi
}

# Function to show usage information
show_usage() {
    echo "Usage: $0 [backup|monitor|cleanup|schedule|report]"
    echo ""
    echo "Commands:"
    echo "  backup    Create database, config, and log backups"
    echo "  monitor   Run health and security monitoring checks"
    echo "  cleanup   Remove old backup files"
    echo "  schedule  Setup cron jobs for automation"
    echo "  report    Generate monitoring report"
    echo ""
    echo "Environment Variables:"
    echo "  INSTALL_CRON=true    Install cron jobs when running schedule"
}

# Main function
main() {
    local command="${1:-backup}"

    print_info "🛡️ pbtodo Backup and Monitoring Script"
    print_info "Command: $command"

    check_prerequisites

    case "$command" in
        backup)
            create_database_backup
            create_config_backup
            create_log_backup
            ;;
        monitor)
            check_database_health
            check_application_logs
            check_system_resources
            generate_monitoring_report
            ;;
        cleanup)
            cleanup_old_backups
            ;;
        schedule)
            setup_cron_jobs
            ;;
        report)
            generate_monitoring_report
            ;;
        *)
            print_error "Invalid command: $command"
            show_usage
            exit 1
            ;;
    esac

    log_event "INFO" "Command '$command' completed successfully"
    print_success "Operation completed successfully"
}

# Run main function with all arguments
main "$@"
