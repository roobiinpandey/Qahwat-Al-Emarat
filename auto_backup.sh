#!/bin/bash

# QAHWAT AL EMARAT Project Auto Backup Script
# Updated on: September 27, 2025
# Version: 2.1

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Default configuration
BACKUP_DIR="../backups"
MAX_BACKUPS=5
COMPRESSION_LEVEL=6
INCLUDE_DATABASE=true

# Get current timestamp
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_NAME="qahwatalemarat_backup_${TIMESTAMP}"

#!/bin/bash

# QAHWAT AL EMARAT Project Auto Backup Script
# Updated on: September 28, 2025
# Version: 3.0 - Enhanced with cloud storage, notifications, and recovery procedures

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Default configuration
BACKUP_DIR="../backups"
MAX_BACKUPS=5
COMPRESSION_LEVEL=6
INCLUDE_DATABASE=true
NOTIFICATION_WEBHOOK="${NOTIFICATION_WEBHOOK:-}"
ENABLE_CLOUD_BACKUP="${ENABLE_CLOUD_BACKUP:-false}"

# Cloud storage configuration
AWS_S3_BUCKET="${AWS_S3_BUCKET:-}"
AZURE_STORAGE_ACCOUNT="${AZURE_STORAGE_ACCOUNT:-}"
AZURE_CONTAINER="${AZURE_CONTAINER:-qahwatalemarat-backups}"
GCP_BUCKET="${GCP_BUCKET:-}"

# Get current timestamp
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_NAME="qahwatalemarat_backup_${TIMESTAMP}"

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --backup-dir=*)
            BACKUP_DIR="${1#*=}"
            shift
            ;;
        --max-backups=*)
            MAX_BACKUPS="${1#*=}"
            shift
            ;;
        --compression=*)
            COMPRESSION_LEVEL="${1#*=}"
            shift
            ;;
        --no-database)
            INCLUDE_DATABASE=false
            shift
            ;;
        --enable-cloud)
            ENABLE_CLOUD_BACKUP=true
            shift
            ;;
        --notification-url=*)
            NOTIFICATION_WEBHOOK="${1#*=}"
            shift
            ;;
        --aws-s3-bucket=*)
            AWS_S3_BUCKET="${1#*=}"
            ENABLE_CLOUD_BACKUP=true
            shift
            ;;
        --azure-account=*)
            AZURE_STORAGE_ACCOUNT="${1#*=}"
            ENABLE_CLOUD_BACKUP=true
            shift
            ;;
        --gcp-bucket=*)
            GCP_BUCKET="${1#*=}"
            ENABLE_CLOUD_BACKUP=true
            shift
            ;;
        --help)
            echo "Usage: $0 [OPTIONS]"
            echo
            echo "Enhanced Auto Backup Script for QAHWAT AL EMARAT"
            echo
            echo "Options:"
            echo "  --backup-dir=DIR        Backup directory (default: ../backups)"
            echo "  --max-backups=N         Keep maximum N backups (default: 5)"
            echo "  --compression=N         Compression level 1-9 (default: 6)"
            echo "  --no-database           Skip database backup"
            echo "  --enable-cloud          Enable cloud storage backup"
            echo "  --notification-url=URL  Send notifications to webhook URL"
            echo "  --aws-s3-bucket=BUCKET  Upload to AWS S3 bucket"
            echo "  --azure-account=NAME    Upload to Azure Storage account"
            echo "  --gcp-bucket=BUCKET     Upload to Google Cloud Storage bucket"
            echo "  --help                  Show this help"
            echo
            echo "Environment variables:"
            echo "  NOTIFICATION_WEBHOOK    Webhook URL for notifications"
            echo "  ENABLE_CLOUD_BACKUP     Enable cloud backup (true/false)"
            echo "  AWS_S3_BUCKET          AWS S3 bucket name"
            echo "  AZURE_STORAGE_ACCOUNT  Azure Storage account name"
            echo "  GCP_BUCKET             Google Cloud Storage bucket name"
            exit 0
            ;;
        *)
            print_error "Unknown option: $1"
            echo "Use --help for usage information."
            exit 1
            ;;
    esac
done

# Function to print colored output
print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_progress() {
    echo -e "${CYAN}[PROGRESS]${NC} $1"
}

# Function to show progress bar
show_progress() {
    local current=$1
    local total=$2
    local width=50
    local percentage=$((current * 100 / total))
    local completed=$((current * width / total))

    printf "\r${CYAN}[PROGRESS]${NC} ["
    for ((i=1; i<=completed; i++)); do printf "="; done
    for ((i=completed+1; i<=width; i++)); do printf " "; done
    printf "] %d%%" $percentage
}

# Function to send notification
send_notification() {
    local title="$1"
    local message="$2"

    if [ -n "$NOTIFICATION_WEBHOOK" ]; then
        curl -X POST -H 'Content-type: application/json' \
             --data "{\"text\":\"$title\\n$message\"}" \
             "$NOTIFICATION_WEBHOOK" 2>/dev/null || true
    fi
}

# Function to upload to cloud storage
upload_to_cloud() {
    local backup_file="$1"
    local uploaded=false

    if [ "$ENABLE_CLOUD_BACKUP" != "true" ]; then
        return 0
    fi

    print_info "Uploading backup to cloud storage..."

    # AWS S3
    if [ -n "$AWS_S3_BUCKET" ] && command -v aws >/dev/null 2>&1; then
        print_info "Uploading to AWS S3: $AWS_S3_BUCKET"
        if aws s3 cp "$backup_file" "s3://$AWS_S3_BUCKET/"; then
            print_success "Uploaded to AWS S3 successfully"
            uploaded=true
        else
            print_warning "Failed to upload to AWS S3"
        fi
    fi

    # Azure Blob Storage
    if [ -n "$AZURE_STORAGE_ACCOUNT" ] && command -v az >/dev/null 2>&1; then
        print_info "Uploading to Azure Blob Storage: $AZURE_STORAGE_ACCOUNT/$AZURE_CONTAINER"
        if az storage blob upload --account-name "$AZURE_STORAGE_ACCOUNT" \
                                --container-name "$AZURE_CONTAINER" \
                                --name "$(basename "$backup_file")" \
                                --file "$backup_file" >/dev/null 2>&1; then
            print_success "Uploaded to Azure Blob Storage successfully"
            uploaded=true
        else
            print_warning "Failed to upload to Azure Blob Storage"
        fi
    fi

    # Google Cloud Storage
    if [ -n "$GCP_BUCKET" ] && command -v gsutil >/dev/null 2>&1; then
        print_info "Uploading to Google Cloud Storage: $GCP_BUCKET"
        if gsutil cp "$backup_file" "gs://$GCP_BUCKET/"; then
            print_success "Uploaded to Google Cloud Storage successfully"
            uploaded=true
        else
            print_warning "Failed to upload to Google Cloud Storage"
        fi
    fi

    if [ "$uploaded" = true ]; then
        print_success "Cloud upload completed"
        return 0
    else
        print_warning "No cloud storage configured or all uploads failed"
        return 1
    fi
}

# Function to check if we're in the right directory
check_project_directory() {
    if [[ ! -f "package.json" ]] || [[ ! -d "frontend" ]] || [[ ! -d "server" ]]; then
        print_error "This doesn't appear to be the QAHWAT AL EMARAT project directory."
        print_error "Please run this script from the project root directory."
        exit 1
    fi
}

# Function to get project information
get_project_info() {
    local project_name="QAHWAT AL EMARAT"
    local total_files=$(find . -type f -not -path "./.git/*" 2>/dev/null | wc -l)
    local total_size=$(du -sh . --exclude=.git 2>/dev/null | cut -f1)

    echo "$project_name|$total_files|$total_size"
}

# Function to backup MongoDB database
backup_database() {
    if [[ "$INCLUDE_DATABASE" != "true" ]]; then
        print_info "Database backup skipped (--no-database flag used)"
        return 0
    fi

    print_info "Checking for MongoDB database backup..."

    # Check if MongoDB is running
    if ! pgrep mongod > /dev/null; then
        print_warning "MongoDB is not running. Skipping database backup."
        return 0
    fi

    # Create backup directory if it doesn't exist
    mkdir -p "$BACKUP_DIR"

    local db_backup_file="$BACKUP_DIR/qahwatalemarat_db_backup_${TIMESTAMP}"

    print_info "Creating MongoDB database backup..."

    # Use mongodump to backup database
    if mongodump --out "$db_backup_file" --quiet; then
        print_success "Database backup created successfully!"
        print_info "Database backup location: $db_backup_file"
        return 0
    else
        print_warning "Database backup failed. Continuing with file backup only."
        return 1
    fi
}

# Function to create backup
create_backup() {
    # Create backup directory if it doesn't exist
    mkdir -p "$BACKUP_DIR"

    local backup_file="$BACKUP_NAME.tar.gz"
    local backup_path="$BACKUP_DIR/$backup_file"

    print_info "Creating backup archive: $backup_file"
    print_info "Compression level: $COMPRESSION_LEVEL"
    print_info "This may take a few moments depending on project size..."

    # Create compressed tar archive with progress indication
    # Exclude common temporary and unnecessary files
    local exclude_options=(
        --exclude=".git"
        --exclude=".DS_Store"
        --exclude="*.log"
        --exclude="*.tmp"
        --exclude="*.swp"
        --exclude="*.bak"
        --exclude="node_modules/.cache"
        --exclude="node_modules/.npm"
        --exclude=".vscode"
        --exclude=".idea"
        --exclude="*.sqlite"
        --exclude="*.sqlite3"
        --exclude="backup_*.tar.gz"
        --exclude="backup.tar"
        --exclude="BACKUP_README.md"
        --exclude="backup.sh"
        --exclude="backup/"
        --exclude="backups/"
        --exclude="*.tar.gz"
        --exclude="*.zip"
        --exclude="dist/"
        --exclude="build/"
        --exclude=".next/"
        --exclude=".nuxt/"
        --exclude="coverage/"
        --exclude=".nyc_output/"
        --exclude="*.tgz"
        --exclude="*.deb"
        --exclude="*.rpm"
    )

    # Create the backup with compression level
    if tar -c "${exclude_options[@]}" . | gzip -$COMPRESSION_LEVEL > "$backup_path"; then
        # Get backup file size
        local backup_size=$(ls -lh "$backup_path" | awk '{print $5}')

        print_success "Backup created successfully!"
        print_success "File: $backup_file"
        print_success "Size: $backup_size"
        print_success "Location: $backup_path"

        return 0
    else
        print_error "Failed to create backup archive!"
        return 1
    fi
}

# Function to verify backup
verify_backup() {
    local backup_file="$BACKUP_NAME.tar.gz"
    local backup_path="$BACKUP_DIR/$backup_file"

    print_info "Verifying backup integrity..."

    if [[ -f "$backup_path" ]]; then
        # Test the archive
        if gzip -t "$backup_path" && tar -tzf "$backup_path" &>/dev/null; then
            print_success "Backup verification passed!"
            return 0
        else
            print_error "Backup verification failed! Archive may be corrupted."
            return 1
        fi
    else
        print_error "Backup file not found!"
        return 1
    fi
}

# Function to rotate old backups
rotate_backups() {
    print_info "Checking for old backups to rotate..."

    # Count existing backups
    local backup_count=$(ls -1 "$BACKUP_DIR"/qahwatalemarat_backup_*.tar.gz 2>/dev/null | wc -l)

    if [[ $backup_count -gt $MAX_BACKUPS ]]; then
        print_info "Found $backup_count backups. Keeping only the latest $MAX_BACKUPS."

        # Get list of backups sorted by modification time (oldest first)
        local old_backups=$(ls -t "$BACKUP_DIR"/qahwatalemarat_backup_*.tar.gz | tail -n +$((MAX_BACKUPS + 1)))

        if [[ -n "$old_backups" ]]; then
            echo "$old_backups" | while read -r old_backup; do
                print_info "Removing old backup: $(basename "$old_backup")"
                rm -f "$old_backup"
            done
            print_success "Backup rotation completed."
        fi
    else
        print_info "Backup count ($backup_count) is within limit ($MAX_BACKUPS). No rotation needed."
    fi
}

# Function to create backup info file
create_backup_info() {
    local backup_file="$BACKUP_NAME.tar.gz"
    local backup_path="$BACKUP_DIR/$backup_file"
    local info_file="$BACKUP_DIR/backup_info_${TIMESTAMP}.txt"

    {
        echo "QAHWAT AL EMARAT Project Backup Information"
        echo "=========================================="
        echo
        echo "Backup created on: $(date)"
        echo "Backup file: $backup_file"
        echo "Backup size: $(ls -lh "$backup_path" | awk '{print $5}')"
        echo "Backup location: $backup_path"
        echo "Compression level: $COMPRESSION_LEVEL"
        echo
        echo "Project information:"
        echo "- Location: $(pwd)"
        echo "- Total files: $(get_project_info | cut -d'|' -f2)"
        echo "- Project size: $(get_project_info | cut -d'|' -f3)"
        echo
        echo "Backup configuration:"
        echo "- Max backups kept: $MAX_BACKUPS"
        echo "- Database backup included: $INCLUDE_DATABASE"
        echo
        echo "To restore this backup:"
        echo "1. cd '$BACKUP_DIR'"
        echo "2. tar -xzf $backup_file"
        echo "3. cd 'Qahwatal Emarat'"
        echo
        echo "To restore database (if included):"
        echo "1. Make sure MongoDB is running"
        echo "2. cd '$BACKUP_DIR/qahwatalemarat_db_backup_${TIMESTAMP}'"
        echo "3. mongorestore ."
        echo
        echo "Note: This backup excludes temporary files, logs, and build artifacts."
    } > "$info_file"

    print_success "Backup information saved to: $info_file"
}

# Main function
main() {
    print_info "QAHWAT AL EMARAT Auto Backup Script v2.1"
    print_info "======================================"

    # Check if we're in the right directory
    check_project_directory

    # Get project information
    local project_info=$(get_project_info)
    local project_name=$(echo "$project_info" | cut -d'|' -f1)
    local total_files=$(echo "$project_info" | cut -d'|' -f2)
    local total_size=$(echo "$project_info" | cut -d'|' -f3)

    # Ask for permission
    ask_permission "Ready to backup '$project_name' project?

Project Details:
- Total files: $total_files
- Project size: $total_size
- Backup directory: $BACKUP_DIR
- Backup name: $BACKUP_NAME.tar.gz
- Compression level: $COMPRESSION_LEVEL
- Max backups kept: $MAX_BACKUPS
- Database backup: $( [[ "$INCLUDE_DATABASE" == "true" ]] && echo "Yes" || echo "No" )

This will create a complete backup of your project."

    # Create backup directory
    mkdir -p "$BACKUP_DIR"

    # Backup database first (if enabled)
    local db_backup_success=true
    if [[ "$INCLUDE_DATABASE" == "true" ]]; then
        if ! backup_database; then
            db_backup_success=false
        fi
    fi

    # Create project backup
    if create_backup; then
        # Verify backup
        if verify_backup; then
            # Upload to cloud storage
            local cloud_upload_success=true
            if ! upload_to_cloud "$backup_path"; then
                cloud_upload_success=false
            fi

            # Rotate old backups
            rotate_backups

            # Create backup info file
            create_backup_info

            echo
            print_success "🎉 BACKUP COMPLETED SUCCESSFULLY! 🎉"
            echo
            print_info "Your project has been safely backed up."
            if [[ "$db_backup_success" == "true" && "$INCLUDE_DATABASE" == "true" ]]; then
                print_info "Database backup was also created."
            fi
            if [[ "$cloud_upload_success" == "true" && "$ENABLE_CLOUD_BACKUP" == "true" ]]; then
                print_info "Backup was uploaded to cloud storage."
            fi
            print_info "Backup location: $BACKUP_DIR"
            print_info "You can now continue working without worry!"

            # Send success notification
            local notification_msg="Backup completed successfully\\nLocation: $BACKUP_DIR\\nSize: $backup_size"
            if [[ "$cloud_upload_success" == "true" ]]; then
                notification_msg="$notification_msg\\nCloud upload: ✅"
            fi
            send_notification "✅ Qahwat Al Emarat Backup Successful" "$notification_msg"
        else
            print_error "Backup verification failed. Please check the backup file."
            send_notification "❌ Qahwat Al Emarat Backup Failed" "Backup verification failed for $backup_file"
            exit 1
        fi
    else
        print_error "Backup creation failed. Please try again."
        send_notification "❌ Qahwat Al Emarat Backup Failed" "Backup creation failed"
        exit 1
    fi
}

# Run main function
main "$@"
