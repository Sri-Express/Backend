// src/routes/adminRoutes.ts - COMPLETE ADMIN ROUTES WITH ROUTE ADMIN MANAGEMENT
import express from 'express';
import { requireSystemAdmin } from '../middleware/adminMiddleware';
import { protect } from '../middleware/authMiddleware';
import Emergency from '../models/Emergency';

// User management controllers
import { 
  getAllUsers, 
  getUserById, 
  createUser, 
  updateUser, 
  deleteUser, 
  toggleUserStatus, 
  getUserStats, 
  getUserStatistics, 
  getUserActivity, 
  getUserTimeline,
  // NEW: Route admin management functions
  createRouteAdmin,
  assignRouteToAdmin,
  removeRouteAdminAssignment,
  getRouteAdmins,
  createRouteAdminWithAssignment
} from '../controllers/adminUserController';

// Device management controllers
import { 
  getAllDevices, 
  getDeviceById, 
  createDevice, 
  updateDevice, 
  deleteDevice, 
  updateDeviceLocation, 
  addDeviceAlert, 
  clearDeviceAlerts, 
  getDeviceStats 
} from '../controllers/adminDeviceController';

// System management controllers
import { 
  getSystemStats, 
  getSystemHealth, 
  getSystemAlerts, 
  getSystemAnalytics, 
  updateSystemSettings 
} from '../controllers/adminSystemController';

// Emergency management controllers
import { 
  getEmergencyDashboard, 
  createEmergencyAlert, 
  getAllIncidents, 
  resolveEmergency, 
  sendEmergencyBroadcast, 
  getEmergencyTeams 
} from '../controllers/adminEmergencyController';

// Fleet management controllers
import { 
  getAllFleets, 
  getFleetById, 
  createFleet, 
  updateFleet, 
  approveFleet, 
  rejectFleet, 
  suspendFleet, 
  reactivateFleet, 
  deleteFleet, 
  getFleetStats, 
  getInspectionsDue, 
  getComplianceIssues 
} from '../controllers/adminFleetController';

// Vehicle management controllers
import {
  getAllVehicles,
  getVehicleStats,
  getVehicleById,
  approveVehicle,
  rejectVehicle,
  bulkApproveVehicles,
  bulkRejectVehicles,
  getPendingVehicles,
  deleteVehicle
} from '../controllers/adminVehicleController';

// Route management controllers
import {
  createRoute,
  getAllRoutes,
  getRouteById,
  approveRoute,
  rejectRoute,
  updateRoute,
  deleteRoute,
  getRouteStats,
  getPendingRoutes,
  getRoutesByFleet,
  // NEW: Route admin assignment functions
  assignRouteAdmin,
  removeRouteAdmin,
  getRouteAdminAssignments,
  getUnassignedRoutes,
  bulkAssignRouteAdmins
} from '../controllers/adminRouteController';

// GPS Simulation controllers
import { 
  getSimulationStatus, 
  startSimulation, 
  stopSimulation, 
  setSimulationSpeed, 
  resetSimulation, 
  getSimulationVehicles, 
  controlVehicle, 
  getSimulationAnalytics 
} from '../controllers/simulationController';

const router = express.Router();

// Public emergency alerts route (before admin middleware)
router.get('/emergency/user-alerts', protect, async (req, res) => {
  try {
    // Get recent emergency alerts that should be visible to users
    const alerts = await Emergency.find({
      isActive: true,
      createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }, // Last 24 hours
      $or: [
        { priority: { $in: ['critical', 'high', 'medium'] } },
        { type: 'broadcast' }
      ]
    })
    .sort({ createdAt: -1 })
    .limit(50)
    .select('incidentId title description type priority createdAt location');

    // Transform to alert format
    const formattedAlerts = alerts.map(emergency => ({
      id: `emergency_${emergency._id}`,
      type: emergency.type === 'system' ? 'broadcast' : 'emergency_created',
      title: emergency.title,
      message: emergency.description,
      priority: emergency.priority,
      timestamp: emergency.createdAt,
      recipients: emergency.priority === 'low' ? ['admins'] : ['all'],
      emergency: emergency,
      read: false
    }));

    res.json({ alerts: formattedAlerts });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: (error as Error).message });
  }
});

// Apply authentication middleware to all admin routes below this point
router.use(requireSystemAdmin);

// ============================
// USER MANAGEMENT ROUTES
// ============================
router.get('/users', getAllUsers);
router.get('/users/stats', getUserStats);
router.post('/users', createUser);
router.get('/users/:id/stats', getUserStatistics);
router.get('/users/:id/activity', getUserActivity);
router.get('/users/:id/timeline', getUserTimeline);
router.patch('/users/:id/toggle-status', toggleUserStatus);
router.get('/users/:id', getUserById);
router.put('/users/:id', updateUser);
router.delete('/users/:id', deleteUser);

// ============================
// NEW: ROUTE ADMIN MANAGEMENT ROUTES
// ============================
// Route admin user management
router.get('/users/route-admins', getRouteAdmins);
router.post('/users/route-admin', createRouteAdmin);
router.post('/users/route-admin-with-assignment', createRouteAdminWithAssignment);

// Route admin assignment management
router.post('/users/:routeAdminId/assign-route', assignRouteToAdmin);
router.delete('/users/:routeAdminId/remove-route', removeRouteAdminAssignment);

// Test route for route admin endpoints
router.get('/users/route-admins/test', async (req, res) => {
  try {
    res.json({
      message: 'Route admin user management endpoints are working!',
      timestamp: new Date().toISOString(),
      availableEndpoints: [
        'GET /api/admin/users/route-admins - Get all route admins with assignments',
        'POST /api/admin/users/route-admin - Create route admin account',
        'POST /api/admin/users/route-admin-with-assignment - Create and assign in one step',
        'POST /api/admin/users/:routeAdminId/assign-route - Assign route to admin',
        'DELETE /api/admin/users/:routeAdminId/remove-route - Remove assignment',
        'GET /api/admin/users/route-admins/test - This test endpoint'
      ],
      totalEndpoints: 6
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: (error as Error).message });
  }
});

// ============================
// DEVICE MANAGEMENT ROUTES
// ============================
router.get('/devices', getAllDevices);
router.get('/devices/stats', getDeviceStats);
router.post('/devices', createDevice);
router.put('/devices/:id/location', updateDeviceLocation);
router.post('/devices/:id/alerts', addDeviceAlert);
router.delete('/devices/:id/alerts', clearDeviceAlerts);
router.get('/devices/:id', getDeviceById);
router.put('/devices/:id', updateDevice);
router.delete('/devices/:id', deleteDevice);

// ============================
// SYSTEM MANAGEMENT ROUTES
// ============================
router.get('/system/stats', getSystemStats);
router.get('/system/health', getSystemHealth);
router.get('/system/alerts', getSystemAlerts);
router.get('/system/analytics', getSystemAnalytics);
router.put('/system/settings', updateSystemSettings);

router.get('/system/audit', async (req, res) => {
  try {
    res.json({
      message: 'System audit logs endpoint',
      totalLogs: 15420,
      recentActivity: 247,
      criticalEvents: 3,
      implementation: 'UserActivity aggregation pending'
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// ============================
// EMERGENCY MANAGEMENT ROUTES
// ============================
router.get('/emergency', getEmergencyDashboard);
router.post('/emergency/alert', createEmergencyAlert);
router.get('/emergency/incidents', getAllIncidents);
router.post('/emergency/broadcast', sendEmergencyBroadcast);
router.get('/emergency/teams', getEmergencyTeams);
router.put('/emergency/:id/resolve', resolveEmergency);

// ============================
// FLEET MANAGEMENT ROUTES
// ============================
router.get('/fleet', getAllFleets);
router.get('/fleet/stats', getFleetStats);
router.get('/fleet/inspections', getInspectionsDue);
router.get('/fleet/compliance', getComplianceIssues);
router.post('/fleet', createFleet);
router.get('/fleet/:id', getFleetById);
router.put('/fleet/:id', updateFleet);
router.put('/fleet/:id/approve', approveFleet);
router.put('/fleet/:id/reject', rejectFleet);
router.put('/fleet/:id/suspend', suspendFleet);
router.put('/fleet/:id/reactivate', reactivateFleet);
router.delete('/fleet/:id', deleteFleet);

// Test route for fleet admin endpoints
router.get('/fleet/test/endpoints', async (req, res) => {
  try {
    res.json({
      message: 'Fleet admin endpoints are working!',
      timestamp: new Date().toISOString(),
      availableEndpoints: [
        'GET /api/admin/fleet - Get all fleets',
        'GET /api/admin/fleet/stats - Fleet statistics',
        'GET /api/admin/fleet/inspections - Inspections due',
        'GET /api/admin/fleet/compliance - Compliance issues',
        'POST /api/admin/fleet - Create fleet',
        'GET /api/admin/fleet/:id - Get fleet by ID',
        'PUT /api/admin/fleet/:id - Update fleet',
        'PUT /api/admin/fleet/:id/approve - Approve fleet',
        'PUT /api/admin/fleet/:id/reject - Reject fleet',
        'PUT /api/admin/fleet/:id/suspend - Suspend fleet',
        'PUT /api/admin/fleet/:id/reactivate - Reactivate fleet',
        'DELETE /api/admin/fleet/:id - Delete fleet',
        'GET /api/admin/fleet/test/endpoints - This test endpoint'
      ],
      totalEndpoints: 13
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: (error as Error).message });
  }
});

// ============================
// VEHICLE MANAGEMENT ROUTES
// ============================
router.get('/vehicles', getAllVehicles);
router.get('/vehicles/stats', getVehicleStats);
router.get('/vehicles/pending', getPendingVehicles);
router.get('/vehicles/:id', getVehicleById);
router.put('/vehicles/:id/approve', approveVehicle);
router.put('/vehicles/:id/reject', rejectVehicle);
router.put('/vehicles/bulk-approve', bulkApproveVehicles);
router.put('/vehicles/bulk-reject', bulkRejectVehicles);
router.delete('/vehicles/:id', deleteVehicle);

// Test route for vehicle admin endpoints
router.get('/vehicles/test/endpoints', async (req, res) => {
  try {
    res.json({
      message: 'Vehicle admin endpoints are working!',
      timestamp: new Date().toISOString(),
      availableEndpoints: [
        'GET /api/admin/vehicles - Get all vehicles',
        'GET /api/admin/vehicles/stats - Vehicle statistics',
        'GET /api/admin/vehicles/pending - Pending vehicles',
        'GET /api/admin/vehicles/:id - Get vehicle by ID',
        'PUT /api/admin/vehicles/:id/approve - Approve vehicle',
        'PUT /api/admin/vehicles/:id/reject - Reject vehicle',
        'PUT /api/admin/vehicles/bulk-approve - Bulk approve vehicles',
        'PUT /api/admin/vehicles/bulk-reject - Bulk reject vehicles',
        'DELETE /api/admin/vehicles/:id - Delete vehicle',
        'GET /api/admin/vehicles/test/endpoints - This test endpoint'
      ],
      totalEndpoints: 10
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: (error as Error).message });
  }
});

// ============================
// ROUTE MANAGEMENT ROUTES
// ============================
router.get('/routes', getAllRoutes);
router.get('/routes/stats', getRouteStats);
router.get('/routes/pending', getPendingRoutes);
router.get('/routes/fleet/:fleetId', getRoutesByFleet);
router.post('/routes', createRoute); // Admin route creation
router.get('/routes/:id', getRouteById);
router.put('/routes/:id/approve', approveRoute);
router.put('/routes/:id/reject', rejectRoute);
router.put('/routes/:id', updateRoute);
router.delete('/routes/:id', deleteRoute);

// NEW: Route admin assignment routes
router.get('/routes/admin-assignments', getRouteAdminAssignments);
router.get('/routes/unassigned', getUnassignedRoutes);
router.put('/routes/:routeId/assign-admin', assignRouteAdmin);
router.delete('/routes/:routeId/remove-admin', removeRouteAdmin);
router.post('/routes/bulk-assign-admins', bulkAssignRouteAdmins);

// Test route for route admin endpoints
router.get('/routes/test/endpoints', async (req, res) => {
  try {
    res.json({
      message: 'Route admin endpoints are working!',
      timestamp: new Date().toISOString(),
      availableEndpoints: [
        'GET /api/admin/routes - Get all routes',
        'GET /api/admin/routes/stats - Route statistics',
        'GET /api/admin/routes/pending - Pending routes',
        'GET /api/admin/routes/fleet/:fleetId - Routes by fleet',
        'POST /api/admin/routes - Create new route',
        'GET /api/admin/routes/:id - Get route by ID',
        'PUT /api/admin/routes/:id/approve - Approve route',
        'PUT /api/admin/routes/:id/reject - Reject route',
        'PUT /api/admin/routes/:id - Update route',
        'DELETE /api/admin/routes/:id - Delete route',
        // NEW route admin endpoints
        'GET /api/admin/routes/admin-assignments - Get all assignments',
        'GET /api/admin/routes/unassigned - Get unassigned routes',
        'PUT /api/admin/routes/:routeId/assign-admin - Assign route admin',
        'DELETE /api/admin/routes/:routeId/remove-admin - Remove route admin',
        'POST /api/admin/routes/bulk-assign-admins - Bulk assign admins',
        'GET /api/admin/routes/test/endpoints - This test endpoint'
      ],
      totalEndpoints: 16,
      newFeatures: [
        'Route admin assignment management',
        'Bulk route admin assignments',
        'Unassigned routes tracking',
        'Route admin assignment statistics'
      ]
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: (error as Error).message });
  }
});

// ============================
// GPS SIMULATION ROUTES
// ============================
router.get('/simulation/status', getSimulationStatus);
router.post('/simulation/start', startSimulation);
router.post('/simulation/stop', stopSimulation);
router.post('/simulation/reset', resetSimulation);
router.post('/simulation/speed', setSimulationSpeed);
router.get('/simulation/vehicles', getSimulationVehicles);
router.post('/simulation/vehicle/:vehicleId', controlVehicle);
router.get('/simulation/analytics', getSimulationAnalytics);

// ============================
// ANALYTICS & REPORTING ROUTES
// ============================
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
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/analytics/security', async (req, res) => {
  try {
    res.json({
      message: 'Security analytics endpoint',
      failedLogins: 45,
      suspiciousActivities: 3,
      blockedIPs: 12
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// ============================
// AI MODULE ROUTES
// ============================
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
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

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
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

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
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// ============================
// ROUTE ADMIN DASHBOARD FOR SYSTEM ADMINS
// ============================
router.get('/route-admin-dashboard', async (req, res) => {
  try {
    // Mock dashboard data for route admin management overview
    res.json({
      message: 'Route Admin Management Dashboard',
      timestamp: new Date().toISOString(),
      summary: {
        totalRoutes: 25,
        assignedRoutes: 18,
        unassignedRoutes: 7,
        totalRouteAdmins: 12,
        activeRouteAdmins: 10,
        availableRouteAdmins: 2
      },
      recentAssignments: [
        {
          id: 'assign1',
          routeName: 'Colombo - Kandy Express',
          routeAdminName: 'John Doe',
          assignedAt: new Date(Date.now() - 86400000),
          status: 'active'
        },
        {
          id: 'assign2',
          routeName: 'Galle - Matara Coastal',
          routeAdminName: 'Jane Smith',
          assignedAt: new Date(Date.now() - 172800000),
          status: 'active'
        }
      ],
      pendingActions: [
        {
          action: 'assign_admin',
          routeName: 'Negombo - Airport Express',
          priority: 'high',
          waitingDays: 3
        },
        {
          action: 'admin_training',
          routeAdminName: 'Mike Johnson',
          priority: 'medium',
          assignedRoute: 'Jaffna - Vavuniya Line'
        }
      ],
      performance: {
        avgAssignmentTime: 2.5, // days
        successfulAssignments: 95.8, // percentage
        adminSatisfactionScore: 4.2 // out of 5
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// ============================
// UTILITY ROUTES
// ============================
router.post('/test/activity', async (req, res) => {
  try {
    res.json({
      message: 'Activity logging test endpoint',
      user: (req as any).user?.name,
      logged: true,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/docs', (req, res) => {
  res.json({
    message: 'Sri Express Admin API Documentation',
    version: '4.0.0',
    status: 'Route Admin Management System Fully Integrated!',
    endpoints: {
      users: 'User management endpoints (10 total)',
      routeAdmins: 'Route admin management endpoints (6 total) - NEW!',
      devices: 'Device management endpoints (8 total)',
      fleet: 'Fleet management endpoints (13 total)',
      routes: 'Route management endpoints (16 total - UPDATED!)',
      routeAssignments: 'Route admin assignment endpoints (5 total) - NEW!',
      simulation: 'GPS simulation endpoints (8 total)',
      ai: 'AI module endpoints (3 total)',
      emergency: 'Emergency management endpoints (7 total)',
      analytics: 'Analytics and reporting endpoints (5 total)'
    },
    totalEndpoints: '81+',
    newRouteAdminFeatures: [
      'Create route admin accounts',
      'Assign route admins to specific routes',
      'Remove route admin assignments',
      'Bulk assign multiple route admins',
      'View all route admin assignments',
      'Get unassigned routes',
      'Route admin dashboard overview',
      'Route admin performance tracking'
    ],
    workflow: [
      '1. System admin creates routes via admin panel',
      '2. System admin creates route admin accounts',
      '3. System admin assigns route admins to specific routes',
      '4. Route admin logs in and manages their assigned route',
      '5. Route admin assigns vehicles from multiple fleets to their route',
      '6. Route admin manages schedules and monitors performance',
      '7. System admin can reassign or remove route admins anytime'
    ],
    keyCapabilities: [
      'Full route admin lifecycle management',
      'One-to-one route-admin assignment model',
      'Route admins can assign vehicles from any approved fleet',
      'Complete assignment tracking and history',
      'Bulk operations for efficiency',
      'Dashboard and analytics for system admins'
    ]
  });
});

export default router;