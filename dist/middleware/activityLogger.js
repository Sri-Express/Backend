"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logLogoutActivity = exports.logLoginActivity = exports.logActivity = void 0;
const UserActivity_1 = __importDefault(require("../models/UserActivity"));
// Activity mapping for different routes and methods
const ACTIVITY_MAPPINGS = {
    // Authentication routes
    '/api/auth/login': {
        'POST': {
            action: 'login',
            description: 'User logged in successfully',
            category: 'auth',
            severity: 'medium'
        }
    },
    '/api/auth/logout': {
        'POST': {
            action: 'logout',
            description: 'User logged out',
            category: 'auth',
            severity: 'low'
        }
    },
    '/api/auth/forgot-password': {
        'POST': {
            action: 'password_reset_request',
            description: 'Requested password reset',
            category: 'auth',
            severity: 'medium'
        }
    },
    '/api/auth/reset-password': {
        'PUT': {
            action: 'password_change',
            description: 'Changed account password',
            category: 'auth',
            severity: 'high'
        }
    },
    // Profile routes
    '/api/dashboard/profile': {
        'PUT': {
            action: 'profile_update',
            description: 'Updated profile information',
            category: 'profile',
            severity: 'low'
        }
    },
    // Admin user management
    '/api/admin/users': {
        'GET': {
            action: 'users_list_view',
            description: 'Viewed users list',
            category: 'system',
            severity: 'low'
        },
        'POST': {
            action: 'user_created',
            description: 'Created new user account',
            category: 'system',
            severity: 'high'
        }
    },
    // Device management
    '/api/admin/devices': {
        'GET': {
            action: 'devices_list_view',
            description: 'Viewed devices list',
            category: 'device',
            severity: 'low'
        },
        'POST': {
            action: 'device_created',
            description: 'Registered new device',
            category: 'device',
            severity: 'medium'
        }
    },
    // Trip bookings
    '/api/dashboard/demo-trip': {
        'POST': {
            action: 'trip_booking',
            description: 'Booked new trip',
            category: 'trip',
            severity: 'low'
        }
    }
};
// Get route pattern that matches the request
const getRoutePattern = (path) => {
    // Handle dynamic routes like /api/admin/users/:id
    const patterns = [
        { pattern: /^\/api\/admin\/users\/[^\/]+\/edit$/, route: '/api/admin/users/:id/edit' },
        { pattern: /^\/api\/admin\/users\/[^\/]+\/toggle-status$/, route: '/api/admin/users/:id/toggle-status' },
        { pattern: /^\/api\/admin\/users\/[^\/]+\/stats$/, route: '/api/admin/users/:id/stats' },
        { pattern: /^\/api\/admin\/users\/[^\/]+\/activity$/, route: '/api/admin/users/:id/activity' },
        { pattern: /^\/api\/admin\/users\/[^\/]+\/timeline$/, route: '/api/admin/users/:id/timeline' },
        { pattern: /^\/api\/admin\/users\/[^\/]+$/, route: '/api/admin/users/:id' },
        { pattern: /^\/api\/admin\/devices\/[^\/]+\/location$/, route: '/api/admin/devices/:id/location' },
        { pattern: /^\/api\/admin\/devices\/[^\/]+\/alerts$/, route: '/api/admin/devices/:id/alerts' },
        { pattern: /^\/api\/admin\/devices\/[^\/]+$/, route: '/api/admin/devices/:id' },
    ];
    for (const { pattern, route } of patterns) {
        if (pattern.test(path)) {
            return route;
        }
    }
    return path;
};
// Get activity config for dynamic routes
const getDynamicActivityConfig = (path, method, userId) => {
    const userIdPattern = /\/([a-f\d]{24})\//i; // MongoDB ObjectId pattern
    const userIdMatch = path.match(userIdPattern);
    const targetUserId = userIdMatch ? userIdMatch[1] : null;
    if (path.includes('/api/admin/users/') && targetUserId) {
        switch (method) {
            case 'GET':
                if (path.includes('/stats')) {
                    return {
                        action: 'user_stats_view',
                        description: `Viewed user statistics: ${targetUserId}`,
                        category: 'system',
                        severity: 'low'
                    };
                }
                if (path.includes('/activity')) {
                    return {
                        action: 'user_activity_view',
                        description: `Viewed user activity: ${targetUserId}`,
                        category: 'system',
                        severity: 'low'
                    };
                }
                if (path.includes('/timeline')) {
                    return {
                        action: 'user_timeline_view',
                        description: `Viewed user timeline: ${targetUserId}`,
                        category: 'system',
                        severity: 'low'
                    };
                }
                return {
                    action: 'user_details_view',
                    description: `Viewed user details: ${targetUserId}`,
                    category: 'system',
                    severity: 'low'
                };
            case 'PUT':
                return {
                    action: 'user_updated',
                    description: `Updated user account: ${targetUserId}`,
                    category: 'system',
                    severity: 'high'
                };
            case 'DELETE':
                return {
                    action: 'user_deleted',
                    description: `Deleted user account: ${targetUserId}`,
                    category: 'system',
                    severity: 'high'
                };
            case 'PATCH':
                if (path.includes('/toggle-status')) {
                    return {
                        action: 'user_status_toggle',
                        description: `Toggled user account status: ${targetUserId}`,
                        category: 'system',
                        severity: 'medium'
                    };
                }
                break;
        }
    }
    if (path.includes('/api/admin/devices/') && targetUserId) {
        switch (method) {
            case 'GET':
                return {
                    action: 'device_details_view',
                    description: `Viewed device details: ${targetUserId}`,
                    category: 'device',
                    severity: 'low'
                };
            case 'PUT':
                return {
                    action: 'device_updated',
                    description: `Updated device configuration: ${targetUserId}`,
                    category: 'device',
                    severity: 'medium'
                };
            case 'DELETE':
                return {
                    action: 'device_deleted',
                    description: `Deleted device: ${targetUserId}`,
                    category: 'device',
                    severity: 'high'
                };
        }
    }
    return null;
};
// Main activity logging middleware
const logActivity = (req, res, next) => {
    var _a;
    // Skip if already logged or no user
    if (req.activityLogged || !req.user) {
        return next();
    }
    // Get client IP
    const ipAddress = req.ip ||
        req.connection.remoteAddress ||
        req.socket.remoteAddress ||
        ((_a = req.headers['x-forwarded-for']) === null || _a === void 0 ? void 0 : _a.split(',')[0]) ||
        'unknown';
    // Get user agent
    const userAgent = req.headers['user-agent'] || 'unknown';
    // Store original json method to capture response
    const originalJson = res.json;
    let responseLogged = false;
    // Override res.json to capture successful responses
    res.json = function (body) {
        if (!responseLogged && res.statusCode >= 200 && res.statusCode < 300) {
            responseLogged = true;
            // Log activity for successful requests
            logRequestActivity(req, ipAddress, userAgent, body);
        }
        return originalJson.call(this, body);
    };
    next();
};
exports.logActivity = logActivity;
// Function to log the actual activity
const logRequestActivity = async (req, ipAddress, userAgent, responseBody) => {
    var _a, _b;
    try {
        if (!req.user || req.activityLogged)
            return;
        const routePattern = getRoutePattern(req.path);
        let activityConfig = (_a = ACTIVITY_MAPPINGS[routePattern]) === null || _a === void 0 ? void 0 : _a[req.method];
        // Handle dynamic routes
        if (!activityConfig) {
            activityConfig = getDynamicActivityConfig(req.path, req.method, req.user._id.toString());
        }
        // Skip if no activity config or explicitly skipped
        if (!activityConfig || activityConfig.skipLogging) {
            return;
        }
        // Prepare metadata
        const metadata = {
            path: req.path,
            method: req.method,
            query: req.query,
            userRole: req.user.role
        };
        // Add response data for certain actions
        if (responseBody && activityConfig.action.includes('created')) {
            metadata.createdId = ((_b = responseBody.user) === null || _b === void 0 ? void 0 : _b._id) || responseBody._id;
        }
        // Log the activity using the UserActivity model's static method
        await UserActivity_1.default.logActivity(req.user._id, activityConfig.action, activityConfig.description, {
            ipAddress,
            userAgent,
            metadata,
            category: activityConfig.category || 'other',
            severity: activityConfig.severity || 'low'
        });
        // Mark as logged to prevent duplicate logging
        req.activityLogged = true;
    }
    catch (error) {
        console.error('Error in activity logging:', error);
        // Don't throw error to prevent breaking main functionality
    }
};
// Middleware specifically for login activity
const logLoginActivity = async (req, res, next) => {
    var _a;
    try {
        // This middleware should be used after successful login
        if (req.user) {
            const ipAddress = req.ip ||
                req.connection.remoteAddress ||
                req.socket.remoteAddress ||
                ((_a = req.headers['x-forwarded-for']) === null || _a === void 0 ? void 0 : _a.split(',')[0]) ||
                'unknown';
            const userAgent = req.headers['user-agent'] || 'unknown';
            await UserActivity_1.default.logActivity(req.user._id, 'login', 'User logged in successfully', {
                ipAddress,
                userAgent,
                category: 'auth',
                severity: 'medium',
                metadata: {
                    loginTime: new Date(),
                    userRole: req.user.role
                }
            });
        }
        next();
    }
    catch (error) {
        console.error('Error logging login activity:', error);
        next(); // Continue even if logging fails
    }
};
exports.logLoginActivity = logLoginActivity;
// Middleware for logout activity
const logLogoutActivity = async (req, res, next) => {
    var _a;
    try {
        if (req.user) {
            const ipAddress = req.ip ||
                req.connection.remoteAddress ||
                req.socket.remoteAddress ||
                ((_a = req.headers['x-forwarded-for']) === null || _a === void 0 ? void 0 : _a.split(',')[0]) ||
                'unknown';
            const userAgent = req.headers['user-agent'] || 'unknown';
            await UserActivity_1.default.logActivity(req.user._id, 'logout', 'User logged out', {
                ipAddress,
                userAgent,
                category: 'auth',
                severity: 'low',
                metadata: {
                    logoutTime: new Date(),
                    userRole: req.user.role
                }
            });
        }
        next();
    }
    catch (error) {
        console.error('Error logging logout activity:', error);
        next();
    }
};
exports.logLogoutActivity = logLogoutActivity;
