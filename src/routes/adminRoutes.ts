// src/routes/adminRoutes.ts - QUICK FIX VERSION
import express from 'express';
import { requireSystemAdmin } from '../middleware/adminMiddleware';
// import { logActivity } from '../middleware/activityLogger'; // TEMPORARILY DISABLED

// User management controllers
import { 
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  toggleUserStatus,
  getUserStats,
  // NEW: Import the new user statistics and activity functions
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

const router = express.Router();

// All admin routes require system admin privileges
router.use(requireSystemAdmin);

// TEMPORARILY DISABLED: Apply activity logging middleware to all admin routes
// router.use(logActivity);

// ============================
// USER MANAGEMENT ROUTES
// ============================

// Get all users with pagination and filtering
router.get('/users', getAllUsers);

// Get user statistics (overview)
router.get('/users/stats', getUserStats);

// Get user by ID
router.get('/users/:id', getUserById);

// NEW: Get individual user statistics and analytics
router.get('/users/:id/stats', getUserStatistics);

// NEW: Get user activity log with pagination and filtering
router.get('/users/:id/activity', getUserActivity);

// NEW: Get user activity timeline (simplified for dashboard widgets)
router.get('/users/:id/timeline', getUserTimeline);

// Create new user
router.post('/users', createUser);

// Update user
router.put('/users/:id', updateUser);

// Delete user
router.delete('/users/:id', deleteUser);

// Toggle user active status
router.patch('/users/:id/toggle-status', toggleUserStatus);

// ============================
// DEVICE MANAGEMENT ROUTES
// ============================

// Get all devices with pagination and filtering
router.get('/devices', getAllDevices);

// Get device statistics
router.get('/devices/stats', getDeviceStats);

// Get device by ID
router.get('/devices/:id', getDeviceById);

// Create new device
router.post('/devices', createDevice);

// Update device
router.put('/devices/:id', updateDevice);

// Delete device
router.delete('/devices/:id', deleteDevice);

// Update device location
router.put('/devices/:id/location', updateDeviceLocation);

// Add alert to device
router.post('/devices/:id/alerts', addDeviceAlert);

// Clear device alerts
router.delete('/devices/:id/alerts', clearDeviceAlerts);

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

// Get system-wide audit logs (placeholder)
router.get('/system/audit', async (req, res) => {
  try {
    res.json({ 
      message: 'System audit logs endpoint',
      totalLogs: 15420,
      recentActivity: 247,
      criticalEvents: 3,
      implementation: 'To be enhanced with UserActivity aggregation'
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

// Resolve emergency incident
router.put('/emergency/:id/resolve', resolveEmergency);

// Send system-wide emergency broadcast
router.post('/emergency/broadcast', sendEmergencyBroadcast);

// Get emergency response teams
router.get('/emergency/teams', getEmergencyTeams);

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
      ],
      implementation: 'To be implemented with UserActivity aggregation'
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
      blockedIPs: 12,
      implementation: 'To be implemented with UserActivity security analysis'
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// ============================
// FLEET MANAGEMENT ROUTES (Placeholder)
// ============================

// Get fleet registrations
router.get('/fleet', (req, res) => {
  res.json({
    fleets: [],
    pendingApprovals: 0,
    activeFleets: 12,
    totalVehicles: 245,
    message: 'Fleet management API not implemented yet'
  });
});

// Approve fleet registration
router.put('/fleet/:id/approve', (req, res) => {
  res.json({
    fleetId: req.params.id,
    status: 'approved',
    message: 'Fleet approval API not implemented yet'
  });
});

// Reject fleet registration
router.put('/fleet/:id/reject', (req, res) => {
  res.json({
    fleetId: req.params.id,
    status: 'rejected', 
    reason: req.body.reason || 'Not specified',
    message: 'Fleet rejection API not implemented yet'
  });
});

// Get fleet details
router.get('/fleet/:id', (req, res) => {
  res.json({
    fleetId: req.params.id,
    message: 'Fleet details API not implemented yet'
  });
});

// ============================
// AI MODULE ROUTES (Placeholder)
// ============================

// Get AI module status
router.get('/ai', (req, res) => {
  res.json({
    status: 'inactive',
    modules: [
      { name: 'route_optimization', status: 'inactive', accuracy: 0 },
      { name: 'demand_prediction', status: 'inactive', accuracy: 0 },
      { name: 'chatbot', status: 'inactive', accuracy: 0 }
    ],
    overall_accuracy: 0,
    last_training: null,
    message: 'AI module API not implemented yet'
  });
});

// Toggle AI module
router.post('/ai/toggle', (req, res) => {
  const { module, enabled } = req.body;
  res.json({
    module,
    status: enabled ? 'enabled' : 'disabled',
    message: 'AI module toggle API not implemented yet'
  });
});

// Get AI configuration
router.get('/ai/config', (req, res) => {
  res.json({
    config: {
      auto_retrain: false,
      confidence_threshold: 0.8,
      model_version: '1.0.0'
    },
    message: 'AI configuration API not implemented yet'
  });
});

// Update AI configuration
router.put('/ai/config', (req, res) => {
  res.json({
    config: req.body,
    updated: true,
    message: 'AI configuration update API not implemented yet'
  });
});

// Start AI model training
router.post('/ai/train', (req, res) => {
  res.json({
    training_id: 'train_' + Date.now(),
    status: 'started',
    estimated_duration: '2 hours',
    message: 'AI training API not implemented yet'
  });
});

// Get AI training status
router.get('/ai/train/:id', (req, res) => {
  res.json({
    training_id: req.params.id,
    status: 'completed',
    progress: 100,
    accuracy: 94.2,
    message: 'AI training status API not implemented yet'
  });
});

// ============================
// UTILITY ROUTES
// ============================

// Test activity logging (for debugging)
router.post('/test/activity', async (req, res) => {
  try {
    res.json({
      message: 'Activity logging test endpoint (middleware disabled)',
      user: req.user?.name,
      logged: false,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get API documentation/endpoints list
router.get('/docs', (req, res) => {
  res.json({
    message: 'Sri Express Admin API Documentation',
    version: '1.3.0',
    status: 'Activity logging temporarily disabled for development',
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
        'GET /devices/:id': 'Get device by ID',
        'POST /devices': 'Create new device',
        'PUT /devices/:id': 'Update device',
        'DELETE /devices/:id': 'Delete device',
        'PUT /devices/:id/location': 'Update device location',
        'POST /devices/:id/alerts': 'Add device alert',
        'DELETE /devices/:id/alerts': 'Clear device alerts'
      },
      system: {
        'GET /system/stats': 'Get system statistics',
        'GET /system/health': 'Get system health',
        'GET /system/alerts': 'Get system alerts',
        'GET /system/analytics': 'Get system analytics',
        'PUT /system/settings': 'Update system settings',
        'GET /system/audit': 'Get system audit logs'
      },
      emergency: {
        'GET /emergency': 'Get emergency dashboard',
        'POST /emergency/alert': 'Create emergency alert',
        'GET /emergency/incidents': 'Get emergency incidents',
        'PUT /emergency/:id/resolve': 'Resolve emergency',
        'POST /emergency/broadcast': 'Send emergency broadcast',
        'GET /emergency/teams': 'Get emergency teams'
      },
      analytics: {
        'GET /analytics/user-activity': 'Get user activity analytics',
        'GET /analytics/security': 'Get security analytics'
      }
    },
    features: {
      activity_logging: 'Temporarily disabled for development',
      real_time_stats: 'Real-time user and system statistics',
      emergency_management: 'Complete emergency response system'
    }
  });
});

export default router;