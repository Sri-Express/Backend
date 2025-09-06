"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.routeSpecificAuth = exports.standardRouteAdminAuth = exports.attachRouteAdminStats = exports.requireActiveRoute = exports.logRouteAdminActivity = exports.validateRouteAdminPermissions = exports.requireAssignedRoute = exports.requireRouteAdminForRoute = exports.requireRouteAdmin = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const User_1 = __importDefault(require("../models/User"));
const Route_1 = __importDefault(require("../models/Route"));
const mongoose_1 = __importDefault(require("mongoose"));
// Middleware to check if user is route admin
const requireRouteAdmin = async (req, res, next) => {
    try {
        let token;
        // Check for token in Authorization header
        if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
            token = req.headers.authorization.split(' ')[1];
        }
        // Make sure token exists
        if (!token) {
            res.status(401).json({ message: 'Not authorized, no token' });
            return;
        }
        try {
            // Verify token
            const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET || '');
            // Get user from token id
            const user = await User_1.default.findById(decoded.id).select('-password');
            if (!user) {
                res.status(401).json({ message: 'Not authorized, user not found' });
                return;
            }
            // Check if user is route admin (or system admin for testing)
            if (user.role !== 'route_admin' && user.role !== 'system_admin') {
                res.status(403).json({
                    message: 'Access denied. Route administrator privileges required.',
                    userRole: user.role,
                    requiredRole: 'route_admin'
                });
                return;
            }
            // Set user in request object
            req.user = user;
            next();
        }
        catch (error) {
            console.error('Token verification error:', error);
            res.status(401).json({ message: 'Not authorized, token invalid' });
            return;
        }
    }
    catch (error) {
        console.error('Route admin middleware error:', error);
        res.status(500).json({ message: 'Server error' });
        return;
    }
};
exports.requireRouteAdmin = requireRouteAdmin;
// Middleware to check if route admin has access to specific route
const requireRouteAdminForRoute = (routeIdParam = 'routeId') => {
    return async (req, res, next) => {
        var _a, _b;
        try {
            const routeId = req.params[routeIdParam] || req.body.routeId;
            const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id;
            if (!userId) {
                res.status(401).json({ message: 'User not authenticated' });
                return;
            }
            if (!routeId) {
                res.status(400).json({ message: 'Route ID is required' });
                return;
            }
            if (!mongoose_1.default.Types.ObjectId.isValid(routeId)) {
                res.status(400).json({ message: 'Invalid route ID format' });
                return;
            }
            // System admins have access to all routes
            if (((_b = req.user) === null || _b === void 0 ? void 0 : _b.role) === 'system_admin') {
                next();
                return;
            }
            // Check if this route admin is assigned to this specific route
            const route = await Route_1.default.findOne({
                _id: routeId,
                routeAdminId: userId,
                approvalStatus: 'approved',
                isActive: true
            });
            if (!route) {
                res.status(403).json({
                    message: 'Access denied. You are not assigned to manage this route.',
                    routeId: routeId
                });
                return;
            }
            // Add route to request for later use
            req.assignedRoute = route;
            next();
        }
        catch (error) {
            console.error('Route admin authorization error:', error);
            res.status(500).json({ message: 'Server error during authorization' });
            return;
        }
    };
};
exports.requireRouteAdminForRoute = requireRouteAdminForRoute;
// Middleware to check if route admin has any route assigned
const requireAssignedRoute = async (req, res, next) => {
    var _a, _b;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id;
        if (!userId) {
            res.status(401).json({ message: 'User not authenticated' });
            return;
        }
        // System admins bypass this check
        if (((_b = req.user) === null || _b === void 0 ? void 0 : _b.role) === 'system_admin') {
            next();
            return;
        }
        // Check if route admin has any route assigned
        const assignedRoute = await Route_1.default.findOne({
            routeAdminId: userId,
            approvalStatus: 'approved',
            isActive: true
        });
        if (!assignedRoute) {
            res.status(403).json({
                message: 'No route has been assigned to you. Please contact system administrator.',
                hasAssignedRoute: false
            });
            return;
        }
        // Add assigned route to request
        req.assignedRoute = assignedRoute;
        next();
    }
    catch (error) {
        console.error('Assigned route check error:', error);
        res.status(500).json({ message: 'Server error during route assignment check' });
        return;
    }
};
exports.requireAssignedRoute = requireAssignedRoute;
// Middleware to validate route admin assignment permissions
const validateRouteAdminPermissions = (allowedActions = []) => {
    return async (req, res, next) => {
        var _a, _b, _c;
        try {
            const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id;
            const userRole = (_b = req.user) === null || _b === void 0 ? void 0 : _b.role;
            // System admins have all permissions
            if (userRole === 'system_admin') {
                next();
                return;
            }
            if (userRole !== 'route_admin') {
                res.status(403).json({
                    message: 'Access denied. Route administrator role required.'
                });
                return;
            }
            // Check if route admin has required permissions
            if (allowedActions.length > 0) {
                const userPermissions = ((_c = req.user) === null || _c === void 0 ? void 0 : _c.permissions) || [];
                const hasPermission = allowedActions.some(action => userPermissions.includes(action));
                if (!hasPermission) {
                    res.status(403).json({
                        message: 'Insufficient permissions for this action.',
                        requiredPermissions: allowedActions,
                        userPermissions
                    });
                    return;
                }
            }
            next();
        }
        catch (error) {
            console.error('Route admin permission validation error:', error);
            res.status(500).json({ message: 'Server error during permission validation' });
            return;
        }
    };
};
exports.validateRouteAdminPermissions = validateRouteAdminPermissions;
// Middleware to log route admin activities
const logRouteAdminActivity = (action, category = 'route_management') => {
    return async (req, res, next) => {
        var _a, _b;
        try {
            const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id;
            const routeId = (_b = req.assignedRoute) === null || _b === void 0 ? void 0 : _b._id;
            // Store activity info in request for later logging
            req.activityLog = {
                userId,
                routeId,
                action,
                category,
                ipAddress: req.ip,
                userAgent: req.get('User-Agent'),
                timestamp: new Date(),
                endpoint: `${req.method} ${req.originalUrl}`
            };
            next();
        }
        catch (error) {
            console.error('Activity logging error:', error);
            // Don't fail the request due to logging error
            next();
        }
    };
};
exports.logRouteAdminActivity = logRouteAdminActivity;
// Middleware to check route operational status
const requireActiveRoute = async (req, res, next) => {
    var _a;
    try {
        const routeId = req.params.routeId || req.body.routeId || ((_a = req.assignedRoute) === null || _a === void 0 ? void 0 : _a._id);
        if (!routeId) {
            res.status(400).json({ message: 'Route ID is required' });
            return;
        }
        const route = await Route_1.default.findOne({
            _id: routeId,
            approvalStatus: 'approved',
            status: 'active',
            isActive: true
        });
        if (!route) {
            res.status(400).json({
                message: 'Route is not active or not available for management',
                routeId: routeId
            });
            return;
        }
        // Update assigned route if not already set
        if (!req.assignedRoute) {
            req.assignedRoute = route;
        }
        next();
    }
    catch (error) {
        console.error('Route status check error:', error);
        res.status(500).json({ message: 'Server error during route status check' });
        return;
    }
};
exports.requireActiveRoute = requireActiveRoute;
// Helper middleware to get route admin statistics
const attachRouteAdminStats = async (req, res, next) => {
    var _a, _b;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id;
        if (((_b = req.user) === null || _b === void 0 ? void 0 : _b.role) === 'route_admin' && userId) {
            // Get route admin statistics
            const assignedRoute = await Route_1.default.findOne({
                routeAdminId: userId,
                approvalStatus: 'approved',
                isActive: true
            });
            if (assignedRoute) {
                // Attach basic stats to request
                req.routeAdminStats = {
                    hasAssignedRoute: true,
                    routeId: assignedRoute._id, // ← Add type casting
                    routeName: assignedRoute.name,
                    assignedSince: assignedRoute.updatedAt
                };
            }
            else {
                req.routeAdminStats = {
                    hasAssignedRoute: false,
                    routeId: null,
                    routeName: null,
                    assignedSince: null
                };
            }
        }
        next();
    }
    catch (error) {
        console.error('Route admin stats error:', error);
        // Don't fail the request
        next();
    }
};
exports.attachRouteAdminStats = attachRouteAdminStats;
// Composite middleware for common route admin checks
exports.standardRouteAdminAuth = [
    exports.requireRouteAdmin,
    exports.requireAssignedRoute,
    exports.attachRouteAdminStats
];
// Composite middleware for route-specific operations
const routeSpecificAuth = (routeIdParam = 'routeId') => [
    exports.requireRouteAdmin,
    (0, exports.requireRouteAdminForRoute)(routeIdParam),
    exports.requireActiveRoute
];
exports.routeSpecificAuth = routeSpecificAuth;
exports.default = {
    requireRouteAdmin: exports.requireRouteAdmin,
    requireRouteAdminForRoute: exports.requireRouteAdminForRoute,
    requireAssignedRoute: exports.requireAssignedRoute,
    validateRouteAdminPermissions: exports.validateRouteAdminPermissions,
    logRouteAdminActivity: exports.logRouteAdminActivity,
    requireActiveRoute: exports.requireActiveRoute,
    attachRouteAdminStats: exports.attachRouteAdminStats,
    standardRouteAdminAuth: exports.standardRouteAdminAuth,
    routeSpecificAuth: exports.routeSpecificAuth
};
