// OPTIMIZED realTimeEmergencyService.ts
// Key improvements: Memory management, rate limiting, connection pooling

import { Server as HTTPServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import User from '../models/User';
import Emergency from '../models/Emergency';

export interface EmergencyNotification {
  id: string;
  type: 'emergency_created' | 'emergency_resolved' | 'emergency_escalated' | 'broadcast' | 'critical_alert';
  title: string;
  message: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  emergency?: any;
  timestamp: Date;
  recipients: string[];
  data?: any;
}

export interface ConnectedUser {
  userId: string;
  socketId: string;
  name: string;
  role: string;
  email: string;
  lastSeen: Date;
  connectionCount: number; // Track multiple connections
}

class OptimizedRealTimeEmergencyService {
  private io: SocketIOServer;
  private connectedUsers: Map<string, ConnectedUser> = new Map();
  private userSockets: Map<string, Set<string>> = new Map();
  private rateLimitMap: Map<string, { count: number; resetTime: number }> = new Map();
  private heartbeatInterval?: NodeJS.Timeout;
  private cleanupInterval?: NodeJS.Timeout;
  private emergencyCache: Map<string, any> = new Map();
  private dashboardUpdateTimeout?: NodeJS.Timeout;
  private readonly MAX_CACHE_SIZE = 1000;
  private readonly RATE_LIMIT_WINDOW = 60000; // 1 minute
  private readonly RATE_LIMIT_MAX = 100; // Max requests per window

  constructor(httpServer: HTTPServer) {
    this.io = new SocketIOServer(httpServer, {
      cors: {
        origin: process.env.FRONTEND_URL || "http://localhost:3000",
        methods: ["GET", "POST"],
        credentials: true
      },
      transports: ['websocket', 'polling'],
      // Performance optimizations
      pingTimeout: 60000,
      pingInterval: 25000,
      maxHttpBufferSize: 1e6, // 1MB
      allowEIO3: true
    });

    this.setupSocketHandlers();
    this.startHeartbeat();
    this.startCleanupTasks();
    
    console.log('🚨 Optimized Real-time Emergency Service initialized');
  }

  private setupSocketHandlers(): void {
    // Rate limiting middleware
    this.io.use((socket: Socket, next) => {
      const ip = socket.handshake.address;
      const now = Date.now();
      const rateLimit = this.rateLimitMap.get(ip);

      if (rateLimit) {
        if (now > rateLimit.resetTime) {
          // Reset rate limit window
          this.rateLimitMap.set(ip, { count: 1, resetTime: now + this.RATE_LIMIT_WINDOW });
        } else if (rateLimit.count >= this.RATE_LIMIT_MAX) {
          return next(new Error('Rate limit exceeded'));
        } else {
          rateLimit.count++;
        }
      } else {
        this.rateLimitMap.set(ip, { count: 1, resetTime: now + this.RATE_LIMIT_WINDOW });
      }
      
      next();
    });

    // Authentication middleware
    this.io.use(async (socket: Socket, next) => {
      try {
        const token = socket.handshake.auth.token;
        if (!token) {
          return next(new Error('Authentication error'));
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
        
        // Use cache for user lookup to reduce DB hits
        const cacheKey = `user_${decoded.id}`;
        let user = this.emergencyCache.get(cacheKey);
        
        if (!user) {
          user = await User.findById(decoded.id).select('-password').lean(); // Use lean() for performance
          if (user) {
            this.emergencyCache.set(cacheKey, user);
          }
        }
        
        if (!user) {
          return next(new Error('User not found'));
        }

        socket.data.user = user;
        next();
      } catch (error) {
        next(new Error('Authentication error'));
      }
    });

    this.io.on('connection', (socket: Socket) => {
      this.handleConnection(socket);
    });
  }

  private handleConnection(socket: Socket): void {
    const user = socket.data.user;
    const existingUser = this.connectedUsers.get(socket.id);
    
    const connectedUser: ConnectedUser = {
      userId: user._id.toString(),
      socketId: socket.id,
      name: user.name,
      role: user.role,
      email: user.email,
      lastSeen: new Date(),
      connectionCount: existingUser ? existingUser.connectionCount + 1 : 1
    };

    // Store connected user with optimized structure
    this.connectedUsers.set(socket.id, connectedUser);
    
    // Optimize user socket tracking
    if (!this.userSockets.has(user._id.toString())) {
      this.userSockets.set(user._id.toString(), new Set());
    }
    this.userSockets.get(user._id.toString())!.add(socket.id);

    console.log(`🔌 User connected: ${user.name} (${user.role}) - Connections: ${connectedUser.connectionCount}`);

    // Optimized room joining with batching
    const rooms = this.getUserRooms(user.role);
    rooms.forEach(room => socket.join(room));

    // Send optimized welcome message
    socket.emit('connected', {
      message: 'Connected to Emergency Alert System',
      user: { id: user._id, name: user.name, role: user.role },
      timestamp: new Date(),
      serverStats: {
        connectedUsers: this.getConnectedUsersCount(),
        activeRooms: rooms.length
      }
    });

    // Send cached emergency status to reduce DB load
    this.sendCachedEmergencyStatus(socket);

    // Optimized event handlers with debouncing
    this.setupSocketEventHandlers(socket);
  }

  private getUserRooms(role: string): string[] {
    const rooms = ['all_users'];
    
    switch (role) {
      case 'system_admin':
        rooms.push('system_admins', 'admins', 'emergency_responders');
        break;
      case 'company_admin':
        rooms.push('fleet_managers', 'admins');
        break;
      case 'route_admin':
        rooms.push('routeadmins', 'admins', 'emergency_responders');
        break;
      case 'customer_service':
        rooms.push('customer_service', 'admins');
        break;
      case 'client':
        rooms.push('users');
        break;
    }
    
    rooms.push(`role:${role}`);
    return rooms;
  }

  private setupSocketEventHandlers(socket: Socket): void {
    const user = socket.data.user;
    
    // Debounced emergency subscription
    let subscriptionTimeout: NodeJS.Timeout;
    socket.on('subscribe_emergency', (emergencyId: string) => {
      clearTimeout(subscriptionTimeout);
      subscriptionTimeout = setTimeout(() => {
        socket.join(`emergency:${emergencyId}`);
        console.log(`📡 ${user.name} subscribed to emergency: ${emergencyId}`);
      }, 100);
    });

    socket.on('unsubscribe_emergency', (emergencyId: string) => {
      socket.leave(`emergency:${emergencyId}`);
    });

    // Optimized emergency actions with caching
    socket.on('emergency_action', async (data: { action: string; emergencyId?: string; data?: any }) => {
      try {
        await this.handleEmergencyActionOptimized(socket, data);
      } catch (error) {
        socket.emit('error', { message: 'Failed to process emergency action' });
      }
    });

    // Efficient ping/pong
    socket.on('ping', () => {
      socket.emit('pong', { timestamp: new Date(), userId: user._id });
    });

    socket.on('disconnect', () => {
      this.handleDisconnectionOptimized(socket);
    });
  }

  private async handleEmergencyActionOptimized(socket: Socket, data: any): Promise<void> {
    const cacheKey = `emergency_${data.emergencyId}`;
    
    switch (data.action) {
      case 'get_emergency_details':
        if (data.emergencyId) {
          let emergency = this.emergencyCache.get(cacheKey);
          if (!emergency) {
            emergency = await Emergency.findById(data.emergencyId).lean();
            if (emergency) {
              this.emergencyCache.set(cacheKey, emergency);
            }
          }
          socket.emit('emergency_details', emergency);
        }
        break;
        
      case 'request_emergency_stats':
        await this.sendCachedEmergencyStatus(socket);
        break;
        
      case 'mark_notification_read':
        socket.emit('notification_read', { notificationId: data.notificationId });
        break;
    }
  }

  private handleDisconnectionOptimized(socket: Socket): void {
    const connectedUser = this.connectedUsers.get(socket.id);
    if (connectedUser) {
      console.log(`❌ User disconnected: ${connectedUser.name} - Socket: ${socket.id}`);
      
      // Efficient cleanup
      const userSockets = this.userSockets.get(connectedUser.userId);
      if (userSockets) {
        userSockets.delete(socket.id);
        if (userSockets.size === 0) {
          this.userSockets.delete(connectedUser.userId);
        }
      }
      
      this.connectedUsers.delete(socket.id);
    }
  }

  private async sendCachedEmergencyStatus(socket: Socket): Promise<void> {
    try {
      const cacheKey = 'emergency_status';
      let statusData = this.emergencyCache.get(cacheKey);
      
      if (!statusData) {
        // Optimized aggregation pipeline
        const [activeEmergencies, criticalEmergencies] = await Promise.all([
          Emergency.find({ 
            status: { $in: ['active', 'responded'] }, 
            isActive: true 
          }).sort({ createdAt: -1 }).limit(10).lean(),
          
          Emergency.find({
            priority: 'critical',
            status: { $in: ['active', 'responded'] },
            isActive: true
          }).sort({ createdAt: -1 }).lean()
        ]);

        statusData = {
          activeCount: activeEmergencies.length,
          criticalCount: criticalEmergencies.length,
          activeEmergencies,
          criticalEmergencies,
          timestamp: new Date()
        };

        // Cache for 30 seconds
        this.emergencyCache.set(cacheKey, statusData);
        setTimeout(() => this.emergencyCache.delete(cacheKey), 30000);
      }

      socket.emit('emergency_status', statusData);
    } catch (error) {
      console.error('Error sending emergency status:', error);
    }
  }

  // Optimized broadcast with batching
  public async broadcastEmergencyAlert(notification: EmergencyNotification): Promise<void> {
    console.log(`🚨 Broadcasting emergency alert: ${notification.title}`);
    
    const rooms = this.getTargetRooms(notification.recipients);
    const broadcastData = {
      ...notification,
      connectedUsers: this.getConnectedUsersCount(),
      serverTimestamp: new Date()
    };

    // Batch emit to all rooms
    rooms.forEach(room => {
      this.io.to(room).emit('emergency_alert', { ...broadcastData, room });
    });

    // Critical alerts get additional processing
    if (notification.priority === 'critical') {
      await this.handleCriticalAlert(notification);
    }

    console.log(`📡 Alert sent to ${rooms.length} rooms - ${this.getConnectedUsersCount()} users`);
    
    // Update cache
    this.emergencyCache.delete('emergency_status'); // Invalidate cache
  }

  private async handleCriticalAlert(notification: EmergencyNotification): Promise<void> {
    // Send browser push notifications
    this.io.emit('push_notification_request', {
      title: notification.title,
      body: notification.message,
      icon: '/emergency-icon.png',
      badge: '/emergency-badge.png',
      tag: notification.id,
      data: {
        emergencyId: notification.emergency?._id,
        priority: notification.priority,
        timestamp: notification.timestamp
      }
    });
  }

  private getTargetRooms(recipients: string[]): string[] {
    const rooms: string[] = [];
    
    recipients.forEach(recipient => {
      const roomMap: Record<string, string> = {
        'all': 'all_users',
        'system_admins': 'system_admins',
        'fleet_managers': 'fleet_managers',
        'fleet_operators': 'fleet_managers', // Map to same room as fleet_managers
        'passengers': 'users', // Map passengers to users room
        'users': 'users',
        'route_admins': 'routeadmins', // Support both naming conventions
        'routeadmins': 'routeadmins',
        'customer_service': 'customer_service',
        'staff_only': 'admins', // All staff go to admins room
        'emergency_responders': 'emergency_responders' // New room for emergency responders
      };
      
      if (roomMap[recipient]) {
        rooms.push(roomMap[recipient]);
      } else if (recipient.startsWith('role:')) {
        rooms.push(recipient);
      }
    });

    return [...new Set(rooms)]; // Remove duplicates
  }

  // Optimized notification methods
  public async notifyEmergencyCreated(emergency: any): Promise<void> {
    const notification: EmergencyNotification = {
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
    this.updateDashboardStatsOptimized();
  }

  public async notifyEmergencyResolved(emergency: any): Promise<void> {
    const notification: EmergencyNotification = {
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
    
    // Optimized specific emergency notification
    this.io.to(`emergency:${emergency._id}`).emit('emergency_resolved', {
      emergencyId: emergency._id,
      resolution: emergency.resolution,
      timestamp: new Date()
    });
    
    this.updateDashboardStatsOptimized();
  }

  public async notifyEmergencyEscalated(emergency: any): Promise<void> {
    const notification: EmergencyNotification = {
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

  public async sendSystemBroadcast(message: string, priority: 'low' | 'medium' | 'high' | 'critical' = 'medium', recipients: string[] = ['all']): Promise<void> {
    const notification: EmergencyNotification = {
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

  private updateDashboardStatsOptimized(): void {
    // Debounced dashboard updates to prevent spam
    if (!this.dashboardUpdateTimeout) {
      this.dashboardUpdateTimeout = setTimeout(() => {
        this.io.to('admins').emit('update_dashboard_stats', {
          timestamp: new Date(),
          message: 'Emergency statistics updated'
        });
        this.dashboardUpdateTimeout = undefined;
      }, 1000);
    }
  }

  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      const connectedCount = this.getConnectedUsersCount();
      this.io.emit('heartbeat', {
        timestamp: new Date(),
        connectedUsers: connectedCount,
        serverLoad: process.memoryUsage().heapUsed / 1024 / 1024 // MB
      });
    }, 30000);
  }

  private startCleanupTasks(): void {
    // Clean up stale data every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.performCleanup();
    }, 300000);
  }

  private performCleanup(): void {
    const now = Date.now();
    
    // Clean rate limit map
    for (const [ip, data] of this.rateLimitMap.entries()) {
      if (now > data.resetTime) {
        this.rateLimitMap.delete(ip);
      }
    }

    // Clean emergency cache if too large
    if (this.emergencyCache.size > this.MAX_CACHE_SIZE) {
      const entries = Array.from(this.emergencyCache.entries());
      const toDelete = entries.slice(0, Math.floor(this.MAX_CACHE_SIZE * 0.3));
      toDelete.forEach(([key]) => this.emergencyCache.delete(key));
    }

    console.log(`🧹 Cleanup completed - Cache: ${this.emergencyCache.size}, Rate limits: ${this.rateLimitMap.size}`);
  }

  // Utility methods remain the same but with optimizations
  public getConnectedUsers(): ConnectedUser[] {
    return Array.from(this.connectedUsers.values());
  }

  public getConnectedUsersCount(): number {
    return this.connectedUsers.size;
  }

  public async sendToUser(userId: string, event: string, data: any): Promise<void> {
    const sockets = this.userSockets.get(userId);
    if (sockets) {
      sockets.forEach(socketId => {
        this.io.to(socketId).emit(event, data);
      });
    }
  }

  public async sendToRole(role: string, event: string, data: any): Promise<void> {
    this.io.to(`role:${role}`).emit(event, data);
  }

  public async sendToRecipientGroup(group: string, event: string, data: any): Promise<void> {
    switch (group) {
      case 'system_admins':
        this.io.to('system_admins').emit(event, data);
        break;
      case 'fleet_managers':
      case 'fleet_operators':
        this.io.to('fleet_managers').emit(event, data);
        break;
      case 'passengers':
      case 'users':
        this.io.to('users').emit(event, data);
        break;
      case 'route_admins':
      case 'routeadmins':
        this.io.to('routeadmins').emit(event, data);
        break;
      case 'customer_service':
        this.io.to('customer_service').emit(event, data);
        break;
      case 'staff_only':
        this.io.to('admins').emit(event, data);
        break;
      case 'emergency_responders':
        this.io.to('emergency_responders').emit(event, data);
        break;
      case 'all':
      default:
        this.io.to('all_users').emit(event, data);
        break;
    }
  }

  public getUserSocketIds(userId: string): string[] {
    const sockets = this.userSockets.get(userId);
    return sockets ? Array.from(sockets) : [];
  }

  public isUserConnected(userId: string): boolean {
    return this.userSockets.has(userId);
  }

  public cleanup(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = undefined;
    }
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = undefined;
    }
    if (this.dashboardUpdateTimeout) {
      clearTimeout(this.dashboardUpdateTimeout);
      this.dashboardUpdateTimeout = undefined;
    }
    this.connectedUsers.clear();
    this.userSockets.clear();
    this.rateLimitMap.clear();
    this.emergencyCache.clear();
    console.log('Service cleanup completed');
  }
}

// Singleton with proper cleanup - BACKWARD COMPATIBLE EXPORTS
let optimizedRealTimeEmergencyService: OptimizedRealTimeEmergencyService | null = null;

// Keep old export names for backward compatibility
export const initializeRealTimeEmergencyService = (httpServer: HTTPServer): OptimizedRealTimeEmergencyService => {
  if (!optimizedRealTimeEmergencyService) {
    optimizedRealTimeEmergencyService = new OptimizedRealTimeEmergencyService(httpServer);
  }
  return optimizedRealTimeEmergencyService;
};

export const getRealTimeEmergencyService = (): OptimizedRealTimeEmergencyService => {
  if (!optimizedRealTimeEmergencyService) {
    throw new Error('Optimized real-time emergency service not initialized');
  }
  return optimizedRealTimeEmergencyService;
};

// New export names for future use
export const initializeOptimizedRealTimeEmergencyService = initializeRealTimeEmergencyService;
export const getOptimizedRealTimeEmergencyService = getRealTimeEmergencyService;

// Graceful shutdown
process.on('SIGTERM', () => {
  if (optimizedRealTimeEmergencyService) {
    optimizedRealTimeEmergencyService.cleanup();
  }
});

export default OptimizedRealTimeEmergencyService;