// src/controllers/adminUserController.ts - FIXED WITHOUT STATIC METHODS
import { Request, Response } from 'express';
import User from '../models/User';
import UserActivity from '../models/UserActivity';
import bcrypt from 'bcrypt';
import mongoose from 'mongoose';

// @desc    Get all users with pagination and filtering
// @route   GET /api/admin/users
// @access  Private (System Admin)
export const getAllUsers = async (req: Request, res: Response): Promise<void> => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      search = '', 
      role = 'all', 
      status = 'all',
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build query
    let query: any = {};

    // Search functionality
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    // Role filter
    if (role !== 'all') {
      query.role = role;
    }

    // Status filter (assuming we add isActive field)
    if (status === 'active') {
      query.isActive = true;
    } else if (status === 'inactive') {
      query.isActive = false;
    }

    // Calculate pagination
    const pageNumber = parseInt(page as string);
    const pageSize = parseInt(limit as string);
    const skip = (pageNumber - 1) * pageSize;

    // Build sort object
    const sort: any = {};
    sort[sortBy as string] = sortOrder === 'desc' ? -1 : 1;

    // Get users with pagination
    const users = await User.find(query)
      .select('-password')
      .sort(sort)
      .skip(skip)
      .limit(pageSize);

    // Get total count for pagination
    const totalUsers = await User.countDocuments(query);

    // Get user statistics
    const stats = await User.aggregate([
      {
        $group: {
          _id: '$role',
          count: { $sum: 1 }
        }
      }
    ]);

    const userStats = {
      totalUsers,
      activeUsers: await User.countDocuments({ ...query, isActive: true }),
      byRole: stats.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {})
    };

    res.json({
      users,
      pagination: {
        currentPage: pageNumber,
        totalPages: Math.ceil(totalUsers / pageSize),
        totalUsers,
        hasNext: pageNumber < Math.ceil(totalUsers / pageSize),
        hasPrev: pageNumber > 1
      },
      stats: userStats
    });
  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({ 
      message: 'Server error', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
};

// @desc    Get user by ID
// @route   GET /api/admin/users/:id
// @access  Private (System Admin)
export const getUserById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const user = await User.findById(id).select('-password');

    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    res.json(user);
  } catch (error) {
    console.error('Get user by ID error:', error);
    res.status(500).json({ 
      message: 'Server error', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
};

// @desc    Create new user
// @route   POST /api/admin/users
// @access  Private (System Admin)
export const createUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { 
      name, 
      email, 
      password, 
      role, 
      phone, 
      department, 
      company, 
      permissions = [],
      isActive = true 
    } = req.body;

    // Validate required fields
    if (!name || !email || !password || !role) {
      res.status(400).json({ message: 'Name, email, password, and role are required' });
      return;
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      res.status(400).json({ message: 'User with this email already exists' });
      return;
    }

    // Validate role
    const validRoles = ['client', 'customer_service', 'route_admin', 'company_admin', 'system_admin'];
    if (!validRoles.includes(role)) {
      res.status(400).json({ message: 'Invalid role specified' });
      return;
    }

    // Create user object
    const userData: any = {
      name,
      email,
      password,
      role,
      isActive
    };

    // Add optional fields
    if (phone) userData.phone = phone;
    if (department) userData.department = department;
    if (company) userData.company = company;
    if (permissions.length > 0) userData.permissions = permissions;

    // Create user
    const user = await User.create(userData);

    // Return user without password
    const userResponse = await User.findById(user._id).select('-password');

    res.status(201).json({
      message: 'User created successfully',
      user: userResponse
    });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ 
      message: 'Server error', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
};

// @desc    Update user
// @route   PUT /api/admin/users/:id
// @access  Private (System Admin)
export const updateUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { 
      name, 
      email, 
      role, 
      phone, 
      department, 
      company, 
      permissions,
      isActive 
    } = req.body;

    // Find user
    const user = await User.findById(id);
    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    // Check if email is already taken by another user
    if (email && email !== user.email) {
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        res.status(400).json({ message: 'Email already in use by another user' });
        return;
      }
    }

    // Update fields
    if (name) user.name = name;
    if (email) user.email = email;
    if (role) user.role = role;
    if (phone !== undefined) user.phone = phone;
    if (department !== undefined) user.department = department;
    if (company !== undefined) user.company = company;
    if (permissions !== undefined) user.permissions = permissions;
    if (isActive !== undefined) user.isActive = isActive;

    // Save user
    await user.save();

    // Return user without password
    const updatedUser = await User.findById(id).select('-password');

    res.json({
      message: 'User updated successfully',
      user: updatedUser
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ 
      message: 'Server error', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
};

// @desc    Delete user
// @route   DELETE /api/admin/users/:id
// @access  Private (System Admin)
export const deleteUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    // Prevent deletion of system admin users
    const user = await User.findById(id);
    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    if (user.role === 'system_admin') {
      res.status(400).json({ message: 'Cannot delete system administrator accounts' });
      return;
    }

    // Delete user
    await User.findByIdAndDelete(id);

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ 
      message: 'Server error', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
};

// @desc    Toggle user active status
// @route   PATCH /api/admin/users/:id/toggle-status
// @access  Private (System Admin)
export const toggleUserStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const user = await User.findById(id);
    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    // Toggle active status
    user.isActive = !user.isActive;
    await user.save();

    res.json({
      message: `User ${user.isActive ? 'activated' : 'deactivated'} successfully`,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isActive: user.isActive
      }
    });
  } catch (error) {
    console.error('Toggle user status error:', error);
    res.status(500).json({ 
      message: 'Server error', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
};

// @desc    Get user statistics
// @route   GET /api/admin/users/stats
// @access  Private (System Admin)
export const getUserStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const totalUsers = await User.countDocuments();
    const activeUsers = await User.countDocuments({ isActive: true });
    const inactiveUsers = await User.countDocuments({ isActive: false });

    // Get users by role
    const usersByRole = await User.aggregate([
      {
        $group: {
          _id: '$role',
          count: { $sum: 1 }
        }
      }
    ]);

    // Get recent registrations (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const recentRegistrations = await User.countDocuments({
      createdAt: { $gte: thirtyDaysAgo }
    });

    const stats = {
      totalUsers,
      activeUsers,
      inactiveUsers,
      recentRegistrations,
      byRole: usersByRole.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {})
    };

    res.json(stats);
  } catch (error) {
    console.error('Get user stats error:', error);
    res.status(500).json({ 
      message: 'Server error', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
};

// @desc    Get individual user statistics
// @route   GET /api/admin/users/:id/stats
// @access  Private (System Admin)
export const getUserStatistics = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    // Check if user exists
    const user = await User.findById(id);
    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    // Get activity statistics using direct queries instead of static method
    const totalActivities = await UserActivity.countDocuments({ userId: id });
    const loginCount = await UserActivity.countDocuments({ 
      userId: id, 
      action: 'login' 
    });
    
    // Get last 30 days activity
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const recentActivities = await UserActivity.countDocuments({
      userId: id,
      timestamp: { $gte: thirtyDaysAgo }
    });

    // Mock role-specific statistics (you can enhance these with real data)
    let roleSpecificStats: Record<string, any> = {};

    switch (user.role) {
      case 'client':
        roleSpecificStats = {
          tripsBooked: Math.floor(Math.random() * 50) + 5,
          completedTrips: Math.floor(Math.random() * 45) + 3,
          cancelledTrips: Math.floor(Math.random() * 5),
          upcomingTrips: Math.floor(Math.random() * 3)
        };
        break;
      case 'route_admin':
      case 'company_admin':
        roleSpecificStats = {
          devicesManaged: Math.floor(Math.random() * 20) + 5,
          onlineDevices: Math.floor(Math.random() * 15) + 3,
          offlineDevices: Math.floor(Math.random() * 5),
          maintenanceDevices: Math.floor(Math.random() * 3)
        };
        break;
      case 'customer_service':
        roleSpecificStats = {
          ticketsHandled: Math.floor(Math.random() * 200) + 50,
          resolvedTickets: Math.floor(Math.random() * 180) + 40,
          averageResponseTime: Math.floor(Math.random() * 60) + 15
        };
        break;
      case 'system_admin':
        roleSpecificStats = {
          usersManaged: await User.countDocuments(),
          devicesOverseeing: Math.floor(Math.random() * 100) + 20,
          systemAlerts: Math.floor(Math.random() * 10) + 2
        };
        break;
    }

    // Get last activity date
    const lastActivity = await UserActivity.findOne(
      { userId: id },
      {},
      { sort: { timestamp: -1 } }
    );

    // Mock trends (enhance with real calculation)
    const trends = {
      loginTrend: Math.floor(Math.random() * 40) - 20, // -20 to +20
      activityTrend: Math.floor(Math.random() * 60) - 30 // -30 to +30
    };

    const statistics = {
      userId: id,
      role: user.role,
      accountCreated: user.createdAt,
      lastLogin: user.lastLogin,
      isActive: user.isActive,
      totalLogins: loginCount,
      totalActivities,
      recentActivities,
      lastActiveDate: lastActivity?.timestamp || user.lastLogin || user.updatedAt,
      averageSessionsPerDay: Math.round((loginCount / 30) * 10) / 10, // Mock calculation
      activityByCategory: {
        auth: Math.floor(totalActivities * 0.3),
        profile: Math.floor(totalActivities * 0.1),
        device: Math.floor(totalActivities * 0.4),
        trip: Math.floor(totalActivities * 0.1),
        system: Math.floor(totalActivities * 0.1)
      },
      ...roleSpecificStats,
      failedLoginAttempts: Math.floor(Math.random() * 5), // Mock data
      trends
    };

    res.json(statistics);
  } catch (error) {
    console.error('Get user statistics error:', error);
    res.status(500).json({ 
      message: 'Server error', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
};

// @desc    Get user activity log
// @route   GET /api/admin/users/:id/activity
// @access  Private (System Admin)
export const getUserActivity = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { 
      page = 1, 
      limit = 20, 
      category = 'all',
      action = 'all',
      startDate,
      endDate
    } = req.query;

    // Check if user exists
    const user = await User.findById(id);
    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    // Build query
    let query: any = { userId: new mongoose.Types.ObjectId(id) };

    // Filter by category
    if (category !== 'all') {
      query.category = category;
    }

    // Filter by action
    if (action !== 'all') {
      query.action = action;
    }

    // Filter by date range
    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) {
        query.timestamp.$gte = new Date(startDate as string);
      }
      if (endDate) {
        query.timestamp.$lte = new Date(endDate as string);
      }
    }

    // Calculate pagination
    const pageNumber = parseInt(page as string);
    const pageSize = parseInt(limit as string);
    const skip = (pageNumber - 1) * pageSize;

    // Get activities with pagination
    const activities = await UserActivity.find(query)
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(pageSize)
      .lean();

    // Get total count for pagination
    const totalActivities = await UserActivity.countDocuments(query);

    // Get activity summary
    const activitySummary = await UserActivity.aggregate([
      { $match: { userId: new mongoose.Types.ObjectId(id) } },
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 },
          lastActivity: { $max: '$timestamp' }
        }
      }
    ]);

    // Get unique actions for this user
    const uniqueActions = await UserActivity.distinct('action', { userId: id });

    // Format activities for frontend
    const formattedActivities = activities.map(activity => ({
      id: activity._id,
      action: activity.action,
      description: activity.description,
      category: activity.category,
      severity: activity.severity,
      timestamp: activity.timestamp,
      ipAddress: activity.ipAddress,
      userAgent: activity.userAgent,
      metadata: activity.metadata
    }));

    res.json({
      activities: formattedActivities,
      pagination: {
        currentPage: pageNumber,
        totalPages: Math.ceil(totalActivities / pageSize),
        totalActivities,
        hasNext: pageNumber < Math.ceil(totalActivities / pageSize),
        hasPrev: pageNumber > 1
      },
      summary: {
        totalActivities,
        categorySummary: activitySummary.reduce((acc: Record<string, any>, item) => {
          acc[item._id] = {
            count: item.count,
            lastActivity: item.lastActivity
          };
          return acc;
        }, {}),
        availableActions: uniqueActions,
        availableCategories: ['auth', 'profile', 'device', 'trip', 'system', 'other']
      }
    });
  } catch (error) {
    console.error('Get user activity error:', error);
    res.status(500).json({ 
      message: 'Server error', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
};

// @desc    Get user activity timeline (simplified for dashboard widgets)
// @route   GET /api/admin/users/:id/timeline
// @access  Private (System Admin)
export const getUserTimeline = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { limit = 10 } = req.query;

    // Check if user exists
    const user = await User.findById(id);
    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    // Get recent activities for timeline
    const recentActivities = await UserActivity.find({ userId: id })
      .sort({ timestamp: -1 })
      .limit(parseInt(limit as string))
      .select('action description timestamp category severity metadata')
      .lean();

    // Format for timeline display
    const timeline = recentActivities.map(activity => ({
      id: activity._id,
      action: activity.action,
      description: activity.description,
      timestamp: activity.timestamp,
      category: activity.category,
      severity: activity.severity,
      icon: getActivityIcon(activity.action),
      color: getCategoryColor(activity.category),
      metadata: activity.metadata
    }));

    res.json({ timeline });
  } catch (error) {
    console.error('Get user timeline error:', error);
    res.status(500).json({ 
      message: 'Server error', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
};

// Helper function to get activity icon
const getActivityIcon = (action: string): string => {
  const iconMap: Record<string, string> = {
    'login': 'login',
    'logout': 'logout',
    'password_change': 'key',
    'profile_update': 'user',
    'user_created': 'user-plus',
    'user_updated': 'user-edit',
    'user_deleted': 'user-minus',
    'device_created': 'device-plus',
    'device_updated': 'device-edit',
    'device_deleted': 'device-minus',
    'trip_booking': 'map',
    'users_list_view': 'list',
    'devices_list_view': 'list',
    'user_details_view': 'eye',
    'device_details_view': 'eye'
  };

  return iconMap[action] || 'activity';
};

// Helper function to get category color
const getCategoryColor = (category: string): string => {
  const colorMap: Record<string, string> = {
    'auth': 'blue',
    'profile': 'green',
    'device': 'orange',
    'trip': 'cyan',
    'system': 'red',
    'other': 'gray'
  };

  return colorMap[category] || 'gray';
};