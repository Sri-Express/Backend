// src/controllers/adminEmergencyController.ts
import { Request, Response } from 'express';
import Emergency from '../models/Emergency';
import Device from '../models/Device';
import User from '../models/User';
import mongoose from 'mongoose';

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

// @desc    Get emergency dashboard data
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
      criticalEmergencies
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

// @desc    Create emergency alert
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

    res.status(201).json({
      message: 'Emergency alert created successfully',
      emergency: {
        _id: emergency._id,
        incidentId: emergency.incidentId,
        type: emergency.type,
        priority: emergency.priority,
        title: emergency.title,
        status: emergency.status,
        location: emergency.location,
        createdAt: emergency.createdAt
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

// @desc    Resolve emergency incident
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

    res.json({
      message: 'Emergency resolved successfully',
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

// @desc    Send system-wide emergency broadcast
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

    // In a real implementation, you would integrate with actual notification services here
    // For now, we'll simulate the broadcast
    console.log(`Emergency Broadcast Sent:
      Message: ${message}
      Recipients: ${recipients} (${recipientCount} users)
      Method: ${method}
      Priority: ${priority}
    `);

    res.json({
      message: 'Emergency broadcast sent successfully',
      broadcast: {
        _id: broadcast._id,
        incidentId: broadcast.incidentId,
        message,
        recipients,
        recipientCount,
        method,
        sentAt: new Date()
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