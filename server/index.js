require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const morgan = require('morgan');
const { body, validationResult } = require('express-validator');
const { apiLimiter, authLimiter, orderLimiter } = require('./middleware/rateLimiter');
const multer = require('multer');
const path = require('path');

const app = express();

// CORS configuration
const allowedOrigins = process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : ['http://localhost:3000', 'http://localhost:3001'];
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, etc.)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

app.use(express.json({ limit: '10mb' })); // Limit payload size

// Security headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
});

// Request logging
app.use(morgan('combined'));

// HTTPS enforcement in production
if (process.env.FORCE_HTTPS === 'true') {
  app.use((req, res, next) => {
    if (req.header('x-forwarded-proto') !== 'https') {
      res.redirect(`https://${req.header('host')}${req.url}`);
    } else {
      next();
    }
  });
}

// Serve static files from images directory
app.use('/images', express.static('images'));

// Serve uploaded files
app.use('/uploads', express.static('uploads'));

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    // Generate unique filename with timestamp
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    // Check if file is an image
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  }
});

// MongoDB connection with error handling
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/qahwatalemarat', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Connected to MongoDB');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

connectDB();

// Authentication middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

// Apply rate limiting
app.use('/api/', apiLimiter);

// Admin login route
app.post('/api/admin/login', authLimiter, [
  body('username').trim().isLength({ min: 1 }).withMessage('Username is required'),
  body('password').isLength({ min: parseInt(process.env.PASSWORD_MIN_LENGTH) || 8 }).withMessage(`Password must be at least ${process.env.PASSWORD_MIN_LENGTH || 8} characters`)
    .matches(process.env.PASSWORD_REQUIRE_UPPERCASE === 'true' ? /(?=.*[A-Z])/ : /(?=.*[a-z])/)
    .withMessage('Password must contain uppercase letter')
    .matches(process.env.PASSWORD_REQUIRE_LOWERCASE === 'true' ? /(?=.*[a-z])/ : /(?=.*[a-z])/)
    .withMessage('Password must contain lowercase letter')
    .matches(process.env.PASSWORD_REQUIRE_NUMBERS === 'true' ? /(?=.*\d)/ : /(?=.*[a-z])/)
    .withMessage('Password must contain number')
    .matches(process.env.PASSWORD_REQUIRE_SYMBOLS === 'true' ? /(?=.*[@$!%*?&])/ : /(?=.*[a-z])/)
    .withMessage('Password must contain special character')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { username, password } = req.body;

    // Get credentials from environment variables
    const adminUsername = process.env.ADMIN_USERNAME;
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (!adminUsername || !adminPassword) {
      console.error('Admin credentials not configured in environment variables');
      return res.status(500).json({ error: 'Server configuration error' });
    }

    // Verify credentials
    const isValidPassword = await bcrypt.compare(password, adminPassword);
    if (username === adminUsername && isValidPassword) {
      const token = jwt.sign(
        { username: username, role: 'admin' },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRE || '7d' }
      );

      res.json({
        message: 'Login successful',
        token,
        user: { username, role: 'admin' }
      });
    } else {
      res.status(401).json({ error: 'Invalid credentials' });
    }
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// File upload endpoint
app.post('/api/upload', authenticateToken, upload.single('image'), (req, res) => {
  console.log('Upload endpoint called');
  console.log('File:', req.file);
  console.log('Body:', req.body);
  try {
    if (!req.file) {
      console.log('No file uploaded');
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Return the file path that can be used in the frontend
    const fileUrl = `/uploads/${req.file.filename}`;
    console.log('File uploaded successfully:', fileUrl);
    res.json({
      message: 'File uploaded successfully',
      fileUrl: fileUrl,
      filename: req.file.filename
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'File upload failed' });
  }
});

// Basic API endpoints
app.get('/', (req, res) => {
  res.json({
    message: 'Qahwatal Emarat API',
    version: '1.0.0',
    status: 'running'
  });
});

// API routes (v1)
app.use('/api/v1/menu', require('./routes/menu'));
app.use('/api/v1/order', require('./routes/order'));
app.use('/api/v1/admin', authenticateToken, require('./routes/admin'));
app.use('/api/v1/inventory', authenticateToken, require('./routes/inventory'));

// Legacy API routes (for backward compatibility)
app.use('/api/menu', require('./routes/menu'));
app.use('/api/order', require('./routes/order'));
app.use('/api/admin', authenticateToken, require('./routes/admin'));
app.use('/api/inventory', authenticateToken, require('./routes/inventory'));

const PORT = process.env.PORT || 5050;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down gracefully...');
  await mongoose.connection.close();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('Shutting down gracefully...');
  await mongoose.connection.close();
  process.exit(0);
});
