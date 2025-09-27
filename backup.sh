#!/bin/bash

# Enhanced Database Backup Script for Qahwat Al Emarat
# Version: 3.0 - Updated: September 28, 2025
# Features: Cloud storage, verification, retention, notifications

set -e

# Configuration
BACKUP_DIR="./backups"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_NAME="qahwat_al_emarat_backup_$DATE"
MONGODB_URI="${MONGODB_URI:-mongodb://localhost:27017/qahwat_al_emarat}"
RETENTION_DAYS="${RETENTION_DAYS:-7}"
NOTIFICATION_WEBHOOK="${NOTIFICATION_WEBHOOK:-}"

# Cloud storage configuration
AWS_S3_BUCKET="${AWS_S3_BUCKET:-}"
AZURE_STORAGE_ACCOUNT="${AZURE_STORAGE_ACCOUNT:-}"
AZURE_CONTAINER="${AZURE_CONTAINER:-qahwatalemarat-backups}"
GCP_BUCKET="${GCP_BUCKET:-}"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

# Logging function
log() {
    local level="$1"
    local message="$2"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo -e "$timestamp [$level] $message" >> "$BACKUP_DIR/backup.log"
    echo -e "$timestamp [$level] $message"
}

# Error handling
error_exit() {
    local message="$1"
    log "ERROR" "$message"
    send_notification "❌ Backup Failed" "$message"
    exit 1
}

# Success notification
success_message() {
    local message="$1"
    log "SUCCESS" "$message"
    send_notification "✅ Backup Successful" "$message"
}

# Send notification to webhook
send_notification() {
    local title="$1"
    local message="$2"

    if [ -n "$NOTIFICATION_WEBHOOK" ]; then
        curl -X POST -H 'Content-type: application/json' \
             --data "{\"text\":\"$title\\n$message\"}" \
             "$NOTIFICATION_WEBHOOK" 2>/dev/null || true
    fi
}

# Verify backup integrity
verify_backup() {
    local backup_file="$1"

    log "INFO" "Verifying backup integrity: $backup_file"

    if [ ! -f "$backup_file" ]; then
        error_exit "Backup file not found: $backup_file"
    fi

    # Test the archive
    if ! tar -tzf "$backup_file" >/dev/null 2>&1; then
        error_exit "Backup verification failed: Archive is corrupted"
    fi

    log "SUCCESS" "Backup verification passed"
}

# Upload to cloud storage
upload_to_cloud() {
    local backup_file="$1"
    local uploaded=false

    # AWS S3
    if [ -n "$AWS_S3_BUCKET" ] && command -v aws >/dev/null 2>&1; then
        log "INFO" "Uploading to AWS S3: $AWS_S3_BUCKET"
        if aws s3 cp "$backup_file" "s3://$AWS_S3_BUCKET/"; then
            log "SUCCESS" "Uploaded to AWS S3 successfully"
            uploaded=true
        else
            log "WARNING" "Failed to upload to AWS S3"
        fi
    fi

    # Azure Blob Storage
    if [ -n "$AZURE_STORAGE_ACCOUNT" ] && command -v az >/dev/null 2>&1; then
        log "INFO" "Uploading to Azure Blob Storage: $AZURE_STORAGE_ACCOUNT/$AZURE_CONTAINER"
        if az storage blob upload --account-name "$AZURE_STORAGE_ACCOUNT" \
                                --container-name "$AZURE_CONTAINER" \
                                --name "$(basename "$backup_file")" \
                                --file "$backup_file" >/dev/null 2>&1; then
            log "SUCCESS" "Uploaded to Azure Blob Storage successfully"
            uploaded=true
        else
            log "WARNING" "Failed to upload to Azure Blob Storage"
        fi
    fi

    # Google Cloud Storage
    if [ -n "$GCP_BUCKET" ] && command -v gsutil >/dev/null 2>&1; then
        log "INFO" "Uploading to Google Cloud Storage: $GCP_BUCKET"
        if gsutil cp "$backup_file" "gs://$GCP_BUCKET/"; then
            log "SUCCESS" "Uploaded to Google Cloud Storage successfully"
            uploaded=true
        else
            log "WARNING" "Failed to upload to Google Cloud Storage"
        fi
    fi

    if [ "$uploaded" = true ]; then
        log "SUCCESS" "Cloud upload completed"
    else
        log "WARNING" "No cloud storage configured or all uploads failed"
    fi
}

# Clean up old backups
cleanup_old_backups() {
    log "INFO" "Cleaning up backups older than $RETENTION_DAYS days"

    # Local cleanup
    local old_backups=$(find "$BACKUP_DIR" -name "*.tar.gz" -mtime +$RETENTION_DAYS 2>/dev/null || true)
    if [ -n "$old_backups" ]; then
        echo "$old_backups" | xargs rm -f 2>/dev/null || true
        local count=$(echo "$old_backups" | wc -l)
        log "INFO" "Removed $count old local backup(s)"
    fi

    # Cloud cleanup (if configured)
    if [ -n "$AWS_S3_BUCKET" ] && command -v aws >/dev/null 2>&1; then
        log "INFO" "Cleaning up old backups from AWS S3"
        aws s3api list-objects-v2 --bucket "$AWS_S3_BUCKET" --query 'Contents[?LastModified<`'"$(date -d "$RETENTION_DAYS days ago" +%Y-%m-%d)"'`].Key' --output text 2>/dev/null | \
        xargs -I {} aws s3 rm "s3://$AWS_S3_BUCKET/{}" 2>/dev/null || true
    fi
}

# Main backup function
main() {
    log "INFO" "Starting database backup: $BACKUP_NAME"

    # Create backup directory if it doesn't exist
    mkdir -p "$BACKUP_DIR" || error_exit "Failed to create backup directory: $BACKUP_DIR"

    # Check MongoDB connection
    if ! mongosh --eval "db.adminCommand('ping')" "$MONGODB_URI" >/dev/null 2>&1; then
        error_exit "Cannot connect to MongoDB at $MONGODB_URI"
    fi

    # Create backup using mongodump
    log "INFO" "Creating database dump..."
    if ! mongodump --uri="$MONGODB_URI" --out="$BACKUP_DIR/$BACKUP_NAME" --quiet; then
        error_exit "mongodump failed"
    fi

    # Compress the backup
    log "INFO" "Compressing backup..."
    if ! tar -czf "$BACKUP_DIR/${BACKUP_NAME}.tar.gz" -C "$BACKUP_DIR" "$BACKUP_NAME"; then
        error_exit "Failed to compress backup"
    fi

    # Remove uncompressed backup
    rm -rf "$BACKUP_DIR/$BACKUP_NAME"

    # Verify backup
    verify_backup "$BACKUP_DIR/${BACKUP_NAME}.tar.gz"

    # Get backup size
    local backup_size=$(du -h "$BACKUP_DIR/${BACKUP_NAME}.tar.gz" | cut -f1)

    # Upload to cloud storage
    upload_to_cloud "$BACKUP_DIR/${BACKUP_NAME}.tar.gz"

    # Clean up old backups
    cleanup_old_backups

    # Success message
    local success_msg="Backup completed: $BACKUP_DIR/${BACKUP_NAME}.tar.gz (Size: $backup_size)"
    success_message "$success_msg"

    echo -e "${GREEN}✅ Backup completed successfully!${NC}"
    echo "📁 Location: $BACKUP_DIR/${BACKUP_NAME}.tar.gz"
    echo "📊 Size: $backup_size"
    echo "📅 Retention: $RETENTION_DAYS days"
}

# Show usage
usage() {
    echo "Usage: $0 [OPTIONS]"
    echo
    echo "Enhanced Database Backup Script for Qahwat Al Emarat"
    echo
    echo "Options:"
    echo "  --retention-days=N     Keep backups for N days (default: 7)"
    echo "  --notification-url=URL Send notifications to webhook URL"
    echo "  --aws-s3-bucket=BUCKET Upload to AWS S3 bucket"
    echo "  --azure-account=NAME   Upload to Azure Storage account"
    echo "  --azure-container=NAME Azure container name (default: qahwatalemarat-backups)"
    echo "  --gcp-bucket=BUCKET    Upload to Google Cloud Storage bucket"
    echo "  --help                 Show this help"
    echo
    echo "Environment variables:"
    echo "  MONGODB_URI            MongoDB connection string"
    echo "  NOTIFICATION_WEBHOOK   Webhook URL for notifications"
    echo "  AWS_S3_BUCKET          AWS S3 bucket name"
    echo "  AZURE_STORAGE_ACCOUNT  Azure Storage account name"
    echo "  GCP_BUCKET            Google Cloud Storage bucket name"
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --retention-days=*)
            RETENTION_DAYS="${1#*=}"
            shift
            ;;
        --notification-url=*)
            NOTIFICATION_WEBHOOK="${1#*=}"
            shift
            ;;
        --aws-s3-bucket=*)
            AWS_S3_BUCKET="${1#*=}"
            shift
            ;;
        --azure-account=*)
            AZURE_STORAGE_ACCOUNT="${1#*=}"
            shift
            ;;
        --azure-container=*)
            AZURE_CONTAINER="${1#*=}"
            shift
            ;;
        --gcp-bucket=*)
            GCP_BUCKET="${1#*=}"
            shift
            ;;
        --help)
            usage
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            usage
            exit 1
            ;;
    esac
done

# Run main function
main
