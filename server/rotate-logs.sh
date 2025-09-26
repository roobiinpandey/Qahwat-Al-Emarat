#!/bin/bash

# Log Rotation Script for Qahwatal Emarat
# Rotates and compresses log files to manage disk space

set -e

# Configuration
LOG_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RETENTION_DAYS=30
MAX_LOG_SIZE="100M"  # Rotate when log exceeds this size

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🔄 Rotating logs in $LOG_DIR${NC}"

# Function to rotate a log file
rotate_log() {
    local log_file="$1"
    local base_name=$(basename "$log_file" .log)
    local timestamp=$(date +%Y%m%d_%H%M%S)

    if [ -f "$log_file" ]; then
        local size=$(stat -f%z "$log_file" 2>/dev/null || stat -c%s "$log_file" 2>/dev/null || echo "0")

        # Check if rotation is needed (size or monthly)
        if [ "$size" -gt 0 ]; then
            echo -e "${YELLOW}Rotating $log_file (Size: $(numfmt --to=iec-i --suffix=B $size))${NC}"

            # Compress current log
            gzip -c "$log_file" > "${log_file}.${timestamp}.gz"

            # Truncate original log
            : > "$log_file"

            echo -e "${GREEN}✅ Created ${log_file}.${timestamp}.gz${NC}"
        fi
    fi
}

# Rotate main log files
rotate_log "$LOG_DIR/access.log"
rotate_log "$LOG_DIR/error.log"
rotate_log "$LOG_DIR/backup.log"
rotate_log "$LOG_DIR/monitor.log"

# Clean up old rotated logs
echo -e "${YELLOW}Cleaning up old rotated logs (retention: $RETENTION_DAYS days)...${NC}"
find "$LOG_DIR" -name "*.log.*.gz" -mtime +$RETENTION_DAYS -delete -print 2>/dev/null | sed 's/^/🗑️  Removed: /' || true

# Show current log sizes
echo -e "\n${BLUE}Current log file sizes:${NC}"
for log_file in access.log error.log backup.log monitor.log; do
    if [ -f "$LOG_DIR/$log_file" ]; then
        size=$(stat -f%z "$LOG_DIR/$log_file" 2>/dev/null || stat -c%s "$LOG_DIR/$log_file" 2>/dev/null || echo "0")
        echo "📄 $log_file: $(numfmt --to=iec-i --suffix=B $size)"
    fi
done

# Show compressed logs count
COMPRESSED_COUNT=$(find "$LOG_DIR" -name "*.log.*.gz" | wc -l)
echo -e "\n${GREEN}✅ Log rotation completed ($COMPRESSED_COUNT compressed logs retained)${NC}"
