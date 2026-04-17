# Bus Tracking System - Backend

## Setup Instructions

### Prerequisites
- Node.js v16+ installed
- MongoDB v6+ installed and running

### Installation

1. Navigate to backend directory:
```bash
cd bus-tracking-backend
```

2. Install dependencies:
```bash
npm install
```

3. Create `.env` file (copy from `.env.example`):
```bash
cp .env.example .env
```

4. Update `.env` with your MongoDB URI and JWT secret

5. Start MongoDB:
```bash
# On Windows
net start MongoDB

# On Linux/Mac
sudo systemctl start mongod
```

6. Start the server:
```bash
# Development mode (with auto-reload)
npm run dev

# Production mode
npm start
```

7. Server will run on http://localhost:5000

### API Endpoints

#### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user

#### Users (Admin/Staff only)
- `GET /api/users` - Get all users
- `GET /api/users/drivers` - Get all drivers
- `GET /api/users/students` - Get all students
- `POST /api/users` - Create user
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user

#### Buses (Admin only for create/update/delete)
- `GET /api/buses` - Get all buses
- `GET /api/buses/locations` - Get all bus locations (Admin)
- `POST /api/buses` - Create bus
- `PUT /api/buses/:id` - Update bus
- `DELETE /api/buses/:id` - Delete bus
- `PUT /api/buses/:id/assign-driver` - Assign driver

#### Locations
- `POST /api/locations/update` - Update location (Driver)
- `GET /api/locations/student` - Get student's assigned bus location

### Socket.IO Events

#### Client → Server
- `join-bus` - Join a bus room to receive updates
- `leave-bus` - Leave a bus room
- `location-update` - Send location update (Driver)
- `subscribe-all-buses` - Subscribe to all bus updates (Admin)

#### Server → Client
- `location-update` - Bus location update
- `trip-status` - Trip started/stopped notification
- `bus-joined` - Confirmation of joining bus room

### Default Admin Account
After setup, create an admin user via registration or directly in database:
```
Email: admin@college.edu
Password: admin123
Role: admin
```

### Testing Socket.IO
Connect using socket client:
```javascript
const io = require('socket.io-client');
const socket = io('http://localhost:5000', {
  auth: { token: 'your_jwt_token', userId: 'user_id', role: 'admin' }
});
```"# bus_trackapp_bk" 
