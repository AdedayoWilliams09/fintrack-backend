// FILE: backend/src/models/User.js
// COMPLETE REWRITE - Using static method for password hashing

import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    minlength: [2, 'Name must be at least 2 characters'],
    maxlength: [50, 'Name cannot exceed 50 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    trim: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [8, 'Password must be at least 8 characters'],
    select: false
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  emailVerificationToken: String,
  emailVerificationExpires: Date,
  resetPasswordToken: String,
  resetPasswordExpires: Date,
  preferences: {
    currency: {
      type: String,
      default: 'USD'
    },
    theme: {
      type: String,
      enum: ['light', 'dark', 'system'],
      default: 'system'
    },
    dateFormat: {
      type: String,
      default: 'MM/DD/YYYY'
    },
    notifications: {
      email: { type: Boolean, default: true },
      budgetAlerts: { type: Boolean, default: true },
      reportSummaries: { type: Boolean, default: true }
    }
  },
  avatar: {
    url: String,
    publicId: String
  },
  lastLogin: Date,
  loginAttempts: {
    type: Number,
    default: 0
  },
  lockUntil: Date,
  isActive: {
    type: Boolean,
    default: true
  },
  deletedAt: Date,
  deletionReason: String
}, {
  timestamps: true
});

// ============================================
//  INDEXES
// ============================================

userSchema.index({ resetPasswordToken: 1 });
userSchema.index({ emailVerificationToken: 1 });
userSchema.index({ isActive: 1 });
userSchema.index({ role: 1 });

// ============================================
//  STATIC METHODS
// ============================================

// Hash password before saving (using static method)
userSchema.statics.hashPassword = async function(password) {
  const saltRounds = parseInt(process.env.BCRYPT_ROUNDS || 10);
  const salt = await bcrypt.genSalt(saltRounds);
  return await bcrypt.hash(password, salt);
};

// ============================================
//  INSTANCE METHODS
// ============================================

// Compare password
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Generate JWT access token
userSchema.methods.generateAccessToken = function() {
  return jwt.sign(
    { id: this._id, email: this.email, role: this.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_ACCESS_EXPIRE || '15m' }
  );
};

// Generate JWT refresh token
userSchema.methods.generateRefreshToken = function() {
  return jwt.sign(
    { id: this._id },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRE || '7d' }
  );
};

// Check if account is locked
userSchema.methods.isLocked = function() {
  return this.lockUntil && this.lockUntil > Date.now();
};

// Remove password from JSON response
userSchema.set('toJSON', {
  transform: function(doc, ret) {
    delete ret.password;
    delete ret.__v;
    return ret;
  }
});

const User = mongoose.model('User', userSchema);
export default User;