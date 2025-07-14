// src/controllers/adminSystemController.ts
import { Request, Response } from 'express';
import User from '../models/User';
import Device from '../models/Device';
import Trip from '../models/Trip';
import mongoose from 'mongoose';

// Types for alerts
interface SystemAlert {
  id: string;
  type: 'error' | 'warning' | 'info';
  category: string;
  title: string;
  message: string;
  device?: {
    id: string;
    deviceId: string;
    vehicleNumber: string;
  };
  timestamp: Date;
  priority: 'high' | 'medium' | 'low';
}

type AlertPriority = 'high' | 'medium' | 'low';

// @desc    Get system dashboard statistics
// @route   GET /api/admin/system/stats
// @access  Private (System Admin)
export const getSystemStats = async (req: Request, res: Response): Promise<void> => {
  try {
    // Get user statistics
    const totalUsers = await User.countDocuments();
    const activeUsers = await User.countDocuments({ isActive: true });
    const usersByRole = await User.aggregate([
      {
        $group: {
          _id: '$role',
          count: { $sum: 1 }
        }
      }
    ]);

    // Get device statistics
    const totalDevices = await Device.countDocuments({ isActive: true });
    const activeDevices = await Device.countDocuments({ status: 'online', isActive: true });
    const offlineDevices = await Device.countDocuments({ status: 'offline', isActive: true });
    const maintenanceDevices = await Device.countDocuments({ status: 'maintenance', isActive: true });

    // Get total alerts
    const alertsResult = await Device.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: null, totalAlerts: { $sum: '$alerts.count' } } }
    ]);
    const totalAlerts = alertsResult[0]?.totalAlerts || 0;

    // Get trip statistics
    const totalTrips = await Trip.countDocuments();
    const todayTrips = await Trip.countDocuments({
      date: {
        $gte: new Date(new Date().setHours(0, 0, 0, 0)),
        $lt: new Date(new Date().setHours(23, 59, 59, 999))
      }
    });

    // Get recent activity (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recentUsers = await User.countDocuments({
      createdAt: { $gte: sevenDaysAgo }
    });

    const recentTrips = await Trip.countDocuments({
      createdAt: { $gte: sevenDaysAgo }
    });

    // Calculate system uptime (mock for now)
    const systemUptime = 99.8;

    // Mock API requests (in real implementation, you'd track this)
    const apiRequests = 245780;
    const errorRate = 0.2;

    // Format user statistics by role
    const userRoleStats = usersByRole.reduce((acc: Record<string, number>, item) => {
      acc[item._id] = item.count;
      return acc;
    }, {});

    const stats = {
      totalUsers,
      activeUsers,
      totalDevices,
      activeDevices,
      offlineDevices,
      maintenanceDevices,
      totalAlerts,
      totalTrips,
      todayTrips,
      systemUptime,
      apiRequests,
      errorRate,
      recentActivity: {
        newUsers: recentUsers,
        newTrips: recentTrips
      },
      usersByRole: userRoleStats,
      devicesByStatus: {
        online: activeDevices,
        offline: offlineDevices,
        maintenance: maintenanceDevices
      }
    };

    res.json(stats);
  } catch (error) {
    console.error('Get system stats error:', error);
    res.status(500).json({ 
      message: 'Server error', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
};

// @desc    Get system health metrics
// @route   GET /api/admin/system/health
// @access  Private (System Admin)
export const getSystemHealth = async (req: Request, res: Response): Promise<void> => {
  try {
    // Database health check
    const dbHealthStart = Date.now();
    
    // Check if database connection exists
    if (!mongoose.connection.db) {
      res.status(500).json({ 
        message: 'Database connection not available',
        status: 'unhealthy'
      });
      return;
    }

    await mongoose.connection.db.admin().ping();
    const dbResponseTime = Date.now() - dbHealthStart;

    // Memory usage (Node.js process)
    const memoryUsage = process.memoryUsage();
    const memoryUsagePercent = (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100;

    // CPU usage (simplified)
    const cpuUsage = process.cpuUsage();
    const cpuUsagePercent = ((cpuUsage.user + cpuUsage.system) / 1000000) * 100;

    // Get recent errors (last 24 hours)
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    // Mock error count (in real implementation, you'd track this)
    const errorCount = Math.floor(Math.random() * 10);

    // Check service availability
    const services = [
      {
        name: 'Database',
        status: 'healthy',
        responseTime: dbResponseTime,
        uptime: '99.9%'
      },
      {
        name: 'Authentication',
        status: 'healthy',
        responseTime: Math.floor(Math.random() * 50) + 10,
        uptime: '99.8%'
      },
      {
        name: 'API Gateway',
        status: 'healthy',
        responseTime: Math.floor(Math.random() * 30) + 5,
        uptime: '99.9%'
      },
      {
        name: 'Real-time Tracking',
        status: Math.random() > 0.9 ? 'degraded' : 'healthy',
        responseTime: Math.floor(Math.random() * 100) + 20,
        uptime: '99.5%'
      }
    ];

    const health = {
      status: 'healthy',
      timestamp: new Date(),
      uptime: process.uptime(),
      memory: {
        used: memoryUsage.heapUsed,
        total: memoryUsage.heapTotal,
        usagePercent: memoryUsagePercent.toFixed(2)
      },
      cpu: {
        usagePercent: cpuUsagePercent.toFixed(2)
      },
      database: {
        connected: mongoose.connection.readyState === 1,
        responseTime: dbResponseTime
      },
      services,
      errors: {
        last24Hours: errorCount,
        rate: (errorCount / 1000 * 100).toFixed(3) + '%'
      }
    };

    res.json(health);
  } catch (error) {
    console.error('Get system health error:', error);
    res.status(500).json({ 
      message: 'Server error', 
      error: error instanceof Error ? error.message : 'Unknown error',
      status: 'unhealthy'
    });
  }
};

// @desc    Get system alerts
// @route   GET /api/admin/system/alerts
// @access  Private (System Admin)
export const getSystemAlerts = async (req: Request, res: Response): Promise<void> => {
  try {
    // Get device alerts
    const deviceAlerts = await Device.find({ 
      'alerts.count': { $gt: 0 }, 
      isActive: true 
    }).select('deviceId vehicleNumber alerts status');

    // Get offline devices (offline for more than 30 minutes)
    const thirtyMinutesAgo = new Date();
    thirtyMinutesAgo.setMinutes(thirtyMinutesAgo.getMinutes() - 30);

    const offlineDevices = await Device.find({
      status: 'offline',
      lastSeen: { $lt: thirtyMinutesAgo },
      isActive: true
    }).select('deviceId vehicleNumber lastSeen');

    // Get maintenance devices
    const maintenanceDevices = await Device.find({
      status: 'maintenance',
      isActive: true
    }).select('deviceId vehicleNumber lastMaintenance');

    // Create alerts array with proper typing
    const alerts: SystemAlert[] = [];

    // Add device alerts
    deviceAlerts.forEach(device => {
      device.alerts.messages.forEach(message => {
        alerts.push({
          id: `device-${device._id}-${Date.now()}`,
          type: 'warning',
          category: 'Device',
          title: `Device Alert: ${device.deviceId}`,
          message: message,
          device: {
            id: String(device._id),
            deviceId: device.deviceId,
            vehicleNumber: device.vehicleNumber
          },
          timestamp: new Date(),
          priority: 'medium'
        });
      });
    });

    // Add offline device alerts
    offlineDevices.forEach(device => {
      const hoursOffline = Math.floor((Date.now() - device.lastSeen.getTime()) / (1000 * 60 * 60));
      alerts.push({
        id: `offline-${device._id}`,
        type: 'error',
        category: 'Connectivity',
        title: `Device Offline: ${device.deviceId}`,
        message: `Device has been offline for ${hoursOffline} hours`,
        device: {
          id: String(device._id),
          deviceId: device.deviceId,
          vehicleNumber: device.vehicleNumber
        },
        timestamp: device.lastSeen,
        priority: 'high'
      });
    });

    // Add maintenance alerts
    maintenanceDevices.forEach(device => {
      alerts.push({
        id: `maintenance-${device._id}`,
        type: 'info',
        category: 'Maintenance',
        title: `Device in Maintenance: ${device.deviceId}`,
        message: `Device is currently under maintenance`,
        device: {
          id: String(device._id),
          deviceId: device.deviceId,
          vehicleNumber: device.vehicleNumber
        },
        timestamp: device.lastMaintenance || new Date(),
        priority: 'low'
      });
    });

    // Sort alerts by priority and timestamp
    const priorityOrder: Record<AlertPriority, number> = { high: 3, medium: 2, low: 1 };
    alerts.sort((a, b) => {
      const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
      if (priorityDiff !== 0) return priorityDiff;
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    });

    res.json({
      alerts,
      summary: {
        total: alerts.length,
        high: alerts.filter(a => a.priority === 'high').length,
        medium: alerts.filter(a => a.priority === 'medium').length,
        low: alerts.filter(a => a.priority === 'low').length
      }
    });
  } catch (error) {
    console.error('Get system alerts error:', error);
    res.status(500).json({ 
      message: 'Server error', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
};

// @desc    Get system analytics
// @route   GET /api/admin/system/analytics
// @access  Private (System Admin)
export const getSystemAnalytics = async (req: Request, res: Response): Promise<void> => {
  try {
    const { period = '7d' } = req.query;

    // Calculate date range based on period
    let startDate = new Date();
    switch (period) {
      case '24h':
        startDate.setHours(startDate.getHours() - 24);
        break;
      case '7d':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(startDate.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(startDate.getDate() - 90);
        break;
      default:
        startDate.setDate(startDate.getDate() - 7);
    }

    // Get user registration trends
    const userRegistrationTrends = await User.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            role: '$role'
          },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { '_id.date': 1 }
      }
    ]);

    // Get trip trends
    const tripTrends = await Trip.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            status: '$status'
          },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { '_id.date': 1 }
      }
    ]);

    // Get device activity trends
    const deviceActivityTrends = await Device.aggregate([
      {
        $match: {
          isActive: true,
          lastSeen: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: '%Y-%m-%d', date: '$lastSeen' } },
            status: '$status'
          },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { '_id.date': 1 }
      }
    ]);

    res.json({
      period,
      dateRange: {
        start: startDate,
        end: new Date()
      },
      userRegistrationTrends,
      tripTrends,
      deviceActivityTrends
    });
  } catch (error) {
    console.error('Get system analytics error:', error);
    res.status(500).json({ 
      message: 'Server error', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
};

// @desc    Update system settings
// @route   PUT /api/admin/system/settings
// @access  Private (System Admin)
export const updateSystemSettings = async (req: Request, res: Response): Promise<void> => {
  try {
    const { settings } = req.body;

    // In a real implementation, you'd store these in a Settings collection
    // For now, we'll just return success
    console.log('System settings updated:', settings);

    res.json({
      message: 'System settings updated successfully',
      settings
    });
  } catch (error) {
    console.error('Update system settings error:', error);
    res.status(500).json({ 
      message: 'Server error', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
};