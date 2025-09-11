// src/controllers/bookingController.ts - COMPLETE VERSION WITH EMAIL TICKET FEATURE
import { Request, Response } from 'express';
import { Types } from 'mongoose';
import Booking from '../models/Booking';
import Route from '../models/Route';
import Payment from '../models/Payment';
import User from '../models/User';
import * as QRCode from 'qrcode';
import { sendTicketEmail } from '../utils/sendEmail';

// Payment method mapping function
const mapPaymentMethod = (frontendMethod: string): string => {
  const mapping: { [key: string]: string } = {
    'bank': 'bank_transfer',
    'card': 'card',
    'digital_wallet': 'digital_wallet', 
    'cash': 'cash'
  };
  return mapping[frontendMethod] || frontendMethod;
};

// @desc    Get user bookings with filtering and pagination
// @route   GET /api/bookings
// @access  Private
export const getUserBookings = async (req: Request, res: Response): Promise<void> => {
  try {
    console.log('=== GET USER BOOKINGS REQUEST ===');
    
    if (!req.user) { 
      console.error('No user found in request');
      res.status(401).json({ message: 'Not authorized' }); 
      return; 
    }

    console.log('User requesting bookings:', {
      userId: req.user._id,
      email: req.user.email
    });

    const { page = 1, limit = 10, status, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
    const pageNum = parseInt(page as string); 
    const limitNum = parseInt(limit as string); 
    const skip = (pageNum - 1) * limitNum;

    console.log('Query parameters:', {
      page: pageNum,
      limit: limitNum,
      skip,
      status,
      sortBy,
      sortOrder
    });

    // Build filter query
    const filter: any = { userId: req.user._id, isActive: true };
    if (status && status !== 'all') filter.status = status;

    console.log('Database filter:', filter);

    // Build sort object
    const sortObject: any = {};
    sortObject[sortBy as string] = sortOrder === 'desc' ? -1 : 1;

    console.log('Sort object:', sortObject);

    // Get bookings with route information
    const bookings = await Booking.find(filter)
      .populate('routeId', 'name startLocation endLocation vehicleInfo operatorInfo')
      .populate('paymentInfo.paymentId', 'status amount')
      .sort(sortObject)
      .skip(skip)
      .limit(limitNum);

    console.log('Found bookings count:', bookings.length);
    
    if (bookings.length > 0) {
      console.log('Sample booking:', {
        bookingId: bookings[0].bookingId,
        status: bookings[0].status,
        routeName: (bookings[0].routeId as any)?.name || 'No route populated',
        paymentStatus: bookings[0].paymentInfo?.status
      });
    }

    const totalBookings = await Booking.countDocuments(filter);
    const totalPages = Math.ceil(totalBookings / limitNum);

    console.log('Pagination info:', {
      totalBookings,
      totalPages,
      currentPage: pageNum,
      hasNextPage: pageNum < totalPages,
      hasPrevPage: pageNum > 1
    });

    // Calculate stats for this user
    const stats = {
      totalBookings: await Booking.countDocuments({ userId: req.user._id, isActive: true }),
      confirmedBookings: await Booking.countDocuments({ userId: req.user._id, isActive: true, status: 'confirmed' }),
      completedBookings: await Booking.countDocuments({ userId: req.user._id, isActive: true, status: 'completed' }),
      cancelledBookings: await Booking.countDocuments({ userId: req.user._id, isActive: true, status: 'cancelled' })
    };

    console.log('User booking stats:', stats);

    res.json({ 
      bookings, 
      stats,
      pagination: { 
        currentPage: pageNum, 
        totalPages, 
        totalBookings, 
        hasNextPage: pageNum < totalPages, 
        hasPrevPage: pageNum > 1 
      } 
    });

    console.log('Response sent successfully');

  } catch (error) {
    console.error('GET USER BOOKINGS ERROR:', error);
    console.error('Error details:', {
      name: error instanceof Error ? error.name : 'Unknown',
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack trace'
    });
    
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
    console.log('=== BOOKING CREATION START ===');
    console.log('Timestamp:', new Date().toISOString());
    
    if (!req.user) { 
      console.error('No user found in request');
      res.status(401).json({ message: 'Not authorized' }); 
      return; 
    }

    console.log('User authenticated:', {
      userId: req.user._id,
      email: req.user.email,
      name: req.user.name
    });

    console.log('Raw request body:', JSON.stringify(req.body, null, 2));
    console.log('Request headers:', {
      'content-type': req.headers['content-type'],
      'authorization': req.headers.authorization ? 'Bearer [TOKEN]' : 'Missing',
      'user-agent': req.headers['user-agent'],
      'origin': req.headers.origin
    });

    const { 
      routeId, 
      scheduleId, 
      travelDate, 
      departureTime, 
      seatQuantity = 1,
      passengerInfo, 
      seatInfo, 
      paymentMethod,
      status,
      paymentInfo
    } = req.body;
    
    console.log('Extracted booking data:', {
      routeId: routeId || 'MISSING',
      scheduleId: scheduleId || 'MISSING', 
      travelDate: travelDate || 'MISSING',
      departureTime: departureTime || 'MISSING',
      passengerInfo: passengerInfo ? 'Present' : 'MISSING',
      seatInfo: seatInfo ? 'Present' : 'MISSING',
      paymentMethod: paymentMethod || 'MISSING',
      status: status || 'Not provided',
      paymentInfo: paymentInfo ? 'Present' : 'Not provided'
    });

    if (passengerInfo) {
      console.log('Passenger info details:', {
        name: passengerInfo.name || 'MISSING',
        email: passengerInfo.email || 'MISSING',
        phone: passengerInfo.phone || 'MISSING',
        idType: passengerInfo.idType || 'MISSING',
        idNumber: passengerInfo.idNumber || 'MISSING',
        passengerType: passengerInfo.passengerType || 'MISSING'
      });
    }

    if (seatInfo) {
      console.log('Seat info details:', {
        seatNumber: seatInfo.seatNumber || 'MISSING',
        seatType: seatInfo.seatType || 'MISSING',
        preferences: seatInfo.preferences || []
      });
    }
    
    // Enhanced validation with detailed error messages
    const missingFields = [];
    if (!routeId) missingFields.push('routeId');
    if (scheduleId === undefined || scheduleId === null) missingFields.push('scheduleId');
    if (!travelDate) missingFields.push('travelDate');
    if (!departureTime) missingFields.push('departureTime');
    if (!passengerInfo) missingFields.push('passengerInfo');
    if (!seatInfo) missingFields.push('seatInfo');
    if (!paymentMethod) missingFields.push('paymentMethod');
    
    if (missingFields.length > 0) {
      console.error('Validation failed - missing fields:', missingFields);
      res.status(400).json({ 
        message: 'Missing required booking information',
        missingFields,
        receivedData: {
          routeId: !!routeId,
          scheduleId: scheduleId !== undefined && scheduleId !== null,
          travelDate: !!travelDate,
          departureTime: !!departureTime,
          passengerInfo: !!passengerInfo,
          seatInfo: !!seatInfo,
          paymentMethod: !!paymentMethod
        }
      }); 
      return; 
    }

    console.log('Basic validation passed');

    // Get route information with debugging
    console.log('Looking up route with ID:', routeId);
    
    let route;
    try {
      // Try finding by MongoDB _id first
      route = await Route.findById(routeId);
      
      if (!route) {
        console.log('Route not found by _id, trying routeId field...');
        route = await Route.findOne({ routeId: routeId });
      }
      
      if (!route) {
        console.log('Route not found by routeId field, trying string conversion...');
        route = await Route.findOne({ _id: new Types.ObjectId(routeId) });
      }
    } catch (routeError) {
      console.error('Route lookup error:', routeError);
    }
    
    if (!route) {
      console.error('Route not found:', routeId);
      
      // Additional debugging - list some routes for debugging
      const sampleRoutes = await Route.find({}).limit(5).select('_id routeId name status isActive');
      console.log('Sample routes in database:', sampleRoutes.map(r => ({
        _id: (r._id as Types.ObjectId).toString(),
        routeId: r.routeId,
        name: r.name,
        status: r.status,
        isActive: r.isActive
      })));
      
      const totalRoutes = await Route.countDocuments({});
      console.log('Total routes in database:', totalRoutes);
      
      res.status(404).json({ 
        message: 'Route not found or not available',
        searchedId: routeId,
        suggestion: 'Check if the route ID is correct',
        availableRoutes: sampleRoutes.map(r => ({
          _id: (r._id as Types.ObjectId).toString(),
          name: r.name,
          status: r.status
        }))
      }); 
      return; 
    }

    console.log('Route found:', {
      _id: (route._id as Types.ObjectId).toString(),
      routeId: route.routeId,
      name: route.name,
      isActive: route.isActive,
      status: route.status,
      basePrice: route.pricing?.basePrice
    });

    if (!route.isActive || route.status !== 'active') {
      console.error('Route not active:', {
        routeId: route._id,
        name: route.name,
        isActive: route.isActive,
        status: route.status
      });
      res.status(404).json({ message: 'Route not found or not available' }); 
      return; 
    }

    console.log('Route validation passed');

    // Validate travel date with debugging (compare only dates, not times)
    const bookingDate = new Date(travelDate); 
    const now = new Date();
    
    // Reset times to midnight for accurate date comparison
    const bookingDateOnly = new Date(bookingDate.getFullYear(), bookingDate.getMonth(), bookingDate.getDate());
    const nowDateOnly = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    console.log('Date validation:', {
      travelDate: travelDate,
      parsedDate: bookingDate.toISOString(),
      currentDate: now.toISOString(),
      bookingDateOnly: bookingDateOnly.toISOString(),
      nowDateOnly: nowDateOnly.toISOString(),
      isPastDate: bookingDateOnly < nowDateOnly,
      daysDifference: Math.ceil((bookingDateOnly.getTime() - nowDateOnly.getTime()) / (1000 * 3600 * 24))
    });
    
    if (bookingDateOnly < nowDateOnly) { 
      console.error('Cannot book for past dates:', {
        bookingDate: bookingDateOnly.toISOString(),
        currentDate: nowDateOnly.toISOString()
      });
      res.status(400).json({ message: 'Cannot book for past dates' }); 
      return; 
    }

    // Generate or use provided seat number
    const finalSeatNumber = seatInfo.seatNumber || `${Math.floor(Math.random() * 50) + 1}${(seatInfo.seatType || 'window')[0].toUpperCase()}`;
    console.log('Seat number assignment:', {
      provided: seatInfo.seatNumber,
      generated: finalSeatNumber,
      seatType: seatInfo.seatType
    });

    // Check if enough seats are available for the requested quantity
    console.log('Checking seat availability for:', {
      routeId: routeId,
      travelDate: bookingDate.toISOString(),
      departureTime: departureTime,
      requestedQuantity: seatQuantity
    });
    
    const bookedSeatsCount = await Booking.countDocuments({ 
      routeId, 
      travelDate: bookingDate, 
      departureTime, 
      status: { $in: ['confirmed', 'pending'] }, 
      isActive: true 
    });
    
    const availableSeats = route.vehicleInfo.capacity - bookedSeatsCount;
    
    if (availableSeats < seatQuantity) { 
      console.error('Not enough seats available:', {
        requestedQuantity: seatQuantity,
        availableSeats: availableSeats,
        totalCapacity: route.vehicleInfo.capacity,
        bookedSeats: bookedSeatsCount
      });
      res.status(400).json({ 
        message: `Only ${availableSeats} seats available for this schedule. You requested ${seatQuantity} seats.` 
      }); 
      return; 
    }

    console.log('Enough seats available:', { requestedQuantity: seatQuantity, availableSeats });

    // Calculate pricing with debugging
    let basePrice;
    const passengerType = passengerInfo.passengerType || 'regular';
    
    console.log('Starting price calculation:', {
      routeBasePrice: route.pricing?.basePrice,
      passengerType: passengerType,
      hasCalculatePriceMethod: typeof route.calculatePrice === 'function'
    });
    
    if (typeof route.calculatePrice === 'function') {
      try {
        basePrice = route.calculatePrice(passengerType);
        console.log('Used route.calculatePrice method:', basePrice);
      } catch (calcError) {
        console.error('Error in route.calculatePrice:', calcError);
        basePrice = route.pricing?.basePrice || 0;
      }
    } else {
      basePrice = route.pricing?.basePrice || 0;
      console.log('Using base price from route.pricing:', basePrice);
      
      // Apply discounts manually if calculatePrice method doesn't exist
      const discountInfo = route.pricing?.discounts?.find((d: any) => d.type === passengerType);
      if (discountInfo) {
        const discountAmount = (basePrice * discountInfo.percentage / 100);
        basePrice -= discountAmount;
        console.log('Applied manual discount:', {
          discountType: discountInfo.type,
          percentage: discountInfo.percentage,
          discountAmount,
          newPrice: basePrice
        });
      }
    }
    
    const taxes = Math.round(basePrice * 0.02);
    const discounts = 0;
    const totalAmount = basePrice + taxes - discounts;

    console.log('Final pricing calculation:', { 
      basePrice, 
      taxes, 
      discounts, 
      totalAmount,
      passengerType
    });

    // Create multiple bookings based on seatQuantity
    const bookings = [];
    const createdBookings = [];
    
    console.log(`Creating ${seatQuantity} booking(s)...`);
    
    for (let i = 0; i < seatQuantity; i++) {
      // Generate unique seat number for each booking
      const seatNumber = `${Math.floor(Math.random() * 1000) + 1}${(seatInfo.seatType || 'window')[0].toUpperCase()}`;
      
      const bookingData = {
        userId: req.user._id,
        routeId,
        scheduleId,
        travelDate: bookingDate,
        departureTime,
        passengerInfo: {
          name: passengerInfo.name?.trim(),
          phone: passengerInfo.phone?.trim(),
          email: passengerInfo.email?.trim() || req.user.email,
          idType: passengerInfo.idType || 'nic',
          idNumber: passengerInfo.idNumber?.trim(),
          passengerType: passengerType
        },
        seatInfo: {
          seatNumber: seatNumber,
          seatType: seatInfo.seatType || 'window',
          preferences: seatInfo.preferences || []
        },
        pricing: {
          basePrice,
          taxes,
          discounts,
          totalAmount,
          currency: 'LKR'
        },
        paymentInfo: {
          method: paymentMethod,
          status: paymentInfo?.status || (status === 'confirmed' ? 'completed' : 'pending'),
          ...(paymentInfo?.paymentId && { paymentId: paymentInfo.paymentId }),
          ...(paymentInfo?.transactionId && { transactionId: paymentInfo.transactionId }),
          ...(paymentInfo?.paidAt && { paidAt: new Date(paymentInfo.paidAt) })
        },
        status: status || 'pending'
      };

      const booking = new Booking(bookingData);
      bookings.push(booking);
    }

    // Save all bookings
    try {
      for (const booking of bookings) {
        await booking.save();
        createdBookings.push(booking);
        console.log('Booking saved successfully:', {
          _id: (booking._id as Types.ObjectId).toString(),
          bookingId: booking.bookingId,
          seatNumber: booking.seatInfo.seatNumber,
          status: booking.status
        });
      }
    } catch (saveError) {
      console.error('Booking save error details:', {
        name: saveError instanceof Error ? saveError.name : 'Unknown',
        message: saveError instanceof Error ? saveError.message : 'Unknown',
        validationErrors: (saveError as any).errors ? Object.keys((saveError as any).errors) : 'None'
      });
      throw saveError;
    }

    // Use the first booking as the main booking for response
    const booking = createdBookings[0];

    // Create payment record with debugging (if not provided)
    let payment = null;
    if (!paymentInfo?.paymentId) {
      console.log('Creating payment record...');
      
      const mappedPaymentMethod = mapPaymentMethod(paymentMethod);
      console.log('Payment method mapping:', paymentMethod, '->', mappedPaymentMethod);

      const paymentData = {
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
          type: mappedPaymentMethod,
          provider: 'Sri Express Payment'
        },
        transactionInfo: {
          transactionId: paymentInfo?.transactionId || `TXN${Date.now()}${Math.floor(Math.random() * 1000)}`
        },
        billingInfo: {
          name: passengerInfo.name?.trim(),
          email: passengerInfo.email?.trim() || req.user.email,
          phone: passengerInfo.phone?.trim()
        },
        status: paymentInfo?.status || (status === 'confirmed' ? 'completed' : 'pending')
      };

      console.log('Creating payment with data:', {
        userId: paymentData.userId.toString(),
        bookingId: (paymentData.bookingId as Types.ObjectId).toString(),
        total: paymentData.amount.total,
        status: paymentData.status,
        transactionId: paymentData.transactionInfo.transactionId
      });

      try {
        payment = new Payment(paymentData);
        await payment.save();
        console.log('Payment created successfully:', {
          _id: (payment._id as Types.ObjectId).toString(),
          paymentId: payment.paymentId,
          status: payment.status
        });

        // Update booking with payment reference
        booking.paymentInfo.paymentId = payment._id as Types.ObjectId;
        if (paymentInfo?.transactionId) {
          booking.paymentInfo.transactionId = paymentInfo.transactionId;
        }
        await booking.save();
        console.log('Booking updated with payment reference');
      } catch (paymentError) {
        console.error('Payment creation failed (non-critical):', {
          name: paymentError instanceof Error ? paymentError.name : 'Unknown',
          message: paymentError instanceof Error ? paymentError.message : 'Unknown'
        });
      }
    } else {
      console.log('Payment ID provided, skipping payment creation:', paymentInfo.paymentId);
    }

    // Populate route information for response
    try {
      await booking.populate('routeId', 'name startLocation endLocation vehicleInfo operatorInfo');
      console.log('Route information populated successfully');
    } catch (populateError) {
      console.warn('Route population failed (non-critical):', populateError);
    }

    console.log('=== BOOKING CREATION COMPLETED SUCCESSFULLY ===');
    console.log('Final booking summary:', {
      totalBookingsCreated: createdBookings.length,
      mainBookingId: booking.bookingId,
      userId: booking.userId.toString(),
      routeName: (booking.routeId as any)?.name || 'Unknown',
      status: booking.status,
      paymentStatus: booking.paymentInfo?.status,
      totalAmount: booking.pricing?.totalAmount,
      seatNumbers: createdBookings.map(b => b.seatInfo.seatNumber)
    });

    const responseData = { 
      message: `${seatQuantity} seat${seatQuantity > 1 ? 's' : ''} booked successfully`, 
      booking,
      allBookings: createdBookings.map(b => ({
        bookingId: b.bookingId,
        seatNumber: b.seatInfo.seatNumber,
        status: b.status
      })),
      payment: payment ? {
        id: payment._id,
        paymentId: payment.paymentId,
        status: payment.status,
        transactionId: payment.transactionInfo?.transactionId
      } : null,
      debug: {
        createdAt: new Date().toISOString(),
        routeFound: !!route,
        paymentCreated: !!payment,
        bookingId: booking.bookingId,
        totalSeatsBooked: seatQuantity
      }
    };

    console.log('Sending response with keys:', Object.keys(responseData));

    res.status(201).json(responseData);

  } catch (error) {
    console.error('=== BOOKING CREATION ERROR ===');
    console.error('Error type:', error instanceof Error ? error.constructor.name : typeof error);
    console.error('Error message:', error instanceof Error ? error.message : 'Unknown error');
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    console.error('Request body at error:', req.body);
    console.error('User info at error:', req.user ? { 
      id: req.user._id.toString(), 
      email: req.user.email 
    } : 'No user');
    console.error('Timestamp:', new Date().toISOString());
    
    res.status(500).json({ 
      message: 'Server error', 
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
      requestId: `REQ_${Date.now()}`
    });
  }
};

// @desc    Get booking by ID
// @route   GET /api/bookings/:id
// @access  Private
export const getBookingById = async (req: Request, res: Response): Promise<void> => {
  try {
    console.log('=== GET BOOKING BY ID REQUEST ===');
    
    if (!req.user) { 
      console.error('No user found in request');
      res.status(401).json({ message: 'Not authorized' }); 
      return; 
    }

    const { id } = req.params;
    console.log('Looking for booking with ID:', id);
    console.log('Requested by user:', req.user._id.toString());

    // Try multiple ways to find the booking
    let booking;
    
    // First try by bookingId field
    booking = await Booking.findOne({ bookingId: id });
    console.log('Search by bookingId result:', booking ? 'Found' : 'Not found');
    
    // If not found, try by MongoDB _id
    if (!booking) {
      try {
        booking = await Booking.findById(id);
        console.log('Search by _id result:', booking ? 'Found' : 'Not found');
      } catch (idError) {
        console.log('_id search failed (invalid ObjectId):', (idError as Error).message);
      }
    }
    
    // If still not found, try a broader search for debugging
    if (!booking) {
      const allUserBookings = await Booking.find({ userId: req.user._id }).select('_id bookingId').limit(5);
      console.log('User\'s bookings for debugging:', allUserBookings.map(b => ({
        _id: (b._id as Types.ObjectId).toString(),
        bookingId: b.bookingId
      })));
    }

    if (!booking) { 
      console.error('Booking not found with ID:', id);
      res.status(404).json({ message: 'Booking not found' }); 
      return; 
    }

    console.log('Booking found:', {
      _id: (booking._id as Types.ObjectId).toString(),
      bookingId: booking.bookingId,
      userId: booking.userId.toString(),
      status: booking.status
    });

    // Check if user owns this booking
    if (booking.userId.toString() !== req.user._id.toString()) { 
      console.error('User not authorized for this booking:', {
        bookingUserId: booking.userId.toString(),
        requestUserId: req.user._id.toString()
      });
      res.status(403).json({ message: 'Not authorized to view this booking' }); 
      return; 
    }

    // Populate related data
    await booking.populate('routeId', 'name startLocation endLocation waypoints vehicleInfo operatorInfo');
    if (booking.paymentInfo.paymentId) {
      await booking.populate('paymentInfo.paymentId');
    }

    // Add booking management options
    const managementOptions = { 
      canCancel: booking.canBeCancelled(), 
      canModify: booking.canBeModified(), 
      hoursUntilDeparture: booking.getHoursUntilDeparture(), 
      refundAmount: booking.canBeCancelled() ? booking.calculateRefund() : 0 
    };

    console.log('Booking management options:', managementOptions);
    console.log('Response being sent for booking:', booking.bookingId);

    res.json({ booking, managementOptions });
  } catch (error) {
    console.error('GET BOOKING BY ID ERROR:', error);
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
    console.log('=== UPDATE BOOKING REQUEST ===');
    
    if (!req.user) { 
      res.status(401).json({ message: 'Not authorized' }); 
      return; 
    }

    const { id } = req.params; 
    const { passengerInfo, seatInfo } = req.body;
    
    console.log('Update request:', {
      bookingId: id,
      userId: req.user._id.toString(),
      updates: {
        passengerInfo: !!passengerInfo,
        seatInfo: !!seatInfo
      }
    });

    // Find by bookingId field instead of MongoDB _id
    const booking = await Booking.findOne({ bookingId: id });
    if (!booking) { 
      console.error('Booking not found for update:', id);
      res.status(404).json({ message: 'Booking not found' }); 
      return; 
    }

    // Check if user owns this booking
    if (booking.userId.toString() !== req.user._id.toString()) { 
      console.error('User not authorized to update booking');
      res.status(403).json({ message: 'Not authorized to modify this booking' }); 
      return; 
    }

    // Check if booking can be modified
    if (!booking.canBeModified()) { 
      console.error('Booking cannot be modified at this time');
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
        console.error('New seat already booked');
        res.status(400).json({ message: 'New seat already booked for this schedule' }); 
        return; 
      }
    }

    // Update booking
    if (passengerInfo) {
      booking.passengerInfo = { ...booking.passengerInfo, ...passengerInfo };
      console.log('Updated passenger info');
    }
    if (seatInfo) {
      booking.seatInfo = { ...booking.seatInfo, ...seatInfo };
      console.log('Updated seat info');
    }

    await booking.save();
    await booking.populate('routeId', 'name startLocation endLocation vehicleInfo');

    console.log('Booking updated successfully:', booking.bookingId);

    res.json({ message: 'Booking updated successfully', booking });
  } catch (error) {
    console.error('UPDATE BOOKING ERROR:', error);
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
    console.log('=== CANCEL BOOKING REQUEST ===');
    
    if (!req.user) { 
      res.status(401).json({ message: 'Not authorized' }); 
      return; 
    }

    const { id } = req.params; 
    const { reason } = req.body;
    
    console.log('Cancel request:', {
      bookingId: id,
      userId: req.user._id.toString(),
      reason: reason || 'Not provided'
    });

    // Find by bookingId field instead of MongoDB _id
    const booking = await Booking.findOne({ bookingId: id });
    if (!booking) { 
      console.error('Booking not found for cancellation:', id);
      res.status(404).json({ message: 'Booking not found' }); 
      return; 
    }

    // Check if user owns this booking
    if (booking.userId.toString() !== req.user._id.toString()) { 
      console.error('User not authorized to cancel booking');
      res.status(403).json({ message: 'Not authorized to cancel this booking' }); 
      return; 
    }

    // Check if booking can be cancelled
    if (!booking.canBeCancelled()) { 
      console.error('Booking cannot be cancelled at this time');
      res.status(400).json({ message: 'Booking cannot be cancelled at this time' }); 
      return; 
    }

    // Calculate refund amount
    const refundAmount = booking.calculateRefund();
    console.log('Calculated refund amount:', refundAmount);

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
      console.log('Processing refund...');
      const payment = await Payment.findById(booking.paymentInfo.paymentId);
      if (payment) {
        await payment.processRefund(refundAmount, reason || 'Booking cancelled', req.user._id);
        console.log('Refund processed successfully');
      }
    }

    await booking.populate('routeId', 'name startLocation endLocation');

    console.log('Booking cancelled successfully:', {
      bookingId: booking.bookingId,
      refundAmount,
      refundStatus: booking.cancellationInfo?.refundStatus
    });

    res.json({ 
      message: 'Booking cancelled successfully', 
      booking, 
      refundInfo: { 
        refundAmount, 
        refundStatus: booking.cancellationInfo?.refundStatus 
      } 
    });
  } catch (error) {
    console.error('CANCEL BOOKING ERROR:', error);
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
    console.log('=== GENERATE QR CODE REQUEST ===');
    
    if (!req.user) { 
      res.status(401).json({ message: 'Not authorized' }); 
      return; 
    }

    const { id } = req.params;
    console.log('QR code request for booking:', id);

    // Find by bookingId field instead of MongoDB _id
    const booking = await Booking.findOne({ bookingId: id });
    if (!booking) { 
      console.error('Booking not found for QR generation:', id);
      res.status(404).json({ message: 'Booking not found' }); 
      return; 
    }

    // Check if user owns this booking
    if (booking.userId.toString() !== req.user._id.toString()) { 
      console.error('User not authorized for QR generation');
      res.status(403).json({ message: 'Not authorized to access this booking' }); 
      return; 
    }

    // Only generate QR for confirmed bookings
    if (booking.status !== 'confirmed') { 
      console.error('QR code only available for confirmed bookings, current status:', booking.status);
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

    // Generate proper QR code
    try {
      const qrText = JSON.stringify({
        booking: booking.bookingId,
        passenger: booking.passengerInfo.name,
        seat: booking.seatInfo.seatNumber,
        date: booking.travelDate.toISOString().split('T')[0],
        time: booking.departureTime,
        verification: `SRI-EXPRESS-${booking.bookingId}`
      });
      
      const qrCodeData = await QRCode.toDataURL(qrText, {
        errorCorrectionLevel: 'M',
        type: 'image/png',
        margin: 1,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        },
        width: 400
      });

      console.log('QR code generated successfully for booking:', booking.bookingId);

      res.json({ 
        qrCode: qrCodeData,
        qrData, 
        booking: { 
          bookingId: booking.bookingId, 
          status: booking.status 
        } 
      });
    } catch (qrError) {
      console.error('QR code generation failed:', qrError);
      
      // Fallback to simple QR code
      const fallbackQrText = `SRI-EXPRESS-${booking.bookingId}-${booking.passengerInfo.name}-${booking.seatInfo.seatNumber}`;
      const fallbackQrCodeData = `data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><rect width='200' height='200' fill='white'/><text x='100' y='100' text-anchor='middle' font-size='12' fill='black'>${booking.bookingId}</text></svg>`;

      res.json({ 
        qrCode: fallbackQrCodeData,
        qrData, 
        booking: { 
          bookingId: booking.bookingId, 
          status: booking.status 
        },
        warning: 'Using fallback QR code generation'
      });
    }
  } catch (error) {
    console.error('GENERATE QR CODE ERROR:', error);
    res.status(500).json({ 
      message: 'Server error', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
};

// @desc    Send ticket via email
// @route   POST /api/bookings/:id/email-ticket
// @access  Private
export const sendTicketByEmail = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) { 
      res.status(401).json({ message: 'Not authorized' }); 
      return; 
    }

    const { id } = req.params;
    const { email } = req.body;

    console.log('Email ticket request:', { bookingId: id, email });

    // Find booking
    const booking = await Booking.findOne({ bookingId: id }).populate('routeId', 'name startLocation endLocation');
    if (!booking) { 
      res.status(404).json({ message: 'Booking not found' }); 
      return; 
    }

    // Check if user owns this booking
    if (booking.userId.toString() !== req.user._id.toString()) { 
      res.status(403).json({ message: 'Not authorized to email this booking' }); 
      return; 
    }

    // Only email confirmed bookings
    if (booking.status !== 'confirmed') { 
      res.status(400).json({ message: 'Can only email confirmed bookings' }); 
      return; 
    }

    // Generate QR code text
    const qrText = JSON.stringify({
      booking: booking.bookingId,
      passenger: booking.passengerInfo.name,
      seat: booking.seatInfo.seatNumber,
      date: booking.travelDate.toISOString().split('T')[0],
      time: booking.departureTime,
      verification: `SRI-EXPRESS-${booking.bookingId}`
    });

    // Use QR Server service instead of data URL (works in all email clients)
    const qrCodeImageURL = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&format=png&margin=10&data=${encodeURIComponent(qrText)}`;

    console.log('QR code URL generated for email:', qrCodeImageURL);

    // Use the sendTicketEmail function from sendEmail.ts
    try {
      await sendTicketEmail(
        email || booking.passengerInfo.email,
        booking.passengerInfo.name,
        booking.bookingId,
        qrCodeImageURL, // Pass the HTTP URL instead of data URL
        {
          routeId: booking.routeId,
          travelDate: booking.travelDate,
          departureTime: booking.departureTime,
          seatInfo: booking.seatInfo
        }
      );

      console.log('Ticket email sent successfully to:', email || booking.passengerInfo.email);

      res.json({ 
        message: 'Ticket sent successfully via email',
        sentTo: email || booking.passengerInfo.email,
        qrCodeGenerated: true,
        qrService: 'api.qrserver.com'
      });

    } catch (emailError) {
      console.error('Email sending failed:', emailError);
      
      // In development mode, return success with a warning
      if (process.env.NODE_ENV === 'development') {
        res.json({ 
          message: 'QR code generated successfully (email sending failed in development mode)',
          sentTo: email || booking.passengerInfo.email,
          qrCodeGenerated: true,
          emailWarning: 'Email sending failed - check SMTP configuration',
          error: emailError instanceof Error ? emailError.message : 'Unknown email error'
        });
      } else {
        throw emailError;
      }
    }

  } catch (error) {
    console.error('Send ticket email error:', error);
    res.status(500).json({ 
      message: 'Failed to send ticket via email', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
};

// @desc    Check in passenger
// @route   POST /api/bookings/:id/checkin
// @access  Private
export const checkInPassenger = async (req: Request, res: Response): Promise<void> => {
  try {
    console.log('=== CHECK IN PASSENGER REQUEST ===');
    
    if (!req.user) { 
      res.status(401).json({ message: 'Not authorized' }); 
      return; 
    }

    const { id } = req.params; 
    const { location } = req.body;
    
    console.log('Check in request:', {
      bookingId: id,
      userId: req.user._id.toString(),
      location: location || 'Not provided'
    });

    // Find by bookingId field instead of MongoDB _id
    const booking = await Booking.findOne({ bookingId: id });
    if (!booking) { 
      console.error('Booking not found for check in:', id);
      res.status(404).json({ message: 'Booking not found' }); 
      return; 
    }

    // Check if user owns this booking
    if (booking.userId.toString() !== req.user._id.toString()) { 
      console.error('User not authorized for check in');
      res.status(403).json({ message: 'Not authorized to check in this booking' }); 
      return; 
    }

    // Check if booking is confirmed
    if (booking.status !== 'confirmed') { 
      console.error('Only confirmed bookings can be checked in, current status:', booking.status);
      res.status(400).json({ message: 'Only confirmed bookings can be checked in' }); 
      return; 
    }

    // Check if already checked in
    if (booking.checkInInfo?.checkedIn) { 
      console.error('Booking already checked in');
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

    console.log('Check in successful for booking:', booking.bookingId);

    res.json({ 
      message: 'Check-in successful', 
      checkInInfo: booking.checkInInfo 
    });
  } catch (error) {
    console.error('CHECK IN PASSENGER ERROR:', error);
    res.status(500).json({ 
      message: 'Server error', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
};

// @desc    Get seat availability for a route/schedule  
// @route   GET /api/bookings/seat-availability
// @access  Private
export const getSeatAvailability = async (req: Request, res: Response): Promise<void> => {
  try {
    console.log('=== GET SEAT AVAILABILITY REQUEST ===');
    
    if (!req.user) { 
      res.status(401).json({ message: 'Not authorized' }); 
      return; 
    }

    const { routeId, travelDate, departureTime } = req.query;
    
    console.log('Seat availability request:', {
      routeId,
      travelDate,
      departureTime,
      userId: req.user._id.toString()
    });

    if (!routeId || !travelDate || !departureTime) {
      res.status(400).json({ message: 'RouteId, travelDate, and departureTime are required' });
      return;
    }

    // Get route information to know capacity
    const route = await Route.findById(routeId);
    if (!route) {
      res.status(404).json({ message: 'Route not found' });
      return;
    }

    const capacity = route.vehicleInfo.capacity;
    const bookingDate = new Date(travelDate as string);

    // Get all booked seats for this route/date/time
    const bookedSeats = await Booking.find({
      routeId,
      travelDate: bookingDate,
      departureTime,
      status: { $in: ['confirmed', 'pending'] },
      isActive: true
    }).select('seatInfo.seatNumber seatInfo.seatType');

    console.log(`Found ${bookedSeats.length} booked seats out of ${capacity} capacity`);

    // Simple availability calculation
    const availability = {
      total: capacity,
      booked: bookedSeats.length,
      available: capacity - bookedSeats.length
    };

    console.log('Seat availability calculated:', availability);

    res.json({
      routeId,
      travelDate,
      departureTime,
      capacity,
      availability,
      bookedSeats: bookedSeats.map(booking => ({
        seatNumber: booking.seatInfo.seatNumber,
        seatType: booking.seatInfo.seatType
      }))
    });

  } catch (error) {
    console.error('GET SEAT AVAILABILITY ERROR:', error);
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
    console.log('=== GET BOOKING STATS REQUEST ===');
    
    if (!req.user) { 
      res.status(401).json({ message: 'Not authorized' }); 
      return; 
    }

    const userId = req.user._id;
    console.log('Getting stats for user:', userId.toString());

    // Get user's booking statistics
    const stats = await Booking.getBookingStats(userId);
    console.log('User booking stats:', stats);

    // Get booking counts by status
    const statusCounts = await Booking.aggregate([
      { $match: { userId, isActive: true } },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);
    console.log('Status counts:', statusCounts);

    // Get monthly booking trend (last 6 months)
    const sixMonthsAgo = new Date(); 
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    const monthlyTrend = await Booking.aggregate([
      { $match: { userId, isActive: true, createdAt: { $gte: sixMonthsAgo } } },
      { $group: { 
        _id: { 
          year: { $year: '$createdAt' }, 
          month: { $month: '$createdAt' } 
        }, 
        count: { $sum: 1 }, 
        totalSpent: { $sum: '$pricing.totalAmount' } 
      } },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);
    console.log('Monthly trend:', monthlyTrend);

    res.json({ 
      overview: stats, 
      statusCounts, 
      monthlyTrend 
    });
  } catch (error) {
    console.error('GET BOOKING STATS ERROR:', error);
    res.status(500).json({ 
      message: 'Server error', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
};