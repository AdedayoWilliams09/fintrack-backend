// FILE: backend/src/middleware/rateLimiter.js
import rateLimit from 'express-rate-limit';

/**
 * Rate Limiter Middleware
 * 
 * Child Explanation:
 * "This stops people from trying to log in too many times too quickly.
 * It's like a bouncer that says 'Slow down!'"
 * 
 * Technical Explanation:
 * "Express rate limiting middleware to prevent brute force attacks."
 */

// Strict limiter for authentication endpoints
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window
  message: {
    success: false,
    message: 'Too many login attempts. Please try again after 15 minutes.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Strict limiter for registration
export const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // 3 attempts per window
  message: {
    success: false,
    message: 'Too many registration attempts. Please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Strict limiter for password reset
export const forgotPasswordLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // 3 attempts per window
  message: {
    success: false,
    message: 'Too many password reset attempts. Please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});