// FILE: backend/server.js


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

// Load environment variables
dotenv.config();

// Validate required environment variables
const requiredEnvVars = ['PORT', 'MONGO_URI', 'FRONTEND_URL'];
for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    console.error(` Missing required environment variable: ${envVar}`);
    process.exit(1);
  }
}

// Create Express app
const app = express();

//  SECURITY MIDDLEWARE - Protecting the application

// 1. Helmet - Sets security headers
// : "Helmet puts invisible force fields around your house to protect it"
// : "Helmet sets various HTTP headers like X-Content-Type-Options, X-Frame-Options, etc."
app.use(helmet());

// 2. CORS - Allow only frontend to access
// : "CORS is like a guest list - only people on the list can enter"
// : "Cross-Origin Resource Sharing allows only specified origins to access the API"
app.use(cors({
  origin: process.env.FRONTEND_URL,
  credentials: true,
  optionsSuccessStatus: 200
}));

// 3. Compression - Make responses smaller for faster loading
// : "Compression is like vacuum-sealing your clothes to make them smaller"
// : "Compression uses gzip/brotli to reduce response size and bandwidth usage"
app.use(compression());

// 4. JSON Parser - Understand JSON data
// : "JSON parser translates the visitor's language into something our app understands"
// : "express.json() parses incoming JSON request bodies and makes them available as req.body"
app.use(express.json({ limit: '10mb' }));

// 5. URL Encoded Parser - Understand form data
// : "This understands when someone fills out a paper form and sends it"
// : "Parses URL-encoded form data (from HTML forms) into JavaScript objects"
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 6. Logging - See what's happening
// : "Logging is like having a security camera that records everyone who comes and goes"
// : "Morgan logs HTTP requests with details like method, URL, status code, and response time"
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

setupSwagger(app);

// 7. Rate Limiting - Prevent abuse
// : "Rate limiting is like a bouncer that says 'You've had too many drinks, come back later'"
// : "express-rate-limit limits repeated requests from the same IP address to prevent DDOS attacks"
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  message: {
    success: false,
    message: 'Too many requests, please try again later'
  },
  standardHeaders: true, // Return rate limit info in RateLimit-* headers
  legacyHeaders: false, // Disable X-RateLimit-* headers
});
app.use('/api', limiter);

//  ROUTES - The actual API endpoints

// Health check route
// : "Health check is like calling your friend to see if they're awake"
// : "Lightweight endpoint used by monitoring tools to verify service availability"
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
//  "Test route is like a handshake to make sure the connection works"
//  "Simple endpoint to verify API connectivity without authentication"
app.get('/api/test', [
  query('invalid').isEmpty().withMessage('Invalid query parameters'),
], (req, res, next) => {
  // Check for validation errors
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

// 404 handler - Route not found
//  "This is like telling someone 'Sorry, that room doesn't exist'"
//  "Catches all requests that don't match any defined route"
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    path: req.originalUrl
  });
});

// Error handling middleware
//  "This is like having a safety net that catches you if you fall"
//  "Central error handler that catches all errors and returns consistent JSON responses"
const errorHandler = (err, req, res, next) => {
  console.error('Error:', err.message);
  
  // Log stack trace in development only
  if (process.env.NODE_ENV === 'development') {
    console.error(err.stack);
  }
  
  // Hide stack traces in production
  const response = {
    success: false,
    message: err.message || 'Internal Server Error'
  };
  
  if (process.env.NODE_ENV === 'development') {
    response.stack = err.stack;
  }
  
  // Handle Mongoose validation errors
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map(e => e.message);
    return res.status(400).json({
      success: false,
      message: 'Validation Error',
      errors: messages
    });
  }
  
  // Handle duplicate key errors
  if (err.code === 11000) {
    return res.status(400).json({
      success: false,
      message: 'Duplicate field value entered'
    });
  }
  
  res.status(err.status || 500).json(response);
};
app.use(errorHandler);

// Start the server
const PORT = process.env.PORT || 5000;

//  Function to start the server only after DB connection
const startServer = async () => {
  try {
    // Connect to database first
    await connectDB();
    
    // Then start the server
    const server = app.listen(PORT, () => {
      console.log(` Server running on http://localhost:${PORT}`);
      console.log(` Environment: ${process.env.NODE_ENV}`);
      console.log(` Allowed origin: ${process.env.FRONTEND_URL}`);
    });
    
    // Graceful shutdown
    const shutdown = async () => {
      console.log(' Received shutdown signal, closing server...');
      server.close(() => {
        console.log(' Server closed');
        mongoose.connection.close(false, () => {
          console.log(' Database connection closed');
          process.exit(0);
        });
      });
      
      // Force close after 10 seconds if graceful shutdown fails
      setTimeout(() => {
        console.error(' Forced shutdown after timeout');
        process.exit(1);
      }, 10000);
    };
    
    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
    
  } catch (error) {
    console.error('Failed to start server:', error.message);
    process.exit(1);
  }
};



startServer();

export default app;