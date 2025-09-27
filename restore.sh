#!/bin/bash

# Qahwat Al Emarat Recovery Script
# Version: 1.0 - September 28, 2025
# This script helps restore from backups

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Default configuration
BACKUP_DIR="./backups"
RECOVERY_DIR="./recovery_temp"
DRY_RUN=false

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

# Function to show usage
usage() {
    echo "Qahwat Al Emarat Recovery Script"
    echo "Usage: $0 [OPTIONS] BACKUP_FILE"
    echo
    echo "Arguments:"
    echo "  BACKUP_FILE    Path to the backup file (.tar.gz)"
    echo
    echo "Options:"
    echo "  --backup-dir=DIR    Backup directory (default: ./backups)"
    echo "  --recovery-dir=DIR  Temporary recovery directory (default: ./recovery_temp)"
    echo "  --dry-run           Show what would be done without making changes"
    echo "  --database-only     Restore only database"
    echo "  --files-only        Restore only files"
    echo "  --help              Show this help"
    echo
    echo "Examples:"
    echo "  $0 backups/qahwatalemarat_backup_20250928_143000.tar.gz"
    echo "  $0 --dry-run backups/qahwatalemarat_backup_20250928_143000.tar.gz"
    echo "  $0 --database-only backups/qahwat_al_emarat_backup_20250928_143000.tar.gz"
}

# Function to check prerequisites
check_prerequisites() {
    print_info "Checking prerequisites..."

    # Check if backup file exists
    if [ ! -f "$BACKUP_FILE" ]; then
        print_error "Backup file not found: $BACKUP_FILE"
        exit 1
    fi

    # Check if backup file is readable
    if [ ! -r "$BACKUP_FILE" ]; then
        print_error "Cannot read backup file: $BACKUP_FILE"
        exit 1
    fi

    # Check if tar is available
    if ! command -v tar >/dev/null 2>&1; then
        print_error "tar command not found. Please install tar."
        exit 1
    fi

    print_success "Prerequisites check passed"
}

# Function to verify backup integrity
verify_backup() {
    print_info "Verifying backup integrity..."

    if ! tar -tzf "$BACKUP_FILE" >/dev/null 2>&1; then
        print_error "Backup file is corrupted or invalid"
        exit 1
    fi

    print_success "Backup integrity verified"
}

# Function to extract backup
extract_backup() {
    print_info "Extracting backup to $RECOVERY_DIR..."

    if [ "$DRY_RUN" = true ]; then
        print_info "[DRY RUN] Would extract backup to $RECOVERY_DIR"
        return 0
    fi

    # Create recovery directory
    mkdir -p "$RECOVERY_DIR"

    # Extract backup
    if ! tar -xzf "$BACKUP_FILE" -C "$RECOVERY_DIR"; then
        print_error "Failed to extract backup"
        exit 1
    fi

    print_success "Backup extracted successfully"
}

# Function to restore database
restore_database() {
    print_info "Restoring database..."

    if [ "$DRY_RUN" = true ]; then
        print_info "[DRY RUN] Would restore database from $RECOVERY_DIR"
        return 0
    fi

    # Find database backup directory
    local db_backup_dir=""
    if [ -d "$RECOVERY_DIR/qahwatalemarat_db_backup_${TIMESTAMP}" ]; then
        db_backup_dir="$RECOVERY_DIR/qahwatalemarat_db_backup_${TIMESTAMP}"
    elif [ -d "$RECOVERY_DIR/qahwat_al_emarat_backup_${TIMESTAMP}" ]; then
        db_backup_dir="$RECOVERY_DIR/qahwat_al_emarat_backup_${TIMESTAMP}"
    else
        # Look for any directory that looks like a database backup
        db_backup_dir=$(find "$RECOVERY_DIR" -maxdepth 1 -type d -name "*backup*" | head -1)
    fi

    if [ -z "$db_backup_dir" ] || [ ! -d "$db_backup_dir" ]; then
        print_warning "No database backup found in the backup file"
        return 0
    fi

    print_info "Found database backup: $db_backup_dir"

    # Check if MongoDB is running
    if ! pgrep mongod >/dev/null 2>&1; then
        print_warning "MongoDB is not running. Starting MongoDB..."
        if command -v systemctl >/dev/null 2>&1; then
            sudo systemctl start mongod
        else
            print_error "Cannot start MongoDB automatically. Please start MongoDB manually."
            exit 1
        fi
    fi

    # Wait for MongoDB to be ready
    print_info "Waiting for MongoDB to be ready..."
    local retries=30
    while [ $retries -gt 0 ]; do
        if mongosh --eval "db.adminCommand('ping')" >/dev/null 2>&1; then
            break
        fi
        sleep 1
        retries=$((retries - 1))
    done

    if [ $retries -eq 0 ]; then
        print_error "MongoDB is not responding"
        exit 1
    fi

    # Restore database
    print_info "Restoring database..."
    if ! mongorestore --drop "$db_backup_dir"; then
        print_error "Database restoration failed"
        exit 1
    fi

    print_success "Database restored successfully"
}

# Function to restore files
restore_files() {
    print_info "Restoring project files..."

    if [ "$DRY_RUN" = true ]; then
        print_info "[DRY RUN] Would restore files from $RECOVERY_DIR"
        return 0
    fi

    # Find the project directory in the backup
    local project_dir=""
    if [ -d "$RECOVERY_DIR/Qahwatal Emarat" ]; then
        project_dir="$RECOVERY_DIR/Qahwatal Emarat"
    else
        # Look for any directory that might be the project
        project_dir=$(find "$RECOVERY_DIR" -maxdepth 1 -type d | grep -v "^$RECOVERY_DIR$" | head -1)
    fi

    if [ -z "$project_dir" ] || [ ! -d "$project_dir" ]; then
        print_warning "No project files found in the backup"
        return 0
    fi

    print_info "Found project directory: $project_dir"

    # Create backup of current state (safety measure)
    local current_backup="./current_state_backup_$(date +%Y%m%d_%H%M%S).tar.gz"
    print_info "Creating backup of current state: $current_backup"
    tar -czf "$current_backup" --exclude="backups" --exclude="recovery_temp" --exclude="node_modules" --exclude=".git" . 2>/dev/null || true

    # Ask for confirmation before overwriting files
    echo
    print_warning "⚠️  WARNING: This will overwrite existing files!"
    print_info "Current state backed up to: $current_backup"
    echo
    read -p "Are you sure you want to restore files? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_info "File restoration cancelled"
        return 0
    fi

    # Restore files (exclude certain directories)
    print_info "Restoring files..."
    rsync -av --exclude="backups/" --exclude="recovery_temp/" --exclude="node_modules/" --exclude=".git/" "$project_dir/" ./

    print_success "Files restored successfully"
}

# Function to cleanup
cleanup() {
    print_info "Cleaning up temporary files..."

    if [ "$DRY_RUN" = true ]; then
        print_info "[DRY RUN] Would remove $RECOVERY_DIR"
        return 0
    fi

    if [ -d "$RECOVERY_DIR" ]; then
        rm -rf "$RECOVERY_DIR"
        print_success "Temporary files cleaned up"
    fi
}

# Function to run post-recovery tasks
post_recovery() {
    print_info "Running post-recovery tasks..."

    if [ "$DRY_RUN" = true ]; then
        print_info "[DRY RUN] Would run post-recovery tasks"
        return 0
    fi

    # Reinstall dependencies if package.json exists
    if [ -f "package.json" ]; then
        print_info "Reinstalling dependencies..."
        npm install
    fi

    # Reinstall server dependencies
    if [ -f "server/package.json" ]; then
        print_info "Reinstalling server dependencies..."
        cd server && npm install && cd ..
    fi

    print_success "Post-recovery tasks completed"
}

# Parse command line arguments
DATABASE_ONLY=false
FILES_ONLY=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --backup-dir=*)
            BACKUP_DIR="${1#*=}"
            shift
            ;;
        --recovery-dir=*)
            RECOVERY_DIR="${1#*=}"
            shift
            ;;
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        --database-only)
            DATABASE_ONLY=true
            shift
            ;;
        --files-only)
            FILES_ONLY=true
            shift
            ;;
        --help)
            usage
            exit 0
            ;;
        -*)
            print_error "Unknown option: $1"
            usage
            exit 1
            ;;
        *)
            BACKUP_FILE="$1"
            shift
            ;;
    esac
done

# Check if backup file is provided
if [ -z "$BACKUP_FILE" ]; then
    print_error "Backup file not specified"
    usage
    exit 1
fi

# Extract timestamp from backup filename for database backup directory
TIMESTAMP=$(basename "$BACKUP_FILE" .tar.gz | sed 's/.*backup_//' | sed 's/.*backup_//')

# Main execution
main() {
    echo
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE}    QAHWAT AL EMARAT RECOVERY${NC}"
    echo -e "${BLUE}========================================${NC}"
    echo

    if [ "$DRY_RUN" = true ]; then
        print_warning "DRY RUN MODE - No actual changes will be made"
        echo
    fi

    print_info "Backup file: $BACKUP_FILE"
    print_info "Recovery directory: $RECOVERY_DIR"
    echo

    # Run recovery steps
    check_prerequisites
    verify_backup
    extract_backup

    # Determine what to restore
    if [ "$DATABASE_ONLY" = true ]; then
        restore_database
    elif [ "$FILES_ONLY" = true ]; then
        restore_files
    else
        # Restore both
        restore_database
        restore_files
    fi

    post_recovery
    cleanup

    echo
    if [ "$DRY_RUN" = true ]; then
        print_success "🎭 DRY RUN COMPLETED - No changes were made"
    else
        print_success "🎉 RECOVERY COMPLETED SUCCESSFULLY!"
        echo
        print_info "Next steps:"
        echo "  1. Start your application: npm start"
        echo "  2. Test that everything works correctly"
        echo "  3. Remove the current state backup if not needed"
    fi
}

# Run main function
main "$@"
