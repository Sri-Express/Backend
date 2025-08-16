// src/middleware/fleetMiddleware.ts - Fleet Manager Authentication Middleware
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User';

interface AuthenticatedRequest extends Request {
  user?: any;
}

// Fleet Manager Authentication Middleware
export const requireFleetManager = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      res.status(401).json({ message: 'Access denied. No token provided.' });
      return;
    }

    // Verify JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key') as any;
    
    // Get user from database
    const user = await User.findById(decoded.userId).select('-password');
    
    if (!user) {
      res.status(401).json({ message: 'Invalid token. User not found.' });
      return;
    }

    if (!user.isActive) {
      res.status(401).json({ message: 'Account is deactivated.' });
      return;
    }

    // Check if user has fleet management permissions
    const allowedRoles = ['fleet_manager', 'company_admin', 'system_admin'];
    if (!allowedRoles.includes(user.role)) {
      res.status(403).json({ 
        message: 'Access denied. Fleet management permissions required.',
        userRole: user.role,
        requiredRoles: allowedRoles
      });
      return;
    }

    // Add user to request object
    req.user = user;
    next();
  } catch (error) {
    console.error('Fleet middleware error:', error);
    res.status(401).json({ message: 'Invalid token.' });
  }
};

// Fleet Company Owner Middleware (stricter - only fleet_manager and company_admin)
export const requireFleetOwner = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      res.status(401).json({ message: 'Access denied. No token provided.' });
      return;
    }

    // Verify JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key') as any;
    
    // Get user from database
    const user = await User.findById(decoded.userId).select('-password');
    
    if (!user) {
      res.status(401).json({ message: 'Invalid token. User not found.' });
      return;
    }

    if (!user.isActive) {
      res.status(401).json({ message: 'Account is deactivated.' });
      return;
    }

    // Check if user has fleet ownership permissions (more restrictive)
    const allowedRoles = ['fleet_manager', 'company_admin'];
    if (!allowedRoles.includes(user.role)) {
      res.status(403).json({ 
        message: 'Access denied. Fleet ownership permissions required.',
        userRole: user.role,
        requiredRoles: allowedRoles
      });
      return;
    }

    // Add user to request object
    req.user = user;
    next();
  } catch (error) {
    console.error('Fleet owner middleware error:', error);
    res.status(401).json({ message: 'Invalid token.' });
  }
};

// Optional Fleet Manager Middleware (for routes that work for both regular users and fleet managers)
export const optionalFleetManager = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      // No token provided, continue without user
      next();
      return;
    }

    // Verify JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key') as any;
    
    // Get user from database
    const user = await User.findById(decoded.userId).select('-password');
    
    if (user && user.isActive) {
      // Add user to request object if valid
      req.user = user;
    }

    next();
  } catch (error) {
    // Token invalid, continue without user
    next();
  }
};

// Check if user is fleet manager helper function
export const isFleetManager = (user: any): boolean => {
  if (!user) return false;
  const fleetRoles = ['fleet_manager', 'company_admin', 'system_admin'];
  return fleetRoles.includes(user.role);
};

// Check if user owns/manages a specific fleet
export const canManageFleet = async (userId: string, fleetId?: string): Promise<boolean> => {
  try {
    const user = await User.findById(userId);
    if (!user) return false;

    // System admins can manage all fleets
    if (user.role === 'system_admin') return true;

    // Fleet managers and company admins can manage their own fleets
    if (['fleet_manager', 'company_admin'].includes(user.role)) {
      if (!fleetId) return true; // Can access general fleet endpoints
      
      // Additional check: verify fleet ownership through Fleet model
      const Fleet = require('../models/Fleet').default;
      const fleet = await Fleet.findOne({ 
        _id: fleetId, 
        email: user.email, 
        isActive: true 
      });
      return !!fleet;
    }

    return false;
  } catch (error) {
    console.error('Fleet permission check error:', error);
    return false;
  }
};

export default {
  requireFleetManager,
  requireFleetOwner,
  optionalFleetManager,
  isFleetManager,
  canManageFleet
};