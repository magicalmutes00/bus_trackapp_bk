/**
 * Location Routes
 */

const express = require('express');
const router = express.Router();
const {
  updateLocation,
  getBusLocationHistory,
  getLatestLocation,
  getMyBusLocation
} = require('../controllers/locationController');
const { protect, authorize } = require('../middleware/auth');

// All routes require authentication
router.use(protect);

// Location update - driver only
router.post('/update', authorize('driver'), updateLocation);

// Get own bus location - student only
router.get('/student', authorize('student'), getMyBusLocation);

// Get specific bus location history
router.get('/bus/:busId/history', getBusLocationHistory);
router.get('/bus/:busId/latest', getLatestLocation);

module.exports = router;