# Qahwatal Emarat - Restaurant Management System

A modern, full-stack restaurant management system built with React and Node.js, featuring menu management, order processing, and admin dashboard.

## 🚀 Deployment to Render (Individual Services)

This application is configured for deployment to [Render](https://render.com) using individual web services.

### Prerequisites

1. **GitHub Repository**: Your code should be pushed to GitHub
2. **Render Account**: Sign up at [render.com](https://render.com)
3. **MongoDB Database**: You'll need a MongoDB instance (Render provides free tier or use MongoDB Atlas)

### Deployment Steps

#### 1. Create MongoDB Database

1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click "New" → "MongoDB"
3. Name it: `qahwatal-emarat-db`
4. Database name: `qahwatalemarat`
5. Copy the connection string for later use

#### 2. Create Backend API Service

1. Click "New" → "Web Service"
2. Connect your GitHub repository: `https://github.com/roobiinpandey/Qahwat-Al-Emarat.git`
3. Configure the service:
   - **Name**: `qahwatal-emarat-api`
   - **Runtime**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Root Directory**: `server` (important!)

4. Set Environment Variables:
   ```
   NODE_ENV=production
   MONGODB_URI=your_mongodb_connection_string_here
   JWT_SECRET=your_secure_random_jwt_secret_here
   JWT_EXPIRE=7d
   ADMIN_USERNAME=welcome
   ADMIN_PASSWORD=$2a$12$PT/wLim5iYtdv2u9u4VTpu/tkqkysBi6bdsaPnIksVVYLAlZ3jCI6
   PASSWORD_MIN_LENGTH=8
   PASSWORD_REQUIRE_UPPERCASE=false
   PASSWORD_REQUIRE_LOWERCASE=true
   PASSWORD_REQUIRE_NUMBERS=true
   PASSWORD_REQUIRE_SYMBOLS=true
   ALLOWED_ORIGINS=https://your-frontend-service-name.onrender.com
   RATE_LIMIT_WINDOW_MS=900000
   RATE_LIMIT_MAX_REQUESTS=100
   FORCE_HTTPS=true
   ```

5. Click "Create Web Service"

#### 3. Create Frontend Service

1. Click "New" → "Web Service" (or "Static Site")
2. Connect your GitHub repository: `https://github.com/roobiinpandey/Qahwat-Al-Emarat.git`
3. Configure the service:
   - **Name**: `qahwatal-emarat-frontend`
   - **Runtime**: `Node` (for Static Site, choose "Static Site")
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npx serve -s build -l 10000` (for Web Service)
   - **Publish Directory**: `build` (for Static Site)
   - **Root Directory**: `frontend` (important!)

4. Set Environment Variables:
   ```
   REACT_APP_API_BASE=https://your-api-service-name.onrender.com/api
   ```

5. Click "Create Web Service" or "Create Static Site"

### 🔐 Critical Security Setup (REQUIRED)

#### Generate Secure Secrets Before Deployment:

1. **JWT Secret** (minimum 32 characters):
   ```bash
   # Generate a secure random JWT secret
   openssl rand -base64 32
   # Or use: https://www.uuidgenerator.net/
   ```

2. **Admin Password Hash**:
   ```bash
   # Use bcrypt to hash your admin password
   # Online tool: https://bcrypt-generator.com/
   # Or use Node.js:
   node -e "const bcrypt = require('bcryptjs'); console.log(bcrypt.hashSync('your_secure_password', 12));"
   ```

3. **MongoDB Atlas Setup**:
   - Create cluster at [MongoDB Atlas](https://cloud.mongodb.com)
   - Create database user with secure password
   - Get connection string (format: `mongodb+srv://username:password@cluster.mongodb.net/database`)

### 🚀 Deployment Options

#### Option 1: Manual Setup (Recommended for First Deployment)

Follow the step-by-step instructions above for manual service creation.

#### Option 2: Blueprint Deployment (Automated)

Use the `render.yaml` file for automated deployment:

1. **Render Dashboard** → **New** → **Blueprint**
2. Connect: `https://github.com/roobiinpandey/Qahwat-Al-Emarat.git`
3. Render auto-creates services from `render.yaml`
4. **CRITICAL**: Set environment variables in each service

### ⚙️ Required Environment Variables

#### Backend Service (`qahwatal-emarat-api`):
```
NODE_ENV=production
MONGODB_URI=mongodb+srv://your_username:your_password@cluster.mongodb.net/qahwatalemarat
JWT_SECRET=your_32_character_secure_random_jwt_secret
JWT_EXPIRE=7d
ADMIN_USERNAME=admin
ADMIN_PASSWORD=your_bcrypt_hashed_password
ALLOWED_ORIGINS=https://qahwatal-emarat-frontend.onrender.com
```

#### Frontend Service (`qahwatal-emarat-frontend`):
```
REACT_APP_API_BASE=https://qahwatal-emarat-api.onrender.com/api
```

### Post-Deployment Configuration

1. **Update CORS**: After both services are deployed, update the `ALLOWED_ORIGINS` in the API service with your actual frontend URL
2. **Test Login**: Visit your frontend URL and try logging in with the admin credentials
3. **Database**: The application will automatically create collections and indexes on first run

### Troubleshooting

- **Build Failures**: Check the build logs in Render dashboard
- **CORS Issues**: Ensure `ALLOWED_ORIGINS` matches your frontend URL exactly
- **Database Connection**: Verify your MongoDB URI is correct
- **Environment Variables**: Make sure all required variables are set
- **Root Directory**: Make sure to set the correct root directory for each service

### Quick Deploy with render.yaml (Recommended)

If you prefer automated deployment, you can use the `render.yaml` file in your repository root:

1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click "New" → "Blueprint"
3. Connect your GitHub repository: `https://github.com/roobiinpandey/Qahwat-Al-Emarat.git`
4. Render will automatically detect and create all services from `render.yaml`
5. Set the required environment variables in each service after creation

**Note**: The render.yaml approach creates services with different configurations than the manual approach.

### 📋 Deployment Checklist

- [ ] **MongoDB Atlas**: Create cluster and database user
- [ ] **Generate Secrets**: JWT secret (32+ chars) and admin password hash
- [ ] **Render Account**: Sign up at render.com
- [ ] **GitHub**: Repository pushed and public
- [ ] **Environment Variables**: Prepared for both services
- [ ] **Test Locally**: Ensure app works before deployment
- [ ] **Deploy Backend**: Create API service first
- [ ] **Deploy Frontend**: Create frontend service second
- [ ] **Update CORS**: Set ALLOWED_ORIGINS in backend
- [ ] **Test Production**: Verify login and functionality
- [ ] **Change Admin Password**: Update default credentials

### 🔍 Post-Deployment Testing

1. **Frontend URL**: Should load without errors
2. **Admin Login**: Use your secure admin credentials
3. **Menu Management**: Add/edit menu items
4. **Order Processing**: Test order creation
5. **Database**: Verify data persistence
6. **API Endpoints**: Test all CRUD operations

### 🚨 Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| Build fails | Check build logs, verify package.json scripts |
| CORS errors | Update ALLOWED_ORIGINS with correct frontend URL |
| Database connection | Verify MongoDB URI format and credentials |
| Environment variables | Ensure all required vars are set in Render |
| 404 on API calls | Check REACT_APP_API_BASE URL format |

---

## � Docker Deployment

The application now includes Docker support for easy deployment and development.

### Quick Start with Docker

```bash
# Clone the repository
git clone https://github.com/roobiinpandey/Qahwat-Al-Emarat.git
cd Qahwat-Al-Emarat

# Create environment file
cp .env.example .env
# Edit .env with your configuration

# Start with Docker Compose
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### Docker Commands

```bash
# Build the image
docker build -t qahwat-al-emarat .

# Run the container
docker run -p 3000:3000 --env-file .env qahwat-al-emarat

# Run with MongoDB
docker-compose up -d

# View running containers
docker ps

# Stop all services
docker-compose down
```

## 🔄 CI/CD Pipeline

The project includes GitHub Actions for automated testing and deployment.

### CI/CD Features

- **Automated Testing**: Runs tests on every push and PR
- **Docker Build**: Creates optimized Docker images
- **Security Scanning**: Checks for vulnerabilities
- **Deployment Ready**: Prepares artifacts for deployment

### Pipeline Stages

1. **Test**: Runs unit tests and integration tests
2. **Build**: Creates production build and Docker image
3. **Deploy**: Deploys to production (when configured)

## 📊 Monitoring & Health Checks

### Health Check Endpoints

- `GET /api/v1/health` - Basic health check
- `GET /api/v1/metrics` - System metrics and cache status

### Monitoring Features

- Memory usage tracking
- Cache performance metrics
- Database connection status
- Application uptime
- Request/response monitoring

## 💾 Database Backup

### Automated Backups

The project includes automated database backup scripts.

```bash
# Run manual backup
./backup.sh

# Schedule automated backups (add to crontab)
# 0 2 * * * /path/to/backup.sh
```

### Backup Features

- Compressed backups with timestamp
- Automatic cleanup (keeps last 7 backups)
- Configurable retention policies
- Cloud storage ready (AWS S3, Azure Blob)

## 🚀 Performance Optimizations

### Frontend Optimizations

- **Code Splitting**: Route-based lazy loading with React.lazy()
- **Bundle Optimization**: Reduced initial bundle size
- **Image Optimization**: Automatic compression and WebP conversion

### Backend Optimizations

- **Database Queries**: Optimized with aggregation pipelines
- **Caching**: In-memory cache with TTL for frequently accessed data
- **Image Processing**: Sharp library for efficient image handling
- **Rate Limiting**: Configurable rate limits for API endpoints

### Caching Strategy

- Menu items cached for 5 minutes
- Automatic cache cleanup
- Cache hit/miss monitoring
- Memory-efficient implementation
