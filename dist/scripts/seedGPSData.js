"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// src/scripts/seedGPSData.ts - FIXED VERSION WITH CORRECT IMPORTS
const mongoose_1 = __importDefault(require("mongoose"));
const Route_1 = __importDefault(require("../models/Route"));
const Device_1 = __importDefault(require("../models/Device"));
const Fleet_1 = __importDefault(require("../models/Fleet"));
const LocationTracking_1 = __importDefault(require("../models/LocationTracking"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const connectDB = async () => {
    try {
        const conn = await mongoose_1.default.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/sri_express');
        console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    }
    catch (error) {
        console.error('❌ Database connection error:', error);
        process.exit(1);
    }
};
const seedRoutes = async () => {
    console.log('🛣️ Seeding routes...');
    const routes = [
        {
            routeId: 'ROUTE_COL_KDY',
            name: 'Colombo → Kandy Express',
            startLocation: {
                name: 'Colombo Fort',
                coordinates: [79.8612, 6.9271],
                address: 'Fort Railway Station, Colombo 01'
            },
            endLocation: {
                name: 'Kandy Central',
                coordinates: [80.6337, 7.2906],
                address: 'Kandy Railway Station, Kandy'
            },
            waypoints: [
                { name: 'Colombo Fort', coordinates: [79.8612, 6.9271], estimatedTime: 0, order: 0 },
                { name: 'Pettah', coordinates: [79.8478, 6.9319], estimatedTime: 15, order: 1 },
                { name: 'Kottawa', coordinates: [79.9739, 6.9147], estimatedTime: 45, order: 2 },
                { name: 'Homagama', coordinates: [80.0409, 6.8211], estimatedTime: 75, order: 3 },
                { name: 'Padukka', coordinates: [80.1234, 6.7648], estimatedTime: 105, order: 4 },
                { name: 'Kegalle', coordinates: [80.6337, 6.9497], estimatedTime: 150, order: 5 },
                { name: 'Kandy Central', coordinates: [80.6337, 7.2906], estimatedTime: 180, order: 6 }
            ],
            distance: 116,
            estimatedDuration: 180,
            schedules: [
                {
                    departureTime: '06:30',
                    arrivalTime: '09:30',
                    frequency: 30,
                    daysOfWeek: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
                    isActive: true
                },
                {
                    departureTime: '14:30',
                    arrivalTime: '17:30',
                    frequency: 60,
                    daysOfWeek: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
                    isActive: true
                }
            ],
            operatorInfo: {
                fleetId: new mongoose_1.default.Types.ObjectId(),
                companyName: 'National Transport Commission',
                contactNumber: '+94112345678'
            },
            vehicleInfo: {
                type: 'bus',
                capacity: 45,
                amenities: ['AC', 'WiFi', 'USB_Charging', 'Comfortable_Seats']
            },
            pricing: {
                basePrice: 250,
                pricePerKm: 2.15,
                discounts: [
                    { type: 'student', percentage: 25 },
                    { type: 'senior', percentage: 15 },
                    { type: 'military', percentage: 20 }
                ]
            },
            status: 'active',
            avgRating: 4.3,
            totalReviews: 847,
            isActive: true
        },
        {
            routeId: 'ROUTE_COL_GAL',
            name: 'Colombo → Galle Highway Express',
            startLocation: {
                name: 'Colombo Fort',
                coordinates: [79.8612, 6.9271],
                address: 'Central Bus Stand, Pettah'
            },
            endLocation: {
                name: 'Galle Fort',
                coordinates: [80.2210, 6.0535],
                address: 'Galle Bus Terminal'
            },
            waypoints: [
                { name: 'Colombo Fort', coordinates: [79.8612, 6.9271], estimatedTime: 0, order: 0 },
                { name: 'Mount Lavinia', coordinates: [79.8848, 6.8485], estimatedTime: 25, order: 1 },
                { name: 'Kalutara', coordinates: [79.9012, 6.7648], estimatedTime: 55, order: 2 },
                { name: 'Aluthgama', coordinates: [79.9856, 6.4789], estimatedTime: 85, order: 3 },
                { name: 'Ambalangoda', coordinates: [80.0567, 6.2234], estimatedTime: 115, order: 4 },
                { name: 'Galle Fort', coordinates: [80.2210, 6.0535], estimatedTime: 150, order: 5 }
            ],
            distance: 119,
            estimatedDuration: 150,
            schedules: [
                {
                    departureTime: '07:00',
                    arrivalTime: '09:30',
                    frequency: 30,
                    daysOfWeek: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
                    isActive: true
                }
            ],
            operatorInfo: {
                fleetId: new mongoose_1.default.Types.ObjectId(),
                companyName: 'South Western Transport',
                contactNumber: '+94912234567'
            },
            vehicleInfo: {
                type: 'bus',
                capacity: 52,
                amenities: ['AC', 'Reclining_Seats', 'Entertainment']
            },
            pricing: {
                basePrice: 200,
                pricePerKm: 1.68,
                discounts: [
                    { type: 'student', percentage: 20 },
                    { type: 'senior', percentage: 10 }
                ]
            },
            status: 'active',
            avgRating: 4.1,
            totalReviews: 623,
            isActive: true
        },
        {
            routeId: 'ROUTE_COL_JAF',
            name: 'Colombo → Jaffna Intercity Express',
            startLocation: {
                name: 'Colombo Fort',
                coordinates: [79.8612, 6.9271],
                address: 'Fort Railway Station, Colombo 01'
            },
            endLocation: {
                name: 'Jaffna Central',
                coordinates: [80.0255, 9.6615],
                address: 'Jaffna Railway Station'
            },
            waypoints: [
                { name: 'Colombo Fort', coordinates: [79.8612, 6.9271], estimatedTime: 0, order: 0 },
                { name: 'Kandy', coordinates: [80.6337, 7.2906], estimatedTime: 180, order: 1 },
                { name: 'Dambulla', coordinates: [80.7718, 7.9403], estimatedTime: 240, order: 2 },
                { name: 'Anuradhapura', coordinates: [80.4037, 8.3114], estimatedTime: 300, order: 3 },
                { name: 'Vavuniya', coordinates: [80.6895, 8.8271], estimatedTime: 360, order: 4 },
                { name: 'Jaffna Central', coordinates: [80.0255, 9.6615], estimatedTime: 480, order: 5 }
            ],
            distance: 396,
            estimatedDuration: 480,
            schedules: [
                {
                    departureTime: '05:45',
                    arrivalTime: '13:45',
                    frequency: 120,
                    daysOfWeek: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
                    isActive: true
                }
            ],
            operatorInfo: {
                fleetId: new mongoose_1.default.Types.ObjectId(),
                companyName: 'Sri Lanka Railways',
                contactNumber: '+94112440048'
            },
            vehicleInfo: {
                type: 'train',
                capacity: 200,
                amenities: ['AC', 'Dining_Car', 'Observation_Deck', 'Sleeper_Berths']
            },
            pricing: {
                basePrice: 450,
                pricePerKm: 1.14,
                discounts: [
                    { type: 'student', percentage: 30 },
                    { type: 'senior', percentage: 25 },
                    { type: 'military', percentage: 35 }
                ]
            },
            status: 'active',
            avgRating: 4.5,
            totalReviews: 1203,
            isActive: true
        },
        {
            routeId: 'ROUTE_KDY_COL',
            name: 'Kandy → Colombo Return Express',
            startLocation: {
                name: 'Kandy Central',
                coordinates: [80.6337, 7.2906],
                address: 'Kandy Railway Station, Kandy'
            },
            endLocation: {
                name: 'Colombo Fort',
                coordinates: [79.8612, 6.9271],
                address: 'Fort Railway Station, Colombo 01'
            },
            waypoints: [
                { name: 'Kandy Central', coordinates: [80.6337, 7.2906], estimatedTime: 0, order: 0 },
                { name: 'Kegalle', coordinates: [80.6337, 6.9497], estimatedTime: 30, order: 1 },
                { name: 'Padukka', coordinates: [80.1234, 6.7648], estimatedTime: 75, order: 2 },
                { name: 'Homagama', coordinates: [80.0409, 6.8211], estimatedTime: 105, order: 3 },
                { name: 'Kottawa', coordinates: [79.9739, 6.9147], estimatedTime: 135, order: 4 },
                { name: 'Colombo Fort', coordinates: [79.8612, 6.9271], estimatedTime: 180, order: 5 }
            ],
            distance: 116,
            estimatedDuration: 180,
            schedules: [
                {
                    departureTime: '08:15',
                    arrivalTime: '11:15',
                    frequency: 45,
                    daysOfWeek: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
                    isActive: true
                }
            ],
            operatorInfo: {
                fleetId: new mongoose_1.default.Types.ObjectId(),
                companyName: 'Hill Country Transport',
                contactNumber: '+94812234567'
            },
            vehicleInfo: {
                type: 'bus',
                capacity: 48,
                amenities: ['AC', 'Mountain_Views', 'Comfortable_Seats']
            },
            pricing: {
                basePrice: 250,
                pricePerKm: 2.15,
                discounts: [
                    { type: 'student', percentage: 25 }
                ]
            },
            status: 'active',
            avgRating: 4.2,
            totalReviews: 567,
            isActive: true
        },
        {
            routeId: 'ROUTE_GAL_COL',
            name: 'Galle → Colombo Express Return',
            startLocation: {
                name: 'Galle Fort',
                coordinates: [80.2210, 6.0535],
                address: 'Galle Bus Terminal'
            },
            endLocation: {
                name: 'Colombo Fort',
                coordinates: [79.8612, 6.9271],
                address: 'Central Bus Stand, Pettah'
            },
            waypoints: [
                { name: 'Galle Fort', coordinates: [80.2210, 6.0535], estimatedTime: 0, order: 0 },
                { name: 'Ambalangoda', coordinates: [80.0567, 6.2234], estimatedTime: 35, order: 1 },
                { name: 'Aluthgama', coordinates: [79.9856, 6.4789], estimatedTime: 65, order: 2 },
                { name: 'Kalutara', coordinates: [79.9012, 6.7648], estimatedTime: 95, order: 3 },
                { name: 'Mount Lavinia', coordinates: [79.8848, 6.8485], estimatedTime: 125, order: 4 },
                { name: 'Colombo Fort', coordinates: [79.8612, 6.9271], estimatedTime: 150, order: 5 }
            ],
            distance: 119,
            estimatedDuration: 150,
            schedules: [
                {
                    departureTime: '09:30',
                    arrivalTime: '12:00',
                    frequency: 40,
                    daysOfWeek: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
                    isActive: true
                }
            ],
            operatorInfo: {
                fleetId: new mongoose_1.default.Types.ObjectId(),
                companyName: 'Coastal Express',
                contactNumber: '+94912345678'
            },
            vehicleInfo: {
                type: 'bus',
                capacity: 50,
                amenities: ['AC', 'Coastal_Views', 'WiFi']
            },
            pricing: {
                basePrice: 200,
                pricePerKm: 1.68,
                discounts: [
                    { type: 'student', percentage: 20 }
                ]
            },
            status: 'active',
            avgRating: 4.0,
            totalReviews: 445,
            isActive: true
        }
    ];
    await Route_1.default.deleteMany({});
    for (const routeData of routes) {
        const route = new Route_1.default(routeData);
        await route.save();
        console.log(`✅ Route created: ${route.name}`);
    }
    console.log(`🛣️ Created ${routes.length} routes successfully`);
};
const seedDevices = async () => {
    console.log('📱 Seeding devices...');
    const devices = [
        {
            deviceId: 'BUS_NCB_1234',
            vehicleNumber: 'NCB-1234',
            vehicleType: 'bus',
            status: 'online',
            lastSeen: new Date(),
            location: {
                latitude: 6.9271,
                longitude: 79.8612,
                address: 'Colombo Fort Railway Station',
                lastUpdated: new Date()
            },
            batteryLevel: 85,
            signalStrength: 4,
            assignedTo: {
                type: 'route_admin',
                userId: new mongoose_1.default.Types.ObjectId(),
                name: 'Sunil Perera'
            },
            route: {
                routeId: new mongoose_1.default.Types.ObjectId(),
                name: 'Colombo → Kandy Express'
            },
            firmwareVersion: '2.1.4',
            installDate: new Date('2024-01-15'),
            lastMaintenance: new Date('2024-12-01'),
            alerts: {
                count: 0,
                messages: []
            },
            isActive: true
        },
        {
            deviceId: 'BUS_NCB_5678',
            vehicleNumber: 'NCB-5678',
            vehicleType: 'bus',
            status: 'online',
            lastSeen: new Date(),
            location: {
                latitude: 6.9271,
                longitude: 79.8612,
                address: 'Colombo Central Bus Stand',
                lastUpdated: new Date()
            },
            batteryLevel: 92,
            signalStrength: 5,
            assignedTo: {
                type: 'route_admin',
                userId: new mongoose_1.default.Types.ObjectId(),
                name: 'Kamal Silva'
            },
            route: {
                routeId: new mongoose_1.default.Types.ObjectId(),
                name: 'Colombo → Galle Highway Express'
            },
            firmwareVersion: '2.1.4',
            installDate: new Date('2024-02-10'),
            lastMaintenance: new Date('2024-11-20'),
            alerts: {
                count: 0,
                messages: []
            },
            isActive: true
        },
        {
            deviceId: 'TRAIN_T001',
            vehicleNumber: 'T-001',
            vehicleType: 'train',
            status: 'online',
            lastSeen: new Date(),
            location: {
                latitude: 6.9271,
                longitude: 79.8612,
                address: 'Colombo Fort Railway Station',
                lastUpdated: new Date()
            },
            batteryLevel: 78,
            signalStrength: 4,
            assignedTo: {
                type: 'route_admin',
                userId: new mongoose_1.default.Types.ObjectId(),
                name: 'Mahinda Rajapaksa'
            },
            route: {
                routeId: new mongoose_1.default.Types.ObjectId(),
                name: 'Colombo → Jaffna Intercity Express'
            },
            firmwareVersion: '2.2.1',
            installDate: new Date('2024-03-05'),
            lastMaintenance: new Date('2024-12-10'),
            alerts: {
                count: 0,
                messages: []
            },
            isActive: true
        },
        {
            deviceId: 'BUS_NCB_9012',
            vehicleNumber: 'NCB-9012',
            vehicleType: 'bus',
            status: 'online',
            lastSeen: new Date(),
            location: {
                latitude: 7.2906,
                longitude: 80.6337,
                address: 'Kandy Railway Station',
                lastUpdated: new Date()
            },
            batteryLevel: 89,
            signalStrength: 3,
            assignedTo: {
                type: 'route_admin',
                userId: new mongoose_1.default.Types.ObjectId(),
                name: 'Chaminda Fernando'
            },
            route: {
                routeId: new mongoose_1.default.Types.ObjectId(),
                name: 'Kandy → Colombo Return Express'
            },
            firmwareVersion: '2.1.4',
            installDate: new Date('2024-01-20'),
            lastMaintenance: new Date('2024-11-25'),
            alerts: {
                count: 0,
                messages: []
            },
            isActive: true
        },
        {
            deviceId: 'BUS_NCB_3456',
            vehicleNumber: 'NCB-3456',
            vehicleType: 'bus',
            status: 'online',
            lastSeen: new Date(),
            location: {
                latitude: 6.0535,
                longitude: 80.2210,
                address: 'Galle Bus Terminal',
                lastUpdated: new Date()
            },
            batteryLevel: 76,
            signalStrength: 4,
            assignedTo: {
                type: 'route_admin',
                userId: new mongoose_1.default.Types.ObjectId(),
                name: 'Nimal Wickramasinghe'
            },
            route: {
                routeId: new mongoose_1.default.Types.ObjectId(),
                name: 'Galle → Colombo Express Return'
            },
            firmwareVersion: '2.1.4',
            installDate: new Date('2024-02-28'),
            lastMaintenance: new Date('2024-12-05'),
            alerts: {
                count: 0,
                messages: []
            },
            isActive: true
        }
    ];
    await Device_1.default.deleteMany({});
    for (const deviceData of devices) {
        const device = new Device_1.default(deviceData);
        await device.save();
        console.log(`✅ Device created: ${device.vehicleNumber}`);
    }
    console.log(`📱 Created ${devices.length} devices successfully`);
};
const seedFleets = async () => {
    console.log('🚛 Seeding fleet companies...');
    const fleets = [
        {
            companyName: 'National Transport Commission',
            registrationNumber: 'NTC-2024-001',
            contactPerson: 'Director General Transport',
            email: 'info@ntc.gov.lk',
            phone: '+94112345678',
            address: 'Transport Board Building, Colombo 10',
            status: 'approved',
            applicationDate: new Date('2024-01-01'),
            approvalDate: new Date('2024-01-15'),
            totalVehicles: 150,
            activeVehicles: 142,
            operatingRoutes: ['ROUTE_COL_KDY', 'ROUTE_KDY_COL'],
            documents: {
                businessLicense: true,
                insuranceCertificate: true,
                vehicleRegistrations: true,
                driverLicenses: true,
                uploadedFiles: ['ntc_license.pdf', 'insurance_cert.pdf']
            },
            complianceScore: 95,
            lastInspection: new Date('2024-11-01'),
            nextInspectionDue: new Date('2025-05-01'),
            notes: 'Government transport authority - highest compliance standards',
            financialInfo: {
                annualRevenue: 25000000,
                insuranceAmount: 50000000,
                bondAmount: 10000000
            },
            operationalInfo: {
                yearsInOperation: 25,
                averageFleetAge: 8,
                maintenanceSchedule: 'monthly',
                safetyRating: 4.8
            },
            isActive: true
        },
        {
            companyName: 'South Western Transport',
            registrationNumber: 'SWT-2024-002',
            contactPerson: 'Managing Director',
            email: 'operations@swt.lk',
            phone: '+94912234567',
            address: 'Southern Express Building, Galle',
            status: 'approved',
            applicationDate: new Date('2024-01-10'),
            approvalDate: new Date('2024-01-25'),
            totalVehicles: 75,
            activeVehicles: 68,
            operatingRoutes: ['ROUTE_COL_GAL'],
            documents: {
                businessLicense: true,
                insuranceCertificate: true,
                vehicleRegistrations: true,
                driverLicenses: true,
                uploadedFiles: ['swt_license.pdf', 'insurance_2024.pdf']
            },
            complianceScore: 88,
            lastInspection: new Date('2024-10-15'),
            nextInspectionDue: new Date('2025-04-15'),
            notes: 'Excellent highway service provider',
            financialInfo: {
                annualRevenue: 12000000,
                insuranceAmount: 25000000,
                bondAmount: 5000000
            },
            operationalInfo: {
                yearsInOperation: 15,
                averageFleetAge: 6,
                maintenanceSchedule: 'weekly',
                safetyRating: 4.5
            },
            isActive: true
        },
        {
            companyName: 'Hill Country Transport',
            registrationNumber: 'HCT-2024-003',
            contactPerson: 'Operations Manager',
            email: 'contact@hillcountry.lk',
            phone: '+94812234567',
            address: 'Mountain View Center, Kandy',
            status: 'approved',
            applicationDate: new Date('2024-02-01'),
            approvalDate: new Date('2024-02-20'),
            totalVehicles: 45,
            activeVehicles: 40,
            operatingRoutes: ['ROUTE_KDY_COL'],
            documents: {
                businessLicense: true,
                insuranceCertificate: true,
                vehicleRegistrations: true,
                driverLicenses: true,
                uploadedFiles: ['hct_docs.pdf']
            },
            complianceScore: 82,
            lastInspection: new Date('2024-09-30'),
            nextInspectionDue: new Date('2025-03-30'),
            notes: 'Specialized in hill country routes',
            financialInfo: {
                annualRevenue: 8000000,
                insuranceAmount: 15000000,
                bondAmount: 3000000
            },
            operationalInfo: {
                yearsInOperation: 12,
                averageFleetAge: 7,
                maintenanceSchedule: 'weekly',
                safetyRating: 4.3
            },
            isActive: true
        },
        {
            companyName: 'Coastal Express',
            registrationNumber: 'CEX-2024-004',
            contactPerson: 'Fleet Manager',
            email: 'fleet@coastalexpress.lk',
            phone: '+94912345678',
            address: 'Coastal Highway Terminal, Galle',
            status: 'approved',
            applicationDate: new Date('2024-02-15'),
            approvalDate: new Date('2024-03-05'),
            totalVehicles: 35,
            activeVehicles: 32,
            operatingRoutes: ['ROUTE_GAL_COL'],
            documents: {
                businessLicense: true,
                insuranceCertificate: true,
                vehicleRegistrations: true,
                driverLicenses: true,
                uploadedFiles: ['coastal_license.pdf', 'fleet_insurance.pdf']
            },
            complianceScore: 86,
            lastInspection: new Date('2024-11-10'),
            nextInspectionDue: new Date('2025-05-10'),
            notes: 'Premium coastal route service',
            financialInfo: {
                annualRevenue: 6500000,
                insuranceAmount: 12000000,
                bondAmount: 2500000
            },
            operationalInfo: {
                yearsInOperation: 8,
                averageFleetAge: 5,
                maintenanceSchedule: 'weekly',
                safetyRating: 4.4
            },
            isActive: true
        }
    ];
    await Fleet_1.default.deleteMany({});
    for (const fleetData of fleets) {
        const fleet = new Fleet_1.default(fleetData);
        await fleet.save();
        console.log(`✅ Fleet created: ${fleet.companyName}`);
    }
    console.log(`🚛 Created ${fleets.length} fleet companies successfully`);
};
const clearLocationTracking = async () => {
    console.log('🧹 Clearing existing location tracking data...');
    await LocationTracking_1.default.deleteMany({});
    console.log('✅ Location tracking data cleared');
};
const runSeed = async () => {
    try {
        console.log('🌱 Starting GPS Simulation Database Seeding...');
        await connectDB();
        await clearLocationTracking();
        await seedRoutes();
        await seedDevices();
        await seedFleets();
        console.log('🎉 GPS Simulation database seeding completed successfully!');
        console.log('');
        console.log('📋 Summary:');
        console.log('  • 5 realistic Sri Lankan routes created');
        console.log('  • 5 GPS-enabled vehicles configured');
        console.log('  • 4 transport companies registered');
        console.log('  • Location tracking data cleared');
        console.log('');
        console.log('🚀 Ready for GPS simulation!');
        console.log('   Run: npm run start:simulation');
        mongoose_1.default.connection.close();
    }
    catch (error) {
        console.error('❌ Seeding failed:', error);
        mongoose_1.default.connection.close();
        process.exit(1);
    }
};
// Run if called directly
if (require.main === module) {
    runSeed();
}
exports.default = runSeed;
