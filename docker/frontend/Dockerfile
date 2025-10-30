# 🐳 Multi-stage Dockerfile for pbtodo Frontend
# Security-hardened production-ready container
# Build Stage
FROM node:18-alpine AS builder

# Set build arguments
ARG VITE_POCKETBASE_URL
ARG VITE_HTTPS_ENABLED=true
ARG VITE_DEV_MODE=false
ARG VITE_ENABLE_SECURITY_HEADERS=true
ARG VITE_ENABLE_CSP=true
ARG VITE_ENABLE_HSTS=true
ARG VITE_MIN_PASSWORD_LENGTH=12
ARG VITE_REQUIRE_PASSWORD_COMPLEXITY=true

# Install build dependencies
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    && rm -rf /var/cache/apk/*

# Set working directory
WORKDIR /app

# Copy package files
COPY frontend/package*.json ./
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy source code
COPY frontend/ .

# Set build environment variables
ENV NODE_ENV=production
ENV VITE_POCKETBASE_URL=${VITE_POCKETBASE_URL}
ENV VITE_HTTPS_ENABLED=${VITE_HTTPS_ENABLED}
ENV VITE_DEV_MODE=${VITE_DEV_MODE}
ENV VITE_ENABLE_SECURITY_HEADERS=${VITE_ENABLE_SECURITY_HEADERS}
ENV VITE_ENABLE_CSP=${VITE_ENABLE_CSP}
ENV VITE_ENABLE_HSTS=${VITE_ENABLE_HSTS}
ENV VITE_MIN_PASSWORD_LENGTH=${VITE_MIN_PASSWORD_LENGTH}
ENV VITE_REQUIRE_PASSWORD_COMPLEXITY=${VITE_REQUIRE_PASSWORD_COMPLEXITY}

# Build application
RUN npm run build

# Production Stage
FROM nginx:alpine AS production

# Install security and monitoring tools
RUN apk add --no-cache \
    curl \
    tini \
    && rm -rf /var/cache/apk/*

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001

# Set working directory
WORKDIR /usr/share/nginx/html

# Copy custom nginx configuration
COPY docker/frontend/nginx.conf /etc/nginx/nginx.conf
COPY docker/frontend/default.conf /etc/nginx/conf.d/default.conf

# Copy built application from builder
COPY --from=builder /app/dist ./

# Set proper permissions
RUN chown -R nextjs:nodejs /usr/share/nginx/html && \
    chown -R nextjs:nodejs /var/cache/nginx && \
    chown -R nextjs:nodejs /var/log/nginx && \
    chown -R nextjs:nodejs /etc/nginx/conf.d

# Create health check endpoint
RUN echo '#!/bin/sh' > /usr/local/bin/healthcheck.sh && \
    echo 'curl -f http://localhost:80/ || exit 1' >> /usr/local/bin/healthcheck.sh && \
    chmod +x /usr/local/bin/healthcheck.sh

# Security: Remove unnecessary files
RUN rm -rf /var/cache/nginx/* && \
    rm -rf /tmp/* && \
    rm -rf /usr/share/nginx/html/*.map && \
    find /usr/share/nginx/html -name "*.txt" -delete && \
    find /usr/share/nginx/html -name "*.md" -delete

# Expose port
EXPOSE 8080

# Switch to non-root user
USER nextjs

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD /usr/local/bin/healthcheck.sh

# Use tini as init system
ENTRYPOINT ["/sbin/tini", "--"]

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
