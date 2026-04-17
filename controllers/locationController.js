/**
 * Location Controller
 * Handles bus location updates and history
 */

const Location = require('../models/Location');
const Bus = require('../models/Bus');
const { asyncHandler } = require('../middleware/errorHandler');
const { isValidCoordinates } = require('../utils/helpers');

/**
 * @route   POST /api/locations/update
 * @desc    Update bus location (called by driver app)
 * @access  Private/Driver
 */
const updateLocation = asyncHandler(async (req, res) => {
  const { latitude, longitude, speed, heading, altitude, accuracy, batteryLevel } = req.body;

  // Validate coordinates
  if (!isValidCoordinates(latitude, longitude)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid coordinates provided'
    });
  }

  // Find bus assigned to this driver
  const bus = await Bus.findOne({
    assignedDriver: req.user._id,
    status: 'active'
  });

  if (!bus) {
    return res.status(404).json({
      success: false,
      message: 'No active bus assigned to this driver'
    });
  }

  // Check if trip is active
  if (!bus.isTripActive) {
    return res.status(400).json({
      success: false,
      message: 'No active trip. Please start a trip first.'
    });
  }

  // Create location record
  const location = await Location.create({
    busId: bus._id,
    latitude,
    longitude,
    speed: speed || 0,
    heading: heading || 0,
    altitude: altitude || 0,
    accuracy: accuracy || 0,
    timestamp: new Date(),
    batteryLevel
  });

  // Update bus's cached location
  bus.currentLocation = {
    latitude,
    longitude,
    updatedAt: new Date()
  };
  bus.currentSpeed = speed || 0;
  await bus.save();

  // Emit socket event for real-time updates (handled in socket handler)

  res.json({
    success: true,
    message: 'Location updated',
    data: {
      location: {
        latitude: location.latitude,
        longitude: location.longitude,
        timestamp: location.timestamp
      }
    }
  });
});

/**
 * @route   GET /api/locations/bus/:busId
 * @desc    Get location history for a bus
 * @access  Private
 */
const getBusLocationHistory = asyncHandler(async (req, res) => {
  const { busId } = req.params;
  const { limit = 100 } = req.query;

  const bus = await Bus.findById(busId);

  if (!bus) {
    return res.status(404).json({
      success: false,
      message: 'Bus not found'
    });
  }

  // Students can only view their assigned bus history
  if (req.user.role === 'student' && req.user.assignedBus?.toString() !== busId) {
    return res.status(403).json({
      success: false,
      message: 'You can only view your assigned bus location history'
    });
  }

  const locations = await Location.getLocationHistory(busId, parseInt(limit));

  res.json({
    success: true,
    data: {
      busId,
      busNumber: bus.busNumber,
      locations
    }
  });
});

/**
 * @route   GET /api/locations/bus/:busId/latest
 * @desc    Get latest location for a bus
 * @access  Private
 */
const getLatestLocation = asyncHandler(async (req, res) => {
  const { busId } = req.params;

  const bus = await Bus.findById(busId);

  if (!bus) {
    return res.status(404).json({
      success: false,
      message: 'Bus not found'
    });
  }

  // Students can only view their assigned bus
  if (req.user.role === 'student' && req.user.assignedBus?.toString() !== busId) {
    return res.status(403).json({
      success: false,
      message: 'You can only view your assigned bus location'
    });
  }

  const location = await Location.getLatestLocation(busId);

  res.json({
    success: true,
    data: {
      busId,
      busNumber: bus.busNumber,
      location
    }
  });
});

/**
 * @route   GET /api/locations/student
 * @desc    Get current student's assigned bus location
 * @access  Private/Student
 */
const getMyBusLocation = asyncHandler(async (req, res) => {
  if (req.user.role !== 'student') {
    return res.status(403).json({
      success: false,
      message: 'This endpoint is for students only'
    });
  }

  const assignedBusId = req.user.assignedBus;

  if (!assignedBusId) {
    return res.status(404).json({
      success: false,
      message: 'No bus assigned to your account'
    });
  }

  const bus = await Bus.findById(assignedBusId)
    .populate('assignedDriver', 'firstName lastName phone');

  if (!bus) {
    return res.status(404).json({
      success: false,
      message: 'Assigned bus not found'
    });
  }

  const location = await Location.getLatestLocation(assignedBusId);

  res.json({
    success: true,
    data: {
      bus: {
        _id: bus._id,
        busNumber: bus.busNumber,
        model: bus.model,
        routeName: bus.routeName,
        driverName: bus.assignedDriver ?
          `${bus.assignedDriver.firstName} ${bus.assignedDriver.lastName}` : null,
        driverPhone: bus.assignedDriver?.phone
      },
      location: location ? {
        latitude: location.latitude,
        longitude: location.longitude,
        speed: location.speed,
        heading: location.heading,
        timestamp: location.timestamp
      } : null,
      isTripActive: bus.isTripActive
    }
  });
});

module.exports = {
  updateLocation,
  getBusLocationHistory,
  getLatestLocation,
  getMyBusLocation
};