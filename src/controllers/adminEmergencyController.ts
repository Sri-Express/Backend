// src/controllers/adminEmergencyController.ts - Enhanced with Real-time Notifications
import { Request, Response } from 'express';
import Emergency from '../models/Emergency';
import Device from '../models/Device';
import User from '../models/User';
import mongoose from 'mongoose';
import { getRealTimeEmergencyService } from '../services/realTimeEmergencyService';
import sendEmail from '../utils/sendEmail';

// Emergency team interface
interface EmergencyTeam {
  teamId: string;
  teamName: string;
  members: {
    userId: mongoose.Types.ObjectId;
    name: string;
    role: string;
    contactNumber: string;
  }[];
}

// SMS Service (mock implementation - replace with actual SMS service)
const sendSMS = async (phoneNumber: string, message: string): Promise<void> => {
  console.log(`📱 SMS to ${phoneNumber}: ${message}`);
  // Integrate with actual SMS service like Twilio, AWS SNS, etc.
};

// Push Notification Service (mock implementation)
const sendPushNotification = async (userId: string, title: string, body: string, data?: any): Promise<void> => {
  console.log(`🔔 Push notification to user ${userId}: ${title} - ${body}`);
  // Integrate with actual push service like Firebase, OneSignal, etc.
};

// @desc    Get emergency dashboard data with real-time integration
// @route   GET /api/admin/emergency
// @access  Private (System Admin)
export const getEmergencyDashboard = async (req: Request, res: Response): Promise<void> => {
  try {
    // Get total emergencies
    const totalEmergencies = await Emergency.countDocuments({ isActive: true });
    
    // Get active emergencies
    const activeEmergencies = await Emergency.countDocuments({ 
      status: { $in: ['active', 'responded'] }, 
      isActive: true 
    });
    
    // Get emergencies by priority
    const emergenciesByPriority = await Emergency.aggregate([
      { $match: { isActive: true } },
      {
        $group: {
          _id: '$priority',
          count: { $sum: 1 }
        }
      }
    ]);

    // Get emergencies by type
    const emergenciesByType = await Emergency.aggregate([
      { $match: { isActive: true } },
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 }
        }
      }
    ]);

    // Get recent emergencies (last 24 hours)
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    
    const recentEmergencies = await Emergency.find({
      createdAt: { $gte: yesterday },
      isActive: true
    })
    .sort({ createdAt: -1 })
    .limit(10)
    .select('incidentId title type priority status createdAt location reportedBy');

    // Get critical active emergencies
    const criticalEmergencies = await Emergency.find({
      priority: 'critical',
      status: { $in: ['active', 'responded'] },
      isActive: true
    })
    .sort({ createdAt: -1 })
    .limit(5)
    .select('incidentId title type priority status createdAt location assignedTeam');

    // Get average response time (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const responseTimeStats = await Emergency.aggregate([
      {
        $match: {
          createdAt: { $gte: thirtyDaysAgo },
          'assignedTeam.responseTime': { $exists: true },
          isActive: true
        }
      },
      {
        $project: {
          responseTime: {
            $subtract: ['$assignedTeam.responseTime', '$createdAt']
          }
        }
      },
      {
        $group: {
          _id: null,
          averageResponseTime: { $avg: '$responseTime' },
          count: { $sum: 1 }
        }
      }
    ]);

    // Get resolution statistics
    const resolutionStats = await Emergency.aggregate([
      {
        $match: {
          status: 'resolved',
          actualResolutionTime: { $exists: true },
          isActive: true
        }
      },
      {
        $project: {
          resolutionTime: {
            $subtract: ['$actualResolutionTime', '$createdAt']
          }
        }
      },
      {
        $group: {
          _id: null,
          averageResolutionTime: { $avg: '$resolutionTime' },
          count: { $sum: 1 }
        }
      }
    ]);

    // Get system alerts that might become emergencies
    const deviceAlerts = await Device.find({ 
      'alerts.count': { $gt: 0 }, 
      isActive: true 
    }).countDocuments();

    // Get offline devices count
    const offlineDevices = await Device.countDocuments({
      status: 'offline',
      isActive: true
    });

    // Format priority statistics
    const priorityStats = emergenciesByPriority.reduce((acc: Record<string, number>, item) => {
      acc[item._id] = item.count;
      return acc;
    }, {});

    // Format type statistics
    const typeStats = emergenciesByType.reduce((acc: Record<string, number>, item) => {
      acc[item._id] = item.count;
      return acc;
    }, {});

    // Get real-time connection status
    let realTimeStatus = { connectedUsers: 0, websocketActive: false };
    try {
      const realTimeService = getRealTimeEmergencyService();
      realTimeStatus = {
        connectedUsers: realTimeService.getConnectedUsersCount(),
        websocketActive: true
      };
    } catch (error) {
      console.log('Real-time service not available');
    }

    const dashboardData = {
      overview: {
        totalEmergencies,
        activeEmergencies,
        resolvedToday: await Emergency.countDocuments({
          status: 'resolved',
          actualResolutionTime: { $gte: yesterday },
          isActive: true
        }),
        criticalCount: await Emergency.countDocuments({
          priority: 'critical',
          status: { $in: ['active', 'responded'] },
          isActive: true
        })
      },
      statistics: {
        byPriority: priorityStats,
        byType: typeStats,
        averageResponseTime: responseTimeStats[0]?.averageResponseTime ? 
          Math.round(responseTimeStats[0].averageResponseTime / 60000) : 0, // Convert to minutes
        averageResolutionTime: resolutionStats[0]?.averageResolutionTime ? 
          Math.round(resolutionStats[0].averageResolutionTime / 3600000) : 0, // Convert to hours
      },
      alerts: {
        deviceAlerts,
        offlineDevices,
        escalatedEmergencies: await Emergency.countDocuments({
          escalationLevel: { $gte: 3 },
          status: { $in: ['active', 'responded'] },
          isActive: true
        })
      },
      recentEmergencies,
      criticalEmergencies,
      realTimeStatus // Add real-time status to dashboard
    };

    res.json(dashboardData);
  } catch (error) {
    console.error('Get emergency dashboard error:', error);
    res.status(500).json({ 
      message: 'Server error', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
};

// @desc    Create emergency alert with real-time notifications
// @route   POST /api/admin/emergency/alert
// @access  Private (System Admin)
export const createEmergencyAlert = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      type,
      priority = 'medium',
      title,
      description,
      location,
      deviceId,
      severity = 'medium',
      affectedServices = [],
      affectedUsers = 0,
      estimatedResolutionTime
    } = req.body;

    // Validate required fields
    if (!type || !title || !description || !location) {
      res.status(400).json({ 
        message: 'Type, title, description, and location are required' 
      });
      return;
    }

    // Get current user info from middleware
    const reportedBy = {
      userId: req.user!._id,
      name: req.user!.name,
      role: req.user!.role,
      contactMethod: 'system' as const
    };

    // Prepare emergency data
    const emergencyData: any = {
      type,
      priority,
      title,
      description,
      location,
      reportedBy,
      severity,
      affectedServices,
      affectedUsers,
      timeline: [{
        timestamp: new Date(),
        action: 'Emergency Created',
        performedBy: {
          userId: req.user!._id,
          name: req.user!.name,
          role: req.user!.role
        },
        details: `Emergency alert created: ${title}`
      }]
    };

    // Add device information if provided
    if (deviceId) {
      const device = await Device.findById(deviceId);
      if (device) {
        emergencyData.relatedDevice = {
          deviceId: device._id,
          deviceIdString: device.deviceId,
          vehicleNumber: device.vehicleNumber,
          lastKnownLocation: {
            latitude: device.location.latitude,
            longitude: device.location.longitude,
            address: device.location.address
          }
        };
        emergencyData.location.deviceId = device.deviceId;
        emergencyData.location.vehicleNumber = device.vehicleNumber;
      }
    }

    // Add estimated resolution time if provided
    if (estimatedResolutionTime) {
      emergencyData.estimatedResolutionTime = new Date(estimatedResolutionTime);
    }

    // Create emergency
    const emergency = await Emergency.create(emergencyData);

    // If critical priority, auto-escalate
    if (priority === 'critical') {
      emergency.escalationLevel = 3;
      await emergency.save();
    }

    console.log(`🚨 Emergency created: ${emergency.incidentId} - ${priority.toUpperCase()} priority`);

    // ====== REAL-TIME NOTIFICATIONS ======
    try {
      const realTimeService = getRealTimeEmergencyService();
      
      // Send real-time notification
      await realTimeService.notifyEmergencyCreated(emergency);
      
      console.log(`📡 Real-time emergency notification sent for ${emergency.incidentId}`);
    } catch (realTimeError) {
      console.error('Real-time notification failed:', realTimeError);
      // Continue processing even if real-time fails
    }

    // ====== MULTI-CHANNEL NOTIFICATIONS ======
    
    // 1. EMAIL NOTIFICATIONS
    if (priority === 'critical' || priority === 'high') {
      try {
        // Get admin users for email notification
        const adminUsers = await User.find({
          role: { $in: ['system_admin', 'route_admin', 'company_admin'] },
          isActive: true
        }).select('name email');

        // Send email to each admin
        const emailPromises = adminUsers.map(async (admin) => {
          const emailHtml = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e4e4e4; border-radius: 8px;">
              <div style="text-align: center; margin-bottom: 20px;">
                <h1 style="color: #dc2626; margin-bottom: 5px;">🚨 EMERGENCY ALERT</h1>
                <p style="color: #5f6368; font-size: 16px;">${priority.toUpperCase()} Priority Incident</p>
              </div>
              
              <div style="border-top: 2px solid #dc2626; border-bottom: 2px solid #dc2626; padding: 20px 0; margin-bottom: 20px;">
                <h2 style="color: #dc2626; margin-bottom: 15px;">${title}</h2>
                <p style="margin-bottom: 15px;"><strong>Incident ID:</strong> ${emergency.incidentId}</p>
                <p style="margin-bottom: 15px;"><strong>Type:</strong> ${type.charAt(0).toUpperCase() + type.slice(1)}</p>
                <p style="margin-bottom: 15px;"><strong>Location:</strong> ${location.address}</p>
                <p style="margin-bottom: 15px;"><strong>Description:</strong> ${description}</p>
                <p style="margin-bottom: 15px;"><strong>Reported by:</strong> ${reportedBy.name} (${reportedBy.role})</p>
                <p style="margin-bottom: 0;"><strong>Time:</strong> ${new Date().toLocaleString()}</p>
              </div>
              
              <div style="color: #5f6368; font-size: 13px;">
                <p>This is an automated emergency alert from Sri Express Emergency Management System.</p>
                <p style="margin-top: 15px;">© ${new Date().getFullYear()} Sri Express. All rights reserved.</p>
              </div>
            </div>
          `;

          return sendEmail({
            email: admin.email,
            subject: `🚨 ${priority.toUpperCase()} EMERGENCY: ${title}`,
            html: emailHtml
          });
        });

        await Promise.all(emailPromises);
        console.log(`📧 Email notifications sent to ${adminUsers.length} administrators`);
      } catch (emailError) {
        console.error('Email notification failed:', emailError);
      }
    }

    // 2. SMS NOTIFICATIONS (for critical emergencies)
    if (priority === 'critical') {
      try {
        const adminUsers = await User.find({
          role: 'system_admin',
          isActive: true,
          phone: { $exists: true, $ne: null }
        }).select('name phone');

        const smsPromises = adminUsers.map(async (admin) => {
          if (admin.phone) {
            const smsMessage = `🚨 CRITICAL EMERGENCY: ${title} - Location: ${location.address} - Incident: ${emergency.incidentId} - Time: ${new Date().toLocaleTimeString()}`;
            return sendSMS(admin.phone, smsMessage);
          }
        });

        await Promise.all(smsPromises);
        console.log(`📱 SMS alerts sent to ${adminUsers.length} system administrators`);
      } catch (smsError) {
        console.error('SMS notification failed:', smsError);
      }
    }

    // 3. PUSH NOTIFICATIONS
    try {
      const targetUsers = await User.find({
        role: { $in: priority === 'critical' ? ['system_admin', 'route_admin', 'company_admin', 'client'] : ['system_admin', 'route_admin', 'company_admin'] },
        isActive: true
      }).select('_id name');

      const pushPromises = targetUsers.map(async (user) => {
        return sendPushNotification(
          user._id.toString(),
          `🚨 ${priority.toUpperCase()} Emergency`,
          `${title} - ${location.address}`,
          {
            emergencyId: (emergency._id as any)?.toString() || '',
            incidentId: emergency.incidentId,
            priority: priority,
            type: type
          }
        );
      });

      await Promise.all(pushPromises);
      console.log(`🔔 Push notifications sent to ${targetUsers.length} users`);
    } catch (pushError) {
      console.error('Push notification failed:', pushError);
    }

    // Return response
    res.status(201).json({
      message: 'Emergency alert created successfully with multi-channel notifications',
      emergency: {
        _id: emergency._id,
        incidentId: emergency.incidentId,
        type: emergency.type,
        priority: emergency.priority,
        title: emergency.title,
        status: emergency.status,
        location: emergency.location,
        createdAt: emergency.createdAt
      },
      notifications: {
        realTime: 'sent',
        email: priority === 'critical' || priority === 'high' ? 'sent' : 'skipped',
        sms: priority === 'critical' ? 'sent' : 'skipped',
        push: 'sent'
      }
    });
  } catch (error) {
    console.error('Create emergency alert error:', error);
    res.status(500).json({ 
      message: 'Server error', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
};

// @desc    Get all incidents with pagination and filtering
// @route   GET /api/admin/emergency/incidents
// @access  Private (System Admin)
export const getAllIncidents = async (req: Request, res: Response): Promise<void> => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      status = 'all',
      priority = 'all',
      type = 'all',
      search = '',
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build query
    let query: any = { isActive: true };

    // Status filter
    if (status !== 'all') {
      query.status = status;
    }

    // Priority filter
    if (priority !== 'all') {
      query.priority = priority;
    }

    // Type filter
    if (type !== 'all') {
      query.type = type;
    }

    // Search functionality
    if (search) {
      query.$or = [
        { incidentId: { $regex: search, $options: 'i' } },
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    // Calculate pagination
    const pageNumber = parseInt(page as string);
    const pageSize = parseInt(limit as string);
    const skip = (pageNumber - 1) * pageSize;

    // Build sort object
    const sort: any = {};
    sort[sortBy as string] = sortOrder === 'desc' ? -1 : 1;

    // Get incidents with pagination
    const incidents = await Emergency.find(query)
      .sort(sort)
      .skip(skip)
      .limit(pageSize)
      .populate('reportedBy.userId', 'name email role')
      .populate('relatedDevice.deviceId', 'deviceId vehicleNumber')
      .select('-timeline -notifications'); // Exclude heavy fields for list view

    // Get total count for pagination
    const totalIncidents = await Emergency.countDocuments(query);

    res.json({
      incidents,
      pagination: {
        currentPage: pageNumber,
        totalPages: Math.ceil(totalIncidents / pageSize),
        totalIncidents,
        hasNext: pageNumber < Math.ceil(totalIncidents / pageSize),
        hasPrev: pageNumber > 1
      }
    });
  } catch (error) {
    console.error('Get all incidents error:', error);
    res.status(500).json({ 
      message: 'Server error', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
};

// @desc    Resolve emergency incident with real-time notifications
// @route   PUT /api/admin/emergency/:id/resolve
// @access  Private (System Admin)
export const resolveEmergency = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const {
      resolutionMethod,
      resolutionNotes,
      followUpRequired = false,
      followUpDate
    } = req.body;

    // Validate required fields
    if (!resolutionMethod || !resolutionNotes) {
      res.status(400).json({ 
        message: 'Resolution method and notes are required' 
      });
      return;
    }

    // Find emergency
    const emergency = await Emergency.findById(id);
    if (!emergency) {
      res.status(404).json({ message: 'Emergency incident not found' });
      return;
    }

    // Check if already resolved
    if (emergency.status === 'resolved' || emergency.status === 'closed') {
      res.status(400).json({ message: 'Emergency is already resolved' });
      return;
    }

    // Store old priority for notification purposes
    const oldPriority = emergency.priority;

    // Prepare resolution data
    const resolutionData = {
      resolvedBy: {
        userId: req.user!._id,
        name: req.user!.name,
        role: req.user!.role
      },
      resolutionMethod,
      resolutionNotes,
      followUpRequired,
      followUpDate: followUpRequired && followUpDate ? new Date(followUpDate) : undefined
    };

    // Resolve emergency
    await emergency.resolve(resolutionData);

    // Add timeline entry
    await emergency.addTimelineEntry(
      'Emergency Resolved',
      {
        userId: req.user!._id,
        name: req.user!.name,
        role: req.user!.role
      },
      `Emergency resolved using ${resolutionMethod}. ${resolutionNotes}`
    );

    console.log(`✅ Emergency resolved: ${emergency.incidentId}`);

    // ====== REAL-TIME NOTIFICATIONS FOR RESOLUTION ======
    try {
      const realTimeService = getRealTimeEmergencyService();
      
      // Send real-time resolution notification
      await realTimeService.notifyEmergencyResolved(emergency);
      
      console.log(`📡 Real-time resolution notification sent for ${emergency.incidentId}`);
    } catch (realTimeError) {
      console.error('Real-time resolution notification failed:', realTimeError);
    }

    // ====== EMAIL NOTIFICATION FOR HIGH/CRITICAL RESOLUTIONS ======
    if (oldPriority === 'critical' || oldPriority === 'high') {
      try {
        const adminUsers = await User.find({
          role: { $in: ['system_admin', 'route_admin', 'company_admin'] },
          isActive: true
        }).select('name email');

        const emailPromises = adminUsers.map(async (admin) => {
          const emailHtml = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e4e4e4; border-radius: 8px;">
              <div style="text-align: center; margin-bottom: 20px;">
                <h1 style="color: #10b981; margin-bottom: 5px;">✅ EMERGENCY RESOLVED</h1>
                <p style="color: #5f6368; font-size: 16px;">${oldPriority.toUpperCase()} Priority Incident Closed</p>
              </div>
              
              <div style="border-top: 2px solid #10b981; border-bottom: 2px solid #10b981; padding: 20px 0; margin-bottom: 20px;">
                <h2 style="color: #10b981; margin-bottom: 15px;">${emergency.title}</h2>
                <p style="margin-bottom: 15px;"><strong>Incident ID:</strong> ${emergency.incidentId}</p>
                <p style="margin-bottom: 15px;"><strong>Resolution Method:</strong> ${resolutionMethod}</p>
                <p style="margin-bottom: 15px;"><strong>Notes:</strong> ${resolutionNotes}</p>
                <p style="margin-bottom: 15px;"><strong>Resolved by:</strong> ${req.user!.name} (${req.user!.role})</p>
                <p style="margin-bottom: 0;"><strong>Resolution Time:</strong> ${new Date().toLocaleString()}</p>
              </div>
              
              <div style="color: #5f6368; font-size: 13px;">
                <p>This emergency has been successfully resolved and closed.</p>
                <p style="margin-top: 15px;">© ${new Date().getFullYear()} Sri Express. All rights reserved.</p>
              </div>
            </div>
          `;

          return sendEmail({
            email: admin.email,
            subject: `✅ RESOLVED: ${emergency.title} (${emergency.incidentId})`,
            html: emailHtml
          });
        });

        await Promise.all(emailPromises);
        console.log(`📧 Resolution email notifications sent to ${adminUsers.length} administrators`);
      } catch (emailError) {
        console.error('Resolution email notification failed:', emailError);
      }
    }

    res.json({
      message: 'Emergency resolved successfully with notifications sent',
      emergency: {
        _id: emergency._id,
        incidentId: emergency.incidentId,
        status: emergency.status,
        resolution: emergency.resolution,
        actualResolutionTime: emergency.actualResolutionTime
      }
    });
  } catch (error) {
    console.error('Resolve emergency error:', error);
    res.status(500).json({ 
      message: 'Server error', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
};

// @desc    Send system-wide emergency broadcast with real-time delivery
// @route   POST /api/admin/emergency/broadcast
// @access  Private (System Admin)
export const sendEmergencyBroadcast = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      message,
      recipients = 'all', // 'all', 'admins', 'users', 'drivers'
      method = 'system', // 'system', 'email', 'sms', 'push'
      priority = 'high',
      relatedIncident
    } = req.body;

    // Validate required fields
    if (!message) {
      res.status(400).json({ message: 'Broadcast message is required' });
      return;
    }

    // Get recipient count based on type
    let recipientCount = 0;
    let recipientQuery: any = { isActive: true };

    switch (recipients) {
      case 'admins':
        recipientQuery.role = { $in: ['system_admin', 'route_admin', 'company_admin'] };
        break;
      case 'drivers':
        recipientQuery.role = 'route_admin';
        break;
      case 'users':
        recipientQuery.role = 'client';
        break;
      case 'all':
      default:
        // No additional filter for all users
        break;
    }

    recipientCount = await User.countDocuments(recipientQuery);

    // Create broadcast record
    const broadcastData = {
      incidentId: `BROADCAST-${Date.now()}`,
      type: 'system' as const,
      priority: priority as 'critical' | 'high' | 'medium' | 'low',
      title: 'System-wide Emergency Broadcast',
      description: message,
      location: {
        latitude: 0,
        longitude: 0,
        address: 'System-wide'
      },
      reportedBy: {
        userId: req.user!._id,
        name: req.user!.name,
        role: req.user!.role,
        contactMethod: 'system' as const
      },
      severity: priority === 'critical' ? 'critical' as const : 'high' as const,
      affectedUsers: recipientCount,
      notifications: {
        sent: [],
        broadcast: [{
          message,
          sentAt: new Date(),
          recipients,
          method: method as 'system' | 'sms' | 'email' | 'push'
        }]
      },
      timeline: [{
        timestamp: new Date(),
        action: 'Emergency Broadcast Sent',
        performedBy: {
          userId: req.user!._id,
          name: req.user!.name,
          role: req.user!.role
        },
        details: `Broadcast sent to ${recipients} via ${method}. Recipients: ${recipientCount}`
      }]
    };

    // Create broadcast emergency record
    const broadcast = await Emergency.create(broadcastData);

    // If related to existing incident, link them
    if (relatedIncident) {
      const incident = await Emergency.findById(relatedIncident);
      if (incident) {
        await incident.addTimelineEntry(
          'Broadcast Sent',
          {
            userId: req.user!._id,
            name: req.user!.name,
            role: req.user!.role
          },
          `Emergency broadcast sent to ${recipients}. Message: ${message}`
        );
      }
    }

    console.log(`📢 Emergency broadcast created: ${broadcast.incidentId}`);

    // ====== REAL-TIME BROADCAST DELIVERY ======
    try {
      const realTimeService = getRealTimeEmergencyService();
      
      // Send real-time broadcast
      await realTimeService.sendSystemBroadcast(message, priority, [recipients]);
      
      console.log(`📡 Real-time broadcast delivered to ${recipients} (${recipientCount} users)`);
    } catch (realTimeError) {
      console.error('Real-time broadcast failed:', realTimeError);
    }

    // ====== MULTI-CHANNEL BROADCAST DELIVERY ======
    
    // EMAIL BROADCAST
    if (method === 'email' || method === 'system') {
      try {
        const users = await User.find(recipientQuery).select('name email');
        
        const emailPromises = users.map(async (user) => {
          const emailHtml = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e4e4e4; border-radius: 8px;">
              <div style="text-align: center; margin-bottom: 20px;">
                <h1 style="color: #f59e0b; margin-bottom: 5px;">📢 SYSTEM BROADCAST</h1>
                <p style="color: #5f6368; font-size: 16px;">${priority.toUpperCase()} Priority Message</p>
              </div>
              
              <div style="border-top: 2px solid #f59e0b; border-bottom: 2px solid #f59e0b; padding: 20px 0; margin-bottom: 20px;">
                <h2 style="color: #f59e0b; margin-bottom: 15px;">System-wide Announcement</h2>
                <p style="margin-bottom: 15px; font-size: 16px; line-height: 1.6;">${message}</p>
                <p style="margin-bottom: 15px;"><strong>Broadcast ID:</strong> ${broadcast.incidentId}</p>
                <p style="margin-bottom: 0;"><strong>Time:</strong> ${new Date().toLocaleString()}</p>
              </div>
              
              <div style="color: #5f6368; font-size: 13px;">
                <p>This is an automated system broadcast from Sri Express Emergency Management System.</p>
                <p style="margin-top: 15px;">© ${new Date().getFullYear()} Sri Express. All rights reserved.</p>
              </div>
            </div>
          `;

          return sendEmail({
            email: user.email,
            subject: `📢 ${priority.toUpperCase()} SYSTEM BROADCAST`,
            html: emailHtml
          });
        });

        await Promise.all(emailPromises);
        console.log(`📧 Email broadcast sent to ${users.length} recipients`);
      } catch (emailError) {
        console.error('Email broadcast failed:', emailError);
      }
    }

    // SMS BROADCAST (for critical priority)
    if ((method === 'sms' || method === 'system') && priority === 'critical') {
      try {
        const users = await User.find({
          ...recipientQuery,
          phone: { $exists: true, $ne: null }
        }).select('name phone');

        const smsPromises = users.map(async (user) => {
          if (user.phone) {
            const smsMessage = `📢 CRITICAL BROADCAST: ${message} - Sri Express Emergency System - ${new Date().toLocaleTimeString()}`;
            return sendSMS(user.phone, smsMessage);
          }
        });

        await Promise.all(smsPromises);
        console.log(`📱 SMS broadcast sent to ${users.length} recipients`);
      } catch (smsError) {
        console.error('SMS broadcast failed:', smsError);
      }
    }

    res.json({
      message: 'Emergency broadcast sent successfully via multiple channels',
      broadcast: {
        _id: broadcast._id,
        incidentId: broadcast.incidentId,
        message,
        recipients,
        recipientCount,
        method,
        priority,
        sentAt: new Date(),
        deliveryChannels: {
          realTime: 'delivered',
          email: method === 'email' || method === 'system' ? 'sent' : 'skipped',
          sms: (method === 'sms' || method === 'system') && priority === 'critical' ? 'sent' : 'skipped'
        }
      }
    });
  } catch (error) {
    console.error('Send emergency broadcast error:', error);
    res.status(500).json({ 
      message: 'Server error', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
};

// @desc    Get emergency response teams
// @route   GET /api/admin/emergency/teams
// @access  Private (System Admin)
export const getEmergencyTeams = async (req: Request, res: Response): Promise<void> => {
  try {
    // Get all admin users who can be part of emergency teams
    const adminUsers = await User.find({
      role: { $in: ['system_admin', 'route_admin', 'company_admin'] },
      isActive: true
    }).select('name email role phone department');

    // Mock emergency teams structure (in real implementation, you'd have a Teams collection)
    const teams: EmergencyTeam[] = [
      {
        teamId: 'TEAM-001',
        teamName: 'Primary Response Team',
        members: adminUsers.slice(0, 3).map(user => ({
          userId: user._id,
          name: user.name,
          role: user.role,
          contactNumber: user.phone || '+94771234567'
        }))
      },
      {
        teamId: 'TEAM-002',
        teamName: 'Technical Support Team',
        members: adminUsers.slice(3, 6).map(user => ({
          userId: user._id,
          name: user.name,
          role: user.role,
          contactNumber: user.phone || '+94771234567'
        }))
      },
      {
        teamId: 'TEAM-003',
        teamName: 'Medical Emergency Team',
        members: adminUsers.slice(6, 9).map(user => ({
          userId: user._id,
          name: user.name,
          role: user.role,
          contactNumber: user.phone || '+94771234567'
        }))
      }
    ];

    // Get team assignment statistics
    const teamStats = await Emergency.aggregate([
      {
        $match: {
          'assignedTeam.teamId': { $exists: true },
          isActive: true
        }
      },
      {
        $group: {
          _id: '$assignedTeam.teamId',
          assignedIncidents: { $sum: 1 },
          activeIncidents: {
            $sum: {
              $cond: [{ $in: ['$status', ['active', 'responded']] }, 1, 0]
            }
          },
          resolvedIncidents: {
            $sum: {
              $cond: [{ $eq: ['$status', 'resolved'] }, 1, 0]
            }
          }
        }
      }
    ]);

    // Add statistics to teams
    const teamsWithStats = teams.map(team => {
      const stats = teamStats.find(stat => stat._id === team.teamId);
      return {
        ...team,
        statistics: {
          assignedIncidents: stats?.assignedIncidents || 0,
          activeIncidents: stats?.activeIncidents || 0,
          resolvedIncidents: stats?.resolvedIncidents || 0,
          status: stats?.activeIncidents > 0 ? 'busy' : 'available'
        }
      };
    });

    res.json({
      teams: teamsWithStats,
      summary: {
        totalTeams: teams.length,
        availableTeams: teamsWithStats.filter(t => t.statistics.status === 'available').length,
        busyTeams: teamsWithStats.filter(t => t.statistics.status === 'busy').length,
        totalMembers: teams.reduce((sum, team) => sum + team.members.length, 0)
      }
    });
  } catch (error) {
    console.error('Get emergency teams error:', error);
    res.status(500).json({ 
      message: 'Server error', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
};