# Production Deployment Guide - Qahwatal Emarat

This guide covers deploying the Qahwatal Emarat cafe management system to production with security best practices.

## 🚀 Quick Start

### 1. Generate Secure Secrets
```bash
cd server
./generate-secrets.sh
```
This creates:
- `.env.production.secrets` - Generated secure secrets
- `.env.production.template` - Configuration template

### 2. Configure Production Environment
```bash
cp .env.production.template .env.production
# Edit .env.production with your values
nano .env.production
```

### 3. Run Production Setup
```bash
./setup-production.sh
```
This will:
- Generate secure secrets
- Create backup and monitoring scripts
- Set up systemd service file

### 4. Set Up Automated Tasks
```bash
./setup-cron.sh
```
This configures:
- Daily database backups at 2 AM
- Health monitoring every 5 minutes
- Monthly log rotation

## 📋 Prerequisites

### System Requirements
- Ubuntu 20.04+ or CentOS 8+
- Node.js 18+ LTS
- MongoDB 5.0+ (local or Atlas)
- Nginx (for reverse proxy)
- SSL certificate (Let's Encrypt recommended)

### Security Requirements
- Root or sudo access for service installation
- Firewall configured (UFW/iptables)
- Fail2ban for SSH protection
- Regular security updates

## 🔐 Security Configuration

### Environment Variables
```bash
# Required for production
NODE_ENV=production
FORCE_HTTPS=true
JWT_SECRET=<secure-random-32-chars>
MONGODB_URI=<mongodb-atlas-or-local-uri>
ADMIN_USERNAME=<admin-username>
ADMIN_PASSWORD=<bcrypt-hashed-password>
```

### SSL/TLS Setup
```bash
# Install certbot for Let's Encrypt
sudo apt install certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

### Nginx Configuration
```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    # Security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains";

    location / {
        proxy_pass http://localhost:5050;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Static files caching
    location /static/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

## 🗄️ Database Setup

### MongoDB Atlas (Recommended)
1. Create Atlas cluster
2. Set up database user with read/write access
3. Whitelist your server IP
4. Use connection string in `.env.production`

### Local MongoDB
```bash
# Install MongoDB
sudo apt install mongodb

# Enable and start service
sudo systemctl enable mongodb
sudo systemctl start mongodb

# Create database and user
mongosh
use qahwatalemarat
db.createUser({
  user: "qahwataluser",
  pwd: "secure-password",
  roles: ["readWrite"]
})
```

## 🔄 Backup & Recovery

### Automated Backups
The `backup.sh` script:
- Creates daily database backups
- Compresses backups to save space
- Retains backups for 30 days
- Logs all backup operations

### Manual Backup
```bash
cd server
./backup.sh
```

### Restore from Backup
```bash
# Extract backup
tar -xzf /var/backups/qahwatalemarat/backup_name.tar.gz -C /tmp

# Restore to database
mongorestore --db qahwatalemarat /tmp/backup_name/qahwatalemarat
```

## 📊 Monitoring & Alerts

### Health Checks
The `monitor.sh` script checks:
- Server responsiveness
- Database connectivity
- Disk and memory usage
- Rate limiting activity
- SSL certificate expiry
- Failed authentication attempts

### Log Analysis
```bash
# View recent logs
tail -f server/monitor.log
tail -f server/access.log

# Search for security events
grep "429" server/access.log  # Rate limited requests
grep "401\|403" server/access.log  # Failed auth
```

### Alert Configuration
Edit `monitor.sh` to configure:
- Email alerts (requires `mail` command)
- Slack webhooks
- PagerDuty integration

## 🚀 Deployment Steps

### 1. Server Preparation
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install MongoDB (if using local)
sudo apt install -y mongodb

# Install Nginx
sudo apt install -y nginx
```

### 2. Application Deployment
```bash
# Clone repository
git clone https://github.com/yourusername/qahwatal-emarat.git
cd qahwatal-emarat

# Install dependencies
cd server
npm install --production

# Generate secrets
./generate-secrets.sh

# Configure environment
cp .env.production.template .env.production
nano .env.production  # Edit with your values

# Run setup
./setup-production.sh
```

### 3. Service Installation
```bash
# Install systemd service
sudo cp qahwatal-emarat.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable qahwatal-emarat
sudo systemctl start qahwatal-emarat

# Check status
sudo systemctl status qahwatal-emarat
```

### 4. Web Server Setup
```bash
# Configure Nginx (see configuration above)
sudo nano /etc/nginx/sites-available/qahwatal-emarat
sudo ln -s /etc/nginx/sites-available/qahwatal-emarat /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 5. SSL Setup
```bash
# Install certbot
sudo apt install certbot python3-certbot-nginx

# Get certificate
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Set up auto-renewal
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

### 6. Automation Setup
```bash
cd server
./setup-cron.sh
```

## 🔍 Troubleshooting

### Common Issues

**Server won't start:**
```bash
# Check logs
sudo journalctl -u qahwatal-emarat -f

# Check environment
cat .env.production

# Test manually
NODE_ENV=production node index.js
```

**Database connection fails:**
```bash
# Test connection
mongosh "your-connection-string"

# Check MongoDB status
sudo systemctl status mongodb
```

**SSL certificate issues:**
```bash
# Check certificate
sudo certbot certificates

# Renew certificate
sudo certbot renew
```

**High memory usage:**
```bash
# Check process memory
ps aux --sort=-%mem | head

# Monitor with htop
sudo apt install htop
htop
```

### Performance Tuning

**Node.js Optimization:**
```bash
# Use PM2 for production
npm install -g pm2
pm2 start index.js --name qahwatal-emarat
pm2 startup
pm2 save
```

**Database Optimization:**
- Enable database indexing (already configured)
- Monitor slow queries
- Consider read replicas for high traffic

## 🔄 Updates & Maintenance

### Application Updates
```bash
# Pull latest changes
git pull origin main

# Install dependencies
npm install --production

# Restart service
sudo systemctl restart qahwatal-emarat
```

### Security Updates
```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Update Node.js dependencies
npm audit fix

# Rotate secrets quarterly
./generate-secrets.sh
# Update .env.production with new secrets
sudo systemctl restart qahwatal-emarat
```

### Backup Verification
```bash
# Test backup integrity
cd /var/backups/qahwatalemarat
tar -tzf latest-backup.tar.gz | head -10

# Test restore procedure
mongorestore --dry-run /tmp/backup_test
```

## 📞 Support

For issues or questions:
1. Check logs: `tail -f server/monitor.log`
2. Review system status: `sudo systemctl status qahwatal-emarat`
3. Check application health: `curl https://yourdomain.com/api/health`
4. Review this documentation
5. Contact system administrator

## 📝 Checklist

### Pre-deployment
- [ ] Server provisioned with required software
- [ ] Domain configured with DNS
- [ ] SSL certificate obtained
- [ ] Database created and configured
- [ ] Secrets generated and stored securely

### Deployment
- [ ] Application code deployed
- [ ] Environment variables configured
- [ ] Services installed and started
- [ ] Nginx configured and tested
- [ ] SSL enabled and verified

### Post-deployment
- [ ] Automated backups configured
- [ ] Monitoring and alerts set up
- [ ] Health checks passing
- [ ] Admin access tested
- [ ] User acceptance testing completed

### Maintenance
- [ ] Backup integrity verified
- [ ] Log rotation working
- [ ] Security updates applied
- [ ] Performance monitored
- [ ] Documentation updated</content>
<parameter name="filePath">/Volumes/PERSONAL/Qahwatal Emarat/PRODUCTION_DEPLOYMENT.md
