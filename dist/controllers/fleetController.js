"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getFleetAnalytics = exports.deleteVehicle = exports.getVehicleDetails = exports.updateVehicle = exports.addVehicle = exports.getFleetVehicles = exports.markNotificationRead = exports.getFleetNotifications = exports.updateFleetSettings = exports.getFleetSettings = exports.updateFleetProfile = exports.getFleetProfile = exports.getFleetDashboard = void 0;
const Fleet_1 = __importDefault(require("../models/Fleet"));
const Device_1 = __importDefault(require("../models/Device")); // Standardized on Device model
// @desc    Get fleet dashboard data for logged-in fleet manager
// @route   GET /api/fleet/dashboard
// @access  Private (Fleet Manager)
const getFleetDashboard = async (req, res) => {
    var _a, _b, _c;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id;
        // Find fleet by email (assuming fleet manager email matches fleet email)
        const fleet = await Fleet_1.default.findOne({
            email: (_b = req.user) === null || _b === void 0 ? void 0 : _b.email,
            isActive: true
        });
        // Get fleet vehicles
        const vehicles = await Device_1.default.find({
            'assignedTo.userId': userId,
            isActive: true
        }).limit(10);
        // Calculate real-time statistics
        const fleetStats = fleet ? {
            fleetStatus: fleet.status,
            complianceScore: fleet.complianceScore || 0,
            totalVehicles: vehicles.length,
            activeVehicles: vehicles.filter(v => v.status === 'online').length,
            operatingRoutes: 0, // Will be calculated from route assignments
            onlineVehicles: vehicles.filter(v => v.status === 'online').length,
            maintenanceVehicles: vehicles.filter(v => v.status === 'maintenance').length
        } : {
            fleetStatus: 'pending',
            complianceScore: 0,
            totalVehicles: vehicles.length,
            activeVehicles: vehicles.filter(v => v.status === 'online').length,
            operatingRoutes: 0,
            onlineVehicles: vehicles.filter(v => v.status === 'online').length,
            maintenanceVehicles: vehicles.filter(v => v.status === 'maintenance').length
        };
        // Update fleet vehicle count if it exists and is different
        if (fleet && fleet.totalVehicles !== vehicles.length) {
            fleet.totalVehicles = vehicles.length;
            fleet.activeVehicles = vehicles.filter(v => v.status === 'online').length;
            await fleet.save();
        }
        res.json({
            fleet: fleet ? {
                _id: fleet._id,
                companyName: fleet.companyName || 'Fleet Company',
                status: fleet.status,
                complianceScore: fleet.complianceScore || 0,
                totalVehicles: vehicles.length,
                activeVehicles: vehicles.filter(v => v.status === 'online').length
            } : {
                _id: 'no-fleet',
                companyName: `${((_c = req.user) === null || _c === void 0 ? void 0 : _c.name) || 'Fleet Manager'}'s Fleet`,
                status: 'pending',
                complianceScore: 0,
                totalVehicles: vehicles.length,
                activeVehicles: vehicles.filter(v => v.status === 'online').length
            },
            stats: fleetStats,
            vehicles: vehicles.slice(0, 5), // Latest 5 vehicles
            alerts: [] // Real alerts can be implemented later
        });
    }
    catch (error) {
        console.error('Fleet dashboard error:', error);
        res.status(500).json({
            message: 'Server error',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
exports.getFleetDashboard = getFleetDashboard;
// @desc    Get fleet profile
// @route   GET /api/fleet/profile
// @access  Private (Fleet Manager)
const getFleetProfile = async (req, res) => {
    var _a, _b, _c, _d;
    try {
        console.log('🔍 Fleet profile - User:', (_a = req.user) === null || _a === void 0 ? void 0 : _a.email, 'Role:', (_b = req.user) === null || _b === void 0 ? void 0 : _b.role);
        const fleet = await Fleet_1.default.findOne({
            email: (_c = req.user) === null || _c === void 0 ? void 0 : _c.email,
            isActive: true
        });
        if (!fleet) {
            console.log('❌ Fleet profile - No fleet found for user:', (_d = req.user) === null || _d === void 0 ? void 0 : _d.email);
            res.status(404).json({
                message: 'No fleet profile found. Please contact admin to set up your fleet profile.',
                fleet: null
            });
            return;
        }
        console.log('✅ Fleet profile - Found fleet:', fleet.companyName);
        res.json({ fleet });
    }
    catch (error) {
        console.error('Get fleet profile error:', error);
        res.status(500).json({
            message: 'Server error',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
exports.getFleetProfile = getFleetProfile;
// @desc    Update fleet profile
// @route   PUT /api/fleet/profile
// @access  Private (Fleet Manager)
const updateFleetProfile = async (req, res) => {
    var _a, _b, _c;
    try {
        console.log('🔍 Fleet profile update - User:', (_a = req.user) === null || _a === void 0 ? void 0 : _a.email);
        const { companyName, registrationNumber, contactPerson, phone, address, operatingRoutes, operationalInfo } = req.body;
        let fleet = await Fleet_1.default.findOne({
            email: (_b = req.user) === null || _b === void 0 ? void 0 : _b.email,
            isActive: true
        });
        if (!fleet) {
            console.log('🔍 Fleet profile update - No fleet found, creating new one');
            // Create new fleet if it doesn't exist
            if (!companyName || !registrationNumber || !contactPerson) {
                res.status(400).json({
                    message: 'Company name, registration number, and contact person are required for new fleet registration'
                });
                return;
            }
            // Check if registration number already exists
            const existingFleet = await Fleet_1.default.findOne({
                registrationNumber: registrationNumber.trim(),
                isActive: true
            });
            if (existingFleet) {
                res.status(400).json({
                    message: 'Registration number already exists'
                });
                return;
            }
            // Create new fleet
            const fleetData = {
                companyName: companyName.trim(),
                registrationNumber: registrationNumber.trim(),
                contactPerson: contactPerson.trim(),
                email: ((_c = req.user) === null || _c === void 0 ? void 0 : _c.email) || '',
                phone: phone || '',
                address: address || '',
                operatingRoutes: operatingRoutes || [],
                operationalInfo: operationalInfo || {},
                status: 'pending', // New fleets start as pending
                complianceScore: 0,
                totalVehicles: 0,
                activeVehicles: 0,
                applicationDate: new Date(),
                documents: {
                    businessLicense: false,
                    insuranceCertificate: false,
                    vehicleRegistrations: false,
                    driverLicenses: false
                },
                isActive: true
            };
            fleet = await Fleet_1.default.create(fleetData);
            console.log('✅ Fleet profile update - Created new fleet:', fleet.companyName);
            res.status(201).json({
                message: 'Fleet profile created successfully',
                fleet
            });
            return;
        }
        // Update existing fleet - only allow certain fields to be updated
        console.log('🔍 Fleet profile update - Updating existing fleet:', fleet.companyName);
        if (companyName)
            fleet.companyName = companyName.trim();
        if (contactPerson)
            fleet.contactPerson = contactPerson.trim();
        if (phone)
            fleet.phone = phone;
        if (address)
            fleet.address = address;
        if (operatingRoutes)
            fleet.operatingRoutes = operatingRoutes;
        if (operationalInfo) {
            fleet.operationalInfo = { ...fleet.operationalInfo, ...operationalInfo };
        }
        // Check if registration number is being changed and already exists
        if (registrationNumber && registrationNumber.trim() !== fleet.registrationNumber) {
            const existingFleet = await Fleet_1.default.findOne({
                registrationNumber: registrationNumber.trim(),
                _id: { $ne: fleet._id },
                isActive: true
            });
            if (existingFleet) {
                res.status(400).json({
                    message: 'Registration number already in use by another fleet'
                });
                return;
            }
            fleet.registrationNumber = registrationNumber.trim();
        }
        await fleet.save();
        console.log('✅ Fleet profile update - Updated successfully');
        res.json({
            message: 'Fleet profile updated successfully',
            fleet
        });
    }
    catch (error) {
        console.error('Update fleet profile error:', error);
        // Handle validation errors
        if (error && typeof error === 'object' && 'name' in error && error.name === 'ValidationError') {
            const validationErrors = Object.values(error.errors).map((err) => err.message);
            res.status(400).json({
                message: 'Validation error',
                errors: validationErrors
            });
            return;
        }
        // Handle duplicate key errors
        if (error && typeof error === 'object' && 'code' in error && error.code === 11000) {
            res.status(400).json({
                message: 'Registration number already exists'
            });
            return;
        }
        res.status(500).json({
            message: 'Server error',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
exports.updateFleetProfile = updateFleetProfile;
// @desc    Get fleet settings
// @route   GET /api/fleet/settings
// @access  Private (Fleet Manager)
const getFleetSettings = async (req, res) => {
    var _a;
    try {
        const fleet = await Fleet_1.default.findOne({
            email: (_a = req.user) === null || _a === void 0 ? void 0 : _a.email,
            isActive: true
        });
        if (!fleet) {
            res.status(404).json({ message: 'Fleet not found' });
            return;
        }
        // Return fleet settings
        const settings = {
            notifications: {
                emailAlerts: true,
                smsAlerts: false,
                emergencyAlerts: true,
                maintenanceReminders: true,
                routeUpdates: true
            },
            privacy: {
                shareLocation: true,
                sharePerformanceData: false,
                allowAnalytics: true
            },
            operational: {
                autoAcceptBookings: false,
                emergencyContactNumber: fleet.phone || '',
                operatingHours: {
                    start: '06:00',
                    end: '22:00'
                },
                maintenanceSchedule: 'weekly'
            },
            billing: {
                paymentMethod: 'bank_transfer',
                invoiceFrequency: 'monthly',
                autoPayEnabled: false
            }
        };
        res.json({ settings });
    }
    catch (error) {
        console.error('Get fleet settings error:', error);
        res.status(500).json({
            message: 'Server error',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
exports.getFleetSettings = getFleetSettings;
// @desc    Update fleet settings
// @route   PUT /api/fleet/settings
// @access  Private (Fleet Manager)
const updateFleetSettings = async (req, res) => {
    var _a, _b, _c, _d, _e;
    try {
        const { notifications, privacy, operational, billing } = req.body;
        const fleet = await Fleet_1.default.findOne({
            email: (_a = req.user) === null || _a === void 0 ? void 0 : _a.email,
            isActive: true
        });
        if (!fleet) {
            res.status(404).json({ message: 'Fleet not found' });
            return;
        }
        // Update settings (store in operationalInfo or create a dedicated settings field)
        if (!fleet.operationalInfo) {
            fleet.operationalInfo = {
                yearsInOperation: 0,
                averageFleetAge: 0,
                maintenanceSchedule: 'monthly'
            };
        }
        if (notifications)
            fleet.operationalInfo.notifications = notifications;
        if (privacy)
            fleet.operationalInfo.privacy = privacy;
        if (operational)
            fleet.operationalInfo.operational = operational;
        if (billing)
            fleet.operationalInfo.billing = billing;
        await fleet.save();
        res.json({
            message: 'Fleet settings updated successfully',
            settings: {
                notifications: ((_b = fleet.operationalInfo) === null || _b === void 0 ? void 0 : _b.notifications) || {},
                privacy: ((_c = fleet.operationalInfo) === null || _c === void 0 ? void 0 : _c.privacy) || {},
                operational: ((_d = fleet.operationalInfo) === null || _d === void 0 ? void 0 : _d.operational) || {},
                billing: ((_e = fleet.operationalInfo) === null || _e === void 0 ? void 0 : _e.billing) || {}
            }
        });
    }
    catch (error) {
        console.error('Update fleet settings error:', error);
        res.status(500).json({
            message: 'Server error',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
exports.updateFleetSettings = updateFleetSettings;
// @desc    Get fleet notifications
// @route   GET /api/fleet/notifications
// @access  Private (Fleet Manager)
const getFleetNotifications = async (req, res) => {
    try {
        const { unreadOnly = false, limit = 50 } = req.query;
        // Mock notifications - in production, you'd have a Notification model
        const notifications = [
            {
                _id: '1',
                type: 'vehicle_approved',
                title: 'Vehicle Application Approved',
                message: 'Your vehicle BUS-001 has been approved by admin',
                read: false,
                createdAt: new Date(Date.now() - 3600000), // 1 hour ago
                priority: 'high',
                category: 'vehicle'
            },
            {
                _id: '2',
                type: 'vehicle_maintenance',
                title: 'Vehicle Maintenance Due',
                message: 'Vehicle BUS-001 is due for scheduled maintenance',
                read: unreadOnly ? false : true,
                createdAt: new Date(Date.now() - 86400000), // 1 day ago
                priority: 'medium',
                category: 'vehicle'
            },
            {
                _id: '3',
                type: 'system_update',
                title: 'System Update Available',
                message: 'New features are available in the fleet management system',
                read: unreadOnly ? false : true,
                createdAt: new Date(Date.now() - 172800000), // 2 days ago
                priority: 'low',
                category: 'system'
            }
        ];
        const filteredNotifications = unreadOnly === 'true'
            ? notifications.filter(n => !n.read)
            : notifications;
        const limitedNotifications = filteredNotifications.slice(0, parseInt(limit));
        const stats = {
            total: notifications.length,
            unread: notifications.filter(n => !n.read).length,
            high: notifications.filter(n => n.priority === 'high').length,
            medium: notifications.filter(n => n.priority === 'medium').length,
            low: notifications.filter(n => n.priority === 'low').length
        };
        res.json({
            notifications: limitedNotifications,
            stats
        });
    }
    catch (error) {
        console.error('Get fleet notifications error:', error);
        res.status(500).json({
            message: 'Server error',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
exports.getFleetNotifications = getFleetNotifications;
// @desc    Mark notification as read
// @route   PUT /api/fleet/notifications/:id/read
// @access  Private (Fleet Manager)
const markNotificationRead = async (req, res) => {
    try {
        const { id } = req.params;
        // In production, you'd update the actual notification in database
        // For now, just return success
        res.json({
            message: 'Notification marked as read',
            notificationId: id,
            readAt: new Date()
        });
    }
    catch (error) {
        console.error('Mark notification read error:', error);
        res.status(500).json({
            message: 'Server error',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
exports.markNotificationRead = markNotificationRead;
// @desc    Get fleet vehicles
// @route   GET /api/fleet/vehicles
// @access  Private (Fleet Manager)
const getFleetVehicles = async (req, res) => {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id;
        // Find all vehicles assigned to this fleet manager
        const vehicles = await Device_1.default.find({
            'assignedTo.userId': userId,
            isActive: true
        }).sort({ createdAt: -1 }); // Sort by newest first
        // Calculate real-time statistics
        const stats = {
            total: vehicles.length,
            online: vehicles.filter(v => v.status === 'online').length,
            offline: vehicles.filter(v => v.status === 'offline').length,
            maintenance: vehicles.filter(v => v.status === 'maintenance').length
        };
        res.json({ vehicles, stats });
    }
    catch (error) {
        console.error('Get fleet vehicles error:', error);
        res.status(500).json({
            message: 'Server error',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
exports.getFleetVehicles = getFleetVehicles;
// @desc    Add new vehicle
// @route   POST /api/fleet/vehicles
// @access  Private (Fleet Manager)
const addVehicle = async (req, res) => {
    var _a, _b, _c;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id;
        const { vehicleNumber, vehicleType, firmwareVersion, installDate } = req.body;
        // Validate required fields
        if (!vehicleNumber || !vehicleType) {
            res.status(400).json({ message: 'Vehicle number and type are required' });
            return;
        }
        // Check if vehicle number already exists
        const existingVehicle = await Device_1.default.findOne({
            vehicleNumber: vehicleNumber.trim(),
            isActive: true
        });
        if (existingVehicle) {
            res.status(400).json({ message: 'Vehicle number already exists' });
            return;
        }
        // Find the fleet to ensure the user is authorized and update fleet stats
        const fleet = await Fleet_1.default.findOne({
            email: (_b = req.user) === null || _b === void 0 ? void 0 : _b.email,
            isActive: true
        });
        // Create the vehicle data object
        const vehicleData = {
            deviceId: `DEV_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            vehicleNumber: vehicleNumber.trim(),
            vehicleType: vehicleType.toLowerCase(),
            status: 'offline', // New vehicles start offline until device comes online
            location: {
                latitude: 6.9271, // Default to Colombo coordinates
                longitude: 79.8612,
                address: 'Colombo, Sri Lanka (Initial Location)',
                lastUpdated: new Date()
            },
            batteryLevel: 100, // Default full battery
            signalStrength: 0, // No signal until device comes online
            assignedTo: {
                type: 'company_admin',
                userId: userId,
                name: ((_c = req.user) === null || _c === void 0 ? void 0 : _c.name) || 'Fleet Manager'
            },
            firmwareVersion: firmwareVersion || '1.0.0',
            installDate: installDate ? new Date(installDate) : new Date(),
            alerts: {
                count: 0,
                messages: []
            },
            isActive: true,
            // Set fleet reference if fleet exists
            fleetId: fleet === null || fleet === void 0 ? void 0 : fleet._id
        };
        // Create the vehicle in database
        const vehicle = await Device_1.default.create(vehicleData);
        // Update fleet vehicle count if fleet exists
        if (fleet) {
            fleet.totalVehicles = (fleet.totalVehicles || 0) + 1;
            await fleet.save();
        }
        res.status(201).json({
            message: 'Vehicle added successfully',
            vehicle: {
                _id: vehicle._id,
                deviceId: vehicle.deviceId,
                vehicleNumber: vehicle.vehicleNumber,
                vehicleType: vehicle.vehicleType,
                status: vehicle.status,
                location: vehicle.location,
                batteryLevel: vehicle.batteryLevel,
                signalStrength: vehicle.signalStrength,
                lastSeen: vehicle.lastSeen,
                alerts: vehicle.alerts,
                firmwareVersion: vehicle.firmwareVersion,
                installDate: vehicle.installDate,
                createdAt: vehicle.createdAt
            }
        });
    }
    catch (error) {
        console.error('Add vehicle error:', error);
        // Handle validation errors
        if (error && typeof error === 'object' && 'name' in error && error.name === 'ValidationError') {
            const validationErrors = Object.values(error.errors).map((err) => err.message);
            res.status(400).json({
                message: 'Validation error',
                errors: validationErrors
            });
            return;
        }
        // Handle duplicate key errors
        if (error && typeof error === 'object' && 'code' in error && error.code === 11000) {
            res.status(400).json({
                message: 'Vehicle with this device ID already exists'
            });
            return;
        }
        res.status(500).json({
            message: 'Server error',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
exports.addVehicle = addVehicle;
// @desc    Update vehicle
// @route   PUT /api/fleet/vehicles/:id
// @access  Private (Fleet Manager)
const updateVehicle = async (req, res) => {
    var _a;
    try {
        const { id } = req.params;
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id;
        const { vehicleNumber, vehicleType, firmwareVersion, status } = req.body;
        // Find the vehicle and ensure it belongs to this fleet manager
        const vehicle = await Device_1.default.findOne({
            _id: id,
            'assignedTo.userId': userId,
            isActive: true
        });
        if (!vehicle) {
            res.status(404).json({ message: 'Vehicle not found' });
            return;
        }
        // Check if new vehicle number already exists (if being changed)
        if (vehicleNumber && vehicleNumber !== vehicle.vehicleNumber) {
            const existingVehicle = await Device_1.default.findOne({
                vehicleNumber: vehicleNumber.trim(),
                _id: { $ne: id }, // Exclude current vehicle
                isActive: true
            });
            if (existingVehicle) {
                res.status(400).json({ message: 'Vehicle number already exists' });
                return;
            }
        }
        // Update fields if provided
        if (vehicleNumber)
            vehicle.vehicleNumber = vehicleNumber.trim();
        if (vehicleType)
            vehicle.vehicleType = vehicleType.toLowerCase();
        if (firmwareVersion)
            vehicle.firmwareVersion = firmwareVersion;
        if (status && ['online', 'offline', 'maintenance'].includes(status)) {
            vehicle.status = status;
        }
        const updatedVehicle = await vehicle.save();
        res.json({
            message: 'Vehicle updated successfully',
            vehicle: updatedVehicle
        });
    }
    catch (error) {
        console.error('Update vehicle error:', error);
        // Handle validation errors
        if (error && typeof error === 'object' && 'name' in error && error.name === 'ValidationError') {
            const validationErrors = Object.values(error.errors).map((err) => err.message);
            res.status(400).json({
                message: 'Validation error',
                errors: validationErrors
            });
            return;
        }
        res.status(500).json({
            message: 'Server error',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
exports.updateVehicle = updateVehicle;
// @desc    Get single vehicle details
// @route   GET /api/fleet/vehicles/:id
// @access  Private (Fleet Manager)
const getVehicleDetails = async (req, res) => {
    var _a;
    try {
        const { id } = req.params;
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id;
        const vehicle = await Device_1.default.findOne({
            _id: id,
            'assignedTo.userId': userId,
            isActive: true
        });
        if (!vehicle) {
            res.status(404).json({ message: 'Vehicle not found' });
            return;
        }
        res.json({ vehicle });
    }
    catch (error) {
        console.error('Get vehicle details error:', error);
        res.status(500).json({
            message: 'Server error',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
exports.getVehicleDetails = getVehicleDetails;
// @desc    Delete vehicle
// @route   DELETE /api/fleet/vehicles/:id
// @access  Private (Fleet Manager)
const deleteVehicle = async (req, res) => {
    var _a, _b;
    try {
        const { id } = req.params;
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id;
        // Find the vehicle and ensure it belongs to this fleet manager
        const vehicle = await Device_1.default.findOne({
            _id: id,
            'assignedTo.userId': userId,
            isActive: true
        });
        if (!vehicle) {
            res.status(404).json({ message: 'Vehicle not found' });
            return;
        }
        // Soft delete - set isActive to false instead of removing from database
        vehicle.isActive = false;
        await vehicle.save();
        // Update fleet vehicle count
        const fleet = await Fleet_1.default.findOne({
            email: (_b = req.user) === null || _b === void 0 ? void 0 : _b.email,
            isActive: true
        });
        if (fleet && fleet.totalVehicles > 0) {
            fleet.totalVehicles -= 1;
            await fleet.save();
        }
        res.json({
            message: 'Vehicle deleted successfully'
        });
    }
    catch (error) {
        console.error('Delete vehicle error:', error);
        res.status(500).json({
            message: 'Server error',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
exports.deleteVehicle = deleteVehicle;
// @desc    Get fleet analytics
// @route   GET /api/fleet/analytics
// @access  Private (Fleet Manager)
const getFleetAnalytics = async (req, res) => {
    var _a, _b;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id;
        const fleet = await Fleet_1.default.findOne({
            email: (_b = req.user) === null || _b === void 0 ? void 0 : _b.email,
            isActive: true
        });
        if (!fleet) {
            res.status(404).json({ message: 'Fleet not found' });
            return;
        }
        // Get vehicles
        const vehicles = await Device_1.default.find({
            'assignedTo.userId': userId,
            isActive: true
        });
        const analytics = {
            fleet: {
                complianceScore: fleet.complianceScore,
                totalVehicles: fleet.totalVehicles,
                activeVehicles: fleet.activeVehicles,
                operatingRoutes: fleet.operatingRoutes.length
            },
            vehicles: {
                total: vehicles.length,
                online: vehicles.filter(v => v.status === 'online').length,
                offline: vehicles.filter(v => v.status === 'offline').length,
                maintenance: vehicles.filter(v => v.status === 'maintenance').length,
                avgBattery: vehicles.reduce((sum, v) => sum + v.batteryLevel, 0) / vehicles.length || 0,
                avgSignal: vehicles.reduce((sum, v) => sum + v.signalStrength, 0) / vehicles.length || 0
            },
            performance: {
                utilizationRate: fleet.activeVehicles / fleet.totalVehicles * 100 || 0,
                complianceStatus: fleet.complianceScore >= 70 ? 'good' : 'needs_improvement',
                fleetStatus: fleet.status
            }
        };
        res.json(analytics);
    }
    catch (error) {
        console.error('Get fleet analytics error:', error);
        res.status(500).json({
            message: 'Server error',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
exports.getFleetAnalytics = getFleetAnalytics;
