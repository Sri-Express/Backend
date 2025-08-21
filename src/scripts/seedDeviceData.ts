// src/scripts/seedDeviceData.ts - Development seed data for testing
import 'dotenv/config'; // Load environment variables
import mongoose from 'mongoose';
import Device from '../models/Device';
import User from '../models/User';
import connectDB from '../config/db';

const seedDeviceData = async () => {
  try {
    // Connect to database
    await connectDB();
    
    console.log('🌱 Starting device data seeding...');

    // Find the fleet manager user
    const fleetManager = await User.findOne({ 
      email: 'fleetmanager@sriexpress.com' 
    });

    if (!fleetManager) {
      console.log('❌ Fleet manager user not found. Please create the user first.');
      process.exit(1);
    }

    console.log(`✅ Found fleet manager: ${fleetManager.name} (${fleetManager.email})`);

    // Check if devices already exist
    const existingDevices = await Device.find({
      'assignedTo.userId': fleetManager._id,
      isActive: true
    });

    if (existingDevices.length > 0) {
      console.log(`⚠️  Found ${existingDevices.length} existing devices. Skipping seed.`);
      process.exit(0);
    }

    // Create sample vehicles for testing
    const sampleVehicles = [
      {
        deviceId: 'DEV_SRI_001',
        vehicleNumber: 'WP-CAB-1234',
        vehicleType: 'bus',
        status: 'online',
        location: {
          latitude: 6.9271,
          longitude: 79.8612,
          address: 'Colombo Fort Railway Station',
          lastUpdated: new Date()
        },
        batteryLevel: 85,
        signalStrength: 4,
        assignedTo: {
          type: 'company_admin',
          userId: fleetManager._id,
          name: fleetManager.name
        },
        firmwareVersion: '2.1.0',
        installDate: new Date('2024-01-15'),
        alerts: {
          count: 0,
          messages: []
        },
        isActive: true
      },
      {
        deviceId: 'DEV_SRI_002',
        vehicleNumber: 'WP-CAB-5678',
        vehicleType: 'bus',
        status: 'online',
        location: {
          latitude: 6.8485,
          longitude: 79.9681,
          address: 'Maharagama Bus Stand',
          lastUpdated: new Date(Date.now() - 5 * 60000) // 5 minutes ago
        },
        batteryLevel: 92,
        signalStrength: 5,
        assignedTo: {
          type: 'company_admin',
          userId: fleetManager._id,
          name: fleetManager.name
        },
        firmwareVersion: '2.1.0',
        installDate: new Date('2024-01-20'),
        alerts: {
          count: 1,
          messages: ['Route deviation detected']
        },
        isActive: true
      },
      {
        deviceId: 'DEV_SRI_003',
        vehicleNumber: 'WP-VAN-9012',
        vehicleType: 'van',
        status: 'maintenance',
        location: {
          latitude: 6.9270,
          longitude: 79.8612,
          address: 'Pettah Central Depot',
          lastUpdated: new Date(Date.now() - 2 * 60 * 60000) // 2 hours ago
        },
        batteryLevel: 45,
        signalStrength: 2,
        assignedTo: {
          type: 'company_admin',
          userId: fleetManager._id,
          name: fleetManager.name
        },
        firmwareVersion: '1.9.5',
        installDate: new Date('2023-11-10'),
        alerts: {
          count: 2,
          messages: ['Scheduled maintenance due', 'Low battery warning']
        },
        isActive: true
      },
      {
        deviceId: 'DEV_SRI_004',
        vehicleNumber: 'WP-CAB-3456',
        vehicleType: 'bus',
        status: 'offline',
        location: {
          latitude: 6.9388,
          longitude: 79.8542,
          address: 'Kollupitiya Junction',
          lastUpdated: new Date(Date.now() - 30 * 60000) // 30 minutes ago
        },
        batteryLevel: 12,
        signalStrength: 0,
        assignedTo: {
          type: 'company_admin',
          userId: fleetManager._id,
          name: fleetManager.name
        },
        firmwareVersion: '2.0.3',
        installDate: new Date('2024-02-05'),
        alerts: {
          count: 3,
          messages: ['Vehicle offline for 30+ minutes', 'Low battery critical', 'No GPS signal']
        },
        isActive: true
      },
      {
        deviceId: 'DEV_SRI_005',
        vehicleNumber: 'WP-MB-7890',
        vehicleType: 'minibus',
        status: 'online',
        location: {
          latitude: 7.2906,
          longitude: 80.6337,
          address: 'Kandy Central Bus Station',
          lastUpdated: new Date(Date.now() - 1 * 60000) // 1 minute ago
        },
        batteryLevel: 78,
        signalStrength: 3,
        assignedTo: {
          type: 'company_admin',
          userId: fleetManager._id,
          name: fleetManager.name
        },
        firmwareVersion: '2.1.0',
        installDate: new Date('2024-03-01'),
        alerts: {
          count: 0,
          messages: []
        },
        isActive: true
      }
    ];

    // Insert the sample vehicles
    const createdVehicles = await Device.insertMany(sampleVehicles);
    
    console.log(`✅ Successfully created ${createdVehicles.length} sample vehicles:`);
    createdVehicles.forEach(vehicle => {
      console.log(`   - ${vehicle.vehicleNumber} (${vehicle.vehicleType}) - ${vehicle.status}`);
    });

    console.log('🎉 Device data seeding completed successfully!');
    console.log('📍 You can now test the fleet management system with real data.');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding device data:', error);
    process.exit(1);
  }
};

// Run the seed function
seedDeviceData();
