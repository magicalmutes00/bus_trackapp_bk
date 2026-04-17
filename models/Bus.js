/**
 * Bus Model
 * Represents buses in the fleet with driver assignment and route info
 */

const mongoose = require('mongoose');

const busSchema = new mongoose.Schema({
  // Bus identification
  busNumber: {
    type: String,
    required: [true, 'Bus number is required'],
    unique: true,
    trim: true
  },

  // Vehicle registration number
  registrationNumber: {
    type: String,
    required: [true, 'Registration number is required'],
    unique: true,
    trim: true
  },

  // Bus model
  model: {
    type: String,
    required: [true, 'Bus model is required'],
    trim: true
  },

  // Capacity
  capacity: {
    type: Number,
    required: [true, 'Capacity is required'],
    min: [1, 'Capacity must be at least 1'],
    default: 40
  },

  // Current status
  status: {
    type: String,
    enum: ['active', 'inactive', 'maintenance', 'retired'],
    default: 'active'
  },

  // Assigned driver
  assignedDriver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },

  // Route information
  routeName: {
    type: String,
    trim: true
  },

  routeDescription: {
    type: String,
    trim: true
  },

  // Starting point
  startPoint: {
    name: String,
    latitude: Number,
    longitude: Number
  },

  // End point
  endPoint: {
    name: String,
    latitude: Number,
    longitude: Number
  },

  // Current trip status
  isTripActive: {
    type: Boolean,
    default: false
  },

  // Trip start time
  tripStartTime: {
    type: Date
  },

  // Trip end time
  tripEndTime: {
    type: Date
  },

  // Current location (cached for quick access)
  currentLocation: {
    latitude: Number,
    longitude: Number,
    updatedAt: Date
  },

  // Current speed (km/h)
  currentSpeed: {
    type: Number,
    default: 0
  },

  // Total students assigned
  assignedStudentCount: {
    type: Number,
    default: 0
  }

}, {
  timestamps: true
});

// Index for faster queries
busSchema.index({ busNumber: 1 });
busSchema.index({ assignedDriver: 1 });
busSchema.index({ status: 1 });

// Update timestamp on location change
busSchema.methods.updateLocation = function(latitude, longitude, speed) {
  this.currentLocation = {
    latitude,
    longitude,
    updatedAt: new Date()
  };
  this.currentSpeed = speed || 0;
  return this.save();
};

// Virtual for bus identifier
busSchema.virtual('displayName').get(function() {
  return `Bus ${this.busNumber}`;
});

// Ensure virtuals are included in JSON
busSchema.set('toJSON', { virtuals: true });
busSchema.set('toObject', { virtuals: true });

const Bus = mongoose.model('Bus', busSchema);

module.exports = Bus;