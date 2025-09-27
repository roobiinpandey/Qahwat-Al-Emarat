# Qahwat Al Emarat Backup & Recovery Guide
## Version 3.0 - September 28, 2025

This guide covers the comprehensive backup and recovery system for the Qahwat Al Emarat project.

## Table of Contents
1. [Backup System Overview](#backup-system-overview)
2. [Quick Start](#quick-start)
3. [Configuration](#configuration)
4. [Backup Scripts](#backup-scripts)
5. [Recovery Procedures](#recovery-procedures)
6. [Cloud Storage Integration](#cloud-storage-integration)
7. [Monitoring & Notifications](#monitoring--notifications)
8. [Troubleshooting](#troubleshooting)

## Backup System Overview

The backup system consists of multiple scripts designed for different backup scenarios:

- **`backup.sh`** - Database-only backup with cloud storage support
- **`auto_backup.sh`** - Complete project backup (files + database)
- **`server/backup.sh`** - Production server backup with retention
- **`server/setup-cron.sh`** - Automated backup scheduling

### Features
- ✅ Database backup (MongoDB)
- ✅ File system backup
- ✅ Compression and verification
- ✅ Cloud storage integration (AWS S3, Azure, GCP)
- ✅ Automated retention policies
- ✅ Notification system
- ✅ Recovery procedures
- ✅ Comprehensive logging

## Quick Start

### Basic Database Backup
```bash
# Simple database backup
./backup.sh

# With custom retention
./backup.sh --retention-days=14
```

### Complete Project Backup
```bash
# Interactive project backup
./auto_backup.sh

# Automated project backup
./auto_backup.sh --no-database --max-backups=10
```

### Setup Automated Backups
```bash
# Setup cron jobs for automated backups
cd server && ./setup-cron.sh
```

## Configuration

### Environment Variables

Create a `.env` file in the project root:

```bash
# Database Configuration
MONGODB_URI=mongodb://localhost:27017/qahwat_al_emarat

# Cloud Storage (choose one or more)
AWS_S3_BUCKET=your-backup-bucket
AZURE_STORAGE_ACCOUNT=yourstorageaccount
AZURE_CONTAINER=qahwatalemarat-backups
GCP_BUCKET=your-gcp-bucket

# Notifications
NOTIFICATION_WEBHOOK=https://hooks.slack.com/your/webhook

# Backup Settings
RETENTION_DAYS=30
ENABLE_CLOUD_BACKUP=true
```

### Cloud Storage Setup

#### AWS S3
```bash
# Install AWS CLI
pip install awscli

# Configure AWS credentials
aws configure

# Set environment variable
export AWS_S3_BUCKET=your-backup-bucket
```

#### Azure Blob Storage
```bash
# Install Azure CLI
curl -sL https://aka.ms/InstallAzureCLIDeb | sudo bash

# Login to Azure
az login

# Set environment variables
export AZURE_STORAGE_ACCOUNT=yourstorageaccount
export AZURE_CONTAINER=qahwatalemarat-backups
```

#### Google Cloud Storage
```bash
# Install Google Cloud SDK
# Follow: https://cloud.google.com/sdk/docs/install

# Authenticate
gcloud auth login

# Set environment variable
export GCP_BUCKET=your-gcp-bucket
```

## Backup Scripts

### backup.sh - Database Backup

**Usage:**
```bash
./backup.sh [OPTIONS]

Options:
  --retention-days=N     Keep backups for N days (default: 7)
  --notification-url=URL Send notifications to webhook URL
  --aws-s3-bucket=BUCKET Upload to AWS S3 bucket
  --azure-account=NAME   Upload to Azure Storage account
  --gcp-bucket=BUCKET    Upload to Google Cloud Storage bucket
```

**Features:**
- MongoDB database dump
- Automatic compression
- Integrity verification
- Cloud storage upload
- Retention management
- Notification support

### auto_backup.sh - Project Backup

**Usage:**
```bash
./auto_backup.sh [OPTIONS]

Options:
  --backup-dir=DIR        Backup directory (default: ../backups)
  --max-backups=N         Keep maximum N backups (default: 5)
  --compression=N         Compression level 1-9 (default: 6)
  --no-database           Skip database backup
  --enable-cloud          Enable cloud storage backup
  --notification-url=URL  Send notifications to webhook URL
  --aws-s3-bucket=BUCKET  Upload to AWS S3 bucket
  --azure-account=NAME    Upload to Azure Storage account
  --gcp-bucket=BUCKET     Upload to Google Cloud Storage bucket
```

**Features:**
- Complete project files backup
- Database backup (optional)
- Intelligent file exclusion
- Backup verification
- Cloud storage integration
- Interactive confirmation
- Detailed backup information

### server/backup.sh - Production Backup

**Usage:**
```bash
cd server && ./backup.sh
```

**Features:**
- Production-optimized backup
- 30-day retention policy
- Comprehensive logging
- Health monitoring integration

### server/setup-cron.sh - Automation

**Usage:**
```bash
cd server && ./setup-cron.sh
```

**Scheduled Tasks:**
- Daily database backup: 2:00 AM
- Health monitoring: Every 5 minutes
- Log rotation: 1st of each month at 3:00 AM

## Recovery Procedures

### Database Recovery

1. **Stop the application**
   ```bash
   # Stop your application server
   cd server && npm stop
   ```

2. **Restore from backup**
   ```bash
   # Extract backup
   tar -xzf backups/qahwat_al_emarat_backup_20250928_143000.tar.gz -C /tmp/

   # Restore database
   mongorestore --uri="mongodb://localhost:27017/qahwat_al_emarat" /tmp/qahwat_al_emarat_backup_20250928_143000/
   ```

3. **Verify restoration**
   ```bash
   # Connect to MongoDB and check data
   mongosh qahwat_al_emarat
   db.collection.countDocuments()
   ```

4. **Restart application**
   ```bash
   cd server && npm start
   ```

### Project Files Recovery

1. **Extract backup**
   ```bash
   cd backups
   tar -xzf qahwatalemarat_backup_20250928_143000.tar.gz
   cd qahwatalemarat_backup_20250928_143000
   ```

2. **Restore files**
   ```bash
   # Copy files back to project (review what to restore)
   cp -r . ../project/
   ```

3. **Reinstall dependencies**
   ```bash
   cd ../project
   npm install
   cd server && npm install
   ```

### Cloud Storage Recovery

#### AWS S3
```bash
# Download from S3
aws s3 cp s3://your-backup-bucket/backup.tar.gz .

# Extract and restore
tar -xzf backup.tar.gz
```

#### Azure
```bash
# Download from Azure
az storage blob download --account-name yourstorageaccount \
                        --container-name backups \
                        --name backup.tar.gz \
                        --file backup.tar.gz

# Extract and restore
tar -xzf backup.tar.gz
```

#### Google Cloud
```bash
# Download from GCP
gsutil cp gs://your-bucket/backup.tar.gz .

# Extract and restore
tar -xzf backup.tar.gz
```

## Cloud Storage Integration

### AWS S3 Setup
```bash
# Create bucket
aws s3 mb s3://qahwatalemarat-backups

# Enable versioning (recommended)
aws s3api put-bucket-versioning \
    --bucket qahwatalemarat-backups \
    --versioning-configuration Status=Enabled

# Set lifecycle policy for cost optimization
aws s3api put-bucket-lifecycle-configuration \
    --bucket qahwatalemarat-backups \
    --lifecycle-configuration file://lifecycle-policy.json
```

### Azure Blob Storage Setup
```bash
# Create storage account
az storage account create \
    --name qahwatalemaratbackups \
    --resource-group your-resource-group \
    --sku Standard_LRS

# Create container
az storage container create \
    --account-name qahwatalemaratbackups \
    --name qahwatalemarat-backups
```

### Google Cloud Storage Setup
```bash
# Create bucket
gsutil mb -p your-project gs://qahwatalemarat-backups

# Set lifecycle policy
gsutil lifecycle set lifecycle-policy.json gs://qahwatalemarat-backups
```

## Monitoring & Notifications

### Notification Setup

#### Slack Webhook
1. Create a Slack app at https://api.slack.com/apps
2. Add "Incoming Webhooks" feature
3. Create a webhook URL
4. Set `NOTIFICATION_WEBHOOK` environment variable

#### Discord Webhook
1. Go to Server Settings → Integrations → Webhooks
2. Create new webhook
3. Copy webhook URL
4. Set `NOTIFICATION_WEBHOOK` environment variable

### Monitoring Logs

```bash
# View backup logs
tail -f backups/backup.log

# View server backup logs
tail -f server/backup.log

# View monitor logs
tail -f server/monitor.log
```

### Health Checks

```bash
# Run health check
cd server && ./monitor.sh

# Check backup status
ls -la backups/*.tar.gz
```

## Troubleshooting

### Common Issues

#### MongoDB Connection Failed
```bash
# Check MongoDB status
sudo systemctl status mongod

# Check connection
mongosh --eval "db.adminCommand('ping')"

# Verify URI
echo $MONGODB_URI
```

#### Cloud Upload Failed
```bash
# Check AWS credentials
aws sts get-caller-identity

# Check Azure login
az account show

# Check GCP authentication
gcloud auth list
```

#### Permission Denied
```bash
# Make scripts executable
chmod +x backup.sh
chmod +x auto_backup.sh
chmod +x server/backup.sh
chmod +x server/setup-cron.sh
```

#### Disk Space Issues
```bash
# Check disk usage
df -h

# Clean old backups manually
find backups/ -name "*.tar.gz" -mtime +30 -delete
```

### Backup Verification

```bash
# Test backup integrity
tar -tzf backup.tar.gz > /dev/null

# Check backup contents
tar -tf backup.tar.gz | head -20

# Verify database backup
tar -tf backup.tar.gz | grep -E "\.(bson|json)$"
```

### Recovery Testing

**Important:** Always test your recovery procedure!

```bash
# Create test environment
mkdir test-recovery
cd test-recovery

# Download and extract backup
# ... (follow recovery procedures above)

# Test application startup
npm install
npm start

# Verify data integrity
# ... (run your application tests)
```

## Best Practices

### Backup Strategy
1. **3-2-1 Rule**: 3 copies, 2 different media, 1 offsite
2. **Test Restores**: Regularly test recovery procedures
3. **Monitor Backups**: Check logs and receive notifications
4. **Secure Credentials**: Never store credentials in code

### Security Considerations
- Encrypt sensitive backups
- Use IAM roles instead of access keys
- Rotate credentials regularly
- Monitor access logs

### Performance Optimization
- Schedule backups during low-traffic hours
- Use compression to reduce storage costs
- Implement incremental backups for large datasets
- Monitor backup duration and size trends

## Support

For issues or questions about the backup system:

1. Check the logs in `backups/backup.log`
2. Review this documentation
3. Test in a development environment first
4. Contact the development team

---

**Last Updated:** September 28, 2025
**Version:** 3.0
