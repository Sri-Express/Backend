"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// src/routes/adminRoutes.ts
const express_1 = __importDefault(require("express"));
const adminMiddleware_1 = require("../middleware/adminMiddleware");
// User management controllers
const adminUserController_1 = require("../controllers/adminUserController");
// Device management controllers
const adminDeviceController_1 = require("../controllers/adminDeviceController");
// System management controllers
const adminSystemController_1 = require("../controllers/adminSystemController");
// Emergency management controllers
const adminEmergencyController_1 = require("../controllers/adminEmergencyController");
const router = express_1.default.Router();
// All admin routes require system admin privileges
router.use(adminMiddleware_1.requireSystemAdmin);
// ============================
// USER MANAGEMENT ROUTES
// ============================
// Get all users with pagination and filtering
router.get('/users', adminUserController_1.getAllUsers);
// Get user statistics
router.get('/users/stats', adminUserController_1.getUserStats);
// Get user by ID
router.get('/users/:id', adminUserController_1.getUserById);
// Create new user
router.post('/users', adminUserController_1.createUser);
// Update user
router.put('/users/:id', adminUserController_1.updateUser);
// Delete user
router.delete('/users/:id', adminUserController_1.deleteUser);
// Toggle user active status
router.patch('/users/:id/toggle-status', adminUserController_1.toggleUserStatus);
// ============================
// DEVICE MANAGEMENT ROUTES
// ============================
// Get all devices with pagination and filtering
router.get('/devices', adminDeviceController_1.getAllDevices);
// Get device statistics
router.get('/devices/stats', adminDeviceController_1.getDeviceStats);
// Get device by ID
router.get('/devices/:id', adminDeviceController_1.getDeviceById);
// Create new device
router.post('/devices', adminDeviceController_1.createDevice);
// Update device
router.put('/devices/:id', adminDeviceController_1.updateDevice);
// Delete device
router.delete('/devices/:id', adminDeviceController_1.deleteDevice);
// Update device location
router.put('/devices/:id/location', adminDeviceController_1.updateDeviceLocation);
// Add alert to device
router.post('/devices/:id/alerts', adminDeviceController_1.addDeviceAlert);
// Clear device alerts
router.delete('/devices/:id/alerts', adminDeviceController_1.clearDeviceAlerts);
// ============================
// SYSTEM MANAGEMENT ROUTES
// ============================
// Get system dashboard statistics
router.get('/system/stats', adminSystemController_1.getSystemStats);
// Get system health metrics
router.get('/system/health', adminSystemController_1.getSystemHealth);
// Get system alerts
router.get('/system/alerts', adminSystemController_1.getSystemAlerts);
// Get system analytics
router.get('/system/analytics', adminSystemController_1.getSystemAnalytics);
// Update system settings
router.put('/system/settings', adminSystemController_1.updateSystemSettings);
// ============================
// EMERGENCY MANAGEMENT ROUTES
// ============================
// Get emergency dashboard data
router.get('/emergency', adminEmergencyController_1.getEmergencyDashboard);
// Create emergency alert
router.post('/emergency/alert', adminEmergencyController_1.createEmergencyAlert);
// Get all incidents with pagination and filtering
router.get('/emergency/incidents', adminEmergencyController_1.getAllIncidents);
// Resolve emergency incident
router.put('/emergency/:id/resolve', adminEmergencyController_1.resolveEmergency);
// Send system-wide emergency broadcast
router.post('/emergency/broadcast', adminEmergencyController_1.sendEmergencyBroadcast);
// Get emergency response teams
router.get('/emergency/teams', adminEmergencyController_1.getEmergencyTeams);
// ============================
// FLEET MANAGEMENT ROUTES (Placeholder)
// ============================
// Get fleet registrations
router.get('/fleet', (req, res) => {
    res.json({
        fleets: [],
        pendingApprovals: 0,
        message: 'Fleet management API not implemented yet'
    });
});
// Approve fleet registration
router.put('/fleet/:id/approve', (req, res) => {
    res.json({
        message: 'Fleet approval API not implemented yet'
    });
});
// Reject fleet registration
router.put('/fleet/:id/reject', (req, res) => {
    res.json({
        message: 'Fleet rejection API not implemented yet'
    });
});
// ============================
// AI MODULE ROUTES (Placeholder)
// ============================
// Get AI module status
router.get('/ai', (req, res) => {
    res.json({
        status: 'inactive',
        modules: [],
        message: 'AI module API not implemented yet'
    });
});
// Toggle AI module
router.post('/ai/toggle', (req, res) => {
    res.json({
        message: 'AI module toggle API not implemented yet'
    });
});
// Get AI configuration
router.get('/ai/config', (req, res) => {
    res.json({
        config: {},
        message: 'AI configuration API not implemented yet'
    });
});
// Update AI configuration
router.put('/ai/config', (req, res) => {
    res.json({
        message: 'AI configuration update API not implemented yet'
    });
});
exports.default = router;
