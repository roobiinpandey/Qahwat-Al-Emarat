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
   MONGODB_URI=mongodb+srv://roobiinpandey_db_user:WuKbKFaznGK8HBTr@qahwatalemarates.c5rwjak.mongodb.net/qahwatalemarat?retryWrites=true&w=majority&appName=QahwatAlemarates
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

### Default Admin Credentials

- **Username**: `welcome`
- **Password**: `admin123`

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

### Service URLs

After deployment, your services will be available at:
- **Frontend**: `https://qahwatal-emarat-frontend.onrender.com`
- **API**: `https://qahwatal-emarat-api.onrender.com`

---

## 🛠 Local Development

```bash
# Install dependencies
npm install

# Start backend
cd server && npm start

# Start frontend (in new terminal)
cd frontend && npm start
```

## 📱 Features

- Menu management with image uploads
- Real-time order processing
- Admin dashboard with analytics
- Responsive design
- Secure authentication
- Rate limiting and security features
