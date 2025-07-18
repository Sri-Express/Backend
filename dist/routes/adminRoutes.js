"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// src/routes/adminRoutes.ts - UPDATED WITH REAL FLEET IMPLEMENTATION
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
// Fleet management controllers - ⭐ REAL IMPLEMENTATION!
const adminFleetController_1 = require("../controllers/adminFleetController");
const router = express_1.default.Router();
// Apply authentication middleware to all routes
router.use(adminMiddleware_1.requireSystemAdmin);
// ============================
// USER MANAGEMENT ROUTES
// ============================
// Get all users with pagination and filtering
router.get('/users', adminUserController_1.getAllUsers);
// Get user statistics (overview)
router.get('/users/stats', adminUserController_1.getUserStats);
// Create new user
router.post('/users', adminUserController_1.createUser);
// SPECIFIC USER ROUTES (MUST COME BEFORE GENERAL :id ROUTES)
router.get('/users/:id/stats', adminUserController_1.getUserStatistics);
router.get('/users/:id/activity', adminUserController_1.getUserActivity);
router.get('/users/:id/timeline', adminUserController_1.getUserTimeline);
router.patch('/users/:id/toggle-status', adminUserController_1.toggleUserStatus);
// GENERAL USER ROUTES (MUST COME AFTER SPECIFIC ROUTES)
router.get('/users/:id', adminUserController_1.getUserById);
router.put('/users/:id', adminUserController_1.updateUser);
router.delete('/users/:id', adminUserController_1.deleteUser);
// ============================
// DEVICE MANAGEMENT ROUTES
// ============================
// Get all devices with pagination and filtering
router.get('/devices', adminDeviceController_1.getAllDevices);
// Get device statistics
router.get('/devices/stats', adminDeviceController_1.getDeviceStats);
// Create new device
router.post('/devices', adminDeviceController_1.createDevice);
// SPECIFIC DEVICE ROUTES
router.put('/devices/:id/location', adminDeviceController_1.updateDeviceLocation);
router.post('/devices/:id/alerts', adminDeviceController_1.addDeviceAlert);
router.delete('/devices/:id/alerts', adminDeviceController_1.clearDeviceAlerts);
// GENERAL DEVICE ROUTES
router.get('/devices/:id', adminDeviceController_1.getDeviceById);
router.put('/devices/:id', adminDeviceController_1.updateDevice);
router.delete('/devices/:id', adminDeviceController_1.deleteDevice);
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
// Get system-wide audit logs
router.get('/system/audit', async (req, res) => {
    try {
        res.json({
            message: 'System audit logs endpoint',
            totalLogs: 15420,
            recentActivity: 247,
            criticalEvents: 3,
            implementation: 'UserActivity aggregation pending'
        });
    }
    catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});
// ============================
// EMERGENCY MANAGEMENT ROUTES
// ============================
// Get emergency dashboard data
router.get('/emergency', adminEmergencyController_1.getEmergencyDashboard);
// Create emergency alert
router.post('/emergency/alert', adminEmergencyController_1.createEmergencyAlert);
// Get all incidents with pagination and filtering
router.get('/emergency/incidents', adminEmergencyController_1.getAllIncidents);
// Send system-wide emergency broadcast
router.post('/emergency/broadcast', adminEmergencyController_1.sendEmergencyBroadcast);
// Get emergency response teams
router.get('/emergency/teams', adminEmergencyController_1.getEmergencyTeams);
// SPECIFIC EMERGENCY ROUTES
router.put('/emergency/:id/resolve', adminEmergencyController_1.resolveEmergency);
// ============================
// ANALYTICS & REPORTING ROUTES
// ============================
// Get user activity analytics across the platform
router.get('/analytics/user-activity', async (req, res) => {
    try {
        const { period = '7d' } = req.query;
        res.json({
            message: 'User activity analytics endpoint',
            period,
            totalActivities: 45230,
            activeUsers: 1250,
            topActions: [
                { action: 'login', count: 15420 },
                { action: 'trip_booking', count: 8930 },
                { action: 'device_update', count: 3240 }
            ]
        });
    }
    catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});
// Get security analytics
router.get('/analytics/security', async (req, res) => {
    try {
        res.json({
            message: 'Security analytics endpoint',
            failedLogins: 45,
            suspiciousActivities: 3,
            blockedIPs: 12
        });
    }
    catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});
// ============================
// FLEET MANAGEMENT ROUTES - ⭐ REAL IMPLEMENTATION!
// ============================
// Get all fleet applications with pagination and filtering
router.get('/fleet', adminFleetController_1.getAllFleets);
// Get fleet statistics
router.get('/fleet/stats', adminFleetController_1.getFleetStats);
// Get fleets requiring inspection
router.get('/fleet/inspections', adminFleetController_1.getInspectionsDue);
// Get compliance issues
router.get('/fleet/compliance', adminFleetController_1.getComplianceIssues);
// Create new fleet application
router.post('/fleet', adminFleetController_1.createFleet);
// SPECIFIC FLEET ROUTES
router.get('/fleet/:id', adminFleetController_1.getFleetById);
router.put('/fleet/:id', adminFleetController_1.updateFleet);
router.put('/fleet/:id/approve', adminFleetController_1.approveFleet);
router.put('/fleet/:id/reject', adminFleetController_1.rejectFleet);
router.put('/fleet/:id/suspend', adminFleetController_1.suspendFleet);
router.put('/fleet/:id/reactivate', adminFleetController_1.reactivateFleet);
router.delete('/fleet/:id', adminFleetController_1.deleteFleet);
// ============================
// AI MODULE ROUTES - MOCK FOR NOW (CAN BE MADE REAL LATER)
// ============================
// Get AI system overview
router.get('/ai', async (req, res) => {
    try {
        res.json({
            status: 'online',
            modules: [
                {
                    id: 'arrival-predictor',
                    name: 'Arrival Time Predictor',
                    description: 'Predicts bus/train arrival times using traffic and historical data',
                    status: 'active',
                    accuracy: 87.5,
                    lastTrained: '2025-01-15T10:30:00Z',
                    version: '2.1.3',
                    type: 'prediction',
                    config: {
                        autoRetrain: true,
                        confidenceThreshold: 0.85,
                        trainingInterval: 24,
                        dataPoints: 10000
                    },
                    performance: {
                        totalPredictions: 45230,
                        successfulPredictions: 39576,
                        avgResponseTime: 120,
                        lastPrediction: new Date().toISOString()
                    },
                    resources: {
                        cpuUsage: 15.2,
                        memoryUsage: 256,
                        gpuUsage: 45.8
                    }
                },
                {
                    id: 'route-optimizer',
                    name: 'Route Optimizer',
                    description: 'Optimizes routes based on real-time traffic and passenger demand',
                    status: 'inactive',
                    accuracy: 92.1,
                    lastTrained: '2025-01-10T14:20:00Z',
                    version: '1.8.2',
                    type: 'optimization',
                    config: {
                        autoRetrain: false,
                        confidenceThreshold: 0.9,
                        trainingInterval: 48,
                        dataPoints: 8500
                    },
                    performance: {
                        totalPredictions: 12450,
                        successfulPredictions: 11467,
                        avgResponseTime: 85,
                        lastPrediction: new Date(Date.now() - 86400000).toISOString()
                    },
                    resources: {
                        cpuUsage: 0,
                        memoryUsage: 0
                    }
                }
            ],
            stats: {
                totalModules: 2,
                activeModules: 1,
                trainingModules: 0,
                totalPredictions: 57680,
                averageAccuracy: 89.8,
                systemCpuUsage: 15.2,
                systemMemoryUsage: 256,
                systemGpuUsage: 45.8,
                dailyPredictions: 5768,
                errorRate: 1.2
            },
            lastUpdated: new Date()
        });
    }
    catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});
// Toggle AI module
router.post('/ai/:moduleId/toggle', async (req, res) => {
    try {
        const { moduleId } = req.params;
        const { action } = req.body;
        res.json({
            message: `Module ${action}ed successfully`,
            module: {
                id: moduleId,
                status: action === 'start' ? 'active' : 'inactive',
                updatedAt: new Date().toISOString()
            }
        });
    }
    catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});
// Start AI training
router.post('/ai/:moduleId/train', async (req, res) => {
    try {
        const { moduleId } = req.params;
        res.json({
            message: 'Training started successfully',
            trainingJob: {
                id: `train_${Date.now()}`,
                moduleId,
                status: 'queued',
                progress: 0,
                startTime: new Date().toISOString()
            }
        });
    }
    catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});
// ============================
// UTILITY ROUTES
// ============================
// Test activity logging
router.post('/test/activity', async (req, res) => {
    var _a;
    try {
        res.json({
            message: 'Activity logging test endpoint',
            user: (_a = req.user) === null || _a === void 0 ? void 0 : _a.name,
            logged: true,
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});
// Get API documentation
router.get('/docs', (req, res) => {
    res.json({
        message: 'Sri Express Admin API Documentation',
        version: '2.0.0',
        status: 'Fleet APIs Fully Implemented!', // ⭐ UPDATED STATUS!
        endpoints: {
            users: {
                'GET /users': 'Get all users with pagination',
                'GET /users/stats': 'Get user statistics overview',
                'GET /users/:id': 'Get user by ID',
                'GET /users/:id/stats': 'Get individual user statistics',
                'GET /users/:id/activity': 'Get user activity log',
                'GET /users/:id/timeline': 'Get user activity timeline',
                'POST /users': 'Create new user',
                'PUT /users/:id': 'Update user',
                'DELETE /users/:id': 'Delete user',
                'PATCH /users/:id/toggle-status': 'Toggle user status'
            },
            devices: {
                'GET /devices': 'Get all devices with pagination',
                'GET /devices/stats': 'Get device statistics',
                'POST /devices': 'Create new device',
                'GET /devices/:id': 'Get device by ID',
                'PUT /devices/:id': 'Update device',
                'DELETE /devices/:id': 'Delete device'
            },
            fleet: {
                'GET /fleet': 'Get all fleet applications with real database',
                'GET /fleet/stats': 'Get fleet statistics from database',
                'POST /fleet': 'Create fleet application in database',
                'GET /fleet/:id': 'Get fleet by ID from database',
                'PUT /fleet/:id/approve': 'Approve fleet with database update',
                'PUT /fleet/:id/reject': 'Reject fleet with database update',
                'PUT /fleet/:id/suspend': 'Suspend fleet in database'
            },
            ai: {
                'GET /ai': 'Get AI system overview (mock)',
                'POST /ai/:moduleId/toggle': 'Start/stop AI module (mock)',
                'POST /ai/:moduleId/train': 'Start module training (mock)'
            }
        }
    });
});
exports.default = router;
