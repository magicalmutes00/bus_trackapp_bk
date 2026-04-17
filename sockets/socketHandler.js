/**
 * Socket.IO Handler
 * Manages real-time location updates and room-based broadcasting
 */

const Location = require('../models/Location');
const Bus = require('../models/Bus');
const { generateBusColor } = require('../utils/helpers');

/**
 * Initialize Socket.IO with Express server
 * @param {Object} io - Socket.IO server instance
 */
const initSocket = (io) => {
  // Middleware for authentication
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;

    if (!token) {
      return next(new Error('Authentication error: Token required'));
    }

    // Token verification would go here
    // For simplicity, we'll verify in the handshake
    try {
      // Extract user info from token (simplified)
      // In production, verify with JWT
      socket.userId = socket.handshake.auth.userId;
      socket.userRole = socket.handshake.auth.role;
      next();
    } catch (error) {
      next(new Error('Authentication error'));
    }
  });

  // Connection handler
  io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.id}, User: ${socket.userId}, Role: ${socket.userRole}`);

    // Join user's personal room based on their ID
    socket.join(`user:${socket.userId}`);

    /**
     * Driver joins their bus room for location updates
     * This allows targeted broadcasting to only interested parties
     */
    socket.on('join-bus', async (busId) => {
      try {
        const bus = await Bus.findById(busId);

        if (!bus) {
          socket.emit('error', { message: 'Bus not found' });
          return;
        }

        // Verify permissions
        // Drivers can only join their assigned bus
        // Students can only join their assigned bus
        // Admins can join any bus
        let canJoin = false;

        if (socket.userRole === 'admin') {
          canJoin = true;
        } else if (socket.userRole === 'driver') {
          canJoin = bus.assignedDriver?.toString() === socket.userId;
        } else if (socket.userRole === 'student') {
          canJoin = bus._id.toString() === socket.user.assignedBus?.toString();
        }

        if (!canJoin) {
          socket.emit('error', { message: 'Not authorized to track this bus' });
          return;
        }

        // Join the bus room
        socket.join(`bus:${busId}`);
        console.log(`User ${socket.userId} joined bus room: ${busId}`);

        // Send current bus status
        socket.emit('bus-joined', {
          busId: bus._id,
          busNumber: bus.busNumber,
          isTripActive: bus.isTripActive,
          routeName: bus.routeName
        });

        // Get latest location and send to the user
        const location = await Location.getLatestLocation(busId);
        if (location) {
          socket.emit('location-update', {
            busId,
            latitude: location.latitude,
            longitude: location.longitude,
            speed: location.speed,
            heading: location.heading,
            timestamp: location.timestamp
          });
        }
      } catch (error) {
        console.error('Error joining bus room:', error);
        socket.emit('error', { message: 'Failed to join bus room' });
      }
    });

    /**
     * Leave bus room
     */
    socket.on('leave-bus', (busId) => {
      socket.leave(`bus:${busId}`);
      console.log(`User ${socket.userId} left bus room: ${busId}`);
    });

    /**
     * Driver sends location update
     * Location is broadcast ONLY to users tracking this specific bus
     */
    socket.on('location-update', async (data) => {
      try {
        const { latitude, longitude, speed, heading, busId } = data;

        // Validate data
        if (!latitude || !longitude) {
          socket.emit('error', { message: 'Invalid location data' });
          return;
        }

        // Find the bus
        const bus = await Bus.findById(busId);

        if (!bus) {
          socket.emit('error', { message: 'Bus not found' });
          return;
        }

        // Verify driver is assigned to this bus
        if (socket.userRole === 'driver' &&
            bus.assignedDriver?.toString() !== socket.userId) {
          socket.emit('error', { message: 'Not authorized to update this bus location' });
          return;
        }

        // Create location record
        const location = await Location.create({
          busId,
          latitude,
          longitude,
          speed: speed || 0,
          heading: heading || 0,
          timestamp: new Date()
        });

        // Update bus's cached location
        bus.currentLocation = {
          latitude,
          longitude,
          updatedAt: new Date()
        };
        bus.currentSpeed = speed || 0;
        await bus.save();

        // Broadcast ONLY to users in this bus's room
        // This is key: students only see their bus updates, not all buses
        io.to(`bus:${busId}`).emit('location-update', {
          busId,
          busNumber: bus.busNumber,
          latitude,
          longitude,
          speed,
          heading,
          timestamp: location.timestamp
        });

      } catch (error) {
        console.error('Error handling location update:', error);
        socket.emit('error', { message: 'Failed to update location' });
      }
    });

    /**
     * Admin requests all bus locations
     */
    socket.on('get-all-buses-location', async () => {
      if (socket.userRole !== 'admin') {
        socket.emit('error', { message: 'Admin access required' });
        return;
      }

      try {
        const buses = await Bus.find({ status: 'active' });

        const locations = await Promise.all(
          buses.map(async (bus) => {
            const location = await Location.getLatestLocation(bus._id);
            return {
              busId: bus._id,
              busNumber: bus.busNumber,
              routeName: bus.routeName,
              color: generateBusColor(bus._id.toString()),
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

        socket.emit('all-buses-location', { buses: locations });
      } catch (error) {
        console.error('Error fetching all bus locations:', error);
        socket.emit('error', { message: 'Failed to fetch bus locations' });
      }
    });

    /**
     * Subscribe to all buses (admin only)
     * This sends updates for all active buses
     */
    socket.on('subscribe-all-buses', () => {
      if (socket.userRole !== 'admin') {
        socket.emit('error', { message: 'Admin access required' });
        return;
      }

      socket.join('admin:all-buses');
      console.log(`Admin ${socket.userId} subscribed to all bus updates`);
    });

    /**
     * Unsubscribe from all buses
     */
    socket.on('unsubscribe-all-buses', () => {
      socket.leave('admin:all-buses');
    });

    /**
     * Start trip notification
     */
    socket.on('trip-started', async (data) => {
      const { busId } = data;

      // Broadcast trip start to all tracking this bus
      io.to(`bus:${busId}`).emit('trip-status', {
        busId,
        isTripActive: true,
        startTime: new Date()
      });
    });

    /**
     * Stop trip notification
     */
    socket.on('trip-stopped', async (data) => {
      const { busId } = data;

      // Broadcast trip stop to all tracking this bus
      io.to(`bus:${busId}`).emit('trip-status', {
        busId,
        isTripActive: false,
        endTime: new Date()
      });
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      console.log(`Socket disconnected: ${socket.id}, User: ${socket.userId}`);

      // Clean up - leave all bus rooms
      // Socket.IO handles this automatically on disconnect
    });
  });

  return io;
};

/**
 * Broadcast location update to specific bus room
 * This can be called from controllers or other parts of the app
 */
const broadcastLocationUpdate = (io, busId, locationData) => {
  io.to(`bus:${busId}`).emit('location-update', {
    busId,
    ...locationData
  });
};

/**
 * Broadcast to admin dashboard
 */
const broadcastToAdmin = (io, event, data) => {
  io.to('admin:all-buses').emit(event, data);
};

module.exports = {
  initSocket,
  broadcastLocationUpdate,
  broadcastToAdmin
};