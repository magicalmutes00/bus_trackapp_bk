/**
 * Auth Routes
 */

const express = require('express');
const router = express.Router();
const {
  register,
  login,
  getMe,
  logout,
  changePassword,
  refreshToken
} = require('../controllers/authController');
const { protect } = require('../middleware/auth');

// Public routes
router.post('/login', login);
router.post('/register', register);

// Protected routes
router.get('/me', protect, getMe);
router.post('/logout', protect, logout);
router.put('/password', protect, changePassword);
router.post('/refresh', protect, refreshToken);

module.exports = router;