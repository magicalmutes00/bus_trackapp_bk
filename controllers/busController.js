/**
 * Bus Controller
 * Handles bus management CRUD operations
 */

const Bus = require('../models/Bus');
const User = require('../models/User');
const Location = require('../models/Location');
const { asyncHandler } = require('../middleware/errorHandler');
const { paginate } = require('../utils/helpers');

/**
 * @route   GET /api/buses
 * @desc    Get all buses
 * @access  Private
 */
const getAllBuses = asyncHandler(async (req, res) => {
  const { status, search, page = 1, limit = 20 } = req.query;

  const query = {};

  if (status) {
    query.status = status;
  }

  if (search) {
    query.$or = [
      { busNumber: { $regex: search, $options: 'i' } },
      { registrationNumber: { $regex: search, $options: 'i' } },
      { routeName: { $regex: search, $options: 'i' } }
    ];
  }

  const { skip, limit: limitVal, page: pageNum } = paginate(page, limit);

  const buses = await Bus.find(query)
    .populate('assignedDriver', 'firstName lastName phone email')
    .sort({ busNumber: 1 })
    .skip(skip)
    .limit(limitVal);

  const total = await Bus.countDocuments(query);

  res.json({
    success: true,
    data: {
      buses,
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
 * @route   GET /api/buses/:id
 * @desc    Get single bus
 * @access  Private
 */
const getBusById = asyncHandler(async (req, res) => {
  const bus = await Bus.findById(req.params.id)
    .populate('assignedDriver', 'firstName lastName phone email licenseNumber')
    .populate('assignedStudents', 'firstName lastName enrollmentNumber department');

  if (!bus) {
    return res.status(404).json({
      success: false,
      message: 'Bus not found'
    });
  }

  res.json({
    success: true,
    data: {
      bus
    }
  });
});

/**
 * @route   POST /api/buses
 * @desc    Create new bus
 * @access  Private/Admin
 */
const createBus = asyncHandler(async (req, res) => {
  const {
    busNumber, registrationNumber, model, capacity,
    routeName, routeDescription, startPoint, endPoint
  } = req.body;

  // Validate required fields
  if (!busNumber || !registrationNumber || !model) {
    return res.status(400).json({
      success: false,
      message: 'Please provide bus number, registration number, and model'
    });
  }

  // Check for duplicate bus number
  const existingBus = await Bus.findOne({ busNumber });
  if (existingBus) {
    return res.status(400).json({
      success: false,
      message: 'Bus number already exists'
    });
  }

  // Check for duplicate registration number
  const existingReg = await Bus.findOne({ registrationNumber });
  if (existingReg) {
    return res.status(400).json({
      success: false,
      message: 'Registration number already exists'
    });
  }

  const bus = await Bus.create({
    busNumber,
    registrationNumber,
    model,
    capacity: capacity || 40,
    routeName,
    routeDescription,
    startPoint,
    endPoint
  });

  res.status(201).json({
    success: true,
    message: 'Bus created successfully',
    data: {
      bus
    }
  });
});

/**
 * @route   PUT /api/buses/:id
 * @desc    Update bus
 * @access  Private/Admin
 */
const updateBus = asyncHandler(async (req, res) => {
  const {
    busNumber, registrationNumber, model, capacity,
    status, routeName, routeDescription, startPoint, endPoint
  } = req.body;

  let bus = await Bus.findById(req.params.id);

  if (!bus) {
    return res.status(404).json({
      success: false,
      message: 'Bus not found'
    });
  }

  // Check for duplicate bus number if changing
  if (busNumber && busNumber !== bus.busNumber) {
    const existingBus = await Bus.findOne({ busNumber });
    if (existingBus) {
      return res.status(400).json({
        success: false,
        message: 'Bus number already exists'
      });
    }
  }

  // Check for duplicate registration number if changing
  if (registrationNumber && registrationNumber !== bus.registrationNumber) {
    const existingReg = await Bus.findOne({ registrationNumber });
    if (existingReg) {
      return res.status(400).json({
        success: false,
        message: 'Registration number already exists'
      });
    }
  }

  // Update fields
  if (busNumber) bus.busNumber = busNumber;
  if (registrationNumber) bus.registrationNumber = registrationNumber;
  if (model) bus.model = model;
  if (capacity) bus.capacity = capacity;
  if (status) bus.status = status;
  if (routeName !== undefined) bus.routeName = routeName;
  if (routeDescription !== undefined) bus.routeDescription = routeDescription;
  if (startPoint !== undefined) bus.startPoint = startPoint;
  if (endPoint !== undefined) bus.endPoint = endPoint;

  await bus.save();

  const updatedBus = await Bus.findById(bus._id)
    .populate('assignedDriver', 'firstName lastName phone email');

  res.json({
    success: true,
    message: 'Bus updated successfully',
    data: {
      bus: updatedBus
    }
  });
});

/**
 * @route   DELETE /api/buses/:id
 * @desc    Delete bus
 * @access  Private/Admin
 */
const deleteBus = asyncHandler(async (req, res) => {
  const bus = await Bus.findById(req.params.id);

  if (!bus) {
    return res.status(404).json({
      success: false,
      message: 'Bus not found'
    });
  }

  // Check if bus has assigned students
  if (bus.assignedStudentCount > 0) {
    return res.status(400).json({
      success: false,
      message: 'Cannot delete bus with assigned students. Remove students first.'
    });
  }

  // Check if bus has assigned driver
  if (bus.assignedDriver) {
    // Unassign driver from bus
    await User.findByIdAndUpdate(bus.assignedDriver, { assignedBus: null });
  }

  await bus.deleteOne();

  res.json({
    success: true,
    message: 'Bus deleted successfully'
  });
});

/**
 * @route   PUT /api/buses/:id/assign-driver
 * @desc    Assign driver to bus
 * @access  Private/Admin
 */
const assignDriver = asyncHandler(async (req, res) => {
  const { driverId } = req.body;

  const bus = await Bus.findById(req.params.id);

  if (!bus) {
    return res.status(404).json({
      success: false,
      message: 'Bus not found'
    });
  }

  // If driverId provided, verify driver exists and is a driver
  if (driverId) {
    const driver = await User.findOne({ _id: driverId, role: 'driver' });

    if (!driver) {
      return res.status(400).json({
        success: false,
        message: 'Driver not found or invalid role'
      });
    }

    // Check if driver is already assigned to another bus
    if (driver.assignedBus && driver.assignedBus.toString() !== bus._id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'Driver is already assigned to another bus'
      });
    }

    // Assign driver to bus
    driver.assignedBus = bus._id;
    await driver.save();
  }

  // If unassigning (driverId = null), unassign current driver
  if (bus.assignedDriver) {
    await User.findByIdAndUpdate(bus.assignedDriver, { assignedBus: null });
  }

  bus.assignedDriver = driverId || null;
  await bus.save();

  const updatedBus = await Bus.findById(bus._id)
    .populate('assignedDriver', 'firstName lastName phone email');

  res.json({
    success: true,
    message: driverId ? 'Driver assigned successfully' : 'Driver unassigned successfully',
    data: {
      bus: updatedBus
    }
  });
});

/**
 * @route   GET /api/buses/:id/location
 * @desc    Get current location of bus
 * @access  Private
 */
const getBusLocation = asyncHandler(async (req, res) => {
  const bus = await Bus.findById(req.params.id);

  if (!bus) {
    return res.status(404).json({
      success: false,
      message: 'Bus not found'
    });
  }

  // Get latest location from Location collection
  const location = await Location.getLatestLocation(bus._id);

  res.json({
    success: true,
    data: {
      busId: bus._id,
      busNumber: bus.busNumber,
      currentLocation: location ? {
        latitude: location.latitude,
        longitude: location.longitude,
        speed: location.speed,
        heading: location.heading,
        timestamp: location.timestamp
      } : bus.currentLocation,
      isTripActive: bus.isTripActive,
      lastUpdated: location ? location.updatedAt : bus.updatedAt
    }
  });
});

/**
 * @route   GET /api/buses/locations
 * @desc    Get locations of all active buses (for admin map)
 * @access  Private/Admin
 */
const getAllBusLocations = asyncHandler(async (req, res) => {
  const buses = await Bus.find({ status: 'active' })
    .populate('assignedDriver', 'firstName lastName')
    .select('busNumber routeName isTripActive');

  // Get latest location for each bus
  const busesWithLocations = await Promise.all(
    buses.map(async (bus) => {
      const location = await Location.getLatestLocation(bus._id);
      return {
        busId: bus._id,
        busNumber: bus.busNumber,
        routeName: bus.routeName,
        driverName: bus.assignedDriver ?
          `${bus.assignedDriver.firstName} ${bus.assignedDriver.lastName}` : null,
        isTripActive: bus.isTripActive,
        location: location ? {
          latitude: location.latitude,
          longitude: location.longitude,
          speed: location.speed,
          heading: location.heading,
          timestamp: location.timestamp
        } : null
      };
    })
  );

  res.json({
    success: true,
    data: {
      buses: busesWithLocations
    }
  });
});

/**
 * @route   PUT /api/buses/:id/trip
 * @desc    Start or stop trip
 * @access  Private/Driver
 */
const updateTripStatus = asyncHandler(async (req, res) => {
  const { action } = req.body; // 'start' or 'stop'

  const bus = await Bus.findById(req.params.id);

  if (!bus) {
    return res.status(404).json({
      success: false,
      message: 'Bus not found'
    });
  }

  // Verify requesting user is the assigned driver
  if (!bus.assignedDriver || bus.assignedDriver.toString() !== req.user._id.toString()) {
    return res.status(403).json({
      success: false,
      message: 'Only the assigned driver can start/stop trips'
    });
  }

  if (action === 'start') {
    if (bus.isTripActive) {
      return res.status(400).json({
        success: false,
        message: 'Trip is already active'
      });
    }

    bus.isTripActive = true;
    bus.tripStartTime = new Date();
    bus.tripEndTime = null;
  } else if (action === 'stop') {
    if (!bus.isTripActive) {
      return res.status(400).json({
        success: false,
        message: 'No active trip to stop'
      });
    }

    bus.isTripActive = false;
    bus.tripEndTime = new Date();
  }

  await bus.save();

  res.json({
    success: true,
    message: action === 'start' ? 'Trip started successfully' : 'Trip ended successfully',
    data: {
      isTripActive: bus.isTripActive,
      tripStartTime: bus.tripStartTime,
      tripEndTime: bus.tripEndTime
    }
  });
});

module.exports = {
  getAllBuses,
  getBusById,
  createBus,
  updateBus,
  deleteBus,
  assignDriver,
  getBusLocation,
  getAllBusLocations,
  updateTripStatus
};