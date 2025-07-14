// src/controllers/adminUserController.ts
import { Request, Response } from 'express';
import User from '../models/User';
import bcrypt from 'bcrypt';

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