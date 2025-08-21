"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// src/scripts/seedRouteData.ts - Create sample route data for fleet managers
const dotenv_1 = __importDefault(require("dotenv"));
const mongoose_1 = __importDefault(require("mongoose"));
const Route_1 = __importDefault(require("../models/Route"));
const Fleet_1 = __importDefault(require("../models/Fleet"));
// Load environment variables
dotenv_1.default.config();
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://w2052824:L3g2J5ZtGp8r9P4z@cluster0.trzicod.mongodb.net/SriExpressMain?retryWrites=true&w=majority&appName=Cluster0';
async function seedRoutes() {
    try {
        // Connect to MongoDB
        await mongoose_1.default.connect(MONGODB_URI);
        console.log('✅ Connected to MongoDB');
        // Find existing fleet
        const fleet = await Fleet_1.default.findOne({ isActive: true });
        if (!fleet) {
            console.log('❌ No active fleet found. Please create a fleet first.');
            return;
        }
        console.log(`📍 Using fleet: ${fleet.companyName} (${fleet.email})`);
        // Create sample routes
        const sampleRoutes = [
            {
                routeId: 'ROUTE_001',
                name: 'Colombo → Kandy Express',
                startLocation: {
                    name: 'Colombo Fort',
                    coordinates: [6.9271, 79.8612],
                    address: 'Fort Railway Station, Colombo 01'
                },
                endLocation: {
                    name: 'Kandy Central',
                    coordinates: [7.2906, 80.6337],
                    address: 'Kandy Railway Station, Kandy'
                },
                waypoints: [
                    {
                        name: 'Kottawa',
                        coordinates: [6.9147, 79.9739],
                        estimatedTime: 30,
                        order: 1
                    },
                    {
                        name: 'Homagama',
                        coordinates: [6.8211, 80.0409],
                        estimatedTime: 45,
                        order: 2
                    },
                    {
                        name: 'Kegalle',
                        coordinates: [6.9497, 80.6337],
                        estimatedTime: 90,
                        order: 3
                    }
                ],
                distance: 116,
                estimatedDuration: 180,
                schedules: [
                    {
                        departureTime: '06:30',
                        arrivalTime: '09:30',
                        frequency: 60,
                        daysOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
                        isActive: true
                    },
                    {
                        departureTime: '14:30',
                        arrivalTime: '17:30',
                        frequency: 60,
                        daysOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
                        isActive: true
                    },
                    {
                        departureTime: '19:00',
                        arrivalTime: '22:00',
                        frequency: 60,
                        daysOfWeek: ['Friday', 'Saturday', 'Sunday'],
                        isActive: true
                    }
                ],
                operatorInfo: {
                    fleetId: fleet._id.toString(),
                    companyName: fleet.companyName,
                    contactNumber: fleet.phone,
                    licenseNumber: fleet.registrationNumber
                },
                vehicleInfo: {
                    type: 'bus',
                    capacity: 52,
                    amenities: ['AC', 'WiFi', 'Charging Ports', 'Comfortable Seats', 'Entertainment System']
                },
                pricing: {
                    basePrice: 250.00,
                    pricePerKm: 2.15,
                    discounts: [
                        { type: 'student', percentage: 15 },
                        { type: 'senior', percentage: 20 },
                        { type: 'military', percentage: 10 }
                    ]
                },
                status: 'active',
                avgRating: 4.5,
                totalReviews: 324,
                isActive: true
            },
            {
                routeId: 'ROUTE_002',
                name: 'Colombo → Galle Coastal',
                startLocation: {
                    name: 'Colombo Central',
                    coordinates: [6.9271, 79.8612],
                    address: 'Central Bus Stand, Colombo'
                },
                endLocation: {
                    name: 'Galle Fort',
                    coordinates: [6.0535, 80.2210],
                    address: 'Galle Bus Terminal, Galle'
                },
                waypoints: [
                    {
                        name: 'Mount Lavinia',
                        coordinates: [6.8485, 79.8848],
                        estimatedTime: 20,
                        order: 1
                    },
                    {
                        name: 'Kalutara',
                        coordinates: [6.7648, 79.9012],
                        estimatedTime: 45,
                        order: 2
                    },
                    {
                        name: 'Bentota',
                        coordinates: [6.3567, 80.0234],
                        estimatedTime: 75,
                        order: 3
                    },
                    {
                        name: 'Hikkaduwa',
                        coordinates: [6.1123, 80.0789],
                        estimatedTime: 105,
                        order: 4
                    }
                ],
                distance: 119,
                estimatedDuration: 150,
                schedules: [
                    {
                        departureTime: '07:00',
                        arrivalTime: '09:30',
                        frequency: 45,
                        daysOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
                        isActive: true
                    },
                    {
                        departureTime: '15:30',
                        arrivalTime: '18:00',
                        frequency: 45,
                        daysOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
                        isActive: true
                    }
                ],
                operatorInfo: {
                    fleetId: fleet._id.toString(),
                    companyName: fleet.companyName,
                    contactNumber: fleet.phone,
                    licenseNumber: fleet.registrationNumber
                },
                vehicleInfo: {
                    type: 'bus',
                    capacity: 45,
                    amenities: ['AC', 'Reclining Seats', 'Music System', 'Reading Lights']
                },
                pricing: {
                    basePrice: 180.00,
                    pricePerKm: 1.51,
                    discounts: [
                        { type: 'student', percentage: 12 },
                        { type: 'senior', percentage: 18 }
                    ]
                },
                status: 'active',
                avgRating: 4.2,
                totalReviews: 189,
                isActive: true
            },
            {
                routeId: 'ROUTE_003',
                name: 'Kandy → Nuwara Eliya Hill Country',
                startLocation: {
                    name: 'Kandy Central',
                    coordinates: [7.2906, 80.6337],
                    address: 'Kandy Bus Terminal, Kandy'
                },
                endLocation: {
                    name: 'Nuwara Eliya',
                    coordinates: [6.9497, 80.7891],
                    address: 'Nuwara Eliya Bus Stand'
                },
                waypoints: [
                    {
                        name: 'Peradeniya',
                        coordinates: [7.2599, 80.5977],
                        estimatedTime: 15,
                        order: 1
                    },
                    {
                        name: 'Gampola',
                        coordinates: [7.1644, 80.5736],
                        estimatedTime: 35,
                        order: 2
                    },
                    {
                        name: 'Nawalapitiya',
                        coordinates: [7.0431, 80.5339],
                        estimatedTime: 60,
                        order: 3
                    }
                ],
                distance: 78,
                estimatedDuration: 120,
                schedules: [
                    {
                        departureTime: '08:00',
                        arrivalTime: '10:00',
                        frequency: 90,
                        daysOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
                        isActive: true
                    },
                    {
                        departureTime: '16:00',
                        arrivalTime: '18:00',
                        frequency: 90,
                        daysOfWeek: ['Friday', 'Saturday', 'Sunday'],
                        isActive: true
                    }
                ],
                operatorInfo: {
                    fleetId: fleet._id.toString(),
                    companyName: fleet.companyName,
                    contactNumber: fleet.phone,
                    licenseNumber: fleet.registrationNumber
                },
                vehicleInfo: {
                    type: 'bus',
                    capacity: 35,
                    amenities: ['Heating', 'Mountain Views', 'Comfortable Seats', 'Luggage Space']
                },
                pricing: {
                    basePrice: 120.00,
                    pricePerKm: 1.54,
                    discounts: [
                        { type: 'student', percentage: 20 },
                        { type: 'senior', percentage: 25 }
                    ]
                },
                status: 'maintenance',
                avgRating: 4.7,
                totalReviews: 94,
                isActive: true
            }
        ];
        // Check if routes already exist
        const existingRoutes = await Route_1.default.find({ 'operatorInfo.fleetId': fleet._id.toString() });
        if (existingRoutes.length > 0) {
            console.log(`📍 Found ${existingRoutes.length} existing routes for this fleet`);
            console.log('Routes:');
            existingRoutes.forEach((route, index) => {
                console.log(`  ${index + 1}. ${route.name} (${route.status})`);
            });
            return;
        }
        console.log('📍 Creating sample routes...');
        // Create the routes
        for (const routeData of sampleRoutes) {
            const route = new Route_1.default(routeData);
            await route.save();
            console.log(`✅ Created route: ${route.name}`);
        }
        console.log('🎉 Sample route data created successfully!');
        console.log(`📊 Total routes created: ${sampleRoutes.length}`);
        const stats = {
            total: sampleRoutes.length,
            active: sampleRoutes.filter(r => r.status === 'active').length,
            maintenance: sampleRoutes.filter(r => r.status === 'maintenance').length,
            inactive: sampleRoutes.filter(r => r.status === 'inactive').length
        };
        console.log('📈 Route Statistics:');
        console.log(`  - Active: ${stats.active}`);
        console.log(`  - Maintenance: ${stats.maintenance}`);
        console.log(`  - Inactive: ${stats.inactive}`);
    }
    catch (error) {
        console.error('❌ Error seeding routes:', error);
    }
    finally {
        await mongoose_1.default.connection.close();
        console.log('📍 Database connection closed');
    }
}
// Run the script
seedRoutes();
