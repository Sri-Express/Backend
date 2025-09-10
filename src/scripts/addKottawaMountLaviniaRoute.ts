// src/scripts/addKottawaMountLaviniaRoute.ts
import mongoose from 'mongoose';
import Route from '../models/Route';
import Fleet from '../models/Fleet';

const addKottawaMountLaviniaRoute = async () => {
  try {
    // Connect to database
    const mongoURI = process.env.MONGODB_URI || 'mongodb+srv://ranawakaramr22:rothila123@sri-express-01.trzicod.mongodb.net/sri_express?retryWrites=true&w=majority';
    await mongoose.connect(mongoURI);
    console.log('✅ Connected to MongoDB');

    // Check if route already exists
    const existingRoute = await Route.findOne({
      name: 'Kottawa Bus Stand to Mount Lavinia Express'
    });

    if (existingRoute) {
      console.log('⚠️  Route already exists:', existingRoute.name);
      console.log('Route ID:', existingRoute.routeId);
      return;
    }

    // Get or create a system fleet for this route
    let systemFleet = await Fleet.findOne({ companyName: 'SRI EXPRESS SYSTEM' });
    
    if (!systemFleet) {
      console.log('Creating system fleet...');
      systemFleet = new Fleet({
        companyName: 'SRI EXPRESS SYSTEM',
        registrationNumber: 'REG-SYS-001',
        contactPerson: 'System Administrator',
        email: 'system@sriexpress.lk',
        phone: '+94112345678',
        address: 'Colombo, Sri Lanka',
        status: 'approved',
        applicationDate: new Date(),
        approvalDate: new Date(),
        totalVehicles: 50,
        activeVehicles: 45,
        operatingRoutes: [],
        documents: {
          businessLicense: true,
          insuranceCertificate: true,
          vehicleRegistrations: true,
          driverLicenses: true,
          uploadedFiles: []
        },
        complianceScore: 95,
        lastInspection: new Date(),
        nextInspectionDue: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year from now
        operationalInfo: {
          yearsInOperation: 5,
          averageFleetAge: 3,
          maintenanceSchedule: 'monthly',
          safetyRating: 4.5,
          notifications: {
            emailAlerts: true,
            smsAlerts: true,
            emergencyAlerts: true,
            maintenanceReminders: true,
            routeUpdates: true
          }
        }
      });
      await systemFleet.save();
      console.log('✅ System fleet created');
    }

    // Create the new route
    const newRouteData = {
      name: 'Kottawa Bus Stand to Mount Lavinia Express',
      startLocation: {
        name: 'Kottawa Bus Stand',
        coordinates: [79.973900, 6.827600], // [longitude, latitude]
        address: 'Kottawa Bus Stand, Kottawa, Western Province, Sri Lanka'
      },
      endLocation: {
        name: 'Mount Lavinia',
        coordinates: [79.863800, 6.838900], // [longitude, latitude]
        address: 'Mount Lavinia, Western Province, Sri Lanka'
      },
      waypoints: [
        {
          name: 'Maharagama Junction',
          coordinates: [79.927500, 6.844800],
          estimatedTime: 8, // 8 minutes from start
          order: 1
        },
        {
          name: 'Nugegoda',
          coordinates: [79.899000, 6.874800],
          estimatedTime: 15, // 15 minutes from start
          order: 2
        },
        {
          name: 'Dehiwala',
          coordinates: [79.863000, 6.851100],
          estimatedTime: 22, // 22 minutes from start
          order: 3
        }
      ],
      distance: 12.5, // Approximate distance in kilometers
      estimatedDuration: 30, // 30 minutes estimated duration
      schedules: [
        {
          departureTime: "06:00",
          arrivalTime: "06:30",
          frequency: 15, // Every 15 minutes
          daysOfWeek: ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday"],
          isActive: true
        },
        {
          departureTime: "06:15",
          arrivalTime: "06:45",
          frequency: 15,
          daysOfWeek: ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday"],
          isActive: true
        },
        {
          departureTime: "06:30",
          arrivalTime: "07:00",
          frequency: 15,
          daysOfWeek: ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday"],
          isActive: true
        },
        {
          departureTime: "07:00",
          arrivalTime: "07:30",
          frequency: 15,
          daysOfWeek: ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"],
          isActive: true
        }
      ],
      operatorInfo: {
        fleetId: systemFleet._id,
        companyName: systemFleet.companyName,
        contactNumber: systemFleet.phone
      },
      vehicleInfo: {
        type: 'bus' as const,
        capacity: 45,
        amenities: [
          'Air Conditioning',
          'WiFi',
          'Comfortable Seating',
          'Music System',
          'Safety Equipment'
        ]
      },
      pricing: {
        basePrice: 25.00, // Base price in LKR
        pricePerKm: 2.00,  // Price per kilometer
        discounts: [
          { type: 'student' as const, percentage: 15 },
          { type: 'senior' as const, percentage: 20 },
          { type: 'military' as const, percentage: 10 }
        ]
      },
      approvalStatus: 'approved' as const, // Pre-approved system route
      status: 'active' as const,
      isActive: true,
      avgRating: 4.2,
      totalReviews: 89
    };

    // Create and save the route
    const newRoute = new Route(newRouteData);
    const savedRoute = await newRoute.save();

    console.log('✅ Successfully created new route!');
    console.log('📍 Route Details:');
    console.log(`   Route ID: ${savedRoute.routeId}`);
    console.log(`   Name: ${savedRoute.name}`);
    console.log(`   From: ${savedRoute.startLocation.name} (${savedRoute.startLocation.coordinates})`);
    console.log(`   To: ${savedRoute.endLocation.name} (${savedRoute.endLocation.coordinates})`);
    console.log(`   Distance: ${savedRoute.distance} km`);
    console.log(`   Duration: ${savedRoute.estimatedDuration} minutes`);
    console.log(`   Waypoints: ${savedRoute.waypoints.length}`);
    console.log(`   Schedules: ${savedRoute.schedules.length}`);
    console.log(`   Status: ${savedRoute.approvalStatus} / ${savedRoute.status}`);

    // Calculate and display pricing
    const regularPrice = savedRoute.calculatePrice('regular');
    const studentPrice = savedRoute.calculatePrice('student');
    console.log(`💰 Pricing:`);
    console.log(`   Regular: LKR ${regularPrice}`);
    console.log(`   Student: LKR ${studentPrice}`);

  } catch (error) {
    console.error('❌ Error adding route:', error);
    if (error instanceof Error) {
      console.error('Error message:', error.message);
    }
  } finally {
    await mongoose.connection.close();
    console.log('📝 Database connection closed');
  }
};

// Run the script if called directly
if (require.main === module) {
  addKottawaMountLaviniaRoute()
    .then(() => {
      console.log('🎉 Script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Script failed:', error);
      process.exit(1);
    });
}

export default addKottawaMountLaviniaRoute;