/**
 * Seed Script - Create Demo Users
 * Run this to create initial users for testing
 *
 * Usage: node seed.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const Bus = require('./models/Bus');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://mailtopratheeshm_db_user:pratheesh1004@cluster0.yxao1qt.mongodb.net/?appName=Cluster0';

const demoUsers = [
  {
    email: 'admin@college.edu',
    password: 'admin123',
    role: 'admin',
    firstName: 'Admin',
    lastName: 'User',
    phone: '9876543210'
  },
  {
    email: 'staff@college.edu',
    password: 'staff123',
    role: 'staff',
    firstName: 'Staff',
    lastName: 'Member',
    phone: '9876543211'
  },
  {
    email: 'driver@college.edu',
    password: 'driver123',
    role: 'driver',
    firstName: 'Driver',
    lastName: 'One',
    phone: '9876543212',
    licenseNumber: 'DL-123456',
    licenseExpiry: new Date('2027-12-31')
  },
  {
    email: 'student@college.edu',
    password: 'student123',
    role: 'student',
    firstName: 'Student',
    lastName: 'User',
    phone: '9876543213',
    enrollmentNumber: 'STU001',
    department: 'Computer Science'
  }
];

const demoBuses = [
  {
    busNumber: 'BUS-001',
    registrationNumber: 'KA-01-AB-1234',
    model: 'Volvo B7R',
    capacity: 45,
    routeName: 'Route A - City Campus',
    status: 'active'
  },
  {
    busNumber: 'BUS-002',
    registrationNumber: 'KA-01-CD-5678',
    model: 'Mercedes-Benz',
    capacity: 50,
    routeName: 'Route B - Tech Park',
    status: 'active'
  },
  {
    busNumber: 'BUS-003',
    registrationNumber: 'KA-01-EF-9012',
    model: 'Scania K410',
    capacity: 40,
    routeName: 'Route C - Downtown',
    status: 'active'
  }
];

async function seed() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected!\n');

    // Clear existing data
    console.log('Clearing existing users and buses...');
    await User.deleteMany({});
    await Bus.deleteMany({});
    console.log('Cleared!\n');

    // Create buses first
    console.log('Creating demo buses...');
    const createdBuses = await Bus.insertMany(demoBuses);
    console.log(`Created ${createdBuses.length} buses\n`);

    // Create users with PLAIN passwords - let the model hash them via pre-save hook
    console.log('Creating demo users...');

    for (const userData of demoUsers) {
      // Don't hash here - let the User model's pre-save hook handle it
      const user = await User.create({
        email: userData.email,
        password: userData.password, // Plain password - will be hashed by model
        role: userData.role,
        firstName: userData.firstName,
        lastName: userData.lastName,
        phone: userData.phone,
        enrollmentNumber: userData.enrollmentNumber,
        department: userData.department,
        licenseNumber: userData.licenseNumber,
        licenseExpiry: userData.licenseExpiry
      });

      console.log(`  ✓ Created ${user.role}: ${user.email}`);
    }

    // Assign driver to first bus and student to second bus
    const driver = await User.findOne({ role: 'driver' });
    const student = await User.findOne({ role: 'student' });

    if (driver) {
      driver.assignedBus = createdBuses[0]._id;
      await driver.save();
      console.log(`\nAssigned ${createdBuses[0].busNumber} to driver`);
    }

    if (student && createdBuses[1]) {
      student.assignedBus = createdBuses[1]._id;
      await student.save();
      console.log(`Assigned ${createdBuses[1].busNumber} to student`);
    }

    console.log('\n========================================');
    console.log('Demo users created successfully!');
    console.log('========================================');
    console.log('\nLogin credentials:');
    console.log('--------------------------------------');
    for (const user of demoUsers) {
      console.log(`${user.role.padEnd(8)} : ${user.email} / ${user.password}`);
    }
    console.log('--------------------------------------\n');

    process.exit(0);
  } catch (error) {
    console.error('Seed error:', error.message);
    if (error.message.includes('ECONNREFUSED') || error.message.includes('getaddrinfo')) {
      console.log('\n❌ Cannot connect to MongoDB Atlas.');
      console.log('\nPlease check:');
      console.log('1. Your internet connection');
      console.log('2. MongoDB Atlas cluster is running');
      console.log('3. IP whitelist includes your current IP');
      console.log('\nTo whitelist your IP:');
      console.log('  1. Go to https://cloud.mongodb.com');
      console.log('  2. Network Access → Add IP');
      console.log('  3. Add current IP or allow access from anywhere');
    }
    process.exit(1);
  }
}

seed();