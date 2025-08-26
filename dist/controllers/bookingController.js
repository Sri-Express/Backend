"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getBookingStats = exports.checkInPassenger = exports.sendTicketByEmail = exports.generateQRCode = exports.cancelBooking = exports.updateBooking = exports.getBookingById = exports.createBooking = exports.getUserBookings = void 0;
const mongoose_1 = require("mongoose");
const Booking_1 = __importDefault(require("../models/Booking"));
const Route_1 = __importDefault(require("../models/Route"));
const Payment_1 = __importDefault(require("../models/Payment"));
const QRCode = __importStar(require("qrcode"));
// Payment method mapping function
const mapPaymentMethod = (frontendMethod) => {
    const mapping = {
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
const getUserBookings = async (req, res) => {
    var _a, _b;
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
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
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
        const filter = { userId: req.user._id, isActive: true };
        if (status && status !== 'all')
            filter.status = status;
        console.log('Database filter:', filter);
        // Build sort object
        const sortObject = {};
        sortObject[sortBy] = sortOrder === 'desc' ? -1 : 1;
        console.log('Sort object:', sortObject);
        // Get bookings with route information
        const bookings = await Booking_1.default.find(filter)
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
                routeName: ((_a = bookings[0].routeId) === null || _a === void 0 ? void 0 : _a.name) || 'No route populated',
                paymentStatus: (_b = bookings[0].paymentInfo) === null || _b === void 0 ? void 0 : _b.status
            });
        }
        const totalBookings = await Booking_1.default.countDocuments(filter);
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
            totalBookings: await Booking_1.default.countDocuments({ userId: req.user._id, isActive: true }),
            confirmedBookings: await Booking_1.default.countDocuments({ userId: req.user._id, isActive: true, status: 'confirmed' }),
            completedBookings: await Booking_1.default.countDocuments({ userId: req.user._id, isActive: true, status: 'completed' }),
            cancelledBookings: await Booking_1.default.countDocuments({ userId: req.user._id, isActive: true, status: 'cancelled' })
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
    }
    catch (error) {
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
exports.getUserBookings = getUserBookings;
// @desc    Create new booking
// @route   POST /api/bookings
// @access  Private
const createBooking = async (req, res) => {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t;
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
        const { routeId, scheduleId, travelDate, departureTime, passengerInfo, seatInfo, paymentMethod, status, paymentInfo } = req.body;
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
        if (!routeId)
            missingFields.push('routeId');
        if (scheduleId === undefined || scheduleId === null)
            missingFields.push('scheduleId');
        if (!travelDate)
            missingFields.push('travelDate');
        if (!departureTime)
            missingFields.push('departureTime');
        if (!passengerInfo)
            missingFields.push('passengerInfo');
        if (!seatInfo)
            missingFields.push('seatInfo');
        if (!paymentMethod)
            missingFields.push('paymentMethod');
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
            route = await Route_1.default.findById(routeId);
            if (!route) {
                console.log('Route not found by _id, trying routeId field...');
                route = await Route_1.default.findOne({ routeId: routeId });
            }
            if (!route) {
                console.log('Route not found by routeId field, trying string conversion...');
                route = await Route_1.default.findOne({ _id: new mongoose_1.Types.ObjectId(routeId) });
            }
        }
        catch (routeError) {
            console.error('Route lookup error:', routeError);
        }
        if (!route) {
            console.error('Route not found:', routeId);
            // Additional debugging - list some routes for debugging
            const sampleRoutes = await Route_1.default.find({}).limit(5).select('_id routeId name status isActive');
            console.log('Sample routes in database:', sampleRoutes.map(r => ({
                _id: r._id.toString(),
                routeId: r.routeId,
                name: r.name,
                status: r.status,
                isActive: r.isActive
            })));
            const totalRoutes = await Route_1.default.countDocuments({});
            console.log('Total routes in database:', totalRoutes);
            res.status(404).json({
                message: 'Route not found or not available',
                searchedId: routeId,
                suggestion: 'Check if the route ID is correct',
                availableRoutes: sampleRoutes.map(r => ({
                    _id: r._id.toString(),
                    name: r.name,
                    status: r.status
                }))
            });
            return;
        }
        console.log('Route found:', {
            _id: route._id.toString(),
            routeId: route.routeId,
            name: route.name,
            isActive: route.isActive,
            status: route.status,
            basePrice: (_a = route.pricing) === null || _a === void 0 ? void 0 : _a.basePrice
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
        // Validate travel date with debugging
        const bookingDate = new Date(travelDate);
        const now = new Date();
        console.log('Date validation:', {
            travelDate: travelDate,
            parsedDate: bookingDate.toISOString(),
            currentDate: now.toISOString(),
            isPastDate: bookingDate < now,
            daysDifference: Math.ceil((bookingDate.getTime() - now.getTime()) / (1000 * 3600 * 24))
        });
        if (bookingDate < now) {
            console.error('Cannot book for past dates:', bookingDate);
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
        // Check seat availability with debugging
        console.log('Checking seat availability for:', {
            routeId: routeId,
            travelDate: bookingDate.toISOString(),
            departureTime: departureTime,
            seatNumber: finalSeatNumber
        });
        const existingBooking = await Booking_1.default.findOne({
            routeId,
            travelDate: bookingDate,
            departureTime,
            'seatInfo.seatNumber': finalSeatNumber,
            status: { $in: ['confirmed', 'pending'] },
            isActive: true
        });
        if (existingBooking) {
            console.error('Seat already booked:', {
                seatNumber: finalSeatNumber,
                existingBookingId: existingBooking.bookingId,
                existingUserId: existingBooking.userId.toString()
            });
            res.status(400).json({ message: 'Seat already booked for this schedule' });
            return;
        }
        console.log('Seat available:', finalSeatNumber);
        // Calculate pricing with debugging
        let basePrice;
        const passengerType = passengerInfo.passengerType || 'regular';
        console.log('Starting price calculation:', {
            routeBasePrice: (_b = route.pricing) === null || _b === void 0 ? void 0 : _b.basePrice,
            passengerType: passengerType,
            hasCalculatePriceMethod: typeof route.calculatePrice === 'function'
        });
        if (typeof route.calculatePrice === 'function') {
            try {
                basePrice = route.calculatePrice(passengerType);
                console.log('Used route.calculatePrice method:', basePrice);
            }
            catch (calcError) {
                console.error('Error in route.calculatePrice:', calcError);
                basePrice = ((_c = route.pricing) === null || _c === void 0 ? void 0 : _c.basePrice) || 0;
            }
        }
        else {
            basePrice = ((_d = route.pricing) === null || _d === void 0 ? void 0 : _d.basePrice) || 0;
            console.log('Using base price from route.pricing:', basePrice);
            // Apply discounts manually if calculatePrice method doesn't exist
            const discountInfo = (_f = (_e = route.pricing) === null || _e === void 0 ? void 0 : _e.discounts) === null || _f === void 0 ? void 0 : _f.find((d) => d.type === passengerType);
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
        // Create booking data with debugging
        const bookingData = {
            userId: req.user._id,
            routeId,
            scheduleId,
            travelDate: bookingDate,
            departureTime,
            passengerInfo: {
                name: (_g = passengerInfo.name) === null || _g === void 0 ? void 0 : _g.trim(),
                phone: (_h = passengerInfo.phone) === null || _h === void 0 ? void 0 : _h.trim(),
                email: ((_j = passengerInfo.email) === null || _j === void 0 ? void 0 : _j.trim()) || req.user.email,
                idType: passengerInfo.idType || 'nic',
                idNumber: (_k = passengerInfo.idNumber) === null || _k === void 0 ? void 0 : _k.trim(),
                passengerType: passengerType
            },
            seatInfo: {
                seatNumber: finalSeatNumber,
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
                status: (paymentInfo === null || paymentInfo === void 0 ? void 0 : paymentInfo.status) || (status === 'confirmed' ? 'completed' : 'pending'),
                ...((paymentInfo === null || paymentInfo === void 0 ? void 0 : paymentInfo.paymentId) && { paymentId: paymentInfo.paymentId }),
                ...((paymentInfo === null || paymentInfo === void 0 ? void 0 : paymentInfo.transactionId) && { transactionId: paymentInfo.transactionId }),
                ...((paymentInfo === null || paymentInfo === void 0 ? void 0 : paymentInfo.paidAt) && { paidAt: new Date(paymentInfo.paidAt) })
            },
            status: status || 'pending'
        };
        console.log('Final booking data structure:', {
            userId: bookingData.userId.toString(),
            routeId: bookingData.routeId.toString(),
            scheduleId: bookingData.scheduleId,
            passengerName: bookingData.passengerInfo.name,
            seatNumber: bookingData.seatInfo.seatNumber,
            totalAmount: bookingData.pricing.totalAmount,
            status: bookingData.status,
            paymentStatus: bookingData.paymentInfo.status
        });
        // Create and save booking
        console.log('Creating booking document...');
        const booking = new Booking_1.default(bookingData);
        try {
            await booking.save();
            console.log('Booking saved successfully:', {
                _id: booking._id.toString(),
                bookingId: booking.bookingId,
                status: booking.status,
                createdAt: booking.createdAt
            });
        }
        catch (saveError) {
            console.error('Booking save error details:', {
                name: saveError instanceof Error ? saveError.name : 'Unknown',
                message: saveError instanceof Error ? saveError.message : 'Unknown',
                validationErrors: saveError.errors ? Object.keys(saveError.errors) : 'None'
            });
            throw saveError;
        }
        // Create payment record with debugging (if not provided)
        let payment = null;
        if (!(paymentInfo === null || paymentInfo === void 0 ? void 0 : paymentInfo.paymentId)) {
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
                    transactionId: (paymentInfo === null || paymentInfo === void 0 ? void 0 : paymentInfo.transactionId) || `TXN${Date.now()}${Math.floor(Math.random() * 1000)}`
                },
                billingInfo: {
                    name: (_l = passengerInfo.name) === null || _l === void 0 ? void 0 : _l.trim(),
                    email: ((_m = passengerInfo.email) === null || _m === void 0 ? void 0 : _m.trim()) || req.user.email,
                    phone: (_o = passengerInfo.phone) === null || _o === void 0 ? void 0 : _o.trim()
                },
                status: (paymentInfo === null || paymentInfo === void 0 ? void 0 : paymentInfo.status) || (status === 'confirmed' ? 'completed' : 'pending')
            };
            console.log('Creating payment with data:', {
                userId: paymentData.userId.toString(),
                bookingId: paymentData.bookingId.toString(),
                total: paymentData.amount.total,
                status: paymentData.status,
                transactionId: paymentData.transactionInfo.transactionId
            });
            try {
                payment = new Payment_1.default(paymentData);
                await payment.save();
                console.log('Payment created successfully:', {
                    _id: payment._id.toString(),
                    paymentId: payment.paymentId,
                    status: payment.status
                });
                // Update booking with payment reference
                booking.paymentInfo.paymentId = payment._id;
                if (paymentInfo === null || paymentInfo === void 0 ? void 0 : paymentInfo.transactionId) {
                    booking.paymentInfo.transactionId = paymentInfo.transactionId;
                }
                await booking.save();
                console.log('Booking updated with payment reference');
            }
            catch (paymentError) {
                console.error('Payment creation failed (non-critical):', {
                    name: paymentError instanceof Error ? paymentError.name : 'Unknown',
                    message: paymentError instanceof Error ? paymentError.message : 'Unknown'
                });
            }
        }
        else {
            console.log('Payment ID provided, skipping payment creation:', paymentInfo.paymentId);
        }
        // Populate route information for response
        try {
            await booking.populate('routeId', 'name startLocation endLocation vehicleInfo operatorInfo');
            console.log('Route information populated successfully');
        }
        catch (populateError) {
            console.warn('Route population failed (non-critical):', populateError);
        }
        console.log('=== BOOKING CREATION COMPLETED SUCCESSFULLY ===');
        console.log('Final booking summary:', {
            bookingId: booking.bookingId,
            userId: booking.userId.toString(),
            routeName: ((_p = booking.routeId) === null || _p === void 0 ? void 0 : _p.name) || 'Unknown',
            status: booking.status,
            paymentStatus: (_q = booking.paymentInfo) === null || _q === void 0 ? void 0 : _q.status,
            totalAmount: (_r = booking.pricing) === null || _r === void 0 ? void 0 : _r.totalAmount,
            seatNumber: (_s = booking.seatInfo) === null || _s === void 0 ? void 0 : _s.seatNumber
        });
        const responseData = {
            message: 'Booking created successfully',
            booking,
            payment: payment ? {
                id: payment._id,
                paymentId: payment.paymentId,
                status: payment.status,
                transactionId: (_t = payment.transactionInfo) === null || _t === void 0 ? void 0 : _t.transactionId
            } : null,
            debug: {
                createdAt: new Date().toISOString(),
                routeFound: !!route,
                paymentCreated: !!payment,
                bookingId: booking.bookingId
            }
        };
        console.log('Sending response with keys:', Object.keys(responseData));
        res.status(201).json(responseData);
    }
    catch (error) {
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
exports.createBooking = createBooking;
// @desc    Get booking by ID
// @route   GET /api/bookings/:id
// @access  Private
const getBookingById = async (req, res) => {
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
        booking = await Booking_1.default.findOne({ bookingId: id });
        console.log('Search by bookingId result:', booking ? 'Found' : 'Not found');
        // If not found, try by MongoDB _id
        if (!booking) {
            try {
                booking = await Booking_1.default.findById(id);
                console.log('Search by _id result:', booking ? 'Found' : 'Not found');
            }
            catch (idError) {
                console.log('_id search failed (invalid ObjectId):', idError.message);
            }
        }
        // If still not found, try a broader search for debugging
        if (!booking) {
            const allUserBookings = await Booking_1.default.find({ userId: req.user._id }).select('_id bookingId').limit(5);
            console.log('User\'s bookings for debugging:', allUserBookings.map(b => ({
                _id: b._id.toString(),
                bookingId: b.bookingId
            })));
        }
        if (!booking) {
            console.error('Booking not found with ID:', id);
            res.status(404).json({ message: 'Booking not found' });
            return;
        }
        console.log('Booking found:', {
            _id: booking._id.toString(),
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
    }
    catch (error) {
        console.error('GET BOOKING BY ID ERROR:', error);
        res.status(500).json({
            message: 'Server error',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
exports.getBookingById = getBookingById;
// @desc    Update booking
// @route   PUT /api/bookings/:id
// @access  Private
const updateBooking = async (req, res) => {
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
        const booking = await Booking_1.default.findOne({ bookingId: id });
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
            const existingBooking = await Booking_1.default.findOne({
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
    }
    catch (error) {
        console.error('UPDATE BOOKING ERROR:', error);
        res.status(500).json({
            message: 'Server error',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
exports.updateBooking = updateBooking;
// @desc    Cancel booking
// @route   PUT /api/bookings/:id/cancel
// @access  Private
const cancelBooking = async (req, res) => {
    var _a, _b;
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
        const booking = await Booking_1.default.findOne({ bookingId: id });
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
            const payment = await Payment_1.default.findById(booking.paymentInfo.paymentId);
            if (payment) {
                await payment.processRefund(refundAmount, reason || 'Booking cancelled', req.user._id);
                console.log('Refund processed successfully');
            }
        }
        await booking.populate('routeId', 'name startLocation endLocation');
        console.log('Booking cancelled successfully:', {
            bookingId: booking.bookingId,
            refundAmount,
            refundStatus: (_a = booking.cancellationInfo) === null || _a === void 0 ? void 0 : _a.refundStatus
        });
        res.json({
            message: 'Booking cancelled successfully',
            booking,
            refundInfo: {
                refundAmount,
                refundStatus: (_b = booking.cancellationInfo) === null || _b === void 0 ? void 0 : _b.refundStatus
            }
        });
    }
    catch (error) {
        console.error('CANCEL BOOKING ERROR:', error);
        res.status(500).json({
            message: 'Server error',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
exports.cancelBooking = cancelBooking;
// @desc    Generate QR code for booking
// @route   POST /api/bookings/:id/qr
// @access  Private
const generateQRCode = async (req, res) => {
    try {
        console.log('=== GENERATE QR CODE REQUEST ===');
        if (!req.user) {
            res.status(401).json({ message: 'Not authorized' });
            return;
        }
        const { id } = req.params;
        console.log('QR code request for booking:', id);
        // Find by bookingId field instead of MongoDB _id
        const booking = await Booking_1.default.findOne({ bookingId: id });
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
        }
        catch (qrError) {
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
    }
    catch (error) {
        console.error('GENERATE QR CODE ERROR:', error);
        res.status(500).json({
            message: 'Server error',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
exports.generateQRCode = generateQRCode;
// @desc    Send ticket via email
// @route   POST /api/bookings/:id/email-ticket
// @access  Private
const sendTicketByEmail = async (req, res) => {
    var _a;
    try {
        if (!req.user) {
            res.status(401).json({ message: 'Not authorized' });
            return;
        }
        const { id } = req.params;
        const { email, qrCode } = req.body;
        console.log('Email ticket request:', { bookingId: id, email });
        // Find booking
        const booking = await Booking_1.default.findOne({ bookingId: id }).populate('routeId', 'name startLocation endLocation');
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
        // Create email HTML template
        const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f8f9fa;">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #F59E0B, #EF4444); color: white; padding: 2rem; text-align: center; border-radius: 12px 12px 0 0;">
          <h1 style="margin: 0; font-size: 2rem; text-shadow: 0 2px 4px rgba(0,0,0,0.3);">ශ්‍රී Express</h1>
          <p style="margin: 0.5rem 0 0 0; opacity: 0.9; font-size: 1.1rem;">Your Electronic Ticket</p>
        </div>
        
        <!-- Content -->
        <div style="background: white; padding: 2rem;">
          <!-- QR Code Section -->
          <div style="text-align: center; margin: 2rem 0;">
            <div style="display: inline-block; padding: 1rem; background: white; border-radius: 12px; border: 3px solid #F59E0B; box-shadow: 0 4px 12px rgba(245, 158, 11, 0.2);">
              <img src="${qrCode}" alt="Ticket QR Code" style="max-width: 200px; width: 100%; height: auto; display: block;" />
            </div>
            <p style="margin-top: 1rem; color: #666; font-size: 1.1rem; font-weight: 500;">Show this QR code to the conductor</p>
          </div>
          
          <!-- Booking Details -->
          <div style="background: #f8f9fa; padding: 1.5rem; border-radius: 8px; margin: 1.5rem 0;">
            <h2 style="color: #333; margin: 0 0 1rem 0; font-size: 1.3rem; border-bottom: 2px solid #F59E0B; padding-bottom: 0.5rem;">Booking Details</h2>
            
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 0.5rem 0; border-bottom: 1px solid #eee; font-weight: bold; color: #666;">Booking ID:</td>
                <td style="padding: 0.5rem 0; border-bottom: 1px solid #eee; color: #333;">${booking.bookingId}</td>
              </tr>
              <tr>
                <td style="padding: 0.5rem 0; border-bottom: 1px solid #eee; font-weight: bold; color: #666;">Passenger:</td>
                <td style="padding: 0.5rem 0; border-bottom: 1px solid #eee; color: #333;">${booking.passengerInfo.name}</td>
              </tr>
              <tr>
                <td style="padding: 0.5rem 0; border-bottom: 1px solid #eee; font-weight: bold; color: #666;">Route:</td>
                <td style="padding: 0.5rem 0; border-bottom: 1px solid #eee; color: #333;">${((_a = booking.routeId) === null || _a === void 0 ? void 0 : _a.name) || 'N/A'}</td>
              </tr>
              <tr>
                <td style="padding: 0.5rem 0; border-bottom: 1px solid #eee; font-weight: bold; color: #666;">Date & Time:</td>
                <td style="padding: 0.5rem 0; border-bottom: 1px solid #eee; color: #333;">${new Date(booking.travelDate).toLocaleDateString()} at ${booking.departureTime}</td>
              </tr>
              <tr>
                <td style="padding: 0.5rem 0; border-bottom: 1px solid #eee; font-weight: bold; color: #666;">Seat:</td>
                <td style="padding: 0.5rem 0; border-bottom: 1px solid #eee; color: #333;">${booking.seatInfo.seatNumber} (${booking.seatInfo.seatType})</td>
              </tr>
              <tr>
                <td style="padding: 0.5rem 0; border-bottom: 1px solid #eee; font-weight: bold; color: #666;">Amount Paid:</td>
                <td style="padding: 0.5rem 0; border-bottom: 1px solid #eee; color: #10B981; font-weight: bold;">Rs. ${booking.pricing.totalAmount.toLocaleString()}</td>
              </tr>
              <tr>
                <td style="padding: 0.5rem 0; font-weight: bold; color: #666;">Status:</td>
                <td style="padding: 0.5rem 0; color: #10B981; font-weight: bold;">CONFIRMED</td>
              </tr>
            </table>
          </div>
          
          <!-- Important Instructions -->
          <div style="background: #FEF3C7; border: 1px solid #F59E0B; border-left: 4px solid #F59E0B; border-radius: 8px; padding: 1.5rem; margin: 1.5rem 0;">
            <h3 style="color: #92400E; margin: 0 0 1rem 0; font-size: 1.1rem;">Important Instructions</h3>
            <ul style="color: #92400E; margin: 0; padding-left: 1.2rem; line-height: 1.6;">
              <li>Present this QR code for verification before boarding</li>
              <li>Arrive at the departure point 15 minutes early</li>
              <li>Carry valid photo ID matching the passenger name</li>
              <li>Contact support at +94 11 123 4567 for assistance</li>
              <li>This ticket is non-transferable and valid only for the specified journey</li>
            </ul>
          </div>
          
          <!-- Footer -->
          <div style="text-align: center; margin-top: 2rem; padding-top: 1rem; border-top: 1px solid #eee;">
            <p style="color: #666; font-size: 0.9rem; margin: 0;">Thank you for choosing ශ්‍රී Express!</p>
            <p style="color: #999; font-size: 0.8rem; margin: 0.5rem 0 0 0;">This is an automated email. Please do not reply.</p>
          </div>
        </div>
      </div>
    `;
        // Import and use the sendEmail function
        const sendEmail = require('../../utils/sendEmail').default;
        await sendEmail({
            email: email || booking.passengerInfo.email,
            subject: `ශ්‍රී Express - Your E-Ticket (${booking.bookingId})`,
            html: emailHtml
        });
        console.log('Ticket email sent successfully to:', email || booking.passengerInfo.email);
        res.json({
            message: 'Ticket sent successfully via email',
            sentTo: email || booking.passengerInfo.email
        });
    }
    catch (error) {
        console.error('Send ticket email error:', error);
        res.status(500).json({
            message: 'Failed to send ticket via email',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
exports.sendTicketByEmail = sendTicketByEmail;
// @desc    Check in passenger
// @route   POST /api/bookings/:id/checkin
// @access  Private
const checkInPassenger = async (req, res) => {
    var _a;
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
        const booking = await Booking_1.default.findOne({ bookingId: id });
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
        if ((_a = booking.checkInInfo) === null || _a === void 0 ? void 0 : _a.checkedIn) {
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
    }
    catch (error) {
        console.error('CHECK IN PASSENGER ERROR:', error);
        res.status(500).json({
            message: 'Server error',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
exports.checkInPassenger = checkInPassenger;
// @desc    Get booking statistics
// @route   GET /api/bookings/stats
// @access  Private
const getBookingStats = async (req, res) => {
    try {
        console.log('=== GET BOOKING STATS REQUEST ===');
        if (!req.user) {
            res.status(401).json({ message: 'Not authorized' });
            return;
        }
        const userId = req.user._id;
        console.log('Getting stats for user:', userId.toString());
        // Get user's booking statistics
        const stats = await Booking_1.default.getBookingStats(userId);
        console.log('User booking stats:', stats);
        // Get booking counts by status
        const statusCounts = await Booking_1.default.aggregate([
            { $match: { userId, isActive: true } },
            { $group: { _id: '$status', count: { $sum: 1 } } }
        ]);
        console.log('Status counts:', statusCounts);
        // Get monthly booking trend (last 6 months)
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
        const monthlyTrend = await Booking_1.default.aggregate([
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
    }
    catch (error) {
        console.error('GET BOOKING STATS ERROR:', error);
        res.status(500).json({
            message: 'Server error',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
exports.getBookingStats = getBookingStats;
