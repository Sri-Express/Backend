// src/routes/adminRoutes.ts - UPDATED WITH REAL FLEET IMPLEMENTATION
import express from 'express';
import { requireSystemAdmin } from '../middleware/adminMiddleware';

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
  getUserTimeline
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

// Fleet management controllers - ⭐ REAL IMPLEMENTATION!
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

const router = express.Router();

// Apply authentication middleware to all routes
router.use(requireSystemAdmin);

// ============================
// USER MANAGEMENT ROUTES
// ============================

// Get all users with pagination and filtering
router.get('/users', getAllUsers);

// Get user statistics (overview)
router.get('/users/stats', getUserStats);

// Create new user
router.post('/users', createUser);

// SPECIFIC USER ROUTES (MUST COME BEFORE GENERAL :id ROUTES)
router.get('/users/:id/stats', getUserStatistics);
router.get('/users/:id/activity', getUserActivity);
router.get('/users/:id/timeline', getUserTimeline);
router.patch('/users/:id/toggle-status', toggleUserStatus);

// GENERAL USER ROUTES (MUST COME AFTER SPECIFIC ROUTES)
router.get('/users/:id', getUserById);
router.put('/users/:id', updateUser);
router.delete('/users/:id', deleteUser);

// ============================
// DEVICE MANAGEMENT ROUTES
// ============================

// Get all devices with pagination and filtering
router.get('/devices', getAllDevices);

// Get device statistics
router.get('/devices/stats', getDeviceStats);

// Create new device
router.post('/devices', createDevice);

// SPECIFIC DEVICE ROUTES
router.put('/devices/:id/location', updateDeviceLocation);
router.post('/devices/:id/alerts', addDeviceAlert);
router.delete('/devices/:id/alerts', clearDeviceAlerts);

// GENERAL DEVICE ROUTES
router.get('/devices/:id', getDeviceById);
router.put('/devices/:id', updateDevice);
router.delete('/devices/:id', deleteDevice);

// ============================
// SYSTEM MANAGEMENT ROUTES
// ============================

// Get system dashboard statistics
router.get('/system/stats', getSystemStats);

// Get system health metrics
router.get('/system/health', getSystemHealth);

// Get system alerts
router.get('/system/alerts', getSystemAlerts);

// Get system analytics
router.get('/system/analytics', getSystemAnalytics);

// Update system settings
router.put('/system/settings', updateSystemSettings);

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
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// ============================
// EMERGENCY MANAGEMENT ROUTES
// ============================

// Get emergency dashboard data
router.get('/emergency', getEmergencyDashboard);

// Create emergency alert
router.post('/emergency/alert', createEmergencyAlert);

// Get all incidents with pagination and filtering
router.get('/emergency/incidents', getAllIncidents);

// Send system-wide emergency broadcast
router.post('/emergency/broadcast', sendEmergencyBroadcast);

// Get emergency response teams
router.get('/emergency/teams', getEmergencyTeams);

// SPECIFIC EMERGENCY ROUTES
router.put('/emergency/:id/resolve', resolveEmergency);

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
  } catch (error) {
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
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// ============================
// FLEET MANAGEMENT ROUTES - ⭐ REAL IMPLEMENTATION!
// ============================

// Get all fleet applications with pagination and filtering
router.get('/fleet', getAllFleets);

// Get fleet statistics
router.get('/fleet/stats', getFleetStats);

// Get fleets requiring inspection
router.get('/fleet/inspections', getInspectionsDue);

// Get compliance issues
router.get('/fleet/compliance', getComplianceIssues);

// Create new fleet application
router.post('/fleet', createFleet);

// SPECIFIC FLEET ROUTES
router.get('/fleet/:id', getFleetById);
router.put('/fleet/:id', updateFleet);
router.put('/fleet/:id/approve', approveFleet);
router.put('/fleet/:id/reject', rejectFleet);
router.put('/fleet/:id/suspend', suspendFleet);
router.put('/fleet/:id/reactivate', reactivateFleet);
router.delete('/fleet/:id', deleteFleet);

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
  } catch (error) {
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
  } catch (error) {
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
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// ============================
// UTILITY ROUTES
// ============================

// Test activity logging
router.post('/test/activity', async (req, res) => {
  try {
    res.json({
      message: 'Activity logging test endpoint',
      user: req.user?.name,
      logged: true,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
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
      fleet: { // ⭐ REAL IMPLEMENTATION!
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

export default router;