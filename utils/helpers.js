/**
 * Utility Functions
 * Includes Haversine formula for distance calculation and other helpers
 */

/**
 * Calculate distance between two coordinates using Haversine formula
 * @param {number} lat1 - Latitude of point 1
 * @param {number} lon1 - Longitude of point 1
 * @param {number} lat2 - Latitude of point 2
 * @param {number} lon2 - Longitude of point 2
 * @returns {number} Distance in kilometers
 */
const haversineDistance = (lat1, lon1, lat2, lon2) => {
  // Earth's radius in kilometers
  const R = 6371;

  // Convert to radians
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  // Haversine formula
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  const distance = R * c;

  return distance; // in kilometers
};

/**
 * Convert degrees to radians
 */
const toRad = (deg) => {
  return deg * (Math.PI / 180);
};

/**
 * Calculate ETA based on distance and average speed
 * @param {number} distance - Distance in kilometers
 * @param {number} avgSpeed - Average speed in km/h
 * @returns {Object} ETA in minutes and arrival time
 */
const calculateETA = (distance, avgSpeed = 30) => {
  if (!distance || distance <= 0) {
    return {
      etaMinutes: 0,
      arrivalTime: new Date(),
      distance: 0
    };
  }

  // Average speed fallback if not provided
  const speed = avgSpeed > 0 ? avgSpeed : 30;

  // Time in hours
  const timeInHours = distance / speed;

  // Time in minutes
  const etaMinutes = Math.round(timeInHours * 60);

  // Arrival time
  const arrivalTime = new Date(Date.now() + etaMinutes * 60 * 1000);

  return {
    etaMinutes,
    arrivalTime,
    distance: Math.round(distance * 100) / 100 // Round to 2 decimal places
  };
};

/**
 * Format distance for display
 */
const formatDistance = (km) => {
  if (km < 1) {
    return `${Math.round(km * 1000)} m`;
  }
  return `${km.toFixed(1)} km`;
};

/**
 * Format duration in minutes
 */
const formatDuration = (minutes) => {
  if (minutes < 60) {
    return `${Math.round(minutes)} min`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  return `${hours}h ${mins}m`;
};

/**
 * Generate random color for bus markers
 */
const generateBusColor = (busId) => {
  const colors = [
    '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0',
    '#9966FF', '#FF9F40', '#FF6384', '#C9CBCF'
  ];

  if (!busId) return colors[0];

  // Use busId to generate consistent color
  const index = busId.charCodeAt(busId.length - 1) % colors.length;
  return colors[index];
};

/**
 * Validate coordinates
 */
const isValidCoordinates = (lat, lon) => {
  return (
    typeof lat === 'number' &&
    typeof lon === 'number' &&
    lat >= -90 && lat <= 90 &&
    lon >= -180 && lon <= 180 &&
    !isNaN(lat) && !isNaN(lon)
  );
};

/**
 * Sanitize user object for responses
 */
const sanitizeUser = (user) => {
  if (!user) return null;

  const userObj = user.toObject ? user.toObject() : user;

  const {
    password,
    __v,
    ...rest
  } = userObj;

  return rest;
};

/**
 * Paginate query results
 */
const paginate = (page = 1, limit = 10) => {
  const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);

  return {
    skip,
    limit: Math.min(parseInt(limit, 10), 100), // Max 100 items per page
    page: parseInt(page, 10)
  };
};

module.exports = {
  haversineDistance,
  toRad,
  calculateETA,
  formatDistance,
  formatDuration,
  generateBusColor,
  isValidCoordinates,
  sanitizeUser,
  paginate
};