#!/bin/bash

# Secure Secrets Generator for Qahwatal Emarat
# Generates cryptographically secure secrets for production use

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🔐 Qahwatal Emarat Secure Secrets Generator${NC}"
echo "=============================================="

# Function to generate secure random string
generate_secret() {
    local length=${1:-32}
    openssl rand -base64 64 | tr -d "=+/" | cut -c1-$length
}

# Function to generate secure password
generate_password() {
    local length=${1:-16}
    # Generate a simple alphanumeric password without special characters that could break eval
    openssl rand -hex $((length/2)) | cut -c1-$length
}

# Function to hash password with bcrypt
hash_password() {
    local password=$1
    # Escape single quotes in password for eval
    local escaped_password=$(printf '%q' "$password")
    node -e "
    const bcrypt = require('bcryptjs');
    bcrypt.hash('${escaped_password}', 12).then(hash => {
        console.log(hash);
    }).catch(err => {
        console.error('Error hashing password:', err);
        process.exit(1);
    });
    "
}

echo -e "\n${BLUE}Generating secure secrets...${NC}"

# Generate JWT Secret
echo -e "${YELLOW}1. JWT Secret (32 chars)${NC}"
JWT_SECRET=$(generate_secret 32)
echo "JWT_SECRET=$JWT_SECRET"

# Generate Session Secret
echo -e "\n${YELLOW}2. Session Secret (32 chars)${NC}"
SESSION_SECRET=$(generate_secret 32)
echo "SESSION_SECRET=$SESSION_SECRET"

# Generate API Key
echo -e "\n${YELLOW}3. API Key (24 chars)${NC}"
API_KEY=$(generate_secret 24)
echo "API_KEY=$API_KEY"

# Generate Database Password
echo -e "\n${YELLOW}4. Database Password (16 chars)${NC}"
DB_PASSWORD=$(generate_password 16)
echo "DB_PASSWORD=$DB_PASSWORD"

# Admin Password Setup
echo -e "\n${BLUE}Admin Credentials Setup${NC}"
echo "========================"

read -p "Enter admin username [admin]: " ADMIN_USERNAME
ADMIN_USERNAME=${ADMIN_USERNAME:-admin}

echo -e "${YELLOW}Choose admin password option:${NC}"
echo "1. Generate secure random password"
echo "2. Enter custom password"
read -p "Enter choice (1 or 2): " PASSWORD_CHOICE

case $PASSWORD_CHOICE in
    1)
        ADMIN_PASSWORD=$(generate_password 16)
        echo -e "${GREEN}Generated admin password: $ADMIN_PASSWORD${NC}"
        ;;
    2)
        read -s -p "Enter admin password: " ADMIN_PASSWORD
        echo
        if [ -z "$ADMIN_PASSWORD" ]; then
            echo -e "${RED}Error: Password cannot be empty${NC}"
            exit 1
        fi
        ;;
    *)
        echo -e "${RED}Invalid choice. Exiting.${NC}"
        exit 1
        ;;
esac

echo -e "\n${YELLOW}Hashing admin password...${NC}"
ADMIN_PASSWORD_HASHED=$(hash_password "$ADMIN_PASSWORD")

# Create secrets file
SECRETS_FILE=".env.production.secrets"
cat > "$SECRETS_FILE" << EOF
# Production Secrets - Generated on $(date)
# ⚠️  WARNING: Keep this file secure and never commit to version control!

# JWT Authentication
JWT_SECRET=$JWT_SECRET
JWT_EXPIRE=1h

# Session Management
SESSION_SECRET=$SESSION_SECRET

# API Security
API_KEY=$API_KEY

# Database
DB_PASSWORD=$DB_PASSWORD

# Admin Credentials
ADMIN_USERNAME=$ADMIN_USERNAME
ADMIN_PASSWORD=$ADMIN_PASSWORD_HASHED

# Security Headers
CSP_NONCE_SECRET=$(generate_secret 16)
EOF

echo -e "\n${GREEN}✅ Secrets generated and saved to: $SECRETS_FILE${NC}"

# Create production environment template
TEMPLATE_FILE=".env.production.template"
cat > "$TEMPLATE_FILE" << 'EOF'
# Production Environment Configuration Template
# Copy this file to .env.production and fill in your values

NODE_ENV=production
PORT=5050

# Database
MONGODB_URI=mongodb+srv://username:DB_PASSWORD@cluster.mongodb.net/qahwatalemarat?retryWrites=true&w=majority

# JWT Authentication
JWT_SECRET=YOUR_JWT_SECRET_HERE
JWT_EXPIRE=1h

# Session Management
SESSION_SECRET=YOUR_SESSION_SECRET_HERE

# API Security
API_KEY=YOUR_API_KEY_HERE

# Admin Credentials
ADMIN_USERNAME=admin
ADMIN_PASSWORD=YOUR_HASHED_PASSWORD_HERE

# Password Policy
PASSWORD_MIN_LENGTH=12
PASSWORD_REQUIRE_UPPERCASE=true
PASSWORD_REQUIRE_LOWERCASE=true
PASSWORD_REQUIRE_NUMBERS=true
PASSWORD_REQUIRE_SYMBOLS=true

# CORS
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=1000

# Security
FORCE_HTTPS=true

# Logging
LOG_LEVEL=info

# Backup Configuration
BACKUP_SCHEDULE=0 2 * * *
BACKUP_RETENTION_DAYS=30
BACKUP_PATH=/var/backups/qahwatalemarat

# SSL Configuration (if using custom certificate)
SSL_KEY_PATH=/path/to/ssl/private.key
SSL_CERT_PATH=/path/to/ssl/certificate.crt

# Monitoring
ALERT_EMAIL=admin@yourdomain.com
SERVER_URL=https://yourdomain.com

# Security Headers
CSP_NONCE_SECRET=YOUR_CSP_NONCE_SECRET_HERE
EOF

echo -e "${GREEN}✅ Production template created: $TEMPLATE_FILE${NC}"

# Security recommendations
echo -e "\n${BLUE}🔒 Security Recommendations:${NC}"
echo "=============================="
echo "1. Store secrets securely (use a password manager or secret management service)"
echo "2. Rotate secrets regularly (recommended: every 90 days)"
echo "3. Use different secrets for each environment"
echo "4. Never commit secrets to version control"
echo "5. Use environment variables or secure secret stores in production"
echo "6. Limit access to secret files (chmod 600)"
echo "7. Monitor for secret leaks using tools like git-secrets or truffleHog"

# Set restrictive permissions on secrets file
chmod 600 "$SECRETS_FILE"

echo -e "\n${GREEN}🎉 Secrets generation completed!${NC}"
echo -e "${YELLOW}Remember:${NC}"
echo "- Keep $SECRETS_FILE secure and never share it"
echo "- Use the template to configure your production environment"
echo "- Rotate secrets periodically for maximum security"
