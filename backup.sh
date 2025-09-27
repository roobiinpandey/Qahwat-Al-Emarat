#!/bin/bash

# Database backup script for Qahwat Al Emarat
# This script creates backups of the MongoDB database

set -e

# Configuration
BACKUP_DIR="./backups"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_NAME="qahwat_al_emarat_backup_$DATE"
MONGODB_URI="${MONGODB_URI:-mongodb://localhost:27017/qahwat_al_emarat}"

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

echo "Starting database backup: $BACKUP_NAME"

# Create backup using mongodump
mongodump --uri="$MONGODB_URI" --out="$BACKUP_DIR/$BACKUP_NAME"

# Compress the backup
tar -czf "$BACKUP_DIR/${BACKUP_NAME}.tar.gz" -C "$BACKUP_DIR" "$BACKUP_NAME"

# Remove uncompressed backup
rm -rf "$BACKUP_DIR/$BACKUP_NAME"

# Keep only last 7 backups
cd "$BACKUP_DIR"
ls -t *.tar.gz | tail -n +8 | xargs -r rm --

echo "Backup completed: $BACKUP_DIR/${BACKUP_NAME}.tar.gz"
echo "Backup size: $(du -h "$BACKUP_DIR/${BACKUP_NAME}.tar.gz" | cut -f1)"

# Optional: Upload to cloud storage (uncomment and configure as needed)
# aws s3 cp "$BACKUP_DIR/${BACKUP_NAME}.tar.gz" s3://your-backup-bucket/
# az storage blob upload --account-name yourstorageaccount --container-name backups --name "${BACKUP_NAME}.tar.gz" --file "$BACKUP_DIR/${BACKUP_NAME}.tar.gz"
