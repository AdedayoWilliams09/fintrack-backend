// FILE: backend/src/utils/jwt.js
import jwt from 'jsonwebtoken';

/**
 * JWT Utility Functions
 * 
 * Child Explanation:
 * "This creates special ID cards (JWT tokens) that prove who you are.
 * One card is for everyday use (access token) and expires quickly.
 * Another card is for getting new cards (refresh token) and lasts longer."
 * 
 * Technical Explanation:
 * "JWT utility functions for generating and verifying access and refresh tokens.
 * Access tokens are short-lived (15 minutes) while refresh tokens last longer (7 days)."
 */

/**
 * Generate JWT Access Token
 */
export const generateAccessToken = (userId) => {
  return jwt.sign(
    { id: userId },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_ACCESS_EXPIRE || '15m' }
  );
};

/**
 * Generate JWT Refresh Token
 */
export const generateRefreshToken = (userId) => {
  return jwt.sign(
    { id: userId },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRE || '7d' }
  );
};

/**
 * Verify JWT Token
 */
export const verifyToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    throw error;
  }
};