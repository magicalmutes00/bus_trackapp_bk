/**
 * Auth Controller
 * Handles authentication: register, login, logout
 */

const User = require('../models/User');
const { generateToken } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const { sanitizeUser } = require('../utils/helpers');

/**
 * @route   POST /api/auth/register
 * @desc    Register a new user (Admin or Staff only can register other users)
 * @access  Protected (Admin/Staff can register others, public for students initially)
 */
const register = asyncHandler(async (req, res) => {
  const { email, password, role, firstName, lastName, phone, ...additionalData } = req.body;

  // Validate required fields
  if (!email || !password || !firstName || !lastName) {
    return res.status(400).json({
      success: false,
      message: 'Please provide email, password, first name, and last name'
    });
  }

  // Check if user already exists
  const existingUser = await User.findOne({ email: email.toLowerCase() });
  if (existingUser) {
    return res.status(400).json({
      success: false,
      message: 'User already exists with this email'
    });
  }

  // Determine role - only admin can create admin/staff/driver accounts
  let userRole = role || 'student';

  // If registering non-student role, check if requester is admin
  if (userRole !== 'student' && userRole !== 'driver') {
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only admins can create admin or staff accounts'
      });
    }
  }

  // Create user
  const user = await User.create({
    email: email.toLowerCase(),
    password,
    role: userRole,
    firstName,
    lastName,
    phone,
    // Role-specific fields
    ...(userRole === 'student' && {
      enrollmentNumber: additionalData.enrollmentNumber,
      department: additionalData.department,
      assignedBus: additionalData.assignedBus
    }),
    ...(userRole === 'driver' && {
      licenseNumber: additionalData.licenseNumber,
      licenseExpiry: additionalData.licenseExpiry
    }),
    ...(userRole === 'staff' && {
      managedDepartment: additionalData.managedDepartment
    })
  });

  // Generate token
  const token = generateToken(user._id);

  res.status(201).json({
    success: true,
    message: 'User registered successfully',
    data: {
      user: sanitizeUser(user),
      token
    }
  });
});

/**
 * @route   POST /api/auth/login
 * @desc    Login user and return token
 * @access  Public
 */
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  // Validate input
  if (!email || !password) {
    return res.status(400).json({
      success: false,
      message: 'Please provide email and password'
    });
  }

  // Find user and include password for comparison
  const user = await User.findOne({ email: email.toLowerCase() }).select('+password');

  if (!user) {
    return res.status(401).json({
      success: false,
      message: 'Invalid credentials'
    });
  }

  // Check if user is active
  if (!user.isActive) {
    return res.status(401).json({
      success: false,
      message: 'Your account has been deactivated. Contact admin.'
    });
  }

  // Compare password
  const isMatch = await user.comparePassword(password);

  if (!isMatch) {
    return res.status(401).json({
      success: false,
      message: 'Invalid credentials'
    });
  }

  // Update last login
  user.lastLogin = new Date();
  await user.save();

  // Generate token
  const token = generateToken(user._id);

  res.json({
    success: true,
    message: 'Login successful',
    data: {
      user: sanitizeUser(user),
      token,
      role: user.role
    }
  });
});

/**
 * @route   GET /api/auth/me
 * @desc    Get current logged in user
 * @access  Private
 */
const getMe = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id)
    .populate('assignedBus', 'busNumber model routeName status');

  res.json({
    success: true,
    data: {
      user: sanitizeUser(user)
    }
  });
});

/**
 * @route   POST /api/auth/logout
 * @desc    Logout user (client-side token removal)
 * @access  Private
 */
const logout = asyncHandler(async (req, res) => {
  // In JWT-based auth, logout is handled client-side
  // Server can optionally maintain a blacklist of tokens

  res.json({
    success: true,
    message: 'Logged out successfully'
  });
});

/**
 * @route   PUT /api/auth/password
 * @desc    Change password
 * @access  Private
 */
const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({
      success: false,
      message: 'Please provide current and new password'
    });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({
      success: false,
      message: 'New password must be at least 6 characters'
    });
  }

  // Get user with password
  const user = await User.findById(req.user._id).select('+password');

  // Verify current password
  const isMatch = await user.comparePassword(currentPassword);

  if (!isMatch) {
    return res.status(400).json({
      success: false,
      message: 'Current password is incorrect'
    });
  }

  // Update password
  user.password = newPassword;
  await user.save();

  // Generate new token
  const token = generateToken(user._id);

  res.json({
    success: true,
    message: 'Password changed successfully',
    data: {
      token
    }
  });
});

/**
 * @route   POST /api/auth/refresh
 * @desc    Refresh token
 * @access  Private
 */
const refreshToken = asyncHandler(async (req, res) => {
  const token = generateToken(req.user._id);

  res.json({
    success: true,
    data: {
      token
    }
  });
});

module.exports = {
  register,
  login,
  getMe,
  logout,
  changePassword,
  refreshToken
};