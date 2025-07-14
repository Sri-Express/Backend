// src/controllers/dashboardController.ts
import { Request, Response } from 'express';
import Trip from '../models/Trip';
import User from '../models/User';

// @desc    Get dashboard statistics
// @route   GET /api/dashboard/stats
// @access  Private
export const getDashboardStats = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Not authorized' });
      return;
    }

    const userId = req.user._id;

    // Get total trips
    const totalTrips = await Trip.countDocuments({ userId });

    // Get total spent
    const totalSpentResult = await Trip.aggregate([
      { $match: { userId, status: { $in: ['completed', 'upcoming'] } } },
      { $group: { _id: null, total: { $sum: '$price' } } }
    ]);
    const totalSpent = totalSpentResult[0]?.total || 0;

    // Get upcoming trips count
    const upcomingTrips = await Trip.countDocuments({ 
      userId, 
      status: 'upcoming',
      date: { $gte: new Date() }
    });

    // Calculate on-time rate (mock for now - you can implement real logic later)
    const onTimeRate = totalTrips > 0 ? Math.floor(Math.random() * 10) + 90 : 95;

    res.json({
      totalTrips,
      totalSpent,
      upcomingTrips,
      onTimeRate,
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ 
      message: 'Server error', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
};

// @desc    Get recent trips
// @route   GET /api/dashboard/recent-trips
// @access  Private
export const getRecentTrips = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Not authorized' });
      return;
    }

    const userId = req.user._id;

    const recentTrips = await Trip.find({ userId })
      .sort({ date: -1 })
      .limit(10)
      .select('route fromLocation toLocation date price status createdAt');

    res.json(recentTrips);
  } catch (error) {
    console.error('Recent trips error:', error);
    res.status(500).json({ 
      message: 'Server error', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
};

// @desc    Get upcoming trips
// @route   GET /api/dashboard/upcoming-trips
// @access  Private
export const getUpcomingTrips = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Not authorized' });
      return;
    }

    const userId = req.user._id;

    const upcomingTrips = await Trip.find({ 
      userId, 
      status: 'upcoming',
      date: { $gte: new Date() }
    })
      .sort({ date: 1 })
      .limit(5)
      .select('route fromLocation toLocation date time seat price');

    res.json(upcomingTrips);
  } catch (error) {
    console.error('Upcoming trips error:', error);
    res.status(500).json({ 
      message: 'Server error', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
};

// @desc    Update user profile
// @route   PUT /api/dashboard/profile
// @access  Private
export const updateProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Not authorized' });
      return;
    }

    const { name, email } = req.body;

    // Find user and update
    const user = await User.findById(req.user._id);

    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    // Check if email is already taken by another user
    if (email && email !== user.email) {
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        res.status(400).json({ message: 'Email already in use' });
        return;
      }
    }

    // Update fields
    if (name) user.name = name;
    if (email) user.email = email;

    await user.save();

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      message: 'Profile updated successfully'
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ 
      message: 'Server error', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
};

// @desc    Create a demo trip (for testing)
// @route   POST /api/dashboard/demo-trip
// @access  Private
export const createDemoTrip = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Not authorized' });
      return;
    }

    const demoTrips = [
      {
        userId: req.user._id,
        route: 'Colombo - Kandy',
        fromLocation: 'Colombo',
        toLocation: 'Kandy',
        date: new Date('2025-01-10'),
        time: '08:30 AM',
        price: 450,
        status: 'completed'
      },
      {
        userId: req.user._id,
        route: 'Kandy - Galle',
        fromLocation: 'Kandy',
        toLocation: 'Galle',
        date: new Date('2025-01-08'),
        time: '02:15 PM',
        price: 650,
        status: 'completed'
      },
      {
        userId: req.user._id,
        route: 'Colombo - Jaffna',
        fromLocation: 'Colombo',
        toLocation: 'Jaffna',
        date: new Date('2025-01-05'),
        time: '06:00 AM',
        price: 850,
        status: 'cancelled'
      },
      {
        userId: req.user._id,
        route: 'Colombo - Kandy',
        fromLocation: 'Colombo',
        toLocation: 'Kandy',
        date: new Date('2025-01-15'),
        time: '08:30 AM',
        seat: 'A12',
        price: 450,
        status: 'upcoming'
      },
      {
        userId: req.user._id,
        route: 'Galle - Colombo',
        fromLocation: 'Galle',
        toLocation: 'Colombo',
        date: new Date('2025-01-18'),
        time: '02:15 PM',
        seat: 'B08',
        price: 550,
        status: 'upcoming'
      }
    ];

    await Trip.insertMany(demoTrips);

    res.json({ message: 'Demo trips created successfully' });
  } catch (error) {
    console.error('Create demo trip error:', error);
    res.status(500).json({ 
      message: 'Server error', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
};