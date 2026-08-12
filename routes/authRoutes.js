// FILE: backend/src/routes/authRoutes.js
// FIXED - Remove express-validator from login route

import express from 'express';
import { body } from 'express-validator';
import { protect } from '../middleware/authMiddleware.js';
import { 
  authLimiter, 
  registerLimiter, 
  forgotPasswordLimiter 
} from '../middleware/rateLimiter.js';
import {
  register,
  login,
  verifyEmail,
  forgotPassword,
  resetPassword,
  getMe,
  updateProfile,
  refreshToken,
  logout
} from '../controllers/authController.js';

const router = express.Router();

// ============================================
//  VALIDATION RULES - Simplified
// ============================================

// ✅ Register validation
const registerValidation = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Please provide a valid email'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  body('confirmPassword').custom((value, { req }) => {
    if (value !== req.body.password) {
      throw new Error('Passwords do not match');
    }
    return true;
  })
];

// ❌ REMOVED loginValidation - We'll handle validation in controller
// This was causing the "req.body is undefined" error

// ✅ Forgot password validation
const forgotPasswordValidation = [
  body('email').isEmail().withMessage('Please provide a valid email')
];

// ✅ Reset password validation
const resetPasswordValidation = [
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  body('confirmPassword').custom((value, { req }) => {
    if (value !== req.body.password) {
      throw new Error('Passwords do not match');
    }
    return true;
  })
];

// ============================================
//  ROUTES
// ============================================

// Public routes
router.post('/register', registerLimiter, registerValidation, register);
router.post('/login', authLimiter, login); // ✅ REMOVED loginValidation
router.get('/verify-email/:token', verifyEmail);
router.post('/forgot-password', forgotPasswordLimiter, forgotPasswordValidation, forgotPassword);
router.post('/reset-password/:token', resetPasswordValidation, resetPassword);
router.post('/refresh', refreshToken);

// Protected routes
router.post('/logout', protect, logout);
router.get('/me', protect, getMe);
router.put('/profile', protect, updateProfile);

export default router;