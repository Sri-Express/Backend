const mongoose = require('mongoose');
const Route = require('./dist/models/Route.js').default;

async function createESP32Route() {
  try {
    // Use the connection string from env or fallback
    const mongoUri = process.env.MONGODB_URI || 'mongodb+srv://sri-express:sriexpress2024@sri-express-01.trzicod.mongodb.net/sri_express?retryWrites=true&w=majority';
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    // Delete any existing route with this ID
    await Route.deleteOne({ _id: '68c0dcf350719c991fe9e5d8' });

    // Create route with EXACT ID that ESP32 expects
    const routeData = {
      _id: new mongoose.Types.ObjectId('68c0dcf350719c991fe9e5d8'), // EXACT ID from ESP32
      routeId: "RT001KML",
      name: "Kottawa → Mount Lavinia Express",
      startLocation: {
        name: "Kottawa Bus Stand", 
        coordinates: [79.9639299, 6.8408351], // CORRECT coordinates
        address: "RXR7+8HM Kottawa Bus Station, Pannipitiya 10230"
      },
      endLocation: {
        name: "Mount Lavinia",
        coordinates: [79.8638, 6.8389],
        address: "Mount Lavinia Bus Stand, Mount Lavinia"
      },
      waypoints: [
        {
          name: "Maharagama",
          coordinates: [79.9275, 6.8448],
          estimatedTime: 10,
          order: 1
        },
        {
          name: "Nugegoda", 
          coordinates: [79.8990, 6.8748],
          estimatedTime: 20,
          order: 2
        }
      ],
      distance: 15,
      estimatedDuration: 45,
      schedules: [{
        departureTime: "06:00",
        arrivalTime: "06:45", 
        frequency: 15,
        daysOfWeek: ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"],
        isActive: true
      }],
      operatorInfo: {
        fleetId: new mongoose.Types.ObjectId(),
        companyName: "Western Provincial Transport",
        contactNumber: "+94112123456"
      },
      vehicleInfo: {
        type: "bus",
        capacity: 50,
        amenities: ["Comfortable_Seats", "Standing_Space"]
      },
      pricing: {
        basePrice: 35,
        pricePerKm: 2.5,
        discounts: [
          { type: "student", percentage: 25 },
          { type: "senior", percentage: 20 },
          { type: "military", percentage: 15 }
        ]
      },
      status: "active"
    };

    const route = new Route(routeData);
    await route.save();

    console.log('🎉 SUCCESS! Created route with ESP32 ID:');
    console.log(`Route ID: ${route._id}`);
    console.log(`Name: ${route.name}`);
    console.log('✅ Your ESP32 should now work!');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

createESP32Route();