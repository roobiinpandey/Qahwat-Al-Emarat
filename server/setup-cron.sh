#!/bin/bash

# Cron Job Setup Script for Qahwatal Emarat
# Sets up automated backups and monitoring

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}⏰ Setting up automated tasks for Qahwatal Emarat${NC}"
echo "==================================================="

# Get the absolute path to the server directory
SERVER_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKUP_SCRIPT="$SERVER_DIR/backup.sh"
MONITOR_SCRIPT="$SERVER_DIR/monitor.sh"

# Check if scripts exist and are executable
if [ ! -x "$BACKUP_SCRIPT" ]; then
    echo -e "${YELLOW}⚠️  Backup script not found or not executable: $BACKUP_SCRIPT${NC}"
    echo "Run: chmod +x $BACKUP_SCRIPT"
    exit 1
fi

if [ ! -x "$MONITOR_SCRIPT" ]; then
    echo -e "${YELLOW}⚠️  Monitor script not found or not executable: $MONITOR_SCRIPT${NC}"
    echo "Run: chmod +x $MONITOR_SCRIPT"
    exit 1
fi

echo -e "${YELLOW}Current cron jobs:${NC}"
crontab -l 2>/dev/null || echo "No cron jobs found"

echo -e "\n${BLUE}Setting up cron jobs...${NC}"

# Create temporary cron file
TEMP_CRON=$(mktemp)

# Export existing cron jobs
crontab -l 2>/dev/null > "$TEMP_CRON" || true

# Add new cron jobs (avoid duplicates)
add_cron_job() {
    local job="$1"
    if ! grep -q "$job" "$TEMP_CRON"; then
        echo "$job" >> "$TEMP_CRON"
        echo -e "${GREEN}✅ Added: $job${NC}"
    else
        echo -e "${YELLOW}⚠️  Already exists: $job${NC}"
    fi
}

# Daily backup at 2 AM
add_cron_job "0 2 * * * cd $SERVER_DIR && ./backup.sh >> backup.log 2>&1"

# Health monitoring every 5 minutes
add_cron_job "*/5 * * * * cd $SERVER_DIR && ./monitor.sh >> monitor.log 2>&1"

# Log rotation monthly (run on the 1st of each month at 3 AM)
add_cron_job "0 3 1 * * cd $SERVER_DIR && ./rotate-logs.sh 2>/dev/null || true"

# Install new cron jobs
crontab "$TEMP_CRON"

# Clean up
rm "$TEMP_CRON"

echo -e "\n${GREEN}🎉 Cron jobs setup completed!${NC}"
echo -e "\n${BLUE}Scheduled tasks:${NC}"
echo "• Daily database backup: 2:00 AM"
echo "• Health monitoring: Every 5 minutes"
echo "• Log rotation: 1st of each month at 3:00 AM"

echo -e "\n${YELLOW}To view current cron jobs: crontab -l${NC}"
echo -e "${YELLOW}To edit cron jobs manually: crontab -e${NC}"
echo -e "${YELLOW}Backup logs: tail -f $SERVER_DIR/backup.log${NC}"
echo -e "${YELLOW}Monitor logs: tail -f $SERVER_DIR/monitor.log${NC}"
