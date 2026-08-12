// FILE: backend/src/middleware/authMiddleware.js
import jwt from 'jsonwebtoken';
import User from '../models/User.js';

/**
 * Authentication Middleware
 * 
 * Child Explanation:
 * "This is like a security guard at the door. It checks if you have
 * a valid ID (JWT token) before letting you in."
 * 
 * Technical Explanation:
 * "Middleware that verifies JWT tokens and attaches the user to the request object."
 */
export const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = await User.findById(decoded.id).select('-password');
      
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'User not found. Please login again.'
        });
      }

      if (!req.user.isActive) {
        return res.status(401).json({
          success: false,
          message: 'Account is deactivated. Please contact support.'
        });
      }

      req.userId = req.user._id;
      next();
    } catch (error) {
      console.error('Auth error:', error);
      
      if (error.name === 'JsonWebTokenError') {
        return res.status(401).json({
          success: false,
          message: 'Invalid token. Please login again.'
        });
      }
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          message: 'Token expired. Please login again.'
        });
      }
      
      return res.status(401).json({
        success: false,
        message: 'Not authorized'
      });
    }
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'No token provided. Please login.'
    });
  }
};

/**
 * Admin Authorization Middleware
 * 
 * Child Explanation:
 * "This checks if you're a manager with special permissions."
 * 
 * Technical Explanation:
 * "Middleware that verifies if the authenticated user has admin role."
 */
export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `User role ${req.user.role} is not authorized to access this resource`
      });
    }

    next();
  };
};