/**
 * User Controller
 * Handles CRUD operations for all user types
 * Admin can manage all users, Staff manages students, etc.
 */

const User = require('../models/User');
const Bus = require('../models/Bus');
const { asyncHandler } = require('../middleware/errorHandler');
const { sanitizeUser, paginate } = require('../utils/helpers');

/**
 * @route   GET /api/users
 * @desc    Get all users (filtered by role)
 * @access  Private/Admin
 */
const getAllUsers = asyncHandler(async (req, res) => {
  const { role, search, page = 1, limit = 20, isActive } = req.query;

  // Build query
  const query = {};

  // Filter by role
  if (role && ['admin', 'staff', 'driver', 'student'].includes(role)) {
    query.role = role;
  }

  // Filter by active status
  if (isActive !== undefined) {
    query.isActive = isActive === 'true';
  }

  // Search by name or email
  if (search) {
    query.$or = [
      { firstName: { $regex: search, $options: 'i' } },
      { lastName: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } }
    ];
  }

  // Execute pagination
  const { skip, limit: limitVal, page: pageNum } = paginate(page, limit);

  // Get users with pagination
  const users = await User.find(query)
    .populate('assignedBus', 'busNumber routeName status')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limitVal);

  // Get total count
  const total = await User.countDocuments(query);

  res.json({
    success: true,
    data: {
      users: users.map(sanitizeUser),
      pagination: {
        page: pageNum,
        limit: limitVal,
        total,
        pages: Math.ceil(total / limitVal)
      }
    }
  });
});

/**
 * @route   GET /api/users/drivers
 * @desc    Get all drivers
 * @access  Private/Admin/Staff
 */
const getDrivers = asyncHandler(async (req, res) => {
  const drivers = await User.find({ role: 'driver', isActive: true })
    .populate('assignedBus', 'busNumber model status');

  res.json({
    success: true,
    data: {
      drivers: drivers.map(sanitizeUser)
    }
  });
});

/**
 * @route   GET /api/users/students
 * @desc    Get all students
 * @access  Private/Admin/Staff
 */
const getStudents = asyncHandler(async (req, res) => {
  const { busId, department } = req.query;

  const query = { role: 'student', isActive: true };

  if (busId) {
    query.assignedBus = busId;
  }

  if (department) {
    query.department = department;
  }

  const students = await User.find(query)
    .populate('assignedBus', 'busNumber routeName status');

  res.json({
    success: true,
    data: {
      students: students.map(sanitizeUser)
    }
  });
});

/**
 * @route   GET /api/users/:id
 * @desc    Get single user
 * @access  Private
 */
const getUserById = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id)
    .populate('assignedBus', 'busNumber model routeName status');

  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found'
    });
  }

  res.json({
    success: true,
    data: {
      user: sanitizeUser(user)
    }
  });
});

/**
 * @route   POST /api/users
 * @desc    Create new user
 * @access  Private/Admin/Staff
 */
const createUser = asyncHandler(async (req, res) => {
  const {
    email, password, role, firstName, lastName, phone,
    enrollmentNumber, department, licenseNumber, licenseExpiry,
    managedDepartment, assignedBus
  } = req.body;

  // Validate required fields
  if (!email || !password || !firstName || !lastName) {
    return res.status(400).json({
      success: false,
      message: 'Please provide email, password, first name, and last name'
    });
  }

  // Check if user exists
  const existingUser = await User.findOne({ email: email.toLowerCase() });
  if (existingUser) {
    return res.status(400).json({
      success: false,
      message: 'User already exists with this email'
    });
  }

  // Validate role
  const validRoles = ['admin', 'staff', 'driver', 'student'];
  if (!validRoles.includes(role)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid role'
    });
  }

  // Verify assigned bus exists if provided
  if (assignedBus) {
    const bus = await Bus.findById(assignedBus);
    if (!bus) {
      return res.status(400).json({
        success: false,
        message: 'Assigned bus not found'
      });
    }
  }

  // Create user
  const userData = {
    email: email.toLowerCase(),
    password,
    role,
    firstName,
    lastName,
    phone,
    assignedBus: assignedBus || null
  };

  // Add role-specific fields
  if (role === 'student') {
    userData.enrollmentNumber = enrollmentNumber;
    userData.department = department;
  }

  if (role === 'driver') {
    userData.licenseNumber = licenseNumber;
    userData.licenseExpiry = licenseExpiry;
  }

  if (role === 'staff') {
    userData.managedDepartment = managedDepartment;
  }

  const user = await User.create(userData);

  // Update bus student count if assigning student to bus
  if (assignedBus && role === 'student') {
    await Bus.findByIdAndUpdate(assignedBus, {
      $inc: { assignedStudentCount: 1 }
    });
  }

  res.status(201).json({
    success: true,
    message: 'User created successfully',
    data: {
      user: sanitizeUser(user)
    }
  });
});

/**
 * @route   PUT /api/users/:id
 * @desc    Update user
 * @access  Private
 */
const updateUser = asyncHandler(async (req, res) => {
  const {
    firstName, lastName, phone, role,
    enrollmentNumber, department, licenseNumber, licenseExpiry,
    managedDepartment, assignedBus, isActive
  } = req.body;

  // Find user
  let user = await User.findById(req.params.id);

  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found'
    });
  }

  // Check permissions - admin can update anyone, others have restrictions
  // Drivers can update their own profile, staff can update students
  if (req.user.role !== 'admin') {
    if (req.user._id.toString() !== req.params.id) {
      // Users can update their own profile
      if (req.user.role === 'staff' && user.role !== 'student') {
        return res.status(403).json({
          success: false,
          message: 'Staff can only update student accounts'
        });
      }
      if (req.user.role === 'driver' || req.user.role === 'student') {
        return res.status(403).json({
          success: false,
          message: 'You can only update your own profile'
        });
      }
    }
  }

  // Handle role change (admin only)
  if (role && role !== user.role && req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Only admin can change user roles'
    });
  }

  // Handle bus assignment change
  const oldBusId = user.assignedBus ? user.assignedBus.toString() : null;
  const newBusId = assignedBus || null;

  // Update fields
  if (firstName) user.firstName = firstName;
  if (lastName) user.lastName = lastName;
  if (phone !== undefined) user.phone = phone;
  if (role) user.role = role;
  if (isActive !== undefined) user.isActive = isActive;

  // Role-specific updates
  if (user.role === 'student') {
    if (enrollmentNumber !== undefined) user.enrollmentNumber = enrollmentNumber;
    if (department !== undefined) user.department = department;
  }

  if (user.role === 'driver') {
    if (licenseNumber !== undefined) user.licenseNumber = licenseNumber;
    if (licenseExpiry !== undefined) user.licenseExpiry = licenseExpiry;
  }

  if (user.role === 'staff') {
    if (managedDepartment !== undefined) user.managedDepartment = managedDepartment;
  }

  // Handle bus assignment
  if (assignedBus !== undefined) {
    user.assignedBus = assignedBus || null;
  }

  await user.save();

  // Update bus student counts if bus changed
  if (oldBusId !== newBusId) {
    if (oldBusId) {
      await Bus.findByIdAndUpdate(oldBusId, {
        $inc: { assignedStudentCount: -1 }
      });
    }
    if (newBusId) {
      await Bus.findByIdAndUpdate(newBusId, {
        $inc: { assignedStudentCount: 1 }
      });
    }
  }

  const updatedUser = await User.findById(user._id)
    .populate('assignedBus', 'busNumber routeName status');

  res.json({
    success: true,
    message: 'User updated successfully',
    data: {
      user: sanitizeUser(updatedUser)
    }
  });
});

/**
 * @route   DELETE /api/users/:id
 * @desc    Delete user (soft delete - deactivate)
 * @access  Private/Admin
 */
const deleteUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found'
    });
  }

  // Soft delete - just deactivate
  user.isActive = false;
  user.assignedBus = null;
  await user.save();

  // Update bus count if user was assigned to a bus
  if (user.assignedBus) {
    await Bus.findByIdAndUpdate(user.assignedBus, {
      $inc: { assignedStudentCount: -1 }
    });
  }

  res.json({
    success: true,
    message: 'User deactivated successfully'
  });
});

/**
 * @route   PUT /api/users/:id/assign-bus
 * @desc    Assign student to bus
 * @access  Private/Admin/Staff
 */
const assignBus = asyncHandler(async (req, res) => {
  const { busId } = req.body;

  const user = await User.findById(req.params.id);

  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found'
    });
  }

  if (user.role !== 'student') {
    return res.status(400).json({
      success: false,
      message: 'Only students can be assigned to buses'
    });
  }

  // Verify bus exists
  if (busId) {
    const bus = await Bus.findById(busId);
    if (!bus) {
      return res.status(400).json({
        success: false,
        message: 'Bus not found'
      });
    }
  }

  // Update old bus count
  if (user.assignedBus) {
    await Bus.findByIdAndUpdate(user.assignedBus, {
      $inc: { assignedStudentCount: -1 }
    });
  }

  // Update new bus count
  if (busId) {
    await Bus.findByIdAndUpdate(busId, {
      $inc: { assignedStudentCount: 1 }
    });
  }

  user.assignedBus = busId || null;
  await user.save();

  const updatedUser = await User.findById(user._id)
    .populate('assignedBus', 'busNumber routeName status');

  res.json({
    success: true,
    message: 'Bus assigned successfully',
    data: {
      user: sanitizeUser(updatedUser)
    }
  });
});

module.exports = {
  getAllUsers,
  getDrivers,
  getStudents,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  assignBus
};