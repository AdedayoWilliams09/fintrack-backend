// FILE: backend/server.js
// COMPLETE FIXED - WITH JSON PARSER

import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import mongoose from 'mongoose';
import connectDB from './config/db.js';
import { query, validationResult } from 'express-validator';
import { setupSwagger } from './swagger.js';

// ============================================
//  IMPORT AUTH ROUTES
// ============================================
import authRoutes from './routes/authRoutes.js';

// Load environment variables
dotenv.config();

// Validate required environment variables
const requiredEnvVars = ['PORT', 'MONGO_URI', 'FRONTEND_URL'];
for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    console.error(`❌ Missing required environment variable: ${envVar}`);
    process.exit(1);
  }
}

// Create Express app
const app = express();

// ============================================
//  ✅ CRITICAL: BODY PARSER MIDDLEWARE
//  MUST COME BEFORE ANY ROUTES!
// ============================================

// ✅ JSON Parser - Parses JSON request bodies
app.use(express.json({ limit: '10mb' }));

// ✅ URL Encoded Parser - Parses form data
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ============================================
//  OTHER MIDDLEWARE
// ============================================

// Helmet - Security headers
app.use(helmet());

// CORS - Allow frontend access
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
  optionsSuccessStatus: 200
}));

// Compression - Make responses smaller
app.use(compression());

// Logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Swagger UI
setupSwagger(app);

// Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: {
    success: false,
    message: 'Too many requests, please try again later'
  },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api', limiter);

// ============================================
//  ROUTES - MUST COME AFTER MIDDLEWARE
// ============================================

// Health check route
app.get('/api/health', (req, res) => {
  const mongoState = mongoose.connection.readyState;
  const mongoStatus = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting'
  };
  
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    mongoConnected: mongoState === 1,
    mongoState: mongoStatus[mongoState] || 'unknown'
  });
});

// Test connection route
app.get('/api/test', [
  query('invalid').isEmpty().withMessage('Invalid query parameters'),
], (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Invalid query parameters',
      errors: errors.array()
    });
  }
  
  res.json({
    success: true,
    message: 'API connection successful',
    data: {
      backendStatus: 'healthy',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV
    }
  });
});

// ✅ AUTH ROUTES
app.use('/api/auth', authRoutes);

// ============================================
//  ERROR HANDLING
// ============================================

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    path: req.originalUrl
  });
});

// Error handling middleware
const errorHandler = (err, req, res, next) => {
  console.error('Error:', err.message);
  
  if (process.env.NODE_ENV === 'development') {
    console.error(err.stack);
  }
  
  const response = {
    success: false,
    message: err.message || 'Internal Server Error'
  };
  
  if (process.env.NODE_ENV === 'development') {
    response.stack = err.stack;
  }
  
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map(e => e.message);
    return res.status(400).json({
      success: false,
      message: 'Validation Error',
      errors: messages
    });
  }
  
  if (err.code === 11000) {
    return res.status(400).json({
      success: false,
      message: 'Duplicate field value entered'
    });
  }
  
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      message: 'Invalid token. Please login again.'
    });
  }
  
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      message: 'Token expired. Please login again.'
    });
  }
  
  res.status(err.status || 500).json(response);
};
app.use(errorHandler);

// ============================================
//  START SERVER
// ============================================

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await connectDB();
    
    const server = app.listen(PORT, () => {
      console.log(`\n🚀 Server running on http://localhost:${PORT}`);
      console.log(`📍 Environment: ${process.env.NODE_ENV}`);
      console.log(`🔗 Allowed origin: ${process.env.FRONTEND_URL}`);
      console.log(`📚 Health check: http://localhost:${PORT}/api/health`);
      console.log(`📖 API Docs: http://localhost:${PORT}/api-docs`);
      console.log(`🔐 Auth endpoints: http://localhost:${PORT}/api/auth`);
      console.log('\n✅ Authentication API is ready!');
      console.log('📧 Register: POST /api/auth/register');
      console.log('🔑 Login: POST /api/auth/login');
      console.log('👤 Get me: GET /api/auth/me (requires token)\n');
    });
    
    const shutdown = async () => {
      console.log('\n📴 Received shutdown signal, closing server...');
      server.close(() => {
        console.log('🛑 Server closed');
        mongoose.connection.close(false, () => {
          console.log('💾 Database connection closed');
          process.exit(0);
        });
      });
      
      setTimeout(() => {
        console.error('❌ Forced shutdown after timeout');
        process.exit(1);
      }, 10000);
    };
    
    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
    
  } catch (error) {
    console.error('❌ Failed to start server:', error.message);
    process.exit(1);
  }
};

startServer();

export default app;