// src/middleware/authMiddleware.ts - Updated with Route Admin Authorization
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import User, { IUser } from '../models/User';
import Route, { IRoute } from '../models/Route';
import mongoose from 'mongoose';

// Extended Request interface to include user
declare global {
  namespace Express {
    interface Request {
      user?: IUser;
      assignedRoute?: any;
      activityLog?: {
        userId?: mongoose.Types.ObjectId;
        routeId?: mongoose.Types.ObjectId;
        action: string;
        category: string;
        ipAddress?: string;
        userAgent?: string;
        timestamp: Date;
        endpoint: string;
      };
      routeAdminStats?: {
        hasAssignedRoute: boolean;
        routeId: mongoose.Types.ObjectId | null;
        routeName: string | null;
        assignedSince: Date | null;
      };
    }
  }
}

interface JwtPayload {
  id: string;
}

export const protect = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
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
      const decoded = jwt.verify(token, process.env.JWT_SECRET || '') as JwtPayload;

      // Get user from token id
      const user = await User.findById(decoded.id).select('-password');

      if (!user) {
        res.status(401).json({ message: 'Not authorized, user not found' });
        return;
      }

      // Set user in request object
      req.user = user;
      next();
    } catch (error) {
      console.error('Token verification error:', error);
      res.status(401).json({ message: 'Not authorized, token invalid' });
      return;
    }
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({ message: 'Server error' });
    return;
  }
};

// Middleware to check if user is admin
export const isAdmin = (req: Request, res: Response, next: NextFunction): void => {
  if (req.user && (req.user.role === 'system_admin' || req.user.role === 'company_admin')) {
    next();
  } else {
    res.status(403).json({ message: 'Not authorized as an admin' });
  }
};

// Middleware to check if user is route admin
export const isRouteAdmin = (req: Request, res: Response, next: NextFunction): void => {
  if (req.user && (req.user.role === 'route_admin' || req.user.role === 'system_admin')) {
    next();
  } else {
    res.status(403).json({ message: 'Not authorized as a route admin' });
  }
};

// ===================================================
// NEW: ROUTE ADMIN SPECIFIC MIDDLEWARE
// ===================================================

// Middleware to check if user is route admin (strict check)
export const requireRouteAdmin = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Not authenticated' });
      return;
    }

    // Check if user is route admin (or system admin for testing)
    if (req.user.role !== 'route_admin' && req.user.role !== 'system_admin') {
      res.status(403).json({ 
        message: 'Access denied. Route administrator privileges required.',
        userRole: req.user.role,
        requiredRole: 'route_admin'
      });
      return;
    }

    next();
  } catch (error) {
    console.error('Route admin middleware error:', error);
    res.status(500).json({ message: 'Server error' });
    return;
  }
};

// Middleware to check if route admin has access to specific route
export const requireRouteAdminForRoute = (routeIdParam: string = 'routeId') => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const routeId = req.params[routeIdParam] || req.body.routeId;
      const userId = req.user?._id;

      if (!userId) {
        res.status(401).json({ message: 'User not authenticated' });
        return;
      }

      if (!routeId) {
        res.status(400).json({ message: 'Route ID is required' });
        return;
      }

      if (!mongoose.Types.ObjectId.isValid(routeId)) {
        res.status(400).json({ message: 'Invalid route ID format' });
        return;
      }

      // System admins have access to all routes
      if (req.user?.role === 'system_admin') {
        next();
        return;
      }

      // Check if this route admin is assigned to this specific route
      const route = await Route.findOne({
        _id: routeId,
        routeAdminId: userId,
        'routeAdminAssignment.status': 'assigned',
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
    } catch (error) {
      console.error('Route admin authorization error:', error);
      res.status(500).json({ message: 'Server error during authorization' });
      return;
    }
  };
};

// Middleware to check if route admin has any route assigned
export const requireAssignedRoute = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?._id;

    if (!userId) {
      res.status(401).json({ message: 'User not authenticated' });
      return;
    }

    // System admins bypass this check
    if (req.user?.role === 'system_admin') {
      next();
      return;
    }

    // Check if route admin has any route assigned
    const assignedRoute = await Route.findOne({
      routeAdminId: userId,
      'routeAdminAssignment.status': 'assigned',
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
  } catch (error) {
    console.error('Assigned route check error:', error);
    res.status(500).json({ message: 'Server error during route assignment check' });
    return;
  }
};

// Middleware to validate route admin assignment permissions
export const validateRouteAdminPermissions = (allowedActions: string[] = []) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?._id;
      const userRole = req.user?.role;

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
        const userPermissions = req.user?.permissions || [];
        const hasPermission = allowedActions.some(action => 
          userPermissions.includes(action)
        );

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
    } catch (error) {
      console.error('Route admin permission validation error:', error);
      res.status(500).json({ message: 'Server error during permission validation' });
      return;
    }
  };
};

// Middleware to check route operational status
export const requireActiveRoute = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const routeId = req.params.routeId || req.body.routeId || (req.assignedRoute?._id as mongoose.Types.ObjectId);

    if (!routeId) {
      res.status(400).json({ message: 'Route ID is required' });
      return;
    }

    const route = await Route.findOne({
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
  } catch (error) {
    console.error('Route status check error:', error);
    res.status(500).json({ message: 'Server error during route status check' });
    return;
  }
};

// Helper middleware to get route admin statistics
export const attachRouteAdminStats = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?._id;
    
    if (req.user?.role === 'route_admin' && userId) {
      // Get route admin statistics
      const assignedRoute = await Route.findOne({
        routeAdminId: userId,
        'routeAdminAssignment.status': 'assigned',
        approvalStatus: 'approved',
        isActive: true
      });

      if (assignedRoute) {
        // Attach basic stats to request
        req.routeAdminStats = {
          hasAssignedRoute: true,
          routeId: assignedRoute._id as mongoose.Types.ObjectId,
          routeName: assignedRoute.name,
          assignedSince: assignedRoute.routeAdminAssignment?.assignedAt || assignedRoute.updatedAt
        };
      } else {
        req.routeAdminStats = {
          hasAssignedRoute: false,
          routeId: null,
          routeName: null,
          assignedSince: null
        };
      }
    }

    next();
  } catch (error) {
    console.error('Route admin stats error:', error);
    // Don't fail the request
    next();
  }
};

// Composite middleware for role-based access control
export const requireRole = (allowedRoles: string[]) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ message: 'Not authorized' });
        return;
      }

      if (!allowedRoles.includes(req.user.role)) {
        res.status(403).json({ 
          message: `Access denied. Required roles: ${allowedRoles.join(', ')}`,
          userRole: req.user.role,
          allowedRoles
        });
        return;
      }

      next();
    } catch (error) {
      console.error('Role check error:', error);
      res.status(500).json({ message: 'Server error' });
      return;
    }
  };
};

// Composite middleware for common route admin checks
export const standardRouteAdminAuth = [
  protect,
  requireRouteAdmin,
  requireAssignedRoute,
  attachRouteAdminStats
];

// Composite middleware for route-specific operations
export const routeSpecificAuth = (routeIdParam: string = 'routeId') => [
  protect,
  requireRouteAdmin,
  requireRouteAdminForRoute(routeIdParam),
  requireActiveRoute
];

// Middleware to check if user can manage multiple routes (only system admins)
export const requireMultiRouteAccess = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Not authenticated' });
      return;
    }

    // Only system admins can manage multiple routes
    if (req.user.role !== 'system_admin') {
      res.status(403).json({ 
        message: 'Access denied. Only system administrators can manage multiple routes.' 
      });
      return;
    }

    next();
  } catch (error) {
    console.error('Multi-route access check error:', error);
    res.status(500).json({ message: 'Server error' });
    return;
  }
};

// Middleware to log route admin activities
export const logRouteAdminActivity = (action: string, category: string = 'route_management') => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?._id;
      const routeId = req.assignedRoute?._id as mongoose.Types.ObjectId;

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
    } catch (error) {
      console.error('Activity logging error:', error);
      // Don't fail the request due to logging error
      next();
    }
  };
};

// Export all middleware functions
export default {
  protect,
  isAdmin,
  isRouteAdmin,
  requireRouteAdmin,
  requireRouteAdminForRoute,
  requireAssignedRoute,
  validateRouteAdminPermissions,
  requireActiveRoute,
  attachRouteAdminStats,
  requireRole,
  standardRouteAdminAuth,
  routeSpecificAuth,
  requireMultiRouteAccess,
  logRouteAdminActivity
};