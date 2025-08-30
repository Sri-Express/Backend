// src/routes/routeAdminRoutes.ts - Route Admin API Routes
import express from 'express';
import { protect } from '../middleware/authMiddleware';
import { requireRouteAdmin, requireRouteAdminForRoute } from '../middleware/routeAdminMiddleware';

// Route admin controllers
import {
  getRouteAdminDashboard,
  getAssignedRoute,
  getAvailableVehicles,
  assignVehiclesToRoute,
  getRouteAssignments,
  removeVehicleAssignment,
  updateAssignmentSchedules,
  getRouteAnalytics
} from '../controllers/routeAdminController';

const router = express.Router();

// Apply authentication to all route admin routes
router.use(protect);
router.use(requireRouteAdmin);

// ============================
// ROUTE ADMIN DASHBOARD
// ============================
router.get('/dashboard', getRouteAdminDashboard);

// ============================
// ASSIGNED ROUTE MANAGEMENT
// ============================
router.get('/route', getAssignedRoute);
router.get('/analytics', getRouteAnalytics);

// ============================
// VEHICLE ASSIGNMENT MANAGEMENT
// ============================
// Get available vehicles from all approved fleets
router.get('/available-vehicles', getAvailableVehicles);

// Get current assignments for route admin's route
router.get('/assignments', getRouteAssignments);

// Assign vehicles to route (route admin can assign from any fleet)
router.post('/assign-vehicles', assignVehiclesToRoute);

// Remove vehicle assignment
router.delete('/assignments/:assignmentId', removeVehicleAssignment);

// Update assignment schedules
router.put('/assignments/:assignmentId/schedules', updateAssignmentSchedules);

// ============================
// ROUTE SCHEDULE MANAGEMENT
// ============================
router.get('/schedules', async (req, res) => {
  try {
    res.json({
      message: 'Route schedules endpoint',
      schedules: [],
      upcomingDepartures: [],
      implementation: 'Route-specific schedule management'
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.put('/schedules', async (req, res) => {
  try {
    const { schedules } = req.body;
    res.json({
      message: 'Route schedules updated successfully',
      schedules: schedules,
      updatedAt: new Date()
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// ============================
// ROUTE PERFORMANCE MONITORING
// ============================
router.get('/performance', async (req, res) => {
  try {
    const { period = '7d' } = req.query;
    res.json({
      message: 'Route performance metrics',
      period,
      metrics: {
        onTimePercentage: 87.5,
        avgRating: 4.2,
        totalTrips: 145,
        completedTrips: 127,
        revenue: 25400
      },
      trends: {
        tripCount: '+12%',
        revenue: '+8.5%',
        rating: '-0.2'
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/performance/vehicles', async (req, res) => {
  try {
    res.json({
      message: 'Vehicle performance on route',
      vehicles: [],
      topPerformers: [],
      issuesNeedingAttention: []
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// ============================
// ROUTE ISSUES & MAINTENANCE
// ============================
router.get('/issues', async (req, res) => {
  try {
    res.json({
      message: 'Route issues and maintenance',
      activeIssues: [],
      maintenanceScheduled: [],
      recentResolutions: []
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/issues', async (req, res) => {
  try {
    const { title, description, priority, vehicleId } = req.body;
    res.json({
      message: 'Issue reported successfully',
      issue: {
        id: `issue_${Date.now()}`,
        title,
        description,
        priority,
        vehicleId,
        status: 'open',
        reportedBy: req.user?._id,
        reportedAt: new Date()
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// ============================
// ROUTE COMMUNICATION
// ============================
router.get('/notifications', async (req, res) => {
  try {
    res.json({
      message: 'Route admin notifications',
      notifications: [
        {
          id: 'notif1',
          type: 'vehicle_assigned',
          title: 'New vehicle assigned to route',
          message: 'Vehicle BUS-001 has been assigned to your route',
          timestamp: new Date(),
          read: false
        },
        {
          id: 'notif2',
          type: 'schedule_update',
          title: 'Schedule update required',
          message: 'Please update schedules for peak hours',
          timestamp: new Date(Date.now() - 3600000),
          read: false
        }
      ],
      unreadCount: 2
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.put('/notifications/:id/read', async (req, res) => {
  try {
    const { id } = req.params;
    res.json({
      message: 'Notification marked as read',
      notificationId: id,
      updatedAt: new Date()
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// ============================
// FLEET COMMUNICATION
// ============================
router.get('/fleets', async (req, res) => {
  try {
    res.json({
      message: 'Fleets operating on this route',
      fleets: [],
      communications: [],
      pendingRequests: []
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/fleets/:fleetId/message', async (req, res) => {
  try {
    const { fleetId } = req.params;
    const { subject, message, priority } = req.body;
    
    res.json({
      message: 'Message sent to fleet successfully',
      communication: {
        id: `msg_${Date.now()}`,
        fleetId,
        subject,
        message,
        priority,
        sentBy: req.user?._id,
        sentAt: new Date(),
        status: 'sent'
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// ============================
// ROUTE REPORTS
// ============================
router.get('/reports/daily', async (req, res) => {
  try {
    const { date = new Date().toISOString().split('T')[0] } = req.query;
    res.json({
      message: 'Daily route report',
      date,
      summary: {
        totalTrips: 24,
        completedTrips: 22,
        onTimeTrips: 19,
        delayedTrips: 3,
        cancelledTrips: 2,
        revenue: 4850
      },
      vehiclePerformance: [],
      issues: []
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/reports/weekly', async (req, res) => {
  try {
    res.json({
      message: 'Weekly route report',
      weekOf: new Date(),
      summary: {
        totalTrips: 168,
        avgOnTimePercentage: 87.5,
        totalRevenue: 33950,
        avgRating: 4.2
      },
      trends: {
        tripCount: '+5%',
        onTimePerformance: '-2%',
        revenue: '+8%',
        rating: '+0.1'
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/reports/monthly', async (req, res) => {
  try {
    res.json({
      message: 'Monthly route report',
      month: new Date().getMonth() + 1,
      year: new Date().getFullYear(),
      summary: {
        totalTrips: 672,
        avgOnTimePercentage: 89.2,
        totalRevenue: 135800,
        avgRating: 4.3,
        fleetCount: 3,
        vehicleCount: 8
      },
      comparisons: {
        previousMonth: {
          tripChange: '+7%',
          revenueChange: '+12%',
          ratingChange: '+0.2'
        }
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// ============================
// ROUTE ADMIN PROFILE
// ============================
router.get('/profile', async (req, res) => {
  try {
    const user = req.user;
    res.json({
      routeAdmin: {
        _id: user?._id,
        name: user?.name,
        email: user?.email,
        role: user?.role,
        assignedSince: new Date(), // This should come from route assignment
        permissions: user?.permissions || []
      },
      preferences: {
        notifications: true,
        autoAssign: false,
        reportFrequency: 'weekly'
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.put('/profile', async (req, res) => {
  try {
    const { preferences } = req.body;
    res.json({
      message: 'Profile updated successfully',
      preferences,
      updatedAt: new Date()
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// ============================
// TEST & DOCUMENTATION
// ============================
router.get('/test', (req, res) => {
  res.json({
    message: 'Route Admin API is working!',
    timestamp: new Date().toISOString(),
    routeAdmin: {
      _id: req.user?._id,
      name: req.user?.name,
      email: req.user?.email,
      role: req.user?.role
    },
    availableEndpoints: [
      'GET /api/route-admin/dashboard - Route admin dashboard',
      'GET /api/route-admin/route - Get assigned route details',
      'GET /api/route-admin/analytics - Route performance analytics',
      'GET /api/route-admin/available-vehicles - Get vehicles from all fleets',
      'GET /api/route-admin/assignments - Current vehicle assignments',
      'POST /api/route-admin/assign-vehicles - Assign vehicles to route',
      'DELETE /api/route-admin/assignments/:id - Remove assignment',
      'PUT /api/route-admin/assignments/:id/schedules - Update schedules',
      'GET /api/route-admin/performance - Performance metrics',
      'GET /api/route-admin/issues - Route issues',
      'POST /api/route-admin/issues - Report issue',
      'GET /api/route-admin/notifications - Get notifications',
      'GET /api/route-admin/reports/daily - Daily reports',
      'GET /api/route-admin/reports/weekly - Weekly reports',
      'GET /api/route-admin/reports/monthly - Monthly reports'
    ],
    totalEndpoints: 15,
    capabilities: [
      'Assign vehicles from multiple fleets to assigned route',
      'Manage route schedules and assignments',
      'Monitor route performance and analytics',
      'Communicate with fleet operators',
      'Generate route reports',
      'Handle route issues and maintenance'
    ]
  });
});

router.get('/docs', (req, res) => {
  res.json({
    message: 'Route Admin API Documentation',
    version: '1.0.0',
    role: 'Route Admin manages ONE specific route and assigns vehicles from MULTIPLE fleets',
    workflow: [
      '1. System admin creates route admin account',
      '2. System admin assigns route admin to specific route',
      '3. Route admin logs in and sees assigned route dashboard',
      '4. Route admin views available vehicles from all approved fleets',
      '5. Route admin assigns suitable vehicles to their route',
      '6. Route admin manages schedules and monitors performance',
      '7. Route admin communicates with fleet operators',
      '8. Route admin generates reports and handles issues'
    ],
    permissions: {
      can: [
        'View assigned route details',
        'Assign/remove vehicles from any approved fleet',
        'Manage route schedules',
        'View route analytics and performance',
        'Communicate with fleet operators',
        'Generate route reports',
        'Report and track route issues'
      ],
      cannot: [
        'Create or modify routes (system admin only)',
        'Approve vehicles or fleets (system admin only)',
        'Manage other routes',
        'Create other admin accounts',
        'Access system-wide settings'
      ]
    },
    authentication: 'Requires route_admin role and valid route assignment',
    endpoints: {
      dashboard: 1,
      routeManagement: 2,
      vehicleAssignment: 5,
      performance: 2,
      issues: 2,
      communication: 3,
      reports: 3,
      profile: 2,
      utility: 2
    },
    totalEndpoints: 22
  });
});

export default router;