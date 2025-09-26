#!/bin/bash

# Production Setup Script for Qahwatal Emarat
# This script helps configure the application for production deployment

set -e

echo "🚀 Qahwatal Emarat Production Setup Script"
echo "=========================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to generate secure random string
generate_secret() {
    openssl rand -base64 32 | tr -d "=+/" | cut -c1-32
}

# Function to hash password
hash_password() {
    local password=$1
    node -e "const bcrypt = require('bcryptjs'); bcrypt.hash('$password', 12).then(hash => console.log(hash));"
}

echo -e "${BLUE}Step 1: Generating secure JWT secret...${NC}"
JWT_SECRET=$(generate_secret)
echo "JWT_SECRET=$JWT_SECRET"

echo -e "\n${BLUE}Step 2: Setting up admin credentials...${NC}"
read -p "Enter admin username [admin]: " ADMIN_USERNAME
ADMIN_USERNAME=${ADMIN_USERNAME:-admin}

read -s -p "Enter admin password (will be hashed): " ADMIN_PASSWORD
echo
if [ -z "$ADMIN_PASSWORD" ]; then
    echo -e "${RED}Error: Admin password cannot be empty${NC}"
    exit 1
fi

echo -e "${YELLOW}Hashing password...${NC}"
ADMIN_PASSWORD_HASHED=$(hash_password "$ADMIN_PASSWORD")

echo -e "\n${BLUE}Step 3: Production environment configuration...${NC}"
read -p "Enter production domain [yourdomain.com]: " DOMAIN
DOMAIN=${DOMAIN:-yourdomain.com}

read -p "Enter MongoDB connection string: " MONGODB_URI
if [ -z "$MONGODB_URI" ]; then
    echo -e "${RED}Error: MongoDB URI is required${NC}"
    exit 1
fi

# Create production .env file
cat > .env.production << EOF
# Production Environment Configuration
NODE_ENV=production
PORT=5050

# Database
MONGODB_URI=$MONGODB_URI

# JWT Authentication
JWT_SECRET=$JWT_SECRET
JWT_EXPIRE=1h

# Admin Credentials
ADMIN_USERNAME=$ADMIN_USERNAME
ADMIN_PASSWORD=$ADMIN_PASSWORD_HASHED

# Password Policy
PASSWORD_MIN_LENGTH=12
PASSWORD_REQUIRE_UPPERCASE=true
PASSWORD_REQUIRE_LOWERCASE=true
PASSWORD_REQUIRE_NUMBERS=true
PASSWORD_REQUIRE_SYMBOLS=true

# CORS
ALLOWED_ORIGINS=https://$DOMAIN,https://www.$DOMAIN

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
EOF

echo -e "${GREEN}✅ Production .env file created: .env.production${NC}"

# Create backup script
echo -e "\n${BLUE}Step 4: Setting up backup system...${NC}"
cat > backup.sh << 'EOF'
#!/bin/bash

# Automated Backup Script for Qahwatal Emarat
# Run this script via cron for automated backups

set -e

BACKUP_DIR="/var/backups/qahwatalemarat"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_NAME="qahwatalemarat_$TIMESTAMP"
RETENTION_DAYS=30

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

echo "Starting database backup: $BACKUP_NAME"

# Create database backup
mongodump --db qahwatalemarat --out "$BACKUP_DIR/$BACKUP_NAME"

# Compress backup
tar -czf "$BACKUP_DIR/${BACKUP_NAME}.tar.gz" -C "$BACKUP_DIR" "$BACKUP_NAME"

# Remove uncompressed backup
rm -rf "$BACKUP_DIR/$BACKUP_NAME"

# Clean up old backups
find "$BACKUP_DIR" -name "*.tar.gz" -mtime +$RETENTION_DAYS -delete

echo "Backup completed: $BACKUP_DIR/${BACKUP_NAME}.tar.gz"
echo "Old backups cleaned up (retention: $RETENTION_DAYS days)"
EOF

chmod +x backup.sh
echo -e "${GREEN}✅ Backup script created: backup.sh${NC}"

# Create cron job setup
echo -e "\n${BLUE}Step 5: Setting up automated backups...${NC}"
echo "To set up automated daily backups at 2 AM, run:"
echo "sudo crontab -e"
echo "Add this line:"
echo "0 2 * * * cd /path/to/your/app/server && ./backup.sh >> backup.log 2>&1"

# Create monitoring script
echo -e "\n${BLUE}Step 6: Setting up monitoring...${NC}"
cat > monitor.sh << 'EOF'
#!/bin/bash

# Monitoring Script for Qahwatal Emarat
# Check system health and rate limiting

LOG_FILE="monitor.log"
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

echo "[$TIMESTAMP] Starting health check..." >> "$LOG_FILE"

# Check if server is running
if curl -s http://localhost:5050/api/health > /dev/null; then
    echo "[$TIMESTAMP] ✅ Server is healthy" >> "$LOG_FILE"
else
    echo "[$TIMESTAMP] ❌ Server is not responding" >> "$LOG_FILE"
    # Send alert (you can integrate with your alerting system)
fi

# Check database connection
if mongosh --eval "db.adminCommand('ping')" qahwatalemarat > /dev/null 2>&1; then
    echo "[$TIMESTAMP] ✅ Database is connected" >> "$LOG_FILE"
else
    echo "[$TIMESTAMP] ❌ Database connection failed" >> "$LOG_FILE"
fi

# Check disk space
DISK_USAGE=$(df / | tail -1 | awk '{print $5}' | sed 's/%//')
if [ "$DISK_USAGE" -gt 90 ]; then
    echo "[$TIMESTAMP] ⚠️  High disk usage: ${DISK_USAGE}%" >> "$LOG_FILE"
fi

# Check rate limiting logs (if you have access logs)
if [ -f "access.log" ]; then
    RATE_LIMITED=$(grep -c "429" access.log 2>/dev/null || echo "0")
    if [ "$RATE_LIMITED" -gt 10 ]; then
        echo "[$TIMESTAMP] ⚠️  High rate limiting activity: $RATE_LIMITED requests blocked" >> "$LOG_FILE"
    fi
fi

echo "[$TIMESTAMP] Health check completed" >> "$LOG_FILE"
EOF

chmod +x monitor.sh
echo -e "${GREEN}✅ Monitoring script created: monitor.sh${NC}"

# Create systemd service file
echo -e "\n${BLUE}Step 7: Creating systemd service...${NC}"
cat > qahwatal-emarat.service << EOF
[Unit]
Description=Qahwatal Emarat Cafe Management System
After=network.target mongodb.service

[Service]
Type=simple
User=www-data
WorkingDirectory=/path/to/your/app/server
Environment=NODE_ENV=production
EnvironmentFile=/path/to/your/app/server/.env.production
ExecStart=/usr/bin/node index.js
Restart=always
RestartSec=10
StandardOutput=syslog
StandardError=syslog
SyslogIdentifier=qahwatal-emarat

[Install]
WantedBy=multi-user.target
EOF

echo -e "${GREEN}✅ Systemd service file created: qahwatal-emarat.service${NC}"
echo -e "${YELLOW}Note: Update the paths in the service file before using${NC}"

echo -e "\n${GREEN}🎉 Production setup completed!${NC}"
echo -e "\n${YELLOW}Next steps:${NC}"
echo "1. Copy .env.production to your server"
echo "2. Update paths in qahwatal-emarat.service"
echo "3. Install the service: sudo cp qahwatal-emarat.service /etc/systemd/system/"
echo "4. Enable and start: sudo systemctl enable qahwatal-emarat && sudo systemctl start qahwatal-emarat"
echo "5. Set up cron job for backups: 0 2 * * * /path/to/backup.sh"
echo "6. Set up monitoring: */5 * * * * /path/to/monitor.sh"
echo -e "\n${BLUE}Remember to:${NC}"
echo "- Keep your .env.production file secure and never commit it to version control"
echo "- Regularly rotate your JWT secret"
echo "- Monitor logs for security issues"
echo "- Keep dependencies updated"</content>
<parameter name="filePath">/Volumes/PERSONAL/Qahwatal Emarat/server/setup-production.sh
