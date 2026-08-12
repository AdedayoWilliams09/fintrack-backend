// FILE: backend/src/controllers/authController.js
// UPDATED - Using static hashPassword method

import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { generateAccessToken, generateRefreshToken } from '../utils/jwt.js';

/**
 * Register a new user
 */
export const register = async (req, res) => {
  try {
    const { name, email, password, confirmPassword } = req.body;

    // Check if passwords match
    if (password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'Passwords do not match'
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User already exists with this email'
      });
    }

    // ✅ Hash password using static method
    const hashedPassword = await User.hashPassword(password);

    // Generate email verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationExpires = Date.now() + 24 * 60 * 60 * 1000; // 24 hours

    // Create the user with hashed password
    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      emailVerificationToken: verificationToken,
      emailVerificationExpires: verificationExpires
    });

    // Generate JWT tokens
    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    // Log the verification token (in production, send via email)
    console.log(`📧 Verification token for ${email}: ${verificationToken}`);

    res.status(201).json({
      success: true,
      message: 'User registered successfully. Please verify your email.',
      data: {
        user: user.toJSON(),
        accessToken,
        refreshToken
      }
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({
      success: false,
      message: 'Registration failed',
      error: error.message
    });
  }
};

/**
 * Login user
 */
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user by email (include password field)
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Check if account is locked
    if (user.isLocked()) {
      return res.status(401).json({
        success: false,
        message: 'Account is locked. Please try again after 15 minutes.'
      });
    }

    // Compare passwords
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      // ✅ Update directly without pre-save issues
      user.loginAttempts = (user.loginAttempts || 0) + 1;
      if (user.loginAttempts >= 5) {
        user.lockUntil = Date.now() + 15 * 60 * 1000; // 15 minutes
      }
      
      // ✅ Use updateOne to bypass pre-save hooks
      await User.updateOne(
        { _id: user._id },
        { 
          $set: { 
            loginAttempts: user.loginAttempts,
            lockUntil: user.lockUntil
          }
        }
      );
      
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Check if account is active
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Account is deactivated. Please contact support.'
      });
    }

    // ✅ Reset login attempts using updateOne
    await User.updateOne(
      { _id: user._id },
      { 
        $set: { 
          loginAttempts: 0,
          lockUntil: null,
          lastLogin: new Date()
        }
      }
    );

    // Generate JWT tokens
    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    // Get updated user data
    const updatedUser = await User.findById(user._id);

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: updatedUser.toJSON(),
        accessToken,
        refreshToken
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Login failed',
      error: error.message
    });
  }
};

/**
 * Verify email address
 */
export const verifyEmail = async (req, res) => {
  try {
    const { token } = req.params;

    const user = await User.findOne({
      emailVerificationToken: token,
      emailVerificationExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired verification token'
      });
    }

    // ✅ Use updateOne to bypass pre-save hooks
    await User.updateOne(
      { _id: user._id },
      { 
        $set: { 
          isEmailVerified: true,
          emailVerificationToken: null,
          emailVerificationExpires: null
        }
      }
    );

    res.json({
      success: true,
      message: 'Email verified successfully'
    });
  } catch (error) {
    console.error('Verify email error:', error);
    res.status(500).json({
      success: false,
      message: 'Email verification failed',
      error: error.message
    });
  }
};

/**
 * Forgot password - send reset link
 */
export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.json({
        success: true,
        message: 'If an account exists with this email, a reset link will be sent.'
      });
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetExpires = Date.now() + 1 * 60 * 60 * 1000;

    // ✅ Use updateOne to bypass pre-save hooks
    await User.updateOne(
      { _id: user._id },
      { 
        $set: { 
          resetPasswordToken: resetToken,
          resetPasswordExpires: resetExpires
        }
      }
    );

    console.log(`🔐 Password reset token for ${email}: ${resetToken}`);

    res.json({
      success: true,
      message: 'If an account exists with this email, a reset link will be sent.'
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process request',
      error: error.message
    });
  }
};

/**
 * Reset password
 */
export const resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { password, confirmPassword } = req.body;

    if (password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'Passwords do not match'
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 8 characters'
      });
    }

    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired reset token'
      });
    }

    // ✅ Hash password using static method
    const hashedPassword = await User.hashPassword(password);

    // ✅ Use updateOne to bypass pre-save hooks
    await User.updateOne(
      { _id: user._id },
      { 
        $set: { 
          password: hashedPassword,
          resetPasswordToken: null,
          resetPasswordExpires: null
        }
      }
    );

    res.json({
      success: true,
      message: 'Password reset successful'
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({
      success: false,
      message: 'Password reset failed',
      error: error.message
    });
  }
};

/**
 * Refresh access token
 */
export const refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        message: 'Refresh token required'
      });
    }

    const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid refresh token'
      });
    }

    const newAccessToken = generateAccessToken(user._id);

    res.json({
      success: true,
      data: { accessToken: newAccessToken }
    });
  } catch (error) {
    console.error('Refresh token error:', error);
    res.status(401).json({
      success: false,
      message: 'Invalid refresh token',
      error: error.message
    });
  }
};

/**
 * Get current user profile
 */
export const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    res.json({
      success: true,
      data: { user: user.toJSON() }
    });
  } catch (error) {
    console.error('Get me error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get user',
      error: error.message
    });
  }
};

/**
 * Update user profile
 */
export const updateProfile = async (req, res) => {
  try {
    const { name, currency, preferences } = req.body;
    
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Build update object
    const updateData = {};
    if (name) updateData.name = name;
    if (currency) updateData.currency = currency;
    if (preferences) {
      updateData['preferences'] = {
        ...user.preferences,
        ...preferences
      };
    }

    // ✅ Use updateOne to bypass pre-save hooks
    await User.updateOne(
      { _id: user._id },
      { $set: updateData }
    );

    // Get updated user
    const updatedUser = await User.findById(user._id);

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: { user: updatedUser.toJSON() }
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update profile',
      error: error.message
    });
  }
};

/**
 * Logout user
 */
export const logout = async (req, res) => {
  res.json({
    success: true,
    message: 'Logged out successfully'
  });
};