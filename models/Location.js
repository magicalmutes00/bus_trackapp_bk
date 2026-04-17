/**
 * Location Model
 * Stores bus location history and real-time positions
 * Optimized to store only the latest location per bus
 */

const mongoose = require('mongoose');

const locationSchema = new mongoose.Schema({
  // Reference to the bus
  busId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Bus',
    required: [true, 'Bus ID is required'],
    index: true
  },

  // Location coordinates
  latitude: {
    type: Number,
    required: [true, 'Latitude is required']
  },

  longitude: {
    type: Number,
    required: [true, 'Longitude is required']
  },

  // Altitude in meters
  altitude: {
    type: Number,
    default: 0
  },

  // Speed in km/h
  speed: {
    type: Number,
    default: 0
  },

  // Heading in degrees (0-360)
  heading: {
    type: Number,
    default: 0
  },

  // Accuracy in meters
  accuracy: {
    type: Number,
    default: 0
  },

  // Location timestamp from device
  timestamp: {
    type: Date,
    required: true,
    default: Date.now
  },

  // Whether this is from background tracking
  isBackgroundLocation: {
    type: Boolean,
    default: false
  },

  // Battery level at time of update (percentage)
  batteryLevel: {
    type: Number,
    min: 0,
    max: 100
  }

}, {
  timestamps: true
});

// Compound index for efficient queries
locationSchema.index({ busId: 1, timestamp: -1 });

// Static method to get latest location for a bus
locationSchema.statics.getLatestLocation = async function(busId) {
  return await this.findOne({ busId })
    .sort({ timestamp: -1 })
    .exec();
};

// Static method to get location history for a bus
locationSchema.statics.getLocationHistory = async function(busId, limit = 100) {
  return await this.find({ busId })
    .sort({ timestamp: -1 })
    .limit(limit)
    .exec();
};

// Static method to update or create latest location
// This uses upsert to ensure only one document per bus is the "latest"
locationSchema.statics.upsertLatestLocation = async function(busId, locationData) {
  const { latitude, longitude, speed, heading, altitude, accuracy } = locationData;

  return await this.findOneAndUpdate(
    { busId },
    {
      $set: {
        busId,
        latitude,
        longitude,
        speed: speed || 0,
        heading: heading || 0,
        altitude: altitude || 0,
        accuracy: accuracy || 0,
        timestamp: new Date(),
        updatedAt: new Date()
      }
    },
    {
      upsert: true,
      new: true
    }
  );
};

// TTL index - automatically delete locations older than 7 days
locationSchema.index({ timestamp: 1 }, { expireAfterSeconds: 7 * 24 * 60 * 60 });

const Location = mongoose.model('Location', locationSchema);

module.exports = Location;