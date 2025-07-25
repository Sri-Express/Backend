"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// src/scripts/seedRoutes.ts - FIXED VERSION
const mongoose_1 = __importDefault(require("mongoose"));
const dotenv_1 = __importDefault(require("dotenv"));
const Route_1 = __importDefault(require("../models/Route"));
const Fleet_1 = __importDefault(require("../models/Fleet"));
// Load environment variables
dotenv_1.default.config();
const connectDatabase = async () => {
    try {
        const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/sri_express';
        console.log('🔗 Connecting to MongoDB:', mongoUri.replace(/\/\/.*@/, '//***:***@'));
        await mongoose_1.default.connect(mongoUri);
        console.log('✅ Connected to MongoDB');
    }
    catch (error) {
        console.error('❌ MongoDB connection failed:', error);
        throw error;
    }
};
// ✅ FIXED: Added routeId to each sample route
const sampleRoutes = [
    {
        routeId: "RT001CBK", // ✅ Added routeId
        name: "Colombo → Kandy Express",
        startLocation: {
            name: "Colombo Fort",
            coordinates: [79.8612, 6.9271],
            address: "Colombo Fort Railway Station, Colombo 01"
        },
        endLocation: {
            name: "Kandy Central",
            coordinates: [80.6337, 7.2906],
            address: "Kandy Railway Station, Kandy"
        },
        waypoints: [
            {
                name: "Ragama",
                coordinates: [80.0277, 7.0280],
                estimatedTime: 30,
                order: 1
            },
            {
                name: "Gampaha",
                coordinates: [80.0919, 7.0912],
                estimatedTime: 45,
                order: 2
            }
        ],
        distance: 116,
        estimatedDuration: 180,
        schedules: [
            {
                departureTime: "06:00",
                arrivalTime: "09:00",
                frequency: 60,
                daysOfWeek: ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"],
                isActive: true
            },
            {
                departureTime: "14:00",
                arrivalTime: "17:00",
                frequency: 60,
                daysOfWeek: ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"],
                isActive: true
            }
        ],
        operatorInfo: {
            companyName: "National Transport Commission",
            contactNumber: "+94112456789"
        },
        vehicleInfo: {
            type: "bus",
            capacity: 45,
            amenities: ["AC", "WiFi", "USB_Charging"]
        },
        pricing: {
            basePrice: 250,
            pricePerKm: 2.0,
            discounts: [
                { type: "student", percentage: 20 },
                { type: "senior", percentage: 15 },
                { type: "military", percentage: 10 }
            ]
        },
        status: "active"
    },
    {
        routeId: "RT002CBG", // ✅ Added routeId
        name: "Colombo → Galle Highway Express",
        startLocation: {
            name: "Colombo Fort",
            coordinates: [79.8612, 6.9271],
            address: "Colombo Fort Bus Terminal"
        },
        endLocation: {
            name: "Galle Fort",
            coordinates: [80.2170, 6.0535],
            address: "Galle Bus Station"
        },
        waypoints: [
            {
                name: "Mount Lavinia",
                coordinates: [79.8653, 6.8389],
                estimatedTime: 20,
                order: 1
            },
            {
                name: "Kalutara",
                coordinates: [79.9553, 6.5854],
                estimatedTime: 60,
                order: 2
            }
        ],
        distance: 119,
        estimatedDuration: 150,
        schedules: [
            {
                departureTime: "05:30",
                arrivalTime: "08:00",
                frequency: 30,
                daysOfWeek: ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"],
                isActive: true
            },
            {
                departureTime: "12:00",
                arrivalTime: "14:30",
                frequency: 30,
                daysOfWeek: ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"],
                isActive: true
            }
        ],
        operatorInfo: {
            companyName: "South Western Transport",
            contactNumber: "+94112567890"
        },
        vehicleInfo: {
            type: "bus",
            capacity: 52,
            amenities: ["AC", "Reclining_Seats", "Entertainment"]
        },
        pricing: {
            basePrice: 200,
            pricePerKm: 1.8,
            discounts: [
                { type: "student", percentage: 25 },
                { type: "senior", percentage: 20 },
                { type: "military", percentage: 15 }
            ]
        },
        status: "active"
    },
    {
        routeId: "RT003CBJ", // ✅ Added routeId
        name: "Colombo → Jaffna Intercity Express",
        startLocation: {
            name: "Colombo Fort",
            coordinates: [79.8612, 6.9271],
            address: "Colombo Fort Railway Station"
        },
        endLocation: {
            name: "Jaffna Central",
            coordinates: [80.0037, 9.6615],
            address: "Jaffna Railway Station"
        },
        waypoints: [
            {
                name: "Vavuniya",
                coordinates: [80.4981, 8.7514],
                estimatedTime: 360,
                order: 1
            }
        ],
        distance: 396,
        estimatedDuration: 480,
        schedules: [
            {
                departureTime: "08:00",
                arrivalTime: "16:00",
                frequency: 720,
                daysOfWeek: ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"],
                isActive: true
            }
        ],
        operatorInfo: {
            companyName: "Sri Lanka Railways",
            contactNumber: "+94112440048"
        },
        vehicleInfo: {
            type: "train",
            capacity: 200,
            amenities: ["AC", "Dining_Car", "Observation_Deck", "WiFi"]
        },
        pricing: {
            basePrice: 450,
            pricePerKm: 1.2,
            discounts: [
                { type: "student", percentage: 30 },
                { type: "senior", percentage: 25 },
                { type: "military", percentage: 20 }
            ]
        },
        status: "active"
    }
];
const seedRoutes = async () => {
    try {
        console.log('🌱 Starting Route Seeding...');
        // Connect to database
        await connectDatabase();
        // Clear existing routes
        await Route_1.default.deleteMany({});
        console.log('🗑️  Cleared existing routes');
        // Create a default fleet first
        let defaultFleet = await Fleet_1.default.findOne({ companyName: "National Transport Commission" });
        if (!defaultFleet) {
            defaultFleet = new Fleet_1.default({
                companyName: "National Transport Commission",
                registrationNumber: "NTC001",
                contactPerson: "Transport Manager",
                email: "manager@ntc.gov.lk",
                phone: "+94112456789",
                address: "Transport Ministry, Colombo 07",
                status: "approved",
                totalVehicles: 100,
                activeVehicles: 85,
                documents: {
                    businessLicense: true,
                    insuranceCertificate: true,
                    vehicleRegistrations: true,
                    driverLicenses: true
                },
                complianceScore: 95
            });
            await defaultFleet.save();
            console.log('✅ Created default fleet');
        }
        // ✅ FIXED: Create routes one by one to trigger validation properly
        console.log('📝 Creating routes...');
        const createdRoutes = [];
        for (let i = 0; i < sampleRoutes.length; i++) {
            const routeData = {
                ...sampleRoutes[i],
                operatorInfo: {
                    ...sampleRoutes[i].operatorInfo,
                    fleetId: defaultFleet._id
                }
            };
            const route = new Route_1.default(routeData);
            const savedRoute = await route.save();
            createdRoutes.push(savedRoute);
            console.log(`   ✅ Created: ${savedRoute.name} (${savedRoute.routeId})`);
        }
        console.log(`🎉 Successfully created ${createdRoutes.length} routes!`);
        console.log('🚀 You can now test the booking system!');
        console.log('📍 Available routes:');
        createdRoutes.forEach(route => {
            console.log(`   🚌 ${route.name} - Rs. ${route.pricing.basePrice}`);
        });
    }
    catch (error) {
        console.error('❌ Route seeding failed:', error);
    }
    finally {
        await mongoose_1.default.connection.close();
        console.log('🔌 Database connection closed');
    }
};
// Run if called directly
if (require.main === module) {
    seedRoutes();
}
exports.default = seedRoutes;
