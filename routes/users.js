/**
 * User Routes
 */

const express = require('express');
const router = express.Router();
const {
  getAllUsers,
  getDrivers,
  getStudents,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  assignBus
} = require('../controllers/userController');
const { protect, authorize } = require('../middleware/auth');

// All routes require authentication
router.use(protect);

// Admin only routes
router.delete('/:id', authorize('admin'), deleteUser);

// Routes for getting users
router.get('/', authorize('admin', 'staff'), getAllUsers);
router.get('/drivers', authorize('admin', 'staff'), getDrivers);
router.get('/students', authorize('admin', 'staff'), getStudents);
router.get('/:id', getUserById);

// Routes for creating/updating users
router.post('/', authorize('admin', 'staff'), createUser);
router.put('/:id', updateUser);
router.put('/:id/assign-bus', authorize('admin', 'staff'), assignBus);

module.exports = router;