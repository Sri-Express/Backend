// src/controllers/bookingController.ts
import { Request, Response } from 'express';
import Booking from '../models/Booking';
import Route from '../models/Route';
import Payment from '../models/Payment';
import User from '../models/User';

// @desc    Get user bookings with filtering and pagination
// @route   GET /api/bookings
// @access  Private
export const getUserBookings = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Not authorized' });
      return;
    }

    const {
      page = 1,
      limit = 10,
      status,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    // Build filter query
    const filter: any = { 
      userId: req.user._id,
      isActive: true
    };

    if (status && status !== 'all') {
      filter.status = status;
    }

    // Build sort object
    const sortObject: any = {};
    sortObject[sortBy as string] = sortOrder === 'desc' ? -1 : 1;

    // Get bookings with route information
    const bookings = await Booking.find(filter)
      .populate('routeId', 'name startLocation endLocation vehicleInfo operatorInfo')
      .populate('paymentInfo.paymentId', 'status amount')
      .sort(sortObject)
      .skip(skip)
      .limit(limitNum);

    // Get total count for pagination
    const totalBookings = await Booking.countDocuments(filter);
    const totalPages = Math.ceil(totalBookings / limitNum);

    res.json({
      bookings,
      pagination: {
        currentPage: pageNum,
        totalPages,
        totalBookings,
        hasNextPage: pageNum < totalPages,
        hasPrevPage: pageNum > 1
      }
    });
  } catch (error) {
    console.error('Get user bookings error:', error);
    res.status(500).json({ 
      message: 'Server error', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
};

// @desc    Create new booking
// @route   POST /api/bookings
// @access  Private
export const createBooking = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Not authorized' });
      return;
    }

    const {
      routeId,
      scheduleId,
      travelDate,
      departureTime,
      passengerInfo,
      seatInfo,
      paymentMethod
    } = req.body;

    // Validate required fields
    if (!routeId || !scheduleId || !travelDate || !departureTime || !passengerInfo || !seatInfo || !paymentMethod) {
      res.status(400).json({ message: 'Missing required booking information' });
      return;
    }

    // Get route information
    const route = await Route.findById(routeId);
    if (!route || !route.isActive || route.status !== 'active') {
      res.status(404).json({ message: 'Route not found or not available' });
      return;
    }

    // Validate travel date is not in the past
    const bookingDate = new Date(travelDate);
    const now = new Date();
    if (bookingDate < now) {
      res.status(400).json({ message: 'Cannot book for past dates' });
      return;
    }

    // Check if seat is already booked for this route and date
    const existingBooking = await Booking.findOne({
      routeId,
      travelDate: bookingDate,
      departureTime,
      'seatInfo.seatNumber': seatInfo.seatNumber,
      status: { $in: ['confirmed', 'pending'] },
      isActive: true
    });

    if (existingBooking) {
      res.status(400).json({ message: 'Seat already booked for this schedule' });
      return;
    }

    // Calculate pricing
    const basePrice = route.calculatePrice(passengerInfo.passengerType || 'regular');
    const taxes = Math.round(basePrice * 0.02); // 2% tax
    const discounts = 0; // Can be calculated based on promotions
    const totalAmount = basePrice + taxes - discounts;

    // Create booking
    const booking = new Booking({
      userId: req.user._id,
      routeId,
      scheduleId,
      travelDate: bookingDate,
      departureTime,
      passengerInfo: {
        ...passengerInfo,
        email: passengerInfo.email || req.user.email
      },
      seatInfo,
      pricing: {
        basePrice,
        taxes,
        discounts,
        totalAmount,
        currency: 'LKR'
      },
      paymentInfo: {
        method: paymentMethod,
        status: 'pending'
      },
      status: 'pending'
    });

    await booking.save();

    // Create payment record
    const payment = new Payment({
      userId: req.user._id,
      bookingId: booking._id,
      amount: {
        subtotal: basePrice,
        taxes,
        fees: 0,
        discounts,
        total: totalAmount,
        currency: 'LKR'
      },
      paymentMethod: {
        type: paymentMethod
      },
      transactionInfo: {
        transactionId: `TXN${Date.now()}${Math.floor(Math.random() * 1000)}`
      },
      billingInfo: {
        name: passengerInfo.name,
        email: passengerInfo.email || req.user.email,
        phone: passengerInfo.phone
      }
    });

    await payment.save();

    // Update booking with payment reference
    booking.paymentInfo.paymentId = payment._id;
    await booking.save();

    // Populate route information for response
    await booking.populate('routeId', 'name startLocation endLocation vehicleInfo');

    res.status(201).json({
      message: 'Booking created successfully',
      booking,
      payment: {
        id: payment._id,
        paymentId: payment.paymentId,
        amount: payment.amount,
        status: payment.status
      }
    });
  } catch (error) {
    console.error('Create booking error:', error);
    res.status(500).json({ 
      message: 'Server error', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
};

// @desc    Get booking by ID
// @route   GET /api/bookings/:id
// @access  Private
export const getBookingById = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Not authorized' });
      return;
    }

    const { id } = req.params;

    const booking = await Booking.findById(id)
      .populate('routeId', 'name startLocation endLocation waypoints vehicleInfo operatorInfo')
      .populate('paymentInfo.paymentId');

    if (!booking) {
      res.status(404).json({ message: 'Booking not found' });
      return;
    }

    // Check if user owns this booking
    if (booking.userId.toString() !== req.user._id.toString()) {
      res.status(403).json({ message: 'Not authorized to view this booking' });
      return;
    }

    // Add booking management options
    const managementOptions = {
      canCancel: booking.canBeCancelled(),
      canModify: booking.canBeModified(),
      hoursUntilDeparture: booking.getHoursUntilDeparture(),
      refundAmount: booking.canBeCancelled() ? booking.calculateRefund() : 0
    };

    res.json({
      booking,
      managementOptions
    });
  } catch (error) {
    console.error('Get booking by ID error:', error);
    res.status(500).json({ 
      message: 'Server error', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
};

// @desc    Update booking
// @route   PUT /api/bookings/:id
// @access  Private
export const updateBooking = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Not authorized' });
      return;
    }

    const { id } = req.params;
    const { passengerInfo, seatInfo } = req.body;

    const booking = await Booking.findById(id);

    if (!booking) {
      res.status(404).json({ message: 'Booking not found' });
      return;
    }

    // Check if user owns this booking
    if (booking.userId.toString() !== req.user._id.toString()) {
      res.status(403).json({ message: 'Not authorized to modify this booking' });
      return;
    }

    // Check if booking can be modified
    if (!booking.canBeModified()) {
      res.status(400).json({ message: 'Booking cannot be modified at this time' });
      return;
    }

    // If seat is being changed, check availability
    if (seatInfo && seatInfo.seatNumber !== booking.seatInfo.seatNumber) {
      const existingBooking = await Booking.findOne({
        routeId: booking.routeId,
        travelDate: booking.travelDate,
        departureTime: booking.departureTime,
        'seatInfo.seatNumber': seatInfo.seatNumber,
        status: { $in: ['confirmed', 'pending'] },
        isActive: true,
        _id: { $ne: booking._id }
      });

      if (existingBooking) {
        res.status(400).json({ message: 'New seat already booked for this schedule' });
        return;
      }
    }

    // Update booking
    if (passengerInfo) {
      booking.passengerInfo = { ...booking.passengerInfo, ...passengerInfo };
    }

    if (seatInfo) {
      booking.seatInfo = { ...booking.seatInfo, ...seatInfo };
    }

    await booking.save();

    await booking.populate('routeId', 'name startLocation endLocation vehicleInfo');

    res.json({
      message: 'Booking updated successfully',
      booking
    });
  } catch (error) {
    console.error('Update booking error:', error);
    res.status(500).json({ 
      message: 'Server error', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
};

// @desc    Cancel booking
// @route   PUT /api/bookings/:id/cancel
// @access  Private
export const cancelBooking = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Not authorized' });
      return;
    }

    const { id } = req.params;
    const { reason } = req.body;

    const booking = await Booking.findById(id);

    if (!booking) {
      res.status(404).json({ message: 'Booking not found' });
      return;
    }

    // Check if user owns this booking
    if (booking.userId.toString() !== req.user._id.toString()) {
      res.status(403).json({ message: 'Not authorized to cancel this booking' });
      return;
    }

    // Check if booking can be cancelled
    if (!booking.canBeCancelled()) {
      res.status(400).json({ message: 'Booking cannot be cancelled at this time' });
      return;
    }

    // Calculate refund amount
    const refundAmount = booking.calculateRefund();

    // Update booking status
    booking.status = 'cancelled';
    booking.cancellationInfo = {
      reason: reason || 'Cancelled by user',
      cancelledAt: new Date(),
      refundAmount,
      refundStatus: refundAmount > 0 ? 'pending' : 'processed'
    };

    await booking.save();

    // Process refund if applicable
    if (refundAmount > 0 && booking.paymentInfo.paymentId) {
      const payment = await Payment.findById(booking.paymentInfo.paymentId);
      if (payment) {
        await payment.processRefund(refundAmount, reason || 'Booking cancelled', req.user._id);
      }
    }

    await booking.populate('routeId', 'name startLocation endLocation');

    res.json({
      message: 'Booking cancelled successfully',
      booking,
      refundInfo: {
        refundAmount,
        refundStatus: booking.cancellationInfo?.refundStatus
      }
    });
  } catch (error) {
    console.error('Cancel booking error:', error);
    res.status(500).json({ 
      message: 'Server error', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
};

// @desc    Generate QR code for booking
// @route   POST /api/bookings/:id/qr
// @access  Private
export const generateQRCode = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Not authorized' });
      return;
    }

    const { id } = req.params;

    const booking = await Booking.findById(id);

    if (!booking) {
      res.status(404).json({ message: 'Booking not found' });
      return;
    }

    // Check if user owns this booking
    if (booking.userId.toString() !== req.user._id.toString()) {
      res.status(403).json({ message: 'Not authorized to access this booking' });
      return;
    }

    // Only generate QR for confirmed bookings
    if (booking.status !== 'confirmed') {
      res.status(400).json({ message: 'QR code only available for confirmed bookings' });
      return;
    }

    // QR code data
    const qrData = {
      bookingId: booking.bookingId,
      passengerName: booking.passengerInfo.name,
      route: `${booking.routeId}`,
      seat: booking.seatInfo.seatNumber,
      date: booking.travelDate.toISOString().split('T')[0],
      time: booking.departureTime,
      validUntil: booking.travelDate.toISOString()
    };

    res.json({
      qrCode: booking.qrCode,
      qrData,
      booking: {
        bookingId: booking.bookingId,
        status: booking.status
      }
    });
  } catch (error) {
    console.error('Generate QR code error:', error);
    res.status(500).json({ 
      message: 'Server error', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
};

// @desc    Check in passenger
// @route   POST /api/bookings/:id/checkin
// @access  Private
export const checkInPassenger = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Not authorized' });
      return;
    }

    const { id } = req.params;
    const { location } = req.body;

    const booking = await Booking.findById(id);

    if (!booking) {
      res.status(404).json({ message: 'Booking not found' });
      return;
    }

    // Check if user owns this booking
    if (booking.userId.toString() !== req.user._id.toString()) {
      res.status(403).json({ message: 'Not authorized to check in this booking' });
      return;
    }

    // Check if booking is confirmed
    if (booking.status !== 'confirmed') {
      res.status(400).json({ message: 'Only confirmed bookings can be checked in' });
      return;
    }

    // Check if already checked in
    if (booking.checkInInfo?.checkedIn) {
      res.status(400).json({ message: 'Already checked in' });
      return;
    }

    // Update check-in information
    booking.checkInInfo = {
      checkedIn: true,
      checkInTime: new Date(),
      checkInLocation: location || 'Unknown'
    };

    await booking.save();

    res.json({
      message: 'Check-in successful',
      checkInInfo: booking.checkInInfo
    });
  } catch (error) {
    console.error('Check in passenger error:', error);
    res.status(500).json({ 
      message: 'Server error', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
};

// @desc    Get booking statistics
// @route   GET /api/bookings/stats
// @access  Private
export const getBookingStats = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Not authorized' });
      return;
    }

    const userId = req.user._id;

    // Get user's booking statistics
    const stats = await Booking.getBookingStats(userId);

    // Get booking counts by status
    const statusCounts = await Booking.aggregate([
      { $match: { userId, isActive: true } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    // Get monthly booking trend (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const monthlyTrend = await Booking.aggregate([
      {
        $match: {
          userId,
          isActive: true,
          createdAt: { $gte: sixMonthsAgo }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          count: { $sum: 1 },
          totalSpent: { $sum: '$pricing.totalAmount' }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    res.json({
      overview: stats,
      statusCounts,
      monthlyTrend
    });
  } catch (error) {
    console.error('Get booking stats error:', error);
    res.status(500).json({ 
      message: 'Server error', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
};