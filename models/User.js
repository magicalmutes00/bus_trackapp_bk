/**
 * User Model
 * Supports 4 roles: admin, staff, driver, student
 * Each role has specific permissions and relationships
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  // Basic authentication fields
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },

  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters'],
    select: false // Don't include password in queries by default
  },

  // Role-based access control
  role: {
    type: String,
    enum: ['admin', 'staff', 'driver', 'student'],
    required: [true, 'Role is required'],
    default: 'student'
  },

  // Common fields for all users
  firstName: {
    type: String,
    required: [true, 'First name is required'],
    trim: true
  },

  lastName: {
    type: String,
    required: [true, 'Last name is required'],
    trim: true
  },

  phone: {
    type: String,
    trim: true
  },

  // Profile picture URL
  profilePicture: {
    type: String,
    default: null
  },

  // Active status - users can be deactivated
  isActive: {
    type: Boolean,
    default: true
  },

  // Last login timestamp
  lastLogin: {
    type: Date
  },

  // Role-specific fields

  // For drivers - assigned bus reference
  assignedBus: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Bus',
    default: null
  },

  // For students - assigned bus reference
  assignedBus: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Bus',
    default: null
  },

  // For students - enrollment info
  enrollmentNumber: {
    type: String,
    trim: true
  },

  department: {
    type: String,
    trim: true
  },

  // For drivers - license info
  licenseNumber: {
    type: String,
    trim: true
  },

  licenseExpiry: {
    type: Date
  },

  // For staff - department they manage
  managedDepartment: {
    type: String,
    trim: true
  }

}, {
  timestamps: true,
  toJSON: {
    transform: function(doc, ret) {
      delete ret.password;
      return ret;
    }
  }
});

// Index for faster queries
userSchema.index({ role: 1 });
userSchema.index({ assignedBus: 1 });

// Hash password before saving
userSchema.pre('save', async function(next) {
  // Only hash if password is modified
  if (!this.isModified('password')) {
    return next();
  }

  try {
    // Generate salt with 10 rounds
    const salt = await bcrypt.genSalt(10);
    // Hash the password
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Get full name
userSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

// Ensure virtuals are included in JSON
userSchema.set('toJSON', { virtuals: true });
userSchema.set('toObject', { virtuals: true });

const User = mongoose.model('User', userSchema);

module.exports = User;