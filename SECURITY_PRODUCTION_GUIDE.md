# 🚀 Production Security Guide for pbtodo

This guide provides comprehensive security hardening recommendations for deploying the pbtodo application to production.

## 📋 Security Checklist

### ✅ Critical Security Requirements
- [ ] Environment variables properly configured
- [ ] HTTPS enforced in production
- [ ] Security headers implemented
- [ ] CORS properly configured
- [ ] Rate limiting enabled
- [ ] Password requirements strengthened
- [ ] Admin credentials changed
- [ ] Database backups configured
- [ ] Monitoring and logging set up
- [ ] Security headers validated

---

## 🔐 Authentication & Session Security

### 1. Password Policy Enhancement

Current minimum: 8 characters
Recommended production: 12+ characters with complexity

```bash
# Production .env configuration
VITE_MIN_PASSWORD_LENGTH=12
VITE_REQUIRE_PASSWORD_COMPLEXITY=true
VITE_SESSION_TIMEOUT_MINUTES=480  # 8 hours instead of 24
```

### 2. Session Management

Current: localStorage (vulnerable to XSS)
Recommended: Secure cookies with httpOnly flag

```javascript
// Production session configuration
const sessionConfig = {
  cookieSecure: true,      // HTTPS only
  cookieHttpOnly: true,    // Prevent XSS access
  sameSite: 'strict',      // Prevent CSRF
  maxAge: 8 * 60 * 60,   // 8 hours
}
```

### 3. Rate Limiting

Implement client-side and server-side rate limiting:

```javascript
// Frontend rate limiting
const loginAttempts = {
  maxAttempts: 5,
  windowMs: 60 * 1000,    // 1 minute
  blockDuration: 15 * 60 * 1000,  // 15 minutes
}
```

---

## 🌐 Web Security Headers

### 1. Content Security Policy (CSP)

```http
Content-Security-Policy: default-src 'self'; 
script-src 'self' 'unsafe-inline'; 
style-src 'self' 'unsafe-inline'; 
img-src 'self' data: https:; 
font-src 'self'; 
connect-src 'self'; 
frame-ancestors 'none'; 
base-uri 'self'; 
form-action 'self';
```

### 2. Additional Security Headers

```http
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
X-XSS-Protection: 1; mode=block
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=()
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
```

### 3. HTTPS Enforcement

```nginx
# Nginx configuration
server {
    listen 80;
    server_name yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com;
    
    ssl_certificate /path/to/certificate.crt;
    ssl_certificate_key /path/to/private.key;
    
    # Modern SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512;
    ssl_prefer_server_ciphers off;
    
    # Security headers
    add_header X-Frame-Options DENY always;
    add_header X-Content-Type-Options nosniff always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
    add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'" always;
    
    location / {
        proxy_pass http://127.0.0.1:5173;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    location /api/ {
        proxy_pass http://127.0.0.1:8090;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

---

## 🛡️ PocketBase Security Hardening

### 1. Admin Security

```bash
# Change default admin credentials
./pocketbase admin create

# Use strong admin password
# Minimum: 16 characters with complexity
```

### 2. CORS Configuration

Access Admin Dashboard → Settings → Application:

```json
{
  "allowedOrigins": [
    "https://yourdomain.com",
    "https://app.yourdomain.com"
  ]
}
```

### 3. Database Security

```bash
# Secure database permissions
chmod 600 pb_data/data.db
chmod 700 pb_data/
chown pocketbase:pocketbase -R pb_data/
```

### 4. Production Environment Variables

```bash
# /etc/environment
POCKETBASE_ENCRYPTION_KEY=your-32-character-encryption-key
POCKETBASE_DATA_DIR=/var/lib/pocketbase/pb_data
POCKETBASE_PUBLIC_DIR=/var/lib/pocketbase/pb_public
```

---

## 🔄 Deployment Security

### 1. Reverse Proxy Configuration

Using Nginx as reverse proxy provides additional security:

```nginx
# Hide server information
server_tokens off;

# Prevent buffer overflow attacks
client_body_buffer_size 1K;
client_header_buffer_size 1k;
client_max_body_size 8k;
large_client_header_buffers 2 1k;

# Prevent timeout attacks
client_body_timeout 10;
client_header_timeout 10;
keepalive_timeout 5 5;
send_timeout 10;
```

### 2. Firewall Configuration

```bash
# UFW firewall rules
ufw allow ssh
ufw allow 80/tcp
ufw allow 443/tcp
ufw deny 8090/tcp  # Block direct PocketBase access
ufw enable
```

### 3. SSL Certificate Management

```bash
# Let's Encrypt for free SSL
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
sudo systemctl enable certbot.timer
```

---

## 📊 Monitoring & Logging

### 1. Security Monitoring

```bash
# Log monitoring with fail2ban
sudo apt install fail2ban

# /etc/fail2ban/jail.local
[pocketbase]
enabled = true
port = 8090
filter = pocketbase
logpath = /var/log/nginx/access.log
maxretry = 5
bantime = 3600
```

### 2. Database Backup Strategy

```bash
#!/bin/bash
# /usr/local/bin/backup-pocketbase.sh
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups/pocketbase"
DATA_DIR="/var/lib/pocketbase/pb_data"

mkdir -p $BACKUP_DIR

# Create compressed backup
tar -czf $BACKUP_DIR/pocketbase_$DATE.tar.gz -C $DATA_DIR .

# Keep only 30 days of backups
find $BACKUP_DIR -name "*.tar.gz" -mtime +30 -delete

# Verify backup
if [ $? -eq 0 ]; then
    echo "Backup completed successfully: pocketbase_$DATE.tar.gz"
else
    echo "Backup failed!" | mail -s "PocketBase Backup Error" admin@yourdomain.com
fi
```

```bash
# Add to crontab
0 2 * * * /usr/local/bin/backup-pocketbase.sh
```

### 3. System Monitoring

```bash
# Systemd service monitoring
sudo systemctl edit pocketbase

[Service]
Restart=always
RestartSec=10
WatchdogSec=30
```

---

## 🔍 Security Testing

### 1. Automated Security Scanning

```bash
# OWASP ZAP for security testing
docker run -t owasp/zap2docker-stable zap-baseline.py -t https://yourdomain.com

# Nmap for port scanning
nmap -sV -sC yourdomain.com

# SSL Test
openssl s_client -connect yourdomain.com:443 -tls1_2
```

### 2. Regular Security Audits

- Quarterly security review
- Dependency vulnerability scanning
- Code security review
- Penetration testing

---

## 🚨 Incident Response

### 1. Security Incident Plan

1. **Detection**
   - Monitor failed login attempts
   - Watch for unusual API usage
   - Check error logs for anomalies

2. **Response**
   - Isolate affected systems
   - Rotate credentials
   - Analyze breach scope

3. **Recovery**
   - Apply security patches
   - Restore from clean backups
   - Monitor for continued attacks

### 2. Emergency Commands

```bash
# Emergency lockdown
ufw deny in from $MALICIOUS_IP
systemctl stop pocketbase
systemctl stop nginx

# Security audit
last -n 100
who -a
ps aux --forest
netstat -tulpn
```

---

## 📝 Compliance Considerations

### 1. Data Protection

- GDPR compliance checklist
- Data retention policy
- User data export mechanism
- Secure data deletion

### 2. Privacy Requirements

```javascript
// Data anonymization
function anonymizeUser(user) {
  return {
    id: user.id,
    created: user.created,
    // No personal data
  }
}
```

### 3. Audit Trail

```javascript
// Log all sensitive operations
function auditLog(action, userId, details) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    action,
    userId,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    details
  }
  
  // Store securely for audit purposes
  secureLogger.log(logEntry)
}
```

---

## 🔄 Ongoing Maintenance

### 1. Security Updates

```bash
# Regular updates
sudo apt update && sudo apt upgrade -y
npm audit fix
npm update
```

### 2. Security Best Practices

- Review access logs weekly
- Update dependencies monthly
- Security quarterly reviews
- Annual penetration testing

### 3. Performance Monitoring

```bash
# Monitor system resources
htop
iotop
df -h
free -m

# Monitor application performance
tail -f /var/log/nginx/access.log | grep -v "GET /favicon.ico"
tail -f /var/log/pocketbase/logs.txt
```

---

## 📞 Support & Resources

### Security Documentation
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [PocketBase Security](https://pocketbase.io/docs/security/)
- [Nginx Security Hardening](https://www.nginx.com/resources/admin-guide/security-hardening/)

### Emergency Contacts
- Security Team: security@yourdomain.com
- DevOps Team: devops@yourdomain.com
- Hosting Provider: support@provider.com

---

## ✅ Final Deployment Checklist

Before going live, verify:

- [ ] All environment variables set
- [ ] SSL certificate installed
- [ ] Security headers configured
- [ ] Firewall rules active
- [ ] Backup system running
- [ ] Monitoring configured
- [ ] Rate limiting enabled
- [ ] Admin credentials changed
- [ ] CORS properly configured
- [ ] Security testing completed

---

**⚠️ Important:** This security guide should be reviewed and updated regularly as new threats emerge and security best practices evolve.