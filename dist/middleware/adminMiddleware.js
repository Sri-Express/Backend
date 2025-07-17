"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireRole = exports.requireAdmin = exports.requireSystemAdmin = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const User_1 = __importDefault(require("../models/User"));
// Middleware to check if user is system admin
const requireSystemAdmin = async (req, res, next) => {
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
            // Check if user is system admin
            if (user.role !== 'system_admin') {
                res.status(403).json({ message: 'Access denied. System administrator privileges required.' });
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
        console.error('Admin middleware error:', error);
        res.status(500).json({ message: 'Server error' });
        return;
    }
};
exports.requireSystemAdmin = requireSystemAdmin;
// Middleware to check if user is admin (any admin role)
const requireAdmin = async (req, res, next) => {
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
            // Check if user has admin role
            const adminRoles = ['system_admin', 'route_admin', 'company_admin', 'customer_service'];
            if (!adminRoles.includes(user.role)) {
                res.status(403).json({ message: 'Access denied. Administrator privileges required.' });
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
        console.error('Admin middleware error:', error);
        res.status(500).json({ message: 'Server error' });
        return;
    }
};
exports.requireAdmin = requireAdmin;
// Middleware to check specific admin roles
const requireRole = (allowedRoles) => {
    return async (req, res, next) => {
        try {
            if (!req.user) {
                res.status(401).json({ message: 'Not authorized' });
                return;
            }
            if (!allowedRoles.includes(req.user.role)) {
                res.status(403).json({
                    message: `Access denied. Required roles: ${allowedRoles.join(', ')}`
                });
                return;
            }
            next();
        }
        catch (error) {
            console.error('Role check error:', error);
            res.status(500).json({ message: 'Server error' });
            return;
        }
    };
};
exports.requireRole = requireRole;
