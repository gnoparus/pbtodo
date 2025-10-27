#!/bin/bash

# 🛡️ SSL Certificate Generation Script for pbtodo
#
# This script generates SSL certificates for development and production
# environments with proper security configurations.
#
# Usage:
#   ./generate-ssl.sh [development|production]
#   ./generate-ssl.sh production your-domain.com

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default configuration
SSL_DIR="../ssl"
KEY_SIZE=4096
CERT_DAYS=365
ENVIRONMENT="${1:-development}"
DOMAIN="${2:-localhost}"

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

# Function to check if OpenSSL is available
check_openssl() {
    if ! command -v openssl &> /dev/null; then
        print_error "OpenSSL is not installed or not in PATH"
        print_info "Install OpenSSL: sudo apt-get install openssl (Ubuntu/Debian)"
        print_info "Install OpenSSL: brew install openssl (macOS)"
        exit 1
    fi
}

# Function to create SSL directory
create_ssl_directory() {
    if [[ ! -d "$SSL_DIR" ]]; then
        print_info "Creating SSL directory: $SSL_DIR"
        mkdir -p "$SSL_DIR/certs"
        mkdir -p "$SSL_DIR/private"
        mkdir -p "$SSL_DIR/csr"
        print_success "SSL directory created"
    else
        print_info "SSL directory already exists"
    fi
}

# Function to generate RSA private key
generate_private_key() {
    local key_name="$1"
    local key_path="$SSL_DIR/private/${key_name}.key"

    print_info "Generating RSA $KEY_SIZE-bit private key for $key_name..."

    openssl genrsa \
        -out "$key_path" \
        $KEY_SIZE \
        2>/dev/null

    # Set secure permissions
    chmod 600 "$key_path"

    print_success "Private key generated: $key_path"
}

# Function to create certificate signing request
create_csr() {
    local key_name="$1"
    local domain="$2"
    local csr_path="$SSL_DIR/csr/${key_name}.csr"
    local key_path="$SSL_DIR/private/${key_name}.key"

    print_info "Creating Certificate Signing Request for $domain..."

    # Create configuration for CSR
    local config_path="$SSL_DIR/csr/${key_name}.conf"
    cat > "$config_path" << EOF
[req]
distinguished_name = req_distinguished_name
req_extensions = v3_req
prompt = no

[req_distinguished_name]
C = US
ST = California
L = San Francisco
O = pbtodo
OU = Security Department
CN = $domain

[v3_req]
keyUsage = nonRepudiation, digitalSignature, keyEncipherment
extendedKeyUsage = serverAuth
subjectAltName = @alt_names

[alt_names]
DNS.1 = $domain
DNS.2 = www.$domain
DNS.3 = *.$domain
EOF

    openssl req \
        -new \
        -key "$key_path" \
        -out "$csr_path" \
        -config "$config_path" \
        2>/dev/null

    print_success "CSR created: $csr_path"
}

# Function to generate self-signed certificate
generate_self_signed_cert() {
    local key_name="$1"
    local domain="$2"
    local cert_path="$SSL_DIR/certs/${key_name}.crt"
    local key_path="$SSL_DIR/private/${key_name}.key"
    local csr_path="$SSL_DIR/csr/${key_name}.csr"
    local config_path="$SSL_DIR/csr/${key_name}.conf"

    print_info "Generating self-signed certificate for $domain..."

    openssl x509 \
        -req \
        -in "$csr_path" \
        -signkey "$key_path" \
        -out "$cert_path" \
        -days "$CERT_DAYS" \
        -extensions v3_req \
        -extfile "$config_path" \
        2>/dev/null

    print_success "Certificate generated: $cert_path"
}

# Function to generate DH parameters
generate_dh_params() {
    local dh_path="$SSL_DIR/certs/dhparam.pem"

    if [[ ! -f "$dh_path" ]]; then
        print_info "Generating DH parameters (this may take a few minutes)..."

        openssl dhparam \
            -out "$dh_path" \
            2048 \
            2>/dev/null

        print_success "DH parameters generated: $dh_path"
    else
        print_info "DH parameters already exist"
    fi
}

# Function to validate certificate
validate_certificate() {
    local cert_path="$1"
    local domain="$2"

    print_info "Validating certificate for $domain..."

    if openssl x509 \
        -in "$cert_path" \
        -text \
        -noout \
        2>/dev/null | grep -q "$domain"; then
        print_success "Certificate validation passed"
    else
        print_error "Certificate validation failed"
        return 1
    fi
}

# Function to show certificate information
show_certificate_info() {
    local cert_path="$1"

    print_info "Certificate Information:"
    echo "----------------------------------------"
    openssl x509 \
        -in "$cert_path" \
        -text \
        -noout \
        | grep -A 2 "Subject:"
    openssl x509 \
        -in "$cert_path" \
        -text \
        -noout \
        | grep -A 10 "Subject Alternative Name:"
    openssl x509 \
        -in "$cert_path" \
        -text \
        -noout \
        | grep -A 2 "Not After:"
    echo "----------------------------------------"
}

# Function to generate Let's Encrypt certificate (production)
generate_letsencrypt_cert() {
    local domain="$1"
    local email="${2:-admin@${domain}}"

    print_info "Generating Let's Encrypt certificate for $domain..."

    # Check if certbot is available
    if ! command -v certbot &> /dev/null; then
        print_warning "Certbot not found, installing instructions:"
        print_info "Ubuntu/Debian: sudo apt-get install certbot python3-certbot-nginx"
        print_info "CentOS/RHEL: sudo yum install certbot python3-certbot-nginx"
        print_info "macOS: brew install certbot"
        return 1
    fi

    # Generate certificate using certbot
    certbot certonly \
        --standalone \
        --domain "$domain" \
        --domain "www.$domain" \
        --email "$email" \
        --agree-tos \
        --non-interactive \
        --rsa-key-size "$KEY_SIZE"

    # Copy certificates to SSL directory
    cp "/etc/letsencrypt/live/$domain/fullchain.pem" "$SSL_DIR/certs/${domain}.crt"
    cp "/etc/letsencrypt/live/$domain/privkey.pem" "$SSL_DIR/private/${domain}.key"

    print_success "Let's Encrypt certificate generated"
}

# Function to create development certificates
generate_development_certs() {
    local domain="localhost"

    print_info "Generating development certificates for $domain..."

    generate_private_key "$domain"
    create_csr "$domain" "$domain"
    generate_self_signed_cert "$domain" "$domain"
    validate_certificate "$SSL_DIR/certs/${domain}.crt" "$domain"
    show_certificate_info "$SSL_DIR/certs/${domain}.crt"

    # Generate additional test domains
    for test_domain in "pbtodo.local" "api.pbtodo.local"; do
        print_info "Generating certificate for test domain: $test_domain"
        generate_private_key "$test_domain"
        create_csr "$test_domain" "$test_domain"
        generate_self_signed_cert "$test_domain" "$test_domain"
        validate_certificate "$SSL_DIR/certs/${test_domain}.crt" "$test_domain"
    done

    generate_dh_params
}

# Function to create production certificates
generate_production_certs() {
    local domain="$1"

    if [[ -z "$domain" || "$domain" == "your-domain.com" ]]; then
        print_error "Please provide a valid domain name"
        print_info "Usage: ./generate-ssl.sh production your-domain.com"
        exit 1
    fi

    print_info "Generating production certificates for $domain..."

    # Try Let's Encrypt first
    if ! generate_letsencrypt_cert "$domain"; then
        print_warning "Let's Encrypt failed, falling back to self-signed certificate"
        print_warning "Self-signed certificates are not suitable for production use"
        generate_private_key "$domain"
        create_csr "$domain" "$domain"
        generate_self_signed_cert "$domain" "$domain"
        validate_certificate "$SSL_DIR/certs/${domain}.crt" "$domain"
        show_certificate_info "$SSL_DIR/certs/${domain}.crt"
        print_warning "⚠️  IMPORTANT: Use a proper CA-signed certificate for production!"
    fi

    generate_dh_params
}

# Function to create certificate bundle
create_certificate_bundle() {
    local domain="$1"
    local cert_path="$SSL_DIR/certs/${domain}.crt"
    local bundle_path="$SSL_DIR/certs/${domain}-bundle.crt"

    if [[ -f "$cert_path" ]]; then
        print_info "Creating certificate bundle for $domain..."
        cp "$cert_path" "$bundle_path"
        print_success "Certificate bundle created: $bundle_path"
    fi
}

# Function to set proper permissions
set_permissions() {
    print_info "Setting secure file permissions..."

    # Private keys - readable only by owner
    find "$SSL_DIR/private" -type f -name "*.key" -exec chmod 600 {} \;

    # Certificates - readable by owner and group
    find "$SSL_DIR/certs" -type f -name "*.crt" -exec chmod 644 {} \;

    # DH parameters - readable by all
    find "$SSL_DIR/certs" -name "dhparam.pem" -exec chmod 644 {} \;

    # SSL directories
    chmod 755 "$SSL_DIR"
    chmod 700 "$SSL_DIR/private"
    chmod 755 "$SSL_DIR/certs"
    chmod 755 "$SSL_DIR/csr"

    print_success "File permissions set"
}

# Function to show usage information
show_usage() {
    echo "Usage: $0 [development|production] [domain]"
    echo ""
    echo "Examples:"
    echo "  $0 development                    # Generate development certificates"
    echo "  $0 production your-domain.com    # Generate production certificates"
    echo "  $0 production api.your-domain.com # Generate for subdomain"
    echo ""
    echo "Generated files will be placed in: $SSL_DIR"
}

# Function to cleanup temporary files
cleanup() {
    print_info "Cleaning up temporary files..."
    rm -f "$SSL_DIR/csr"/*.conf
    print_success "Cleanup completed"
}

# Main execution
main() {
    print_info "🛡️ SSL Certificate Generation Script"
    print_info "Environment: $ENVIRONMENT"

    if [[ "$ENVIRONMENT" == "development" ]]; then
        check_openssl
        create_ssl_directory
        generate_development_certs
        set_permissions
        cleanup
        print_success "Development certificates generated successfully!"

    elif [[ "$ENVIRONMENT" == "production" ]]; then
        check_openssl
        create_ssl_directory
        generate_production_certs "$DOMAIN"
        create_certificate_bundle "$DOMAIN"
        set_permissions
        cleanup
        print_success "Production certificates generated successfully!"

        print_warning "⚠️  IMPORTANT SECURITY NOTES:"
        print_warning "1. Store private keys securely"
        print_warning "2. Set up automatic certificate renewal"
        print_warning "3. Monitor certificate expiration"
        print_warning "4. Use a proper CA-signed certificate for production"

    else
        print_error "Invalid environment. Use 'development' or 'production'"
        show_usage
        exit 1
    fi

    print_info "📁 SSL files location: $(realpath "$SSL_DIR")"
    print_info "🔧 Update your Nginx configuration with these paths"
    print_info "🔒 Remember to set proper file permissions on the server"
}

# Trap to handle script interruption
trap cleanup EXIT

# Run main function with all arguments
main "$@"
