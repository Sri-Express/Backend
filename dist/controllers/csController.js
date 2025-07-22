"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAnalytics = exports.getAgentWorkload = exports.getDashboard = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const User_1 = __importDefault(require("../models/User"));
const Ticket_1 = __importDefault(require("../models/Ticket"));
const Chat_1 = __importDefault(require("../models/Chat"));
const KnowledgeBase_1 = __importDefault(require("../models/KnowledgeBase"));
const UserActivity_1 = __importDefault(require("../models/UserActivity"));
// CS Dashboard Overview
const getDashboard = async (req, res) => {
    var _a;
    try {
        const agentId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        const { period = '7' } = req.query;
        const days = parseInt(period);
        const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
        // Parallel queries for dashboard data
        const [ticketStats, chatStats, agentTickets, agentChats, recentActivity, systemAlerts, knowledgeStats, customerSatisfaction] = await Promise.all([
            // Overall ticket statistics
            Ticket_1.default.aggregate([
                { $match: { isActive: true } },
                {
                    $group: {
                        _id: '$status',
                        count: { $sum: 1 }
                    }
                }
            ]),
            // Overall chat statistics
            Chat_1.default.aggregate([
                { $match: { isActive: true } },
                {
                    $group: {
                        _id: '$status',
                        count: { $sum: 1 },
                        avgDuration: { $avg: '$duration' }
                    }
                }
            ]),
            // Agent's assigned tickets
            Ticket_1.default.find({
                assignedAgent: agentId,
                status: { $in: ['open', 'in_progress'] },
                isActive: true
            }).countDocuments(),
            // Agent's active chats
            Chat_1.default.find({
                assignedAgent: agentId,
                status: 'active',
                isActive: true
            }).countDocuments(),
            // Recent CS activity
            UserActivity_1.default.find({
                category: { $in: ['cs', 'support', 'ticket', 'chat'] },
                timestamp: { $gte: startDate }
            })
                .sort({ timestamp: -1 })
                .limit(10)
                .populate('userId', 'name email'),
            // System alerts (high priority tickets, long wait times, etc.)
            getSystemAlerts(),
            // Knowledge base statistics
            KnowledgeBase_1.default.aggregate([
                { $match: { status: 'published', isActive: true } },
                {
                    $group: {
                        _id: '$category',
                        count: { $sum: 1 },
                        totalViews: { $sum: '$analytics.views' }
                    }
                }
            ]),
            // Customer satisfaction metrics
            Ticket_1.default.aggregate([
                {
                    $match: {
                        'resolution.customerSatisfaction': { $exists: true },
                        'resolution.resolvedAt': { $gte: startDate }
                    }
                },
                {
                    $group: {
                        _id: null,
                        avgSatisfaction: { $avg: '$resolution.customerSatisfaction' },
                        totalRatings: { $sum: 1 }
                    }
                }
            ])
        ]);
        // Process ticket stats
        const ticketSummary = {
            open: 0,
            in_progress: 0,
            pending_customer: 0,
            resolved: 0,
            closed: 0,
            total: 0
        };
        ticketStats.forEach((stat) => {
            ticketSummary[stat._id] = stat.count;
            ticketSummary.total += stat.count;
        });
        // Process chat stats
        const chatSummary = {
            waiting: 0,
            active: 0,
            ended: 0,
            total: 0,
            avgDuration: 0
        };
        chatStats.forEach((stat) => {
            chatSummary[stat._id] = stat.count;
            chatSummary.total += stat.count;
            if (stat._id === 'ended') {
                chatSummary.avgDuration = Math.round(stat.avgDuration || 0);
            }
        });
        // Get agent performance metrics
        const agentPerformance = await getAgentPerformance(agentId, days);
        // Get priority queues
        const priorityQueues = await getPriorityQueues();
        res.json({
            success: true,
            data: {
                overview: {
                    tickets: ticketSummary,
                    chats: chatSummary,
                    agentWorkload: {
                        assignedTickets: agentTickets,
                        activeChats: agentChats
                    },
                    satisfaction: customerSatisfaction[0] || { avgSatisfaction: 0, totalRatings: 0 }
                },
                performance: agentPerformance,
                queues: priorityQueues,
                alerts: systemAlerts,
                recentActivity: recentActivity,
                knowledgeBase: knowledgeStats,
                period: days
            }
        });
    }
    catch (error) {
        console.error('Dashboard error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to load dashboard data',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
exports.getDashboard = getDashboard;
// Get Agent Performance Metrics
const getAgentPerformance = async (agentId, days) => {
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const [ticketMetrics, chatMetrics] = await Promise.all([
        // Ticket performance
        Ticket_1.default.aggregate([
            {
                $match: {
                    assignedAgent: new mongoose_1.default.Types.ObjectId(agentId),
                    updatedAt: { $gte: startDate }
                }
            },
            {
                $group: {
                    _id: null,
                    totalHandled: { $sum: 1 },
                    resolved: {
                        $sum: {
                            $cond: [{ $eq: ['$status', 'resolved'] }, 1, 0]
                        }
                    },
                    avgResolutionTime: {
                        $avg: {
                            $cond: [
                                { $and: [{ $eq: ['$status', 'resolved'] }, { $ne: ['$resolution', null] }] },
                                {
                                    $divide: [
                                        { $subtract: ['$resolution.resolvedAt', '$createdAt'] },
                                        3600000 // Convert to hours
                                    ]
                                },
                                null
                            ]
                        }
                    },
                    avgSatisfaction: { $avg: '$resolution.customerSatisfaction' }
                }
            }
        ]),
        // Chat performance
        Chat_1.default.aggregate([
            {
                $match: {
                    assignedAgent: new mongoose_1.default.Types.ObjectId(agentId),
                    startedAt: { $gte: startDate }
                }
            },
            {
                $group: {
                    _id: null,
                    totalChats: { $sum: 1 },
                    avgDuration: { $avg: '$duration' },
                    avgResponseTime: { $avg: '$sessionMetrics.responseTime.averageAgent' },
                    avgSatisfaction: { $avg: '$feedback.rating' }
                }
            }
        ])
    ]);
    return {
        tickets: ticketMetrics[0] || { totalHandled: 0, resolved: 0, avgResolutionTime: 0, avgSatisfaction: 0 },
        chats: chatMetrics[0] || { totalChats: 0, avgDuration: 0, avgResponseTime: 0, avgSatisfaction: 0 }
    };
};
// Get Priority Queues
const getPriorityQueues = async () => {
    const [urgentTickets, waitingChats, escalatedTickets] = await Promise.all([
        // Urgent tickets
        Ticket_1.default.find({
            priority: 'urgent',
            status: { $in: ['open', 'in_progress'] },
            isActive: true
        })
            .select('ticketId subject category priority createdAt customerInfo.name')
            .sort({ createdAt: 1 })
            .limit(5),
        // Waiting chats
        Chat_1.default.find({
            status: 'waiting',
            isActive: true
        })
            .select('sessionId customerInfo.name startedAt channel')
            .sort({ startedAt: 1 })
            .limit(5),
        // Escalated tickets
        Ticket_1.default.find({
            'escalation.escalated': true,
            status: { $in: ['open', 'in_progress'] },
            isActive: true
        })
            .select('ticketId subject priority escalation.escalatedAt escalation.reason')
            .sort({ 'escalation.escalatedAt': 1 })
            .limit(5)
    ]);
    return {
        urgent: urgentTickets,
        waiting: waitingChats,
        escalated: escalatedTickets
    };
};
// Get System Alerts
const getSystemAlerts = async () => {
    const alerts = [];
    const now = new Date();
    // Long waiting chats (>5 minutes)
    const longWaitingChats = await Chat_1.default.countDocuments({
        status: 'waiting',
        startedAt: { $lt: new Date(now.getTime() - 5 * 60 * 1000) },
        isActive: true
    });
    if (longWaitingChats > 0) {
        alerts.push({
            type: 'warning',
            message: `${longWaitingChats} customers waiting for more than 5 minutes`,
            action: 'Assign agents to waiting chats',
            priority: 'high'
        });
    }
    // Overdue tickets (>24 hours for urgent, >72 hours for others)
    const overdueUrgent = await Ticket_1.default.countDocuments({
        priority: 'urgent',
        status: { $in: ['open', 'in_progress'] },
        createdAt: { $lt: new Date(now.getTime() - 24 * 60 * 60 * 1000) },
        isActive: true
    });
    if (overdueUrgent > 0) {
        alerts.push({
            type: 'error',
            message: `${overdueUrgent} urgent tickets overdue (>24 hours)`,
            action: 'Review and prioritize urgent tickets',
            priority: 'critical'
        });
    }
    // Unassigned tickets
    const unassignedTickets = await Ticket_1.default.countDocuments({
        assignedAgent: { $exists: false },
        status: 'open',
        isActive: true
    });
    if (unassignedTickets > 5) {
        alerts.push({
            type: 'info',
            message: `${unassignedTickets} unassigned tickets in queue`,
            action: 'Assign tickets to available agents',
            priority: 'medium'
        });
    }
    return alerts;
};
// Get Agent Workload
const getAgentWorkload = async (req, res) => {
    try {
        const agents = await User_1.default.find({
            role: { $in: ['customer_service', 'system_admin'] },
            isActive: true
        }).select('name email role');
        const workload = await Promise.all(agents.map(async (agent) => {
            const [assignedTickets, activeChats, recentResolution] = await Promise.all([
                Ticket_1.default.countDocuments({
                    assignedAgent: agent._id,
                    status: { $in: ['open', 'in_progress'] },
                    isActive: true
                }),
                Chat_1.default.countDocuments({
                    assignedAgent: agent._id,
                    status: 'active',
                    isActive: true
                }),
                Ticket_1.default.countDocuments({
                    assignedAgent: agent._id,
                    status: 'resolved',
                    'resolution.resolvedAt': {
                        $gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
                    }
                })
            ]);
            return {
                agent: {
                    id: agent._id,
                    name: agent.name,
                    email: agent.email,
                    role: agent.role
                },
                workload: {
                    assignedTickets,
                    activeChats,
                    recentResolution,
                    totalActive: assignedTickets + activeChats
                }
            };
        }));
        res.json({
            success: true,
            data: workload.sort((a, b) => b.workload.totalActive - a.workload.totalActive)
        });
    }
    catch (error) {
        console.error('Agent workload error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to load agent workload',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
exports.getAgentWorkload = getAgentWorkload;
// Get CS Analytics
const getAnalytics = async (req, res) => {
    try {
        const { period = '30', type = 'overview' } = req.query;
        const days = parseInt(period);
        const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
        let analytics = {};
        switch (type) {
            case 'tickets':
                analytics = await getTicketAnalytics(startDate);
                break;
            case 'chats':
                analytics = await getChatAnalytics(startDate);
                break;
            case 'satisfaction':
                analytics = await getSatisfactionAnalytics(startDate);
                break;
            case 'performance':
                analytics = await getPerformanceAnalytics(startDate);
                break;
            default:
                analytics = await getOverviewAnalytics(startDate);
        }
        res.json({
            success: true,
            data: analytics,
            period: days
        });
    }
    catch (error) {
        console.error('Analytics error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to load analytics',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
exports.getAnalytics = getAnalytics;
// Helper analytics functions
const getTicketAnalytics = async (startDate) => {
    return await Ticket_1.default.aggregate([
        { $match: { createdAt: { $gte: startDate }, isActive: true } },
        {
            $group: {
                _id: {
                    date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
                    category: '$category'
                },
                count: { $sum: 1 }
            }
        },
        { $sort: { '_id.date': 1 } }
    ]);
};
const getChatAnalytics = async (startDate) => {
    return await Chat_1.default.aggregate([
        { $match: { startedAt: { $gte: startDate }, isActive: true } },
        {
            $group: {
                _id: {
                    date: { $dateToString: { format: '%Y-%m-%d', date: '$startedAt' } }
                },
                totalChats: { $sum: 1 },
                avgDuration: { $avg: '$duration' },
                avgSatisfaction: { $avg: '$feedback.rating' }
            }
        },
        { $sort: { '_id.date': 1 } }
    ]);
};
const getSatisfactionAnalytics = async (startDate) => {
    const [ticketSatisfaction, chatSatisfaction] = await Promise.all([
        Ticket_1.default.aggregate([
            {
                $match: {
                    'resolution.resolvedAt': { $gte: startDate },
                    'resolution.customerSatisfaction': { $exists: true }
                }
            },
            {
                $group: {
                    _id: '$resolution.customerSatisfaction',
                    count: { $sum: 1 }
                }
            }
        ]),
        Chat_1.default.aggregate([
            {
                $match: {
                    endedAt: { $gte: startDate },
                    'feedback.rating': { $exists: true }
                }
            },
            {
                $group: {
                    _id: '$feedback.rating',
                    count: { $sum: 1 }
                }
            }
        ])
    ]);
    return {
        tickets: ticketSatisfaction,
        chats: chatSatisfaction
    };
};
const getPerformanceAnalytics = async (startDate) => {
    return await User_1.default.aggregate([
        {
            $match: {
                role: { $in: ['customer_service', 'system_admin'] },
                isActive: true
            }
        },
        {
            $lookup: {
                from: 'tickets',
                let: { agentId: '$_id' },
                pipeline: [
                    {
                        $match: {
                            $expr: { $eq: ['$assignedAgent', '$$agentId'] },
                            updatedAt: { $gte: startDate },
                            status: 'resolved'
                        }
                    }
                ],
                as: 'resolvedTickets'
            }
        },
        {
            $lookup: {
                from: 'chats',
                let: { agentId: '$_id' },
                pipeline: [
                    {
                        $match: {
                            $expr: { $eq: ['$assignedAgent', '$$agentId'] },
                            startedAt: { $gte: startDate },
                            status: 'ended'
                        }
                    }
                ],
                as: 'completedChats'
            }
        },
        {
            $project: {
                name: 1,
                email: 1,
                ticketsResolved: { $size: '$resolvedTickets' },
                chatsCompleted: { $size: '$completedChats' },
                avgTicketSatisfaction: { $avg: '$resolvedTickets.resolution.customerSatisfaction' },
                avgChatSatisfaction: { $avg: '$completedChats.feedback.rating' }
            }
        }
    ]);
};
const getOverviewAnalytics = async (startDate) => {
    const [ticketTrends, chatTrends, categoryBreakdown] = await Promise.all([
        getTicketAnalytics(startDate),
        getChatAnalytics(startDate),
        Ticket_1.default.aggregate([
            { $match: { createdAt: { $gte: startDate }, isActive: true } },
            {
                $group: {
                    _id: '$category',
                    count: { $sum: 1 }
                }
            },
            { $sort: { count: -1 } }
        ])
    ]);
    return {
        ticketTrends,
        chatTrends,
        categoryBreakdown
    };
};
exports.default = {
    getDashboard: exports.getDashboard,
    getAgentWorkload: exports.getAgentWorkload,
    getAnalytics: exports.getAnalytics
};
