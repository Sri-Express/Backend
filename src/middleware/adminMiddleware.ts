// src/middleware/adminMiddleware.ts
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import User, { IUser } from '../models/User';

// Extended Request interface to include user
declare global {
  namespace Express {
    interface Request {
      user?: IUser;
    }
  }
}

interface JwtPayload {
  id: string;
}

// Middleware to check if user is system admin
export const requireSystemAdmin = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
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

      // Check if user is system admin
      if (user.role !== 'system_admin') {
        res.status(403).json({ message: 'Access denied. System administrator privileges required.' });
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
    console.error('Admin middleware error:', error);
    res.status(500).json({ message: 'Server error' });
    return;
  }
};

// Middleware to check if user is admin (any admin role)
export const requireAdmin = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
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

      // Check if user has admin role
      const adminRoles = ['system_admin', 'route_admin', 'company_admin', 'customer_service'];
      if (!adminRoles.includes(user.role)) {
        res.status(403).json({ message: 'Access denied. Administrator privileges required.' });
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
    console.error('Admin middleware error:', error);
    res.status(500).json({ message: 'Server error' });
    return;
  }
};

// Middleware to check specific admin roles
export const requireRole = (allowedRoles: string[]) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
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
    } catch (error) {
      console.error('Role check error:', error);
      res.status(500).json({ message: 'Server error' });
      return;
    }
  };
};