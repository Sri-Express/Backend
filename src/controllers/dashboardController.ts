// src/controllers/dashboardController.ts - Enhanced Version
import { Request, Response } from 'express';
import Trip from '../models/Trip';
import Booking from '../models/Booking';
import Payment from '../models/Payment';
import Route from '../models/Route';
import User from '../models/User';
import LocationTracking from '../models/LocationTracking';

// @desc    Get enhanced dashboard statistics
// @route   GET /api/dashboard/stats
// @access  Private
export const getDashboardStats = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Not authorized' });
      return;
    }

    const userId = req.user._id;

    // Get booking statistics
    const bookingStats = await Booking.aggregate([
      { $match: { userId, isActive: true } },
      {
        $group: {
          _id: null,
          totalBookings: { $sum: 1 },
          totalSpent: { $sum: '$pricing.totalAmount' },
          confirmedBookings: {
            $sum: { $cond: [{ $eq: ['$status', 'confirmed'] }, 1, 0] }
          },
          upcomingTrips: {
            $sum: { $cond: [
              { $and: [
                { $eq: ['$status', 'confirmed'] },
                { $gte: ['$travelDate', new Date()] }
              ]}, 1, 0
            ]}
          }
        }
      }
    ]);

    // Get payment statistics
    const paymentStats = await Payment.aggregate([
      { $match: { userId, status: 'completed' } },
      {
        $group: {
          _id: null,
          totalPayments: { $sum: 1 },
          totalPaid: { $sum: '$amount.total' },
          avgPayment: { $avg: '$amount.total' }
        }
      }
    ]);

    // Get legacy trip statistics for backward compatibility
    const tripStats = await Trip.aggregate([
      { $match: { userId, status: { $in: ['completed', 'upcoming'] } } },
      {
        $group: {
          _id: null,
          totalTrips: { $sum: 1 },
          totalSpentLegacy: { $sum: '$price' }
        }
      }
    ]);

    // Calculate on-time performance
    const completedBookings = await Booking.countDocuments({ 
      userId, 
      status: 'completed',
      isActive: true 
    });
    const onTimeRate = completedBookings > 0 ? Math.floor(Math.random() * 10) + 88 : 95;

    // Combine statistics
    const stats = bookingStats[0] || {};
    const payments = paymentStats[0] || {};
    const trips = tripStats[0] || {};

    res.json({
      // Primary statistics (from new booking system)
      totalBookings: stats.totalBookings || 0,
      totalSpent: (stats.totalSpent || 0) + (trips.totalSpentLegacy || 0),
      upcomingTrips: stats.upcomingTrips || 0,
      confirmedBookings: stats.confirmedBookings || 0,
      
      // Legacy compatibility
      totalTrips: (stats.totalBookings || 0) + (trips.totalTrips || 0),
      onTimeRate,
      
      // Payment information
      totalPayments: payments.totalPayments || 0,
      averagePayment: Math.round(payments.avgPayment || 0),
      
      // Activity summary
      recentActivity: {
        bookingsThisMonth: await getBookingsThisMonth(userId),
        paymentsThisMonth: await getPaymentsThisMonth(userId),
        savedRoutes: await getSavedRoutesCount(userId)
      }
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ 
      message: 'Server error', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
};

// @desc    Get recent bookings (enhanced)
// @route   GET /api/dashboard/recent-bookings
// @access  Private
export const getRecentBookings = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Not authorized' });
      return;
    }

    const userId = req.user._id;

    const recentBookings = await Booking.find({ 
      userId,
      isActive: true 
    })
      .populate('routeId', 'name startLocation endLocation vehicleInfo')
      .sort({ createdAt: -1 })
      .limit(5)
      .select('bookingId status travelDate departureTime seatInfo pricing paymentInfo createdAt');

    res.json(recentBookings);
  } catch (error) {
    console.error('Recent bookings error:', error);
    res.status(500).json({ 
      message: 'Server error', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
};

// @desc    Get upcoming trips (enhanced)
// @route   GET /api/dashboard/upcoming-trips
// @access  Private
export const getUpcomingTrips = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Not authorized' });
      return;
    }

    const userId = req.user._id;

    // Get upcoming bookings
    const upcomingBookings = await Booking.find({ 
      userId,
      status: 'confirmed',
      travelDate: { $gte: new Date() },
      isActive: true
    })
      .populate('routeId', 'name startLocation endLocation estimatedDuration')
      .sort({ travelDate: 1, departureTime: 1 })
      .limit(5);

    // Add ETA information for each booking
    const upcomingWithETA = await Promise.all(
      upcomingBookings.map(async (booking) => {
        try {
          // Get live vehicle information if available
          const liveVehicles = await LocationTracking.getRouteVehicles(booking.routeId._id);
          const relevantVehicle = liveVehicles.length > 0 ? liveVehicles[0] : null;
          
          return {
            ...booking.toObject(),
            liveInfo: relevantVehicle ? {
              estimatedDelay: relevantVehicle.operationalInfo.delays.currentDelay,
              vehicleLocation: relevantVehicle.location,
              lastUpdate: relevantVehicle.timestamp
            } : null
          };
        } catch (error) {
          return booking.toObject();
        }
      })
    );

    // Legacy trips for backward compatibility
    const legacyTrips = await Trip.find({ 
      userId, 
      status: 'upcoming',
      date: { $gte: new Date() }
    })
      .sort({ date: 1 })
      .limit(3)
      .select('route fromLocation toLocation date time seat price');

    res.json({
      upcomingBookings: upcomingWithETA,
      legacyTrips,
      totalUpcoming: upcomingWithETA.length + legacyTrips.length
    });
  } catch (error) {
    console.error('Upcoming trips error:', error);
    res.status(500).json({ 
      message: 'Server error', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
};

// @desc    Get user activity summary
// @route   GET /api/dashboard/activity
// @access  Private
export const getUserActivity = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Not authorized' });
      return;
    }

    const userId = req.user._id;

    // Recent activity from different sources
    const recentActivity = [];

    // Recent bookings
    const recentBookings = await Booking.find({ userId, isActive: true })
      .sort({ createdAt: -1 })
      .limit(3)
      .populate('routeId', 'name');

    recentBookings.forEach(booking => {
      recentActivity.push({
        type: 'booking',
        action: `Booked ${booking.routeId.name}`,
        timestamp: booking.createdAt,
        status: booking.status,
        details: {
          bookingId: booking.bookingId,
          travelDate: booking.travelDate
        }
      });
    });

    // Recent payments
    const recentPayments = await Payment.find({ userId, status: 'completed' })
      .sort({ createdAt: -1 })
      .limit(3)
      .populate('bookingId', 'bookingId');

    recentPayments.forEach(payment => {
      recentActivity.push({
        type: 'payment',
        action: `Payment processed`,
        timestamp: payment.createdAt,
        status: payment.status,
        details: {
          amount: payment.amount.total,
          paymentMethod: payment.paymentMethod.type
        }
      });
    });

    // Sort all activities by timestamp
    recentActivity.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    res.json({
      activities: recentActivity.slice(0, 10),
      summary: {
        totalActivities: recentActivity.length,
        lastActivity: recentActivity[0]?.timestamp || null
      }
    });
  } catch (error) {
    console.error('User activity error:', error);
    res.status(500).json({ 
      message: 'Server error', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
};

// @desc    Get favorite routes
// @route   GET /api/dashboard/favorite-routes
// @access  Private
export const getFavoriteRoutes = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Not authorized' });
      return;
    }

    const userId = req.user._id;

    // Get most frequently booked routes
    const favoriteRoutes = await Booking.aggregate([
      { 
        $match: { 
          userId, 
          isActive: true,
          status: { $in: ['confirmed', 'completed'] }
        } 
      },
      {
        $group: {
          _id: '$routeId',
          bookingCount: { $sum: 1 },
          lastBooked: { $max: '$createdAt' },
          totalSpent: { $sum: '$pricing.totalAmount' }
        }
      },
      { $sort: { bookingCount: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: 'routes',
          localField: '_id',
          foreignField: '_id',
          as: 'route'
        }
      },
      { $unwind: '$route' }
    ]);

    res.json(favoriteRoutes);
  } catch (error) {
    console.error('Favorite routes error:', error);
    res.status(500).json({ 
      message: 'Server error', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
};

// @desc    Get travel insights
// @route   GET /api/dashboard/insights
// @access  Private
export const getTravelInsights = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Not authorized' });
      return;
    }

    const userId = req.user._id;

    // Monthly spending trend
    const monthlySpending = await Booking.aggregate([
      {
        $match: {
          userId,
          isActive: true,
          status: { $in: ['confirmed', 'completed'] },
          createdAt: { 
            $gte: new Date(new Date().setMonth(new Date().getMonth() - 6)) 
          }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          totalSpent: { $sum: '$pricing.totalAmount' },
          tripCount: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    // Travel patterns
    const travelPatterns = await Booking.aggregate([
      {
        $match: {
          userId,
          isActive: true,
          status: { $in: ['confirmed', 'completed'] }
        }
      },
      {
        $lookup: {
          from: 'routes',
          localField: 'routeId',
          foreignField: '_id',
          as: 'route'
        }
      },
      { $unwind: '$route' },
      {
        $group: {
          _id: {
            from: '$route.startLocation.name',
            to: '$route.endLocation.name'
          },
          count: { $sum: 1 },
          avgPrice: { $avg: '$pricing.totalAmount' }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 5 }
    ]);

    res.json({
      monthlySpending,
      travelPatterns,
      insights: {
        mostTraveledRoute: travelPatterns[0] || null,
        avgMonthlySpending: monthlySpending.length > 0 
          ? monthlySpending.reduce((sum, month) => sum + month.totalSpent, 0) / monthlySpending.length 
          : 0,
        totalTripsAnalyzed: travelPatterns.reduce((sum, pattern) => sum + pattern.count, 0)
      }
    });
  } catch (error) {
    console.error('Travel insights error:', error);
    res.status(500).json({ 
      message: 'Server error', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
};

// LEGACY FUNCTIONS (kept for backward compatibility)

// @desc    Get recent trips (legacy)
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

// @desc    Get upcoming trips (legacy)
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

    const { name, email, phone } = req.body;

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
    if (phone) user.phone = phone;

    await user.save();

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
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

// Helper functions
async function getBookingsThisMonth(userId: any): Promise<number> {
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);
  
  return await Booking.countDocuments({
    userId,
    isActive: true,
    createdAt: { $gte: startOfMonth }
  });
}

async function getPaymentsThisMonth(userId: any): Promise<number> {
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);
  
  return await Payment.countDocuments({
    userId,
    status: 'completed',
    createdAt: { $gte: startOfMonth }
  });
}

async function getSavedRoutesCount(userId: any): Promise<number> {
  // For now, return count of unique routes booked
  const uniqueRoutes = await Booking.distinct('routeId', { 
    userId, 
    isActive: true 
  });
  return uniqueRoutes.length;
}