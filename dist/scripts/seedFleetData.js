"use strict";
// src/scripts/seedFleetData.ts - CORRECTED VERSION
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
const Fleet_1 = __importDefault(require("../models/Fleet"));
const db_1 = __importDefault(require("../config/db"));
dotenv_1.default.config();
const seedFleetData = async () => {
    try {
        // Connect to database
        await (0, db_1.default)();
        console.log('✅ Successfully connected to MongoDB');
        // Clear existing fleet data
        await Fleet_1.default.deleteMany({});
        console.log('✅ Cleared existing fleet data');
        // Sample fleet data with corrected phone numbers
        const fleetData = [
            {
                companyName: 'Colombo Express Transport',
                registrationNumber: 'REG-2024-001',
                contactPerson: 'Samantha Perera',
                email: 'samantha@colomboexpress.lk',
                phone: '+94112345678', // Corrected
                address: 'No. 123, Galle Road, Colombo 03',
                status: 'pending',
                applicationDate: new Date('2025-01-15T09:30:00Z'),
                totalVehicles: 25,
                activeVehicles: 0,
                operatingRoutes: ['Colombo - Kandy', 'Colombo - Galle'],
                documents: {
                    businessLicense: true,
                    insuranceCertificate: true,
                    vehicleRegistrations: false,
                    driverLicenses: true
                },
                complianceScore: 85,
                notes: 'Strong application, missing some vehicle registrations',
                financialInfo: {
                    annualRevenue: 50000000,
                    insuranceAmount: 10000000,
                    bondAmount: 5000000
                },
                operationalInfo: {
                    yearsInOperation: 8,
                    averageFleetAge: 5,
                    maintenanceSchedule: 'monthly',
                    safetyRating: 4
                }
            },
            {
                companyName: 'Southern Transport Co.',
                registrationNumber: 'REG-2024-002',
                contactPerson: 'Kamal Silva',
                email: 'kamal@southerntrans.lk',
                phone: '+94912345678', // Corrected
                address: 'No. 45, Main Street, Matara',
                status: 'approved',
                applicationDate: new Date('2025-01-10T14:20:00Z'),
                approvalDate: new Date('2025-01-12T10:15:00Z'),
                totalVehicles: 18,
                activeVehicles: 16,
                operatingRoutes: ['Matara - Colombo', 'Matara - Tangalle'],
                documents: {
                    businessLicense: true,
                    insuranceCertificate: true,
                    vehicleRegistrations: true,
                    driverLicenses: true
                },
                complianceScore: 95,
                lastInspection: new Date('2025-01-14T11:00:00Z'),
                nextInspectionDue: new Date('2026-01-14T11:00:00Z'),
                financialInfo: {
                    annualRevenue: 35000000,
                    insuranceAmount: 8000000,
                    bondAmount: 4000000
                },
                operationalInfo: {
                    yearsInOperation: 12,
                    averageFleetAge: 3,
                    maintenanceSchedule: 'weekly',
                    safetyRating: 5
                }
            },
            {
                companyName: 'Hill Country Buses',
                registrationNumber: 'REG-2024-003',
                contactPerson: 'Priya Wickramasinghe',
                email: 'priya@hillcountry.lk',
                phone: '+94812345678', // Corrected
                address: 'No. 67, Temple Road, Kandy',
                status: 'rejected',
                applicationDate: new Date('2025-01-08T16:45:00Z'),
                rejectionDate: new Date('2025-01-09T14:30:00Z'),
                totalVehicles: 12,
                activeVehicles: 0,
                operatingRoutes: ['Kandy - Nuwara Eliya'],
                documents: {
                    businessLicense: false,
                    insuranceCertificate: true,
                    vehicleRegistrations: true,
                    driverLicenses: false
                },
                complianceScore: 45,
                rejectionReason: 'Incomplete documentation - missing business license and driver licenses. Safety concerns identified during preliminary review.',
                financialInfo: {
                    annualRevenue: 15000000,
                    insuranceAmount: 3000000,
                    bondAmount: 1500000
                },
                operationalInfo: {
                    yearsInOperation: 3,
                    averageFleetAge: 8,
                    maintenanceSchedule: 'quarterly',
                    safetyRating: 2
                }
            },
            {
                companyName: 'Northern Express Lines',
                registrationNumber: 'REG-2024-004',
                contactPerson: 'Rajesh Kumar',
                email: 'rajesh@northernexpress.lk',
                phone: '+94212345678', // Corrected
                address: 'No. 89, Hospital Road, Jaffna',
                status: 'pending',
                applicationDate: new Date('2025-01-16T08:15:00Z'),
                totalVehicles: 30,
                activeVehicles: 0,
                operatingRoutes: ['Jaffna - Colombo', 'Jaffna - Vavuniya'],
                documents: {
                    businessLicense: true,
                    insuranceCertificate: false,
                    vehicleRegistrations: true,
                    driverLicenses: true
                },
                complianceScore: 75,
                notes: 'Good operational history, pending insurance certificate verification',
                financialInfo: {
                    annualRevenue: 75000000,
                    insuranceAmount: 15000000,
                    bondAmount: 7500000
                },
                operationalInfo: {
                    yearsInOperation: 15,
                    averageFleetAge: 4,
                    maintenanceSchedule: 'monthly',
                    safetyRating: 4
                }
            },
            {
                companyName: 'Eastern Route Transport',
                registrationNumber: 'REG-2024-005',
                contactPerson: 'Nuwan Fernando',
                email: 'nuwan@easternroute.lk',
                phone: '+94652345678', // Corrected
                address: 'No. 156, Clock Tower Road, Batticaloa',
                status: 'approved',
                applicationDate: new Date('2025-01-05T11:45:00Z'),
                approvalDate: new Date('2025-01-07T16:20:00Z'),
                totalVehicles: 22,
                activeVehicles: 20,
                operatingRoutes: ['Batticaloa - Colombo', 'Batticaloa - Trincomalee'],
                documents: {
                    businessLicense: true,
                    insuranceCertificate: true,
                    vehicleRegistrations: true,
                    driverLicenses: true
                },
                complianceScore: 92,
                lastInspection: new Date('2025-01-16T09:30:00Z'),
                nextInspectionDue: new Date('2026-01-16T09:30:00Z'),
                financialInfo: {
                    annualRevenue: 45000000,
                    insuranceAmount: 9000000,
                    bondAmount: 4500000
                },
                operationalInfo: {
                    yearsInOperation: 10,
                    averageFleetAge: 4,
                    maintenanceSchedule: 'monthly',
                    safetyRating: 4
                }
            },
            {
                companyName: 'Central Province Bus Service',
                registrationNumber: 'REG-2024-006',
                contactPerson: 'Malika Rathnayake',
                email: 'malika@centralbus.lk',
                phone: '+94813456789', // Corrected
                address: 'No. 234, Peradeniya Road, Kandy',
                status: 'suspended',
                applicationDate: new Date('2024-12-20T10:30:00Z'),
                approvalDate: new Date('2024-12-25T14:15:00Z'),
                suspensionDate: new Date('2025-01-10T09:00:00Z'),
                totalVehicles: 15,
                activeVehicles: 0,
                operatingRoutes: ['Kandy - Peradeniya', 'Kandy - Matale'],
                documents: {
                    businessLicense: true,
                    insuranceCertificate: true,
                    vehicleRegistrations: true,
                    driverLicenses: true
                },
                complianceScore: 60,
                notes: 'Suspended due to multiple safety violations and passenger complaints',
                financialInfo: {
                    annualRevenue: 20000000,
                    insuranceAmount: 4000000,
                    bondAmount: 2000000
                },
                operationalInfo: {
                    yearsInOperation: 6,
                    averageFleetAge: 7,
                    maintenanceSchedule: 'quarterly',
                    safetyRating: 2
                }
            },
            {
                companyName: 'Metro City Transport',
                registrationNumber: 'REG-2024-007',
                contactPerson: 'Lakshitha Jayawardena',
                email: 'lakshitha@metrocity.lk',
                phone: '+94119876543', // Corrected
                address: 'No. 78, Union Place, Colombo 02',
                status: 'pending',
                applicationDate: new Date('2025-01-17T15:20:00Z'),
                totalVehicles: 40,
                activeVehicles: 0,
                operatingRoutes: ['Colombo - Negombo', 'Colombo - Kalutara'],
                documents: {
                    businessLicense: true,
                    insuranceCertificate: true,
                    vehicleRegistrations: true,
                    driverLicenses: false
                },
                complianceScore: 80,
                notes: 'Large fleet application, pending driver license verification',
                financialInfo: {
                    annualRevenue: 100000000,
                    insuranceAmount: 20000000,
                    bondAmount: 10000000
                },
                operationalInfo: {
                    yearsInOperation: 5,
                    averageFleetAge: 2,
                    maintenanceSchedule: 'weekly',
                    safetyRating: 4
                }
            },
            {
                companyName: 'Uva Province Express',
                registrationNumber: 'REG-2024-008',
                contactPerson: 'Chaminda Perera',
                email: 'chaminda@uvaexpress.lk',
                phone: '+94552345678', // Corrected
                address: 'No. 45, Badulla Road, Monaragala',
                status: 'approved',
                applicationDate: new Date('2025-01-02T08:00:00Z'),
                approvalDate: new Date('2025-01-04T12:30:00Z'),
                totalVehicles: 28,
                activeVehicles: 25,
                operatingRoutes: ['Monaragala - Colombo', 'Badulla - Kandy'],
                documents: {
                    businessLicense: true,
                    insuranceCertificate: true,
                    vehicleRegistrations: true,
                    driverLicenses: true
                },
                complianceScore: 88,
                lastInspection: new Date('2025-01-15T13:45:00Z'),
                nextInspectionDue: new Date('2026-01-15T13:45:00Z'),
                financialInfo: {
                    annualRevenue: 60000000,
                    insuranceAmount: 12000000,
                    bondAmount: 6000000
                },
                operationalInfo: {
                    yearsInOperation: 7,
                    averageFleetAge: 5,
                    maintenanceSchedule: 'monthly',
                    safetyRating: 4
                }
            }
        ];
        // Insert fleet data
        const createdFleets = await Fleet_1.default.insertMany(fleetData);
        console.log(`✅ Created ${createdFleets.length} fleet records`);
        // Display summary
        const stats = await Fleet_1.default.aggregate([
            {
                $group: {
                    _id: '$status',
                    count: { $sum: 1 }
                }
            }
        ]);
        console.log('\n📊 Fleet Data Summary:');
        stats.forEach(stat => {
            console.log(`   ${stat._id}: ${stat.count} fleets`);
        });
        console.log('\n🎉 Fleet seed data created successfully!');
        process.exit(0);
    }
    catch (error) {
        console.error('❌ Error seeding fleet data:', error);
        process.exit(1);
    }
};
// Run the seed function if this file is executed directly
if (require.main === module) {
    seedFleetData();
}
exports.default = seedFleetData;
