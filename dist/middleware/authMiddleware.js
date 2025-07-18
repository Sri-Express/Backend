"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.isRouteAdmin = exports.isAdmin = exports.protect = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const User_1 = __importDefault(require("../models/User"));
const protect = async (req, res, next) => {
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
        console.error('Auth middleware error:', error);
        res.status(500).json({ message: 'Server error' });
        return;
    }
};
exports.protect = protect;
// Middleware to check if user is admin
const isAdmin = (req, res, next) => {
    if (req.user && (req.user.role === 'system_admin' || req.user.role === 'company_admin')) {
        next();
    }
    else {
        res.status(403).json({ message: 'Not authorized as an admin' });
    }
};
exports.isAdmin = isAdmin;
// Middleware to check if user is route admin
const isRouteAdmin = (req, res, next) => {
    if (req.user && (req.user.role === 'route_admin' || req.user.role === 'system_admin')) {
        next();
    }
    else {
        res.status(403).json({ message: 'Not authorized as a route admin' });
    }
};
exports.isRouteAdmin = isRouteAdmin;
