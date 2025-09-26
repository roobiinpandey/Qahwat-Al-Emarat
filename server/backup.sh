#!/bin/bash

# Automated Backup Script for Qahwatal Emarat
# This script creates database backups and manages retention

set -e

# Configuration
BACKUP_DIR="/var/backups/qahwatalemarat"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_NAME="qahwatalemarat_$TIMESTAMP"
RETENTION_DAYS=30
MONGODB_URI="${MONGODB_URI:-mongodb://localhost:27017/qahwatalemarat}"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

echo -e "${GREEN}Starting database backup: $BACKUP_NAME${NC}"

# Create database backup using mongodump
if command -v mongodump &> /dev/null; then
    mongodump --uri="$MONGODB_URI" --out "$BACKUP_DIR/$BACKUP_NAME"
else
    echo -e "${RED}Error: mongodump not found. Please install MongoDB tools.${NC}"
    exit 1
fi

# Compress backup
echo -e "${YELLOW}Compressing backup...${NC}"
tar -czf "$BACKUP_DIR/${BACKUP_NAME}.tar.gz" -C "$BACKUP_DIR" "$BACKUP_NAME"

# Remove uncompressed backup
rm -rf "$BACKUP_DIR/$BACKUP_NAME"

# Get backup size
BACKUP_SIZE=$(du -h "$BACKUP_DIR/${BACKUP_NAME}.tar.gz" | cut -f1)

# Clean up old backups
echo -e "${YELLOW}Cleaning up old backups (retention: $RETENTION_DAYS days)...${NC}"
OLD_BACKUPS=$(find "$BACKUP_DIR" -name "*.tar.gz" -mtime +$RETENTION_DAYS)
if [ -n "$OLD_BACKUPS" ]; then
    echo "$OLD_BACKUPS" | xargs rm -f
    echo "Removed $(echo "$OLD_BACKUPS" | wc -l) old backup(s)"
fi

# Log backup completion
echo "$(date '+%Y-%m-%d %H:%M:%S') - Backup completed: $BACKUP_DIR/${BACKUP_NAME}.tar.gz (Size: $BACKUP_SIZE)" >> "$BACKUP_DIR/backup.log"

echo -e "${GREEN}✅ Backup completed successfully!${NC}"
echo "📁 Location: $BACKUP_DIR/${BACKUP_NAME}.tar.gz"
echo "📊 Size: $BACKUP_SIZE"

# Optional: Send notification (uncomment and configure as needed)
# curl -X POST -H 'Content-type: application/json' \
#      --data '{"text":"Database backup completed successfully"}' \
#      YOUR_SLACK_WEBHOOK_URL
