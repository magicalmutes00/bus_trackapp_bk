/**
 * Models Index
 * Export all models for easy importing
 */

const User = require('./User');
const Bus = require('./Bus');
const Location = require('./Location');
const Trip = require('./Trip');

module.exports = {
  User,
  Bus,
  Location,
  Trip
};