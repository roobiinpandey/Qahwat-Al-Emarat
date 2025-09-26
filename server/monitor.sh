#!/bin/bash

# Monitoring Script for Qahwatal Emarat
# Monitors system health, rate limiting, and security events

set -e

# Configuration
LOG_FILE="monitor.log"
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')
SERVER_URL="${SERVER_URL:-http://localhost:5050}"
ALERT_EMAIL="${ALERT_EMAIL:-admin@qahwatalemarat.com}"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}[$TIMESTAMP] Starting system health check...${NC}" >> "$LOG_FILE"

# Function to send alert
send_alert() {
    local message="$1"
    local severity="$2"

    echo -e "${RED}[$TIMESTAMP] $severity: $message${NC}" >> "$LOG_FILE"

    # Send email alert (requires mail command or similar)
    # echo "$message" | mail -s "Qahwatal Emarat Alert: $severity" "$ALERT_EMAIL"

    # Log to console for immediate visibility
    echo -e "${RED}🚨 ALERT: $message${NC}"
}

# Check if server is running
echo "Checking server health..." >> "$LOG_FILE"
if curl -s --max-time 10 "$SERVER_URL/api/health" > /dev/null; then
    echo -e "${GREEN}[$TIMESTAMP] ✅ Server is healthy${NC}" >> "$LOG_FILE"
else
    send_alert "Server is not responding at $SERVER_URL" "CRITICAL"
fi

# Check database connection (if MongoDB is running locally)
if pgrep mongod > /dev/null; then
    echo -e "${GREEN}[$TIMESTAMP] ✅ MongoDB service is running${NC}" >> "$LOG_FILE"
else
    echo -e "${YELLOW}[$TIMESTAMP] ⚠️  MongoDB service not detected (may be using Atlas)${NC}" >> "$LOG_FILE"
fi

# Check disk space
DISK_USAGE=$(df / | tail -1 | awk '{print $5}' | sed 's/%//')
if [ "$DISK_USAGE" -gt 90 ]; then
    send_alert "High disk usage: ${DISK_USAGE}%" "WARNING"
elif [ "$DISK_USAGE" -gt 80 ]; then
    echo -e "${YELLOW}[$TIMESTAMP] ⚠️  Disk usage: ${DISK_USAGE}%${NC}" >> "$LOG_FILE"
else
    echo -e "${GREEN}[$TIMESTAMP] ✅ Disk usage: ${DISK_USAGE}%${NC}" >> "$LOG_FILE"
fi

# Check memory usage
MEMORY_USAGE=$(free | grep Mem | awk '{printf "%.0f", $3/$2 * 100.0}')
if [ "$MEMORY_USAGE" -gt 90 ]; then
    send_alert "High memory usage: ${MEMORY_USAGE}%" "WARNING"
elif [ "$MEMORY_USAGE" -gt 80 ]; then
    echo -e "${YELLOW}[$TIMESTAMP] ⚠️  Memory usage: ${MEMORY_USAGE}%${NC}" >> "$LOG_FILE"
else
    echo -e "${GREEN}[$TIMESTAMP] ✅ Memory usage: ${MEMORY_USAGE}%${NC}" >> "$LOG_FILE"
fi

# Analyze rate limiting logs
if [ -f "access.log" ]; then
    echo "Analyzing rate limiting activity..." >> "$LOG_FILE"

    # Count rate limited requests in the last hour
    RATE_LIMITED_LAST_HOUR=$(grep "429" access.log | grep "$(date -d '1 hour ago' '+%d/%b/%Y:%H')" | wc -l)
    TOTAL_REQUESTS_LAST_HOUR=$(grep "$(date -d '1 hour ago' '+%d/%b/%Y:%H')" access.log | wc -l)

    if [ "$RATE_LIMITED_LAST_HOUR" -gt 50 ]; then
        send_alert "High rate limiting activity: $RATE_LIMITED_LAST_HOUR requests blocked in last hour" "WARNING"
    elif [ "$RATE_LIMITED_LAST_HOUR" -gt 10 ]; then
        echo -e "${YELLOW}[$TIMESTAMP] ⚠️  Rate limiting activity: $RATE_LIMITED_LAST_HOUR blocked requests/hour${NC}" >> "$LOG_FILE"
    fi

    # Check for suspicious patterns (multiple failed auth attempts)
    FAILED_AUTH=$(grep "POST /api/auth/login" access.log | grep "401\|403" | wc -l)
    if [ "$FAILED_AUTH" -gt 20 ]; then
        send_alert "High number of failed authentication attempts: $FAILED_AUTH" "WARNING"
    fi

    # Check for potential DDoS patterns
    UNIQUE_IPS=$(grep "$(date '+%d/%b/%Y')" access.log | awk '{print $1}' | sort | uniq | wc -l)
    if [ "$UNIQUE_IPS" -gt 1000 ]; then
        send_alert "High number of unique IPs today: $UNIQUE_IPS (potential DDoS)" "CRITICAL"
    fi

    echo -e "${GREEN}[$TIMESTAMP] ✅ Rate limiting analysis complete${NC}" >> "$LOG_FILE"
    echo "  - Blocked requests (last hour): $RATE_LIMITED_LAST_HOUR" >> "$LOG_FILE"
    echo "  - Total requests (last hour): $TOTAL_REQUESTS_LAST_HOUR" >> "$LOG_FILE"
    echo "  - Failed auth attempts: $FAILED_AUTH" >> "$LOG_FILE"
else
    echo -e "${YELLOW}[$TIMESTAMP] ⚠️  Access log not found for rate limiting analysis${NC}" >> "$LOG_FILE"
fi

# Check for error logs
if [ -f "error.log" ]; then
    ERROR_COUNT=$(wc -l < error.log)
    if [ "$ERROR_COUNT" -gt 0 ]; then
        echo -e "${YELLOW}[$TIMESTAMP] ⚠️  $ERROR_COUNT errors logged${NC}" >> "$LOG_FILE"
    fi
fi

# Check SSL certificate expiry (if HTTPS is enabled)
if [ "$FORCE_HTTPS" = "true" ] && [ -n "$DOMAIN" ]; then
    if command -v openssl &> /dev/null; then
        CERT_EXPIRY=$(echo | openssl s_client -servername "$DOMAIN" -connect "$DOMAIN":443 2>/dev/null | openssl x509 -noout -enddate 2>/dev/null | cut -d= -f2)
        if [ -n "$CERT_EXPIRY" ]; then
            CERT_DAYS_LEFT=$(( ($(date -d "$CERT_EXPIRY" +%s) - $(date +%s)) / 86400 ))
            if [ "$CERT_DAYS_LEFT" -lt 30 ]; then
                send_alert "SSL certificate expires in $CERT_DAYS_LEFT days" "WARNING"
            else
                echo -e "${GREEN}[$TIMESTAMP] ✅ SSL certificate valid for $CERT_DAYS_LEFT days${NC}" >> "$LOG_FILE"
            fi
        fi
    fi
fi

echo -e "${GREEN}[$TIMESTAMP] Health check completed${NC}" >> "$LOG_FILE"
echo "==========================================" >> "$LOG_FILE"
