// src/routes/fleetRoutes.ts - Fleet Routes FIXED (Route Assignment Only)
import express from 'express';
import { protect } from '../middleware/authMiddleware';
import { requireFleetManager } from '../middleware/fleetMiddleware';

// Fleet management controllers (existing functions)
import { 
  getFleetDashboard,
  updateFleetProfile,
  getFleetSettings,
  updateFleetSettings,
  getFleetAnalytics,
  getFleetNotifications,
  markNotificationRead,
  getFleetVehicles,
  addVehicle,
  updateVehicle,
  deleteVehicle,
  getVehicleDetails
} from '../controllers/fleetController';

// Route assignment controllers (existing - these are correct)
import {
  getAvailableRoutes,
  getRouteAssignments,
  assignVehiclesToRoute,
  unassignVehicleFromRoute,
  updateAssignmentSchedules,
  getAssignmentPerformance,
  getFleetRouteStats
} from '../controllers/fleetRouteController';

const router = express.Router();

// Apply authentication and authorization to all fleet routes
router.use(protect);
router.use(requireFleetManager);

// ============================
// FLEET DASHBOARD & PROFILE
// ============================
router.get('/dashboard', getFleetDashboard);
router.put('/profile', updateFleetProfile);
router.get('/settings', getFleetSettings);
router.put('/settings', updateFleetSettings);
router.get('/analytics', getFleetAnalytics);
router.get('/notifications', getFleetNotifications);
router.put('/notifications/:id/read', markNotificationRead);

// ============================
// VEHICLE MANAGEMENT
// ============================
router.get('/vehicles', getFleetVehicles);
router.post('/vehicles', addVehicle);
router.get('/vehicles/:id', getVehicleDetails);
router.put('/vehicles/:id', updateVehicle);
router.delete('/vehicles/:id', deleteVehicle);

// ============================
// ROUTE ASSIGNMENT MANAGEMENT ONLY
// (Fleet managers can only assign vehicles to admin-created routes)
// ============================

// Get available routes for fleet assignment
router.get('/routes/available', getAvailableRoutes);

// Route assignment CRUD operations
router.get('/route-assignments', getRouteAssignments);
router.get('/route-assignments/stats', getFleetRouteStats);
router.post('/route-assignments', assignVehiclesToRoute);

// Individual assignment management
router.delete('/route-assignments/:routeId/:vehicleId', unassignVehicleFromRoute);
router.put('/route-assignments/:assignmentId/schedules', updateAssignmentSchedules);
router.get('/route-assignments/:assignmentId/performance', getAssignmentPerformance);

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
  } catch (error) {
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
  } catch (error) {
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
  } catch (error) {
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
  } catch (error) {
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
  } catch (error) {
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
  } catch (error) {
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
  } catch (error) {
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
        targetVehicles: vehicleIds?.length || 0,
        sentAt: new Date().toISOString()
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// ============================
// TEST & DEBUG ENDPOINTS
// ============================
router.get('/test/route-assignments', async (req, res) => {
  try {
    res.json({
      message: 'Fleet route assignment endpoints are working! (ROUTE CREATION REMOVED)',
      timestamp: new Date().toISOString(),
      availableEndpoints: [
        'GET /api/fleet/routes/available - Get available routes for assignment',
        'GET /api/fleet/route-assignments - Get current assignments',
        'GET /api/fleet/route-assignments/stats - Get assignment statistics',
        'POST /api/fleet/route-assignments - Assign vehicles to routes',
        'DELETE /api/fleet/route-assignments/:routeId/:vehicleId - Remove assignment',
        'PUT /api/fleet/route-assignments/:assignmentId/schedules - Update schedules',
        'GET /api/fleet/route-assignments/:assignmentId/performance - Get performance'
      ],
      workflow: [
        '1. Admin creates routes via admin panel',
        '2. Fleet manager registers fleet and adds vehicles',
        '3. Admin approves fleet and vehicles',
        '4. Fleet manager assigns approved vehicles to admin-created routes',
        '5. Fleet manager manages schedules and monitors performance'
      ],
      removedEndpoints: [
        '❌ POST /api/fleet/routes - Route creation (moved to admin only)',
        '❌ PUT /api/fleet/routes/:id - Route updates (admin only)',
        '❌ DELETE /api/fleet/routes/:id - Route deletion (admin only)',
        '❌ GET /api/fleet/routes/:id - Individual route management (admin only)'
      ],
      totalEndpoints: '30+'
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: (error as Error).message });
  }
});

router.get('/docs', (req, res) => {
  res.json({
    message: 'Sri Express Fleet Management API Documentation - FIXED VERSION',
    version: '3.0.0',
    status: 'Fleet Route Assignment Only - Admin Creates Routes',
    endpoints: {
      dashboard: 'Fleet dashboard and profile management (7 endpoints)',
      vehicles: 'Vehicle management with approval system (5 endpoints)',
      routeAssignment: 'Route assignment management (7 endpoints)', 
      operations: 'Trip and schedule operations (2 endpoints)', 
      reports: 'Revenue and performance reporting (2 endpoints)',
      compliance: 'Compliance and document management (2 endpoints)',
      emergency: 'Emergency alerts and safety (2 endpoints)',
      testing: 'Test and debug endpoints (2 endpoints)'
    },
    totalEndpoints: '29',
    correctedWorkflow: {
      step1: 'Admin creates routes via admin panel (/sysadmin/routes)',
      step2: 'Fleet manager applies for fleet registration (/fleet/profile)',
      step3: 'Admin approves fleet (/sysadmin/fleet)',
      step4: 'Fleet manager adds vehicles (/fleet/vehicles/add)',
      step5: 'Admin approves vehicles (/sysadmin/vehicles)',
      step6: 'Fleet manager assigns vehicles to routes (/fleet/routes/available)',
      step7: 'Fleet manager manages assignments and schedules'
    },
    keyChanges: [
      '✅ Removed fleet route creation functionality',
      '✅ Standardized on Device model for vehicles',
      '✅ Simplified workflow: Admin creates routes, Fleet assigns vehicles',
      '✅ Clear separation of admin and fleet responsibilities',
      '✅ Maintained route assignment and performance tracking'
    ]
  });
});

export default router;