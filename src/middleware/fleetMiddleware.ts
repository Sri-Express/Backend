// src/middleware/fleetMiddleware.ts - Fleet Manager Authentication Middleware with Debug
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User';

interface AuthenticatedRequest extends Request {
  user?: any;
}

// Fleet Manager Authentication Middleware
export const requireFleetManager = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    console.log('🔍 Fleet middleware - Starting authentication check');
    console.log('🔍 Fleet middleware - Headers:', req.headers.authorization);
    
    let token;

    // Check for token in Authorization header (both formats)
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
      console.log('🔍 Fleet middleware - Token found in Bearer header');
    } else if (req.header('Authorization')) {
      token = req.header('Authorization')?.replace('Bearer ', '');
      console.log('🔍 Fleet middleware - Token found in Authorization header');
    }

    if (!token) {
      console.log('❌ Fleet middleware - No token provided');
      res.status(401).json({ message: 'Access denied. No token provided.' });
      return;
    }

    console.log('🔍 Fleet middleware - Token found, verifying...');
    console.log('🔍 Fleet middleware - JWT Secret exists:', !!process.env.JWT_SECRET);

    // Verify JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key') as any;
    console.log('🔍 Fleet middleware - Token decoded successfully');
    
    // Get user from database - support both token formats
    const userId = decoded.id || decoded.userId;
    console.log('🔍 Fleet middleware - Looking for user ID:', userId);
    
    const user = await User.findById(userId).select('-password');
    
    if (!user) {
      console.log('❌ Fleet middleware - User not found in database');
      res.status(401).json({ message: 'Invalid token. User not found.' });
      return;
    }

    console.log('🔍 Fleet middleware - User found:', user.email, 'Role:', user.role, 'Active:', user.isActive);

    if (!user.isActive) {
      console.log('❌ Fleet middleware - User account deactivated');
      res.status(401).json({ message: 'Account is deactivated.' });
      return;
    }

    // Check if user has fleet management permissions
    const allowedRoles = ['fleet_manager', 'company_admin', 'system_admin', 'route_admin'];
    if (!allowedRoles.includes(user.role)) {
      console.log('❌ Fleet middleware - Role not allowed:', user.role, 'Allowed roles:', allowedRoles);
      res.status(403).json({ 
        message: 'Access denied. Fleet management permissions required.',
        userRole: user.role,
        requiredRoles: allowedRoles
      });
      return;
    }

    console.log('✅ Fleet middleware - User authorized successfully, proceeding to route handler...');
    // Add user to request object
    req.user = user;
    next();
  } catch (error) {
    console.error('❌ Fleet middleware error:', error);
    console.error('❌ Fleet middleware error stack:', error instanceof Error ? error.stack : 'No stack');
    res.status(401).json({ message: 'Invalid token.' });
  }
};

// Fleet Company Owner Middleware (stricter - only fleet_manager and company_admin)
export const requireFleetOwner = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    console.log('🔍 Fleet owner middleware - Starting authentication check');
    
    let token;

    // Check for token in Authorization header (both formats)
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.header('Authorization')) {
      token = req.header('Authorization')?.replace('Bearer ', '');
    }

    if (!token) {
      console.log('❌ Fleet owner middleware - No token provided');
      res.status(401).json({ message: 'Access denied. No token provided.' });
      return;
    }

    // Verify JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key') as any;
    
    // Get user from database - support both token formats
    const userId = decoded.id || decoded.userId;
    const user = await User.findById(userId).select('-password');
    
    if (!user) {
      console.log('❌ Fleet owner middleware - User not found');
      res.status(401).json({ message: 'Invalid token. User not found.' });
      return;
    }

    if (!user.isActive) {
      console.log('❌ Fleet owner middleware - User account deactivated');
      res.status(401).json({ message: 'Account is deactivated.' });
      return;
    }

    // Check if user has fleet ownership permissions (more restrictive)
    const allowedRoles = ['fleet_manager', 'company_admin', 'system_admin'];
    if (!allowedRoles.includes(user.role)) {
      console.log('❌ Fleet owner middleware - Role not allowed:', user.role);
      res.status(403).json({ 
        message: 'Access denied. Fleet ownership permissions required.',
        userRole: user.role,
        requiredRoles: allowedRoles
      });
      return;
    }

    console.log('✅ Fleet owner middleware - User authorized');
    // Add user to request object
    req.user = user;
    next();
  } catch (error) {
    console.error('❌ Fleet owner middleware error:', error);
    res.status(401).json({ message: 'Invalid token.' });
  }
};

// Optional Fleet Manager Middleware (for routes that work for both regular users and fleet managers)
export const optionalFleetManager = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    let token;

    // Check for token in Authorization header (both formats)
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.header('Authorization')) {
      token = req.header('Authorization')?.replace('Bearer ', '');
    }

    if (!token) {
      // No token provided, continue without user
      next();
      return;
    }

    // Verify JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key') as any;
    
    // Get user from database - support both token formats
    const userId = decoded.id || decoded.userId;
    const user = await User.findById(userId).select('-password');
    
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