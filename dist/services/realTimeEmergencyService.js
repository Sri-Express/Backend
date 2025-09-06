"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRealTimeEmergencyService = exports.initializeRealTimeEmergencyService = void 0;
const socket_io_1 = require("socket.io");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const User_1 = __importDefault(require("../models/User"));
const Emergency_1 = __importDefault(require("../models/Emergency"));
class RealTimeEmergencyService {
    constructor(httpServer) {
        this.connectedUsers = new Map();
        this.userSockets = new Map(); // userId -> Set of socketIds
        this.io = new socket_io_1.Server(httpServer, {
            cors: {
                origin: process.env.FRONTEND_URL || "http://localhost:3000",
                methods: ["GET", "POST"],
                credentials: true
            },
            transports: ['websocket', 'polling']
        });
        this.setupSocketHandlers();
        this.startHeartbeat();
        console.log('🚨 Real-time Emergency Service initialized');
    }
    setupSocketHandlers() {
        this.io.use(async (socket, next) => {
            try {
                const token = socket.handshake.auth.token;
                if (!token) {
                    return next(new Error('Authentication error'));
                }
                const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
                const user = await User_1.default.findById(decoded.id).select('-password');
                if (!user) {
                    return next(new Error('User not found'));
                }
                socket.data.user = user;
                next();
            }
            catch (error) {
                next(new Error('Authentication error'));
            }
        });
        this.io.on('connection', (socket) => {
            this.handleConnection(socket);
        });
    }
    handleConnection(socket) {
        const user = socket.data.user;
        const connectedUser = {
            userId: user._id.toString(),
            socketId: socket.id,
            name: user.name,
            role: user.role,
            email: user.email,
            lastSeen: new Date()
        };
        // Store connected user
        this.connectedUsers.set(socket.id, connectedUser);
        // Add socket to user's socket set
        if (!this.userSockets.has(user._id.toString())) {
            this.userSockets.set(user._id.toString(), new Set());
        }
        this.userSockets.get(user._id.toString()).add(socket.id);
        console.log(`🔌 User connected: ${user.name} (${user.role}) - Socket: ${socket.id}`);
        // Join role-based rooms with updated mapping
        socket.join(`role:${user.role}`);
        socket.join('all_users');
        // Join specific groups based on role
        switch (user.role) {
            case 'system_admin':
                socket.join('system_admins');
                socket.join('admins');
                break;
            case 'company_admin':
                socket.join('fleet_managers');
                socket.join('admins');
                break;
            case 'route_admin':
                socket.join('routeadmins'); // For future implementation
                socket.join('admins');
                break;
            case 'customer_service':
                socket.join('customer_service');
                break;
            case 'client':
                socket.join('users');
                break;
        }
        // Send welcome message and current stats
        socket.emit('connected', {
            message: 'Connected to Emergency Alert System',
            user: {
                id: user._id,
                name: user.name,
                role: user.role
            },
            timestamp: new Date()
        });
        // Send current emergency status
        this.sendCurrentEmergencyStatus(socket);
        // Handle emergency-specific events
        socket.on('subscribe_emergency', (emergencyId) => {
            socket.join(`emergency:${emergencyId}`);
            console.log(`📡 User ${user.name} subscribed to emergency: ${emergencyId}`);
        });
        socket.on('unsubscribe_emergency', (emergencyId) => {
            socket.leave(`emergency:${emergencyId}`);
            console.log(`📡 User ${user.name} unsubscribed from emergency: ${emergencyId}`);
        });
        // Handle emergency actions
        socket.on('emergency_action', async (data) => {
            try {
                await this.handleEmergencyAction(socket, data);
            }
            catch (error) {
                socket.emit('error', { message: 'Failed to process emergency action' });
            }
        });
        // Handle ping/pong for connection health
        socket.on('ping', () => {
            socket.emit('pong', { timestamp: new Date() });
        });
        // Handle disconnection
        socket.on('disconnect', () => {
            this.handleDisconnection(socket);
        });
    }
    handleDisconnection(socket) {
        const connectedUser = this.connectedUsers.get(socket.id);
        if (connectedUser) {
            console.log(`⌐ User disconnected: ${connectedUser.name} - Socket: ${socket.id}`);
            // Remove from user sockets
            const userSockets = this.userSockets.get(connectedUser.userId);
            if (userSockets) {
                userSockets.delete(socket.id);
                if (userSockets.size === 0) {
                    this.userSockets.delete(connectedUser.userId);
                }
            }
            // Remove connected user
            this.connectedUsers.delete(socket.id);
        }
    }
    async sendCurrentEmergencyStatus(socket) {
        try {
            // Get current active emergencies
            const activeEmergencies = await Emergency_1.default.find({
                status: { $in: ['active', 'responded'] },
                isActive: true
            }).sort({ createdAt: -1 }).limit(10);
            // Get critical emergencies
            const criticalEmergencies = await Emergency_1.default.find({
                priority: 'critical',
                status: { $in: ['active', 'responded'] },
                isActive: true
            }).sort({ createdAt: -1 });
            socket.emit('emergency_status', {
                activeCount: activeEmergencies.length,
                criticalCount: criticalEmergencies.length,
                activeEmergencies: activeEmergencies,
                criticalEmergencies: criticalEmergencies,
                timestamp: new Date()
            });
        }
        catch (error) {
            console.error('Error sending emergency status:', error);
        }
    }
    async handleEmergencyAction(socket, data) {
        const user = socket.data.user;
        switch (data.action) {
            case 'get_emergency_details':
                if (data.emergencyId) {
                    const emergency = await Emergency_1.default.findById(data.emergencyId);
                    socket.emit('emergency_details', emergency);
                }
                break;
            case 'request_emergency_stats':
                await this.sendCurrentEmergencyStatus(socket);
                break;
            case 'mark_notification_read':
                // Handle notification read status
                socket.emit('notification_read', { notificationId: data.notificationId });
                break;
        }
    }
    // Public methods for sending notifications
    async broadcastEmergencyAlert(notification) {
        console.log(`🚨 Broadcasting emergency alert: ${notification.title}`);
        // Determine target rooms based on updated recipients mapping
        const rooms = [];
        notification.recipients.forEach(recipient => {
            switch (recipient) {
                case 'all':
                    rooms.push('all_users');
                    break;
                case 'system_admins':
                    rooms.push('system_admins');
                    break;
                case 'fleet_managers':
                    rooms.push('fleet_managers');
                    break;
                case 'users':
                    rooms.push('users');
                    break;
                case 'routeadmins':
                    rooms.push('routeadmins'); // For future implementation
                    break;
                case 'customer_service':
                    rooms.push('customer_service');
                    break;
                default:
                    if (recipient.startsWith('role:')) {
                        rooms.push(recipient);
                    }
                    break;
            }
        });
        // Broadcast to all specified rooms
        rooms.forEach(room => {
            this.io.to(room).emit('emergency_alert', {
                ...notification,
                room,
                connectedUsers: this.getConnectedUsersCount()
            });
        });
        // Send browser push notifications for critical alerts
        if (notification.priority === 'critical') {
            await this.sendBrowserPushNotifications(notification);
        }
        // Log the broadcast
        console.log(`📡 Emergency alert sent to rooms: ${rooms.join(', ')} - ${this.getConnectedUsersCount()} users`);
    }
    async notifyEmergencyCreated(emergency) {
        const notification = {
            id: `emergency_${emergency._id}`,
            type: 'emergency_created',
            title: `New ${emergency.priority.toUpperCase()} Emergency`,
            message: `${emergency.title} - ${emergency.location.address}`,
            priority: emergency.priority,
            emergency: emergency,
            timestamp: new Date(),
            recipients: emergency.priority === 'low' ? ['system_admins'] : ['all']
        };
        await this.broadcastEmergencyAlert(notification);
        // Update dashboard stats for all connected users
        this.updateDashboardStats();
    }
    async notifyEmergencyResolved(emergency) {
        const notification = {
            id: `resolved_${emergency._id}`,
            type: 'emergency_resolved',
            title: 'Emergency Resolved',
            message: `${emergency.title} has been resolved`,
            priority: 'medium',
            emergency: emergency,
            timestamp: new Date(),
            recipients: ['system_admins']
        };
        await this.broadcastEmergencyAlert(notification);
        // Notify users subscribed to this specific emergency
        this.io.to(`emergency:${emergency._id}`).emit('emergency_resolved', {
            emergencyId: emergency._id,
            resolution: emergency.resolution,
            timestamp: new Date()
        });
        this.updateDashboardStats();
    }
    async notifyEmergencyEscalated(emergency) {
        const notification = {
            id: `escalated_${emergency._id}`,
            type: 'emergency_escalated',
            title: 'Emergency Escalated',
            message: `${emergency.title} has been escalated to level ${emergency.escalationLevel}`,
            priority: 'high',
            emergency: emergency,
            timestamp: new Date(),
            recipients: ['all']
        };
        await this.broadcastEmergencyAlert(notification);
    }
    async sendSystemBroadcast(message, priority = 'medium', recipients = ['all']) {
        const notification = {
            id: `broadcast_${Date.now()}`,
            type: 'broadcast',
            title: 'System Broadcast',
            message: message,
            priority: priority,
            timestamp: new Date(),
            recipients: recipients
        };
        await this.broadcastEmergencyAlert(notification);
    }
    async sendBrowserPushNotifications(notification) {
        var _a;
        // This would integrate with Web Push API
        // For now, we'll just broadcast a special push notification event
        this.io.emit('push_notification_request', {
            title: notification.title,
            body: notification.message,
            icon: '/emergency-icon.png',
            badge: '/emergency-badge.png',
            tag: notification.id,
            data: {
                emergencyId: (_a = notification.emergency) === null || _a === void 0 ? void 0 : _a._id,
                priority: notification.priority,
                timestamp: notification.timestamp
            }
        });
    }
    updateDashboardStats() {
        // Broadcast updated stats to all admins
        this.io.to('admins').emit('update_dashboard_stats', {
            timestamp: new Date(),
            message: 'Emergency statistics updated'
        });
    }
    startHeartbeat() {
        // Send heartbeat every 30 seconds to maintain connections
        setInterval(() => {
            this.io.emit('heartbeat', {
                timestamp: new Date(),
                connectedUsers: this.getConnectedUsersCount()
            });
        }, 30000);
    }
    // Utility methods
    getConnectedUsers() {
        return Array.from(this.connectedUsers.values());
    }
    getConnectedUsersCount() {
        return this.connectedUsers.size;
    }
    getUserSocketIds(userId) {
        const sockets = this.userSockets.get(userId);
        return sockets ? Array.from(sockets) : [];
    }
    isUserConnected(userId) {
        return this.userSockets.has(userId);
    }
    async sendToUser(userId, event, data) {
        const socketIds = this.getUserSocketIds(userId);
        socketIds.forEach(socketId => {
            this.io.to(socketId).emit(event, data);
        });
    }
    async sendToRole(role, event, data) {
        this.io.to(`role:${role}`).emit(event, data);
    }
    // Updated method to send to specific groups based on new recipient mapping
    async sendToRecipientGroup(group, event, data) {
        switch (group) {
            case 'system_admins':
                this.io.to('system_admins').emit(event, data);
                break;
            case 'fleet_managers':
                this.io.to('fleet_managers').emit(event, data);
                break;
            case 'users':
                this.io.to('users').emit(event, data);
                break;
            case 'routeadmins':
                this.io.to('routeadmins').emit(event, data);
                break;
            case 'customer_service':
                this.io.to('customer_service').emit(event, data);
                break;
            case 'all':
            default:
                this.io.to('all_users').emit(event, data);
                break;
        }
    }
}
// Singleton instance
let realTimeEmergencyService = null;
const initializeRealTimeEmergencyService = (httpServer) => {
    if (!realTimeEmergencyService) {
        realTimeEmergencyService = new RealTimeEmergencyService(httpServer);
    }
    return realTimeEmergencyService;
};
exports.initializeRealTimeEmergencyService = initializeRealTimeEmergencyService;
const getRealTimeEmergencyService = () => {
    if (!realTimeEmergencyService) {
        throw new Error('Real-time emergency service not initialized');
    }
    return realTimeEmergencyService;
};
exports.getRealTimeEmergencyService = getRealTimeEmergencyService;
exports.default = RealTimeEmergencyService;
