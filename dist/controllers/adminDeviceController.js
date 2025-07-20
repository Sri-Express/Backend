"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDeviceStats = exports.clearDeviceAlerts = exports.addDeviceAlert = exports.updateDeviceLocation = exports.deleteDevice = exports.updateDevice = exports.createDevice = exports.getDeviceById = exports.getAllDevices = void 0;
const Device_1 = __importDefault(require("../models/Device"));
const User_1 = __importDefault(require("../models/User"));
// @desc    Get all devices with pagination and filtering
// @route   GET /api/admin/devices
// @access  Private (System Admin)
const getAllDevices = async (req, res) => {
    try {
        const { page = 1, limit = 10, search = '', status = 'all', vehicleType = 'all', assignedTo = 'all', sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
        // Build query
        const query = {};
        // Search functionality
        if (search) {
            query.$or = [
                { deviceId: { $regex: search, $options: 'i' } },
                { vehicleNumber: { $regex: search, $options: 'i' } },
                { 'assignedTo.name': { $regex: search, $options: 'i' } }
            ];
        }
        // Filter functionality
        if (status !== 'all')
            query.status = status;
        if (vehicleType !== 'all')
            query.vehicleType = vehicleType;
        if (assignedTo !== 'all')
            query['assignedTo.type'] = assignedTo;
        // Only show active devices by default
        query.isActive = true;
        // Calculate pagination
        const pageNumber = parseInt(page, 10);
        const pageSize = parseInt(limit, 10);
        const skip = (pageNumber - 1) * pageSize;
        // Build sort object
        const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };
        // Get devices with pagination
        const devices = await Device_1.default.find(query)
            .sort(sort)
            .skip(skip)
            .limit(pageSize)
            .populate('assignedTo.userId', 'name email');
        // Get total count for pagination
        const totalDevices = await Device_1.default.countDocuments(query);
        // Get device statistics
        const deviceStats = {
            totalDevices,
            onlineDevices: await Device_1.default.countDocuments({ status: 'online', isActive: true }),
            offlineDevices: await Device_1.default.countDocuments({ status: 'offline', isActive: true }),
            maintenanceDevices: await Device_1.default.countDocuments({ status: 'maintenance', isActive: true }),
            alertsCount: await Device_1.default.aggregate([
                { $match: { isActive: true } },
                { $group: { _id: null, totalAlerts: { $sum: '$alerts.count' } } }
            ]).then(result => { var _a; return ((_a = result[0]) === null || _a === void 0 ? void 0 : _a.totalAlerts) || 0; })
        };
        res.json({
            devices,
            pagination: {
                currentPage: pageNumber,
                totalPages: Math.ceil(totalDevices / pageSize),
                totalDevices,
                hasNext: pageNumber < Math.ceil(totalDevices / pageSize),
                hasPrev: pageNumber > 1
            },
            stats: deviceStats
        });
    }
    catch (error) {
        console.error('Get all devices error:', error);
        res.status(500).json({
            message: 'Server error',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
exports.getAllDevices = getAllDevices;
// @desc    Get device by ID
// @route   GET /api/admin/devices/:id
// @access  Private (System Admin)
const getDeviceById = async (req, res) => {
    try {
        const { id } = req.params;
        const device = await Device_1.default.findById(id).populate('assignedTo.userId', 'name email');
        if (!device) {
            res.status(404).json({ message: 'Device not found' });
            return;
        }
        res.json(device);
    }
    catch (error) {
        console.error('Get device by ID error:', error);
        res.status(500).json({
            message: 'Server error',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
exports.getDeviceById = getDeviceById;
// @desc    Create new device
// @route   POST /api/admin/devices
// @access  Private (System Admin)
const createDevice = async (req, res) => {
    var _a;
    try {
        const { deviceId, vehicleNumber, vehicleType, assignedTo, firmwareVersion, installDate, location, route } = req.body;
        // Validate required fields
        if (!deviceId || !vehicleNumber || !vehicleType || !assignedTo || !firmwareVersion || !installDate) {
            res.status(400).json({ message: 'All required fields must be provided' });
            return;
        }
        // Check if device already exists
        const existingDevice = await Device_1.default.findOne({ deviceId });
        if (existingDevice) {
            res.status(400).json({ message: 'Device with this ID already exists' });
            return;
        }
        // Clean up assignedTo data
        const cleanAssignedTo = {
            type: assignedTo.type,
            name: assignedTo.name || (assignedTo.type === 'system' ? 'System Control' : 'Unknown')
        };
        // Only add userId if not system and userId is provided
        if (assignedTo.type !== 'system' && assignedTo.userId) {
            const user = await User_1.default.findById(assignedTo.userId);
            if (!user) {
                res.status(400).json({ message: 'Assigned user not found' });
                return;
            }
            cleanAssignedTo.userId = assignedTo.userId;
            cleanAssignedTo.name = user.name;
        }
        // Clean up location data
        const cleanLocation = {
            latitude: (location === null || location === void 0 ? void 0 : location.latitude) || 6.9271, // Default to Colombo
            longitude: (location === null || location === void 0 ? void 0 : location.longitude) || 79.8612,
            address: ((_a = location === null || location === void 0 ? void 0 : location.address) === null || _a === void 0 ? void 0 : _a.trim()) || 'Address not provided',
            lastUpdated: new Date()
        };
        // Prepare device data
        const deviceData = {
            deviceId: deviceId.trim(),
            vehicleNumber: vehicleNumber.trim(),
            vehicleType,
            assignedTo: cleanAssignedTo,
            firmwareVersion: firmwareVersion.trim(),
            installDate,
            location: cleanLocation,
            status: 'offline',
            batteryLevel: 100,
            signalStrength: 0,
            lastSeen: new Date(),
            alerts: {
                count: 0,
                messages: []
            }
        };
        // Only add route if provided
        if ((route === null || route === void 0 ? void 0 : route.routeId) && (route === null || route === void 0 ? void 0 : route.name)) {
            deviceData.route = {
                routeId: route.routeId,
                name: route.name
            };
        }
        // Create device
        const device = await Device_1.default.create(deviceData);
        res.status(201).json({
            message: 'Device created successfully',
            device
        });
    }
    catch (error) {
        console.error('Create device error:', error);
        // Better error handling
        if (error.name === 'ValidationError') {
            const validationErrors = Object.values(error.errors).map((err) => err.message);
            res.status(400).json({
                message: 'Validation error',
                errors: validationErrors,
                details: error.message
            });
        }
        else if (error.code === 11000) {
            res.status(400).json({ message: 'Device with this ID already exists' });
        }
        else {
            res.status(500).json({
                message: 'Server error',
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }
};
exports.createDevice = createDevice;
// @desc    Update device
// @route   PUT /api/admin/devices/:id
// @access  Private (System Admin)
const updateDevice = async (req, res) => {
    try {
        const { id } = req.params;
        const { deviceId, vehicleNumber, vehicleType, assignedTo, firmwareVersion, installDate, location, status, isActive } = req.body;
        // Find device
        const device = await Device_1.default.findById(id);
        if (!device) {
            res.status(404).json({ message: 'Device not found' });
            return;
        }
        // Check if deviceId is already taken by another device
        if (deviceId && deviceId !== device.deviceId) {
            const existingDevice = await Device_1.default.findOne({ deviceId });
            if (existingDevice) {
                res.status(400).json({ message: 'Device ID already in use by another device' });
                return;
            }
        }
        // Validate assigned user if not system
        if (assignedTo && assignedTo.type !== 'system' && assignedTo.userId) {
            const user = await User_1.default.findById(assignedTo.userId);
            if (!user) {
                res.status(400).json({ message: 'Assigned user not found' });
                return;
            }
            assignedTo.name = user.name;
        }
        // Update fields
        if (deviceId)
            device.deviceId = deviceId;
        if (vehicleNumber)
            device.vehicleNumber = vehicleNumber;
        if (vehicleType)
            device.vehicleType = vehicleType;
        if (assignedTo)
            device.assignedTo = assignedTo;
        if (firmwareVersion)
            device.firmwareVersion = firmwareVersion;
        if (installDate)
            device.installDate = installDate;
        if (location)
            device.location = { ...(device.location || {}), ...location };
        if (status)
            device.status = status;
        if (isActive !== undefined)
            device.isActive = isActive;
        // Save device
        await device.save();
        // Return updated device
        const updatedDevice = await Device_1.default.findById(id).populate('assignedTo.userId', 'name email');
        res.json({
            message: 'Device updated successfully',
            device: updatedDevice
        });
    }
    catch (error) {
        console.error('Update device error:', error);
        res.status(500).json({
            message: 'Server error',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
exports.updateDevice = updateDevice;
// @desc    Delete device
// @route   DELETE /api/admin/devices/:id
// @access  Private (System Admin)
const deleteDevice = async (req, res) => {
    try {
        const { id } = req.params;
        // Find and delete device
        const device = await Device_1.default.findById(id);
        if (!device) {
            res.status(404).json({ message: 'Device not found' });
            return;
        }
        // Soft delete by setting isActive to false
        device.isActive = false;
        await device.save();
        res.json({ message: 'Device deleted successfully' });
    }
    catch (error) {
        console.error('Delete device error:', error);
        res.status(500).json({
            message: 'Server error',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
exports.deleteDevice = deleteDevice;
// @desc    Update device location
// @route   PUT /api/admin/devices/:id/location
// @access  Private (System Admin)
const updateDeviceLocation = async (req, res) => {
    try {
        const { id } = req.params;
        const { latitude, longitude, address } = req.body;
        if (!latitude || !longitude) {
            res.status(400).json({ message: 'Latitude and longitude are required' });
            return;
        }
        const device = await Device_1.default.findById(id);
        if (!device) {
            res.status(404).json({ message: 'Device not found' });
            return;
        }
        // Update location using the model method
        await device.updateLocation(latitude, longitude, address || 'Unknown location');
        res.json({
            message: 'Device location updated successfully',
            device
        });
    }
    catch (error) {
        console.error('Update device location error:', error);
        res.status(500).json({
            message: 'Server error',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
exports.updateDeviceLocation = updateDeviceLocation;
// @desc    Add alert to device
// @route   POST /api/admin/devices/:id/alerts
// @access  Private (System Admin)
const addDeviceAlert = async (req, res) => {
    try {
        const { id } = req.params;
        const { message } = req.body;
        if (!message) {
            res.status(400).json({ message: 'Alert message is required' });
            return;
        }
        const device = await Device_1.default.findById(id);
        if (!device) {
            res.status(404).json({ message: 'Device not found' });
            return;
        }
        // Add alert using the model method
        await device.addAlert(message);
        res.json({
            message: 'Alert added successfully',
            device
        });
    }
    catch (error) {
        console.error('Add device alert error:', error);
        res.status(500).json({
            message: 'Server error',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
exports.addDeviceAlert = addDeviceAlert;
// @desc    Clear device alerts
// @route   DELETE /api/admin/devices/:id/alerts
// @access  Private (System Admin)
const clearDeviceAlerts = async (req, res) => {
    try {
        const { id } = req.params;
        const device = await Device_1.default.findById(id);
        if (!device) {
            res.status(404).json({ message: 'Device not found' });
            return;
        }
        // Clear alerts using the model method
        await device.clearAlerts();
        res.json({
            message: 'Alerts cleared successfully',
            device
        });
    }
    catch (error) {
        console.error('Clear device alerts error:', error);
        res.status(500).json({
            message: 'Server error',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
exports.clearDeviceAlerts = clearDeviceAlerts;
// @desc    Get device statistics
// @route   GET /api/admin/devices/stats
// @access  Private (System Admin)
const getDeviceStats = async (req, res) => {
    var _a;
    try {
        const totalDevices = await Device_1.default.countDocuments({ isActive: true });
        const onlineDevices = await Device_1.default.countDocuments({ status: 'online', isActive: true });
        const offlineDevices = await Device_1.default.countDocuments({ status: 'offline', isActive: true });
        const maintenanceDevices = await Device_1.default.countDocuments({ status: 'maintenance', isActive: true });
        // Get total alerts
        const alertsResult = await Device_1.default.aggregate([
            { $match: { isActive: true } },
            { $group: { _id: null, totalAlerts: { $sum: '$alerts.count' } } }
        ]);
        const alertsCount = ((_a = alertsResult[0]) === null || _a === void 0 ? void 0 : _a.totalAlerts) || 0;
        // Get devices by type
        const devicesByType = await Device_1.default.aggregate([
            { $match: { isActive: true } },
            {
                $group: {
                    _id: '$vehicleType',
                    count: { $sum: 1 }
                }
            }
        ]);
        // Get devices by assignment
        const devicesByAssignment = await Device_1.default.aggregate([
            { $match: { isActive: true } },
            {
                $group: {
                    _id: '$assignedTo.type',
                    count: { $sum: 1 }
                }
            }
        ]);
        const stats = {
            totalDevices,
            onlineDevices,
            offlineDevices,
            maintenanceDevices,
            alertsCount,
            byType: devicesByType.reduce((acc, item) => {
                acc[item._id] = item.count;
                return acc;
            }, {}),
            byAssignment: devicesByAssignment.reduce((acc, item) => {
                acc[item._id] = item.count;
                return acc;
            }, {})
        };
        res.json(stats);
    }
    catch (error) {
        console.error('Get device stats error:', error);
        res.status(500).json({
            message: 'Server error',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
exports.getDeviceStats = getDeviceStats;
