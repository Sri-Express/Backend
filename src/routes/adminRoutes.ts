// src/routes/adminRoutes.ts
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
  getUserStats
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

// ============================
// USER MANAGEMENT ROUTES
// ============================

// Get all users with pagination and filtering
router.get('/users', getAllUsers);

// Get user statistics
router.get('/users/stats', getUserStats);

// Get user by ID
router.get('/users/:id', getUserById);

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

export default router;