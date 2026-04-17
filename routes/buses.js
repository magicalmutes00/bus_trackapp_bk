/**
 * Bus Routes
 */

const express = require('express');
const router = express.Router();
const {
  getAllBuses,
  getBusById,
  createBus,
  updateBus,
  deleteBus,
  assignDriver,
  getBusLocation,
  getAllBusLocations,
  updateTripStatus
} = require('../controllers/busController');
const { protect, authorize } = require('../middleware/auth');

// All routes require authentication
router.use(protect);

// Admin only routes
router.post('/', authorize('admin'), createBus);
router.put('/:id', authorize('admin'), updateBus);
router.delete('/:id', authorize('admin'), deleteBus);
router.put('/:id/assign-driver', authorize('admin'), assignDriver);
router.get('/locations', authorize('admin'), getAllBusLocations);

// Driver routes
router.put('/:id/trip', authorize('driver'), updateTripStatus);

// Common routes
router.get('/', getAllBuses);
router.get('/:id', getBusById);
router.get('/:id/location', getBusLocation);

module.exports = router;