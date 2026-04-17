/**
 * Trip Model
 * Tracks individual bus trips with start/stop times
 */

const mongoose = require('mongoose');

const tripSchema = new mongoose.Schema({
  // Reference to the bus
  busId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Bus',
    required: true,
    index: true
  },

  // Reference to the driver
  driverId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  // Trip status
  status: {
    type: String,
    enum: ['active', 'completed', 'cancelled'],
    default: 'active'
  },

  // Start location
  startLocation: {
    latitude: Number,
    longitude: Number,
    address: String
  },

  // End location
  endLocation: {
    latitude: Number,
    longitude: Number,
    address: String
  },

  // Start time
  startTime: {
    type: Date,
    default: Date.now
  },

  // End time
  endTime: {
    type: Date
  },

  // Route taken (array of points)
  route: [{
    latitude: Number,
    longitude: Number,
    timestamp: Date
  }],

  // Distance covered in km
  distanceCovered: {
    type: Number,
    default: 0
  },

  // Average speed in km/h
  averageSpeed: {
    type: Number,
    default: 0
  },

  // Max speed recorded
  maxSpeed: {
    type: Number,
    default: 0
  },

  // Notes
  notes: {
    type: String
  }

}, {
  timestamps: true
});

// Index for queries
tripSchema.index({ busId: 1, status: 1 });
tripSchema.index({ driverId: 1 });
tripSchema.index({ startTime: -1 });

// Calculate duration
tripSchema.virtual('duration').get(function() {
  if (this.endTime && this.startTime) {
    return (this.endTime - this.startTime) / 1000 / 60; // in minutes
  }
  return null;
});

// Auto-save duration on save
tripSchema.set('toJSON', { virtuals: true });
tripSchema.set('toObject', { virtuals: true });

const Trip = mongoose.model('Trip', tripSchema);

module.exports = Trip;