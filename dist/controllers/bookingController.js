"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getBookingStats = exports.checkInPassenger = exports.generateQRCode = exports.cancelBooking = exports.updateBooking = exports.getBookingById = exports.createBooking = exports.getUserBookings = void 0;
const Booking_1 = __importDefault(require("../models/Booking"));
const Route_1 = __importDefault(require("../models/Route"));
const Payment_1 = __importDefault(require("../models/Payment"));
// ✅ FIXED: Payment method mapping function
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
    try {
        if (!req.user) {
            res.status(401).json({ message: 'Not authorized' });
            return;
        }
        const { page = 1, limit = 10, status, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const skip = (pageNum - 1) * limitNum;
        // Build filter query
        const filter = { userId: req.user._id, isActive: true };
        if (status && status !== 'all')
            filter.status = status;
        // Build sort object
        const sortObject = {};
        sortObject[sortBy] = sortOrder === 'desc' ? -1 : 1;
        // Get bookings with route information
        const bookings = await Booking_1.default.find(filter).populate('routeId', 'name startLocation endLocation vehicleInfo operatorInfo').populate('paymentInfo.paymentId', 'status amount').sort(sortObject).skip(skip).limit(limitNum);
        const totalBookings = await Booking_1.default.countDocuments(filter);
        const totalPages = Math.ceil(totalBookings / limitNum);
        res.json({ bookings, pagination: { currentPage: pageNum, totalPages, totalBookings, hasNextPage: pageNum < totalPages, hasPrevPage: pageNum > 1 } });
    }
    catch (error) {
        console.error('Get user bookings error:', error);
        res.status(500).json({ message: 'Server error', error: error instanceof Error ? error.message : 'Unknown error' });
    }
};
exports.getUserBookings = getUserBookings;
// @desc    Create new booking
// @route   POST /api/bookings
// @access  Private
const createBooking = async (req, res) => {
    var _a, _b, _c, _d, _e, _f, _g;
    try {
        if (!req.user) {
            res.status(401).json({ message: 'Not authorized' });
            return;
        }
        console.log('🎫 Creating booking for user:', req.user._id);
        console.log('📋 Booking request data:', req.body);
        const { routeId, scheduleId, travelDate, departureTime, passengerInfo, seatInfo, paymentMethod, status, paymentInfo } = req.body;
        // ✅ FIXED: Enhanced validation
        if (!routeId || !scheduleId || !travelDate || !departureTime || !passengerInfo || !seatInfo || !paymentMethod) {
            console.error('❌ Missing required fields:', { routeId: !!routeId, scheduleId: !!scheduleId, travelDate: !!travelDate, departureTime: !!departureTime, passengerInfo: !!passengerInfo, seatInfo: !!seatInfo, paymentMethod: !!paymentMethod });
            res.status(400).json({ message: 'Missing required booking information' });
            return;
        }
        // Get route information
        const route = await Route_1.default.findById(routeId);
        if (!route || !route.isActive || route.status !== 'active') {
            console.error('❌ Route not found or not active:', routeId);
            res.status(404).json({ message: 'Route not found or not available' });
            return;
        }
        console.log('✅ Route found:', route.name);
        // Validate travel date is not in the past
        const bookingDate = new Date(travelDate);
        const now = new Date();
        if (bookingDate < now) {
            console.error('❌ Cannot book for past dates:', bookingDate);
            res.status(400).json({ message: 'Cannot book for past dates' });
            return;
        }
        // Check if seat is already booked for this route and date
        const existingBooking = await Booking_1.default.findOne({
            routeId,
            travelDate: bookingDate,
            departureTime,
            'seatInfo.seatNumber': seatInfo.seatNumber,
            status: { $in: ['confirmed', 'pending'] },
            isActive: true
        });
        if (existingBooking) {
            console.error('❌ Seat already booked:', seatInfo.seatNumber);
            res.status(400).json({ message: 'Seat already booked for this schedule' });
            return;
        }
        // Calculate pricing
        const basePrice = route.calculatePrice(passengerInfo.passengerType || 'regular');
        const taxes = Math.round(basePrice * 0.02); // 2% tax
        const discounts = 0; // Can be calculated based on promotions
        const totalAmount = basePrice + taxes - discounts;
        console.log('💰 Pricing calculated:', { basePrice, taxes, discounts, totalAmount });
        // ✅ FIXED: Ensure seat number exists
        const finalSeatNumber = seatInfo.seatNumber || `${Math.floor(Math.random() * 50) + 1}${seatInfo.seatType[0].toUpperCase()}`;
        // Create booking with proper validation
        const bookingData = {
            userId: req.user._id,
            routeId,
            scheduleId,
            travelDate: bookingDate,
            departureTime,
            passengerInfo: {
                name: (_a = passengerInfo.name) === null || _a === void 0 ? void 0 : _a.trim(),
                phone: (_b = passengerInfo.phone) === null || _b === void 0 ? void 0 : _b.trim(),
                email: ((_c = passengerInfo.email) === null || _c === void 0 ? void 0 : _c.trim()) || req.user.email,
                idType: passengerInfo.idType || 'nic',
                idNumber: (_d = passengerInfo.idNumber) === null || _d === void 0 ? void 0 : _d.trim(),
                passengerType: passengerInfo.passengerType || 'regular'
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
                status: (paymentInfo === null || paymentInfo === void 0 ? void 0 : paymentInfo.status) || 'pending',
                ...((paymentInfo === null || paymentInfo === void 0 ? void 0 : paymentInfo.paymentId) && { paymentId: paymentInfo.paymentId }),
                ...((paymentInfo === null || paymentInfo === void 0 ? void 0 : paymentInfo.transactionId) && { transactionId: paymentInfo.transactionId }),
                ...((paymentInfo === null || paymentInfo === void 0 ? void 0 : paymentInfo.paidAt) && { paidAt: paymentInfo.paidAt })
            },
            status: status || 'pending'
        };
        console.log('📝 Final booking data:', bookingData);
        const booking = new Booking_1.default(bookingData);
        await booking.save();
        console.log('✅ Booking created successfully:', booking.bookingId);
        // ✅ FIXED: Create payment record with proper method mapping
        const mappedPaymentMethod = mapPaymentMethod(paymentMethod);
        console.log('💳 Payment method mapping:', paymentMethod, '->', mappedPaymentMethod);
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
                transactionId: `TXN${Date.now()}${Math.floor(Math.random() * 1000)}`
            },
            billingInfo: {
                name: (_e = passengerInfo.name) === null || _e === void 0 ? void 0 : _e.trim(),
                email: ((_f = passengerInfo.email) === null || _f === void 0 ? void 0 : _f.trim()) || req.user.email,
                phone: (_g = passengerInfo.phone) === null || _g === void 0 ? void 0 : _g.trim()
            },
            status: 'pending'
        };
        console.log('💳 Creating payment with data:', paymentData);
        const payment = new Payment_1.default(paymentData);
        await payment.save();
        console.log('✅ Payment created successfully:', payment.paymentId);
        // Update booking with payment reference
        booking.paymentInfo.paymentId = payment._id;
        booking.paymentInfo.status = 'pending';
        await booking.save();
        // Populate route information for response
        await booking.populate('routeId', 'name startLocation endLocation vehicleInfo');
        console.log('🎉 Booking process completed successfully');
        res.status(201).json({
            message: 'Booking created successfully',
            booking,
            payment: {
                id: payment._id,
                paymentId: payment.paymentId,
                amount: payment.amount,
                status: payment.status,
                transactionId: payment.transactionInfo.transactionId
            }
        });
    }
    catch (error) {
        console.error('💥 Create booking error:', error);
        res.status(500).json({
            message: 'Server error',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
exports.createBooking = createBooking;
// @desc    Get booking by ID
// @route   GET /api/bookings/:id
// @access  Private
const getBookingById = async (req, res) => {
    try {
        if (!req.user) {
            res.status(401).json({ message: 'Not authorized' });
            return;
        }
        const { id } = req.params;
        // Find by bookingId field instead of MongoDB _id
        const booking = await Booking_1.default.findOne({ bookingId: id }).populate('routeId', 'name startLocation endLocation waypoints vehicleInfo operatorInfo').populate('paymentInfo.paymentId');
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
        const managementOptions = { canCancel: booking.canBeCancelled(), canModify: booking.canBeModified(), hoursUntilDeparture: booking.getHoursUntilDeparture(), refundAmount: booking.canBeCancelled() ? booking.calculateRefund() : 0 };
        res.json({ booking, managementOptions });
    }
    catch (error) {
        console.error('Get booking by ID error:', error);
        res.status(500).json({ message: 'Server error', error: error instanceof Error ? error.message : 'Unknown error' });
    }
};
exports.getBookingById = getBookingById;
// @desc    Update booking
// @route   PUT /api/bookings/:id
// @access  Private
const updateBooking = async (req, res) => {
    try {
        if (!req.user) {
            res.status(401).json({ message: 'Not authorized' });
            return;
        }
        const { id } = req.params;
        const { passengerInfo, seatInfo } = req.body;
        // Find by bookingId field instead of MongoDB _id
        const booking = await Booking_1.default.findOne({ bookingId: id });
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
            const existingBooking = await Booking_1.default.findOne({ routeId: booking.routeId, travelDate: booking.travelDate, departureTime: booking.departureTime, 'seatInfo.seatNumber': seatInfo.seatNumber, status: { $in: ['confirmed', 'pending'] }, isActive: true, _id: { $ne: booking._id } });
            if (existingBooking) {
                res.status(400).json({ message: 'New seat already booked for this schedule' });
                return;
            }
        }
        // Update booking
        if (passengerInfo)
            booking.passengerInfo = { ...booking.passengerInfo, ...passengerInfo };
        if (seatInfo)
            booking.seatInfo = { ...booking.seatInfo, ...seatInfo };
        await booking.save();
        await booking.populate('routeId', 'name startLocation endLocation vehicleInfo');
        res.json({ message: 'Booking updated successfully', booking });
    }
    catch (error) {
        console.error('Update booking error:', error);
        res.status(500).json({ message: 'Server error', error: error instanceof Error ? error.message : 'Unknown error' });
    }
};
exports.updateBooking = updateBooking;
// @desc    Cancel booking
// @route   PUT /api/bookings/:id/cancel
// @access  Private
const cancelBooking = async (req, res) => {
    var _a;
    try {
        if (!req.user) {
            res.status(401).json({ message: 'Not authorized' });
            return;
        }
        const { id } = req.params;
        const { reason } = req.body;
        // Find by bookingId field instead of MongoDB _id
        const booking = await Booking_1.default.findOne({ bookingId: id });
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
        booking.cancellationInfo = { reason: reason || 'Cancelled by user', cancelledAt: new Date(), refundAmount, refundStatus: refundAmount > 0 ? 'pending' : 'processed' };
        await booking.save();
        // Process refund if applicable
        if (refundAmount > 0 && booking.paymentInfo.paymentId) {
            const payment = await Payment_1.default.findById(booking.paymentInfo.paymentId);
            if (payment)
                await payment.processRefund(refundAmount, reason || 'Booking cancelled', req.user._id);
        }
        await booking.populate('routeId', 'name startLocation endLocation');
        res.json({ message: 'Booking cancelled successfully', booking, refundInfo: { refundAmount, refundStatus: (_a = booking.cancellationInfo) === null || _a === void 0 ? void 0 : _a.refundStatus } });
    }
    catch (error) {
        console.error('Cancel booking error:', error);
        res.status(500).json({ message: 'Server error', error: error instanceof Error ? error.message : 'Unknown error' });
    }
};
exports.cancelBooking = cancelBooking;
// @desc    Generate QR code for booking
// @route   POST /api/bookings/:id/qr
// @access  Private
const generateQRCode = async (req, res) => {
    try {
        if (!req.user) {
            res.status(401).json({ message: 'Not authorized' });
            return;
        }
        const { id } = req.params;
        // Find by bookingId field instead of MongoDB _id
        const booking = await Booking_1.default.findOne({ bookingId: id });
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
        const qrData = { bookingId: booking.bookingId, passengerName: booking.passengerInfo.name, route: `${booking.routeId}`, seat: booking.seatInfo.seatNumber, date: booking.travelDate.toISOString().split('T')[0], time: booking.departureTime, validUntil: booking.travelDate.toISOString() };
        res.json({ qrCode: booking.qrCode, qrData, booking: { bookingId: booking.bookingId, status: booking.status } });
    }
    catch (error) {
        console.error('Generate QR code error:', error);
        res.status(500).json({ message: 'Server error', error: error instanceof Error ? error.message : 'Unknown error' });
    }
};
exports.generateQRCode = generateQRCode;
// @desc    Check in passenger
// @route   POST /api/bookings/:id/checkin
// @access  Private
const checkInPassenger = async (req, res) => {
    var _a;
    try {
        if (!req.user) {
            res.status(401).json({ message: 'Not authorized' });
            return;
        }
        const { id } = req.params;
        const { location } = req.body;
        // Find by bookingId field instead of MongoDB _id
        const booking = await Booking_1.default.findOne({ bookingId: id });
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
        if ((_a = booking.checkInInfo) === null || _a === void 0 ? void 0 : _a.checkedIn) {
            res.status(400).json({ message: 'Already checked in' });
            return;
        }
        // Update check-in information
        booking.checkInInfo = { checkedIn: true, checkInTime: new Date(), checkInLocation: location || 'Unknown' };
        await booking.save();
        res.json({ message: 'Check-in successful', checkInInfo: booking.checkInInfo });
    }
    catch (error) {
        console.error('Check in passenger error:', error);
        res.status(500).json({ message: 'Server error', error: error instanceof Error ? error.message : 'Unknown error' });
    }
};
exports.checkInPassenger = checkInPassenger;
// @desc    Get booking statistics
// @route   GET /api/bookings/stats
// @access  Private
const getBookingStats = async (req, res) => {
    try {
        if (!req.user) {
            res.status(401).json({ message: 'Not authorized' });
            return;
        }
        const userId = req.user._id;
        // Get user's booking statistics
        const stats = await Booking_1.default.getBookingStats(userId);
        // Get booking counts by status
        const statusCounts = await Booking_1.default.aggregate([
            { $match: { userId, isActive: true } },
            { $group: { _id: '$status', count: { $sum: 1 } } }
        ]);
        // Get monthly booking trend (last 6 months)
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
        const monthlyTrend = await Booking_1.default.aggregate([
            { $match: { userId, isActive: true, createdAt: { $gte: sixMonthsAgo } } },
            { $group: { _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } }, count: { $sum: 1 }, totalSpent: { $sum: '$pricing.totalAmount' } } },
            { $sort: { '_id.year': 1, '_id.month': 1 } }
        ]);
        res.json({ overview: stats, statusCounts, monthlyTrend });
    }
    catch (error) {
        console.error('Get booking stats error:', error);
        res.status(500).json({ message: 'Server error', error: error instanceof Error ? error.message : 'Unknown error' });
    }
};
exports.getBookingStats = getBookingStats;
