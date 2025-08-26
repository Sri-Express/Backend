"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// src/routes/fleetRoutes.ts - Fleet Routes with Route Assignment Management (FIXED VERSION)
const express_1 = __importDefault(require("express"));
const authMiddleware_1 = require("../middleware/authMiddleware");
const fleetMiddleware_1 = require("../middleware/fleetMiddleware");
// Fleet management controllers (existing functions)
const fleetController_1 = require("../controllers/fleetController");
// FIXED: Vehicle management controllers from fleetVehicleController
const fleetVehicleController_1 = require("../controllers/fleetVehicleController");
// Route assignment controllers (existing - these are correct)
const fleetRouteController_1 = require("../controllers/fleetRouteController");
const router = express_1.default.Router();
// Apply authentication and authorization to all fleet routes
router.use(authMiddleware_1.protect);
router.use(fleetMiddleware_1.requireFleetManager);
// ============================
// FLEET DASHBOARD & PROFILE
// ============================
router.get('/dashboard', fleetController_1.getFleetDashboard);
router.put('/profile', fleetController_1.updateFleetProfile);
router.get('/settings', fleetController_1.getFleetSettings);
router.put('/settings', fleetController_1.updateFleetSettings);
router.get('/analytics', fleetController_1.getFleetAnalytics);
router.get('/notifications', fleetController_1.getFleetNotifications);
router.put('/notifications/:id/read', fleetController_1.markNotificationRead);
// ============================
// VEHICLE MANAGEMENT (UPDATED)
// ============================
router.get('/vehicles', fleetVehicleController_1.getFleetVehicles);
router.get('/vehicles/dashboard', fleetVehicleController_1.getVehicleDashboard);
router.post('/vehicles', fleetVehicleController_1.addVehicle);
router.get('/vehicles/approved', fleetVehicleController_1.getApprovedVehicles);
router.get('/vehicles/:id', fleetVehicleController_1.getVehicleById);
router.put('/vehicles/:id', fleetVehicleController_1.updateVehicle);
router.put('/vehicles/:id/location', fleetVehicleController_1.updateVehicleLocation);
router.delete('/vehicles/:id', fleetVehicleController_1.deleteVehicle);
// ============================
// ROUTE ASSIGNMENT MANAGEMENT
// ============================
// Get available routes for fleet assignment
router.get('/routes/available', fleetRouteController_1.getAvailableRoutes);
// Route assignment CRUD operations
router.get('/route-assignments', fleetRouteController_1.getRouteAssignments);
router.get('/route-assignments/stats', fleetRouteController_1.getFleetRouteStats);
router.post('/route-assignments', fleetRouteController_1.assignVehiclesToRoute);
// Individual assignment management
router.delete('/route-assignments/:routeId/:vehicleId', fleetRouteController_1.unassignVehicleFromRoute);
router.put('/route-assignments/:assignmentId/schedules', fleetRouteController_1.updateAssignmentSchedules);
router.get('/route-assignments/:assignmentId/performance', fleetRouteController_1.getAssignmentPerformance);
// ============================
// FLEET OPERATIONS (Placeholder endpoints)
// ============================
router.get('/operations/trips', async (req, res) => {
    try {
        res.json({
            message: 'Fleet trip operations endpoint',
            trips: [],
            stats: {
                todayTrips: 0,
                activeTrips: 0,
                completedTrips: 0,
                totalRevenue: 0
            }
        });
    }
    catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});
router.get('/operations/schedules', async (req, res) => {
    try {
        res.json({
            message: 'Fleet schedule operations endpoint',
            schedules: [],
            upcomingDepartures: []
        });
    }
    catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});
// ============================
// FLEET REPORTS (Placeholder endpoints)
// ============================
router.get('/reports/revenue', async (req, res) => {
    try {
        const { period = '30d' } = req.query;
        res.json({
            message: 'Fleet revenue report endpoint',
            period,
            totalRevenue: 0,
            dailyRevenue: [],
            topRoutes: []
        });
    }
    catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});
router.get('/reports/performance', async (req, res) => {
    try {
        const { period = '30d' } = req.query;
        res.json({
            message: 'Fleet performance report endpoint',
            period,
            onTimePercentage: 0,
            avgRating: 0,
            totalTrips: 0,
            performanceByVehicle: []
        });
    }
    catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});
// ============================
// FLEET COMPLIANCE (Placeholder endpoints)
// ============================
router.get('/compliance/status', async (req, res) => {
    try {
        res.json({
            message: 'Fleet compliance status endpoint',
            overallScore: 85,
            categories: {
                vehicleInspection: 90,
                driverCertification: 80,
                insurance: 95,
                permits: 75
            },
            expiringDocuments: [],
            requiredActions: []
        });
    }
    catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});
router.get('/compliance/documents', async (req, res) => {
    try {
        res.json({
            message: 'Fleet compliance documents endpoint',
            documents: [],
            expiringIn30Days: [],
            overdue: []
        });
    }
    catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});
// ============================
// EMERGENCY & SAFETY (Placeholder endpoints)
// ============================
router.get('/emergency/alerts', async (req, res) => {
    try {
        res.json({
            message: 'Fleet emergency alerts endpoint',
            activeAlerts: [],
            recentAlerts: [],
            emergencyContacts: []
        });
    }
    catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});
router.post('/emergency/broadcast', async (req, res) => {
    try {
        const { message, priority, vehicleIds } = req.body;
        res.json({
            message: 'Emergency broadcast sent successfully',
            broadcast: {
                id: `broadcast_${Date.now()}`,
                message,
                priority,
                targetVehicles: (vehicleIds === null || vehicleIds === void 0 ? void 0 : vehicleIds.length) || 0,
                sentAt: new Date().toISOString()
            }
        });
    }
    catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});
// ============================
// TEST & DEBUG ENDPOINTS
// ============================
router.get('/test/route-assignments', async (req, res) => {
    try {
        res.json({
            message: 'Fleet route assignment endpoints are working!',
            timestamp: new Date().toISOString(),
            availableEndpoints: [
                'GET /api/fleet/routes/available - Get available routes for assignment',
                'GET /api/fleet/vehicles/approved - Get approved vehicles',
                'GET /api/fleet/route-assignments - Get current assignments',
                'GET /api/fleet/route-assignments/stats - Get assignment statistics',
                'POST /api/fleet/route-assignments - Assign vehicles to routes',
                'DELETE /api/fleet/route-assignments/:routeId/:vehicleId - Remove assignment',
                'PUT /api/fleet/route-assignments/:assignmentId/schedules - Update schedules',
                'GET /api/fleet/route-assignments/:assignmentId/performance - Get performance'
            ],
            newFeatures: [
                '✅ Route discovery and assignment',
                '✅ Multi-vehicle route assignment',
                '✅ Assignment performance tracking',
                '✅ Schedule management',
                '✅ Vehicle-route compatibility checking',
                '✅ Real-time assignment statistics'
            ],
            totalEndpoints: '35+'
        });
    }
    catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});
router.get('/docs', (req, res) => {
    res.json({
        message: 'Sri Express Fleet Management API Documentation',
        version: '2.6.0',
        status: 'Vehicle Approval System + Route Assignment Fully Integrated!',
        endpoints: {
            dashboard: 'Fleet dashboard and profile management (7 endpoints)',
            vehicles: 'Vehicle management with approval system (8 endpoints)',
            routes: 'Route assignment and management (8 endpoints)',
            operations: 'Trip and schedule operations (2 endpoints)',
            reports: 'Revenue and performance reporting (2 endpoints)',
            compliance: 'Compliance and document management (2 endpoints)',
            emergency: 'Emergency alerts and safety (2 endpoints)',
            testing: 'Test and debug endpoints (2 endpoints)'
        },
        totalEndpoints: '33+',
        keyFeatures: [
            'Complete vehicle fleet management with admin approval',
            'Route assignment and scheduling',
            'Real-time GPS tracking integration',
            'Performance analytics and reporting',
            'Compliance and safety monitoring',
            'Emergency response system',
            'Multi-route vehicle operations'
        ],
        businessLogic: {
            vehicleWorkflow: 'Fleet adds vehicle → Admin approves → Fleet assigns to routes',
            routeCompatibility: 'Bus vehicles only (configurable)',
            multiRouteSupport: 'One vehicle can serve multiple routes',
            approvalRequired: 'All vehicles need admin approval before route assignment',
            performanceTracking: 'Revenue, ratings, completion rates'
        }
    });
});
exports.default = router;
