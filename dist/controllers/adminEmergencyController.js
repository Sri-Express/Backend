"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getEmergencyTeams = exports.sendEmergencyBroadcast = exports.resolveEmergency = exports.getAllIncidents = exports.createEmergencyAlert = exports.getEmergencyDashboard = void 0;
const Emergency_1 = __importDefault(require("../models/Emergency"));
const Device_1 = __importDefault(require("../models/Device"));
const User_1 = __importDefault(require("../models/User"));
// @desc    Get emergency dashboard data
// @route   GET /api/admin/emergency
// @access  Private (System Admin)
const getEmergencyDashboard = async (req, res) => {
    var _a, _b;
    try {
        // Get total emergencies
        const totalEmergencies = await Emergency_1.default.countDocuments({ isActive: true });
        // Get active emergencies
        const activeEmergencies = await Emergency_1.default.countDocuments({
            status: { $in: ['active', 'responded'] },
            isActive: true
        });
        // Get emergencies by priority
        const emergenciesByPriority = await Emergency_1.default.aggregate([
            { $match: { isActive: true } },
            {
                $group: {
                    _id: '$priority',
                    count: { $sum: 1 }
                }
            }
        ]);
        // Get emergencies by type
        const emergenciesByType = await Emergency_1.default.aggregate([
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
        const recentEmergencies = await Emergency_1.default.find({
            createdAt: { $gte: yesterday },
            isActive: true
        })
            .sort({ createdAt: -1 })
            .limit(10)
            .select('incidentId title type priority status createdAt location reportedBy');
        // Get critical active emergencies
        const criticalEmergencies = await Emergency_1.default.find({
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
        const responseTimeStats = await Emergency_1.default.aggregate([
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
        const resolutionStats = await Emergency_1.default.aggregate([
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
        const deviceAlerts = await Device_1.default.find({
            'alerts.count': { $gt: 0 },
            isActive: true
        }).countDocuments();
        // Get offline devices count
        const offlineDevices = await Device_1.default.countDocuments({
            status: 'offline',
            isActive: true
        });
        // Format priority statistics
        const priorityStats = emergenciesByPriority.reduce((acc, item) => {
            acc[item._id] = item.count;
            return acc;
        }, {});
        // Format type statistics
        const typeStats = emergenciesByType.reduce((acc, item) => {
            acc[item._id] = item.count;
            return acc;
        }, {});
        const dashboardData = {
            overview: {
                totalEmergencies,
                activeEmergencies,
                resolvedToday: await Emergency_1.default.countDocuments({
                    status: 'resolved',
                    actualResolutionTime: { $gte: yesterday },
                    isActive: true
                }),
                criticalCount: await Emergency_1.default.countDocuments({
                    priority: 'critical',
                    status: { $in: ['active', 'responded'] },
                    isActive: true
                })
            },
            statistics: {
                byPriority: priorityStats,
                byType: typeStats,
                averageResponseTime: ((_a = responseTimeStats[0]) === null || _a === void 0 ? void 0 : _a.averageResponseTime) ?
                    Math.round(responseTimeStats[0].averageResponseTime / 60000) : 0, // Convert to minutes
                averageResolutionTime: ((_b = resolutionStats[0]) === null || _b === void 0 ? void 0 : _b.averageResolutionTime) ?
                    Math.round(resolutionStats[0].averageResolutionTime / 3600000) : 0, // Convert to hours
            },
            alerts: {
                deviceAlerts,
                offlineDevices,
                escalatedEmergencies: await Emergency_1.default.countDocuments({
                    escalationLevel: { $gte: 3 },
                    status: { $in: ['active', 'responded'] },
                    isActive: true
                })
            },
            recentEmergencies,
            criticalEmergencies
        };
        res.json(dashboardData);
    }
    catch (error) {
        console.error('Get emergency dashboard error:', error);
        res.status(500).json({
            message: 'Server error',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
exports.getEmergencyDashboard = getEmergencyDashboard;
// @desc    Create emergency alert
// @route   POST /api/admin/emergency/alert
// @access  Private (System Admin)
const createEmergencyAlert = async (req, res) => {
    try {
        const { type, priority = 'medium', title, description, location, deviceId, severity = 'medium', affectedServices = [], affectedUsers = 0, estimatedResolutionTime } = req.body;
        // Validate required fields
        if (!type || !title || !description || !location) {
            res.status(400).json({
                message: 'Type, title, description, and location are required'
            });
            return;
        }
        // Get current user info from middleware
        const reportedBy = {
            userId: req.user._id,
            name: req.user.name,
            role: req.user.role,
            contactMethod: 'system'
        };
        // Prepare emergency data
        const emergencyData = {
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
                        userId: req.user._id,
                        name: req.user.name,
                        role: req.user.role
                    },
                    details: `Emergency alert created: ${title}`
                }]
        };
        // Add device information if provided
        if (deviceId) {
            const device = await Device_1.default.findById(deviceId);
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
        const emergency = await Emergency_1.default.create(emergencyData);
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
    }
    catch (error) {
        console.error('Create emergency alert error:', error);
        res.status(500).json({
            message: 'Server error',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
exports.createEmergencyAlert = createEmergencyAlert;
// @desc    Get all incidents with pagination and filtering
// @route   GET /api/admin/emergency/incidents
// @access  Private (System Admin)
const getAllIncidents = async (req, res) => {
    try {
        const { page = 1, limit = 10, status = 'all', priority = 'all', type = 'all', search = '', sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
        // Build query
        let query = { isActive: true };
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
        const pageNumber = parseInt(page);
        const pageSize = parseInt(limit);
        const skip = (pageNumber - 1) * pageSize;
        // Build sort object
        const sort = {};
        sort[sortBy] = sortOrder === 'desc' ? -1 : 1;
        // Get incidents with pagination
        const incidents = await Emergency_1.default.find(query)
            .sort(sort)
            .skip(skip)
            .limit(pageSize)
            .populate('reportedBy.userId', 'name email role')
            .populate('relatedDevice.deviceId', 'deviceId vehicleNumber')
            .select('-timeline -notifications'); // Exclude heavy fields for list view
        // Get total count for pagination
        const totalIncidents = await Emergency_1.default.countDocuments(query);
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
    }
    catch (error) {
        console.error('Get all incidents error:', error);
        res.status(500).json({
            message: 'Server error',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
exports.getAllIncidents = getAllIncidents;
// @desc    Resolve emergency incident
// @route   PUT /api/admin/emergency/:id/resolve
// @access  Private (System Admin)
const resolveEmergency = async (req, res) => {
    try {
        const { id } = req.params;
        const { resolutionMethod, resolutionNotes, followUpRequired = false, followUpDate } = req.body;
        // Validate required fields
        if (!resolutionMethod || !resolutionNotes) {
            res.status(400).json({
                message: 'Resolution method and notes are required'
            });
            return;
        }
        // Find emergency
        const emergency = await Emergency_1.default.findById(id);
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
                userId: req.user._id,
                name: req.user.name,
                role: req.user.role
            },
            resolutionMethod,
            resolutionNotes,
            followUpRequired,
            followUpDate: followUpRequired && followUpDate ? new Date(followUpDate) : undefined
        };
        // Resolve emergency
        await emergency.resolve(resolutionData);
        // Add timeline entry
        await emergency.addTimelineEntry('Emergency Resolved', {
            userId: req.user._id,
            name: req.user.name,
            role: req.user.role
        }, `Emergency resolved using ${resolutionMethod}. ${resolutionNotes}`);
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
    }
    catch (error) {
        console.error('Resolve emergency error:', error);
        res.status(500).json({
            message: 'Server error',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
exports.resolveEmergency = resolveEmergency;
// @desc    Send system-wide emergency broadcast
// @route   POST /api/admin/emergency/broadcast
// @access  Private (System Admin)
const sendEmergencyBroadcast = async (req, res) => {
    try {
        const { message, recipients = 'all', // 'all', 'admins', 'users', 'drivers'
        method = 'system', // 'system', 'email', 'sms', 'push'
        priority = 'high', relatedIncident } = req.body;
        // Validate required fields
        if (!message) {
            res.status(400).json({ message: 'Broadcast message is required' });
            return;
        }
        // Get recipient count based on type
        let recipientCount = 0;
        let recipientQuery = { isActive: true };
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
        recipientCount = await User_1.default.countDocuments(recipientQuery);
        // Create broadcast record
        const broadcastData = {
            incidentId: `BROADCAST-${Date.now()}`,
            type: 'system',
            priority: priority,
            title: 'System-wide Emergency Broadcast',
            description: message,
            location: {
                latitude: 0,
                longitude: 0,
                address: 'System-wide'
            },
            reportedBy: {
                userId: req.user._id,
                name: req.user.name,
                role: req.user.role,
                contactMethod: 'system'
            },
            severity: priority === 'critical' ? 'critical' : 'high',
            affectedUsers: recipientCount,
            notifications: {
                sent: [],
                broadcast: [{
                        message,
                        sentAt: new Date(),
                        recipients,
                        method: method
                    }]
            },
            timeline: [{
                    timestamp: new Date(),
                    action: 'Emergency Broadcast Sent',
                    performedBy: {
                        userId: req.user._id,
                        name: req.user.name,
                        role: req.user.role
                    },
                    details: `Broadcast sent to ${recipients} via ${method}. Recipients: ${recipientCount}`
                }]
        };
        // Create broadcast emergency record
        const broadcast = await Emergency_1.default.create(broadcastData);
        // If related to existing incident, link them
        if (relatedIncident) {
            const incident = await Emergency_1.default.findById(relatedIncident);
            if (incident) {
                await incident.addTimelineEntry('Broadcast Sent', {
                    userId: req.user._id,
                    name: req.user.name,
                    role: req.user.role
                }, `Emergency broadcast sent to ${recipients}. Message: ${message}`);
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
    }
    catch (error) {
        console.error('Send emergency broadcast error:', error);
        res.status(500).json({
            message: 'Server error',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
exports.sendEmergencyBroadcast = sendEmergencyBroadcast;
// @desc    Get emergency response teams
// @route   GET /api/admin/emergency/teams
// @access  Private (System Admin)
const getEmergencyTeams = async (req, res) => {
    try {
        // Get all admin users who can be part of emergency teams
        const adminUsers = await User_1.default.find({
            role: { $in: ['system_admin', 'route_admin', 'company_admin'] },
            isActive: true
        }).select('name email role phone department');
        // Mock emergency teams structure (in real implementation, you'd have a Teams collection)
        const teams = [
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
        const teamStats = await Emergency_1.default.aggregate([
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
                    assignedIncidents: (stats === null || stats === void 0 ? void 0 : stats.assignedIncidents) || 0,
                    activeIncidents: (stats === null || stats === void 0 ? void 0 : stats.activeIncidents) || 0,
                    resolvedIncidents: (stats === null || stats === void 0 ? void 0 : stats.resolvedIncidents) || 0,
                    status: (stats === null || stats === void 0 ? void 0 : stats.activeIncidents) > 0 ? 'busy' : 'available'
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
    }
    catch (error) {
        console.error('Get emergency teams error:', error);
        res.status(500).json({
            message: 'Server error',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
exports.getEmergencyTeams = getEmergencyTeams;
