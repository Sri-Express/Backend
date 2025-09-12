"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteBusRating = exports.updateBusRating = exports.getBusRatings = exports.getUserRatings = exports.createBusRating = exports.getRateableBookings = void 0;
const mongoose_1 = require("mongoose");
const BusRating_1 = __importDefault(require("../models/BusRating"));
const Booking_1 = __importDefault(require("../models/Booking"));
const Device_1 = __importDefault(require("../models/Device"));
const RouteAssignment_1 = __importDefault(require("../models/RouteAssignment"));
// @desc    Get user's rateable bookings (completed, paid, not yet rated)
// @route   GET /api/ratings/rateable-bookings
// @access  Private
const getRateableBookings = async (req, res) => {
    try {
        console.log('=== GET RATEABLE BOOKINGS ===');
        if (!req.user) {
            res.status(401).json({ message: 'Not authorized' });
            return;
        }
        console.log('Getting rateable bookings for user:', req.user._id);
        // Find completed bookings that haven't been rated yet
        const rateableBookings = await Booking_1.default.find({
            userId: req.user._id,
            status: 'completed',
            'paymentInfo.status': 'completed',
            'ratingInfo.hasRated': { $ne: true },
            isActive: true
        })
            .populate('routeId', 'name startLocation endLocation')
            .sort({ travelDate: -1 })
            .limit(20); // Last 20 rateable bookings
        console.log('Found rateable bookings:', rateableBookings.length);
        // For each booking, get the bus information
        const bookingsWithBusInfo = await Promise.all(rateableBookings.map(async (booking) => {
            try {
                // Find the bus assigned to this route at the time of travel
                const assignment = await RouteAssignment_1.default.findOne({
                    routeId: booking.routeId,
                    status: { $in: ['approved', 'active'] },
                    isActive: true
                }).populate('vehicleId', 'vehicleNumber vehicleType');
                return {
                    _id: booking._id,
                    bookingId: booking.bookingId,
                    routeInfo: booking.routeId,
                    travelDate: booking.travelDate,
                    departureTime: booking.departureTime,
                    seatInfo: booking.seatInfo,
                    passengerInfo: {
                        name: booking.passengerInfo.name
                    },
                    deviceInfo: (assignment === null || assignment === void 0 ? void 0 : assignment.vehicleId) ? {
                        _id: assignment.vehicleId._id,
                        vehicleNumber: assignment.vehicleId.vehicleNumber,
                        vehicleType: assignment.vehicleId.vehicleType
                    } : null,
                    canRate: !!(assignment === null || assignment === void 0 ? void 0 : assignment.vehicleId)
                };
            }
            catch (error) {
                console.error('Error getting bus info for booking:', booking.bookingId, error);
                return {
                    _id: booking._id,
                    bookingId: booking.bookingId,
                    routeInfo: booking.routeId,
                    travelDate: booking.travelDate,
                    departureTime: booking.departureTime,
                    seatInfo: booking.seatInfo,
                    passengerInfo: {
                        name: booking.passengerInfo.name
                    },
                    deviceInfo: null,
                    canRate: false
                };
            }
        }));
        console.log('Processed bookings with bus info');
        res.json({
            rateableBookings: bookingsWithBusInfo,
            total: bookingsWithBusInfo.length
        });
    }
    catch (error) {
        console.error('GET RATEABLE BOOKINGS ERROR:', error);
        res.status(500).json({
            message: 'Server error',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
exports.getRateableBookings = getRateableBookings;
// @desc    Create a new bus rating
// @route   POST /api/ratings
// @access  Private
const createBusRating = async (req, res) => {
    var _a;
    try {
        console.log('=== CREATE BUS RATING ===');
        if (!req.user) {
            res.status(401).json({ message: 'Not authorized' });
            return;
        }
        const { bookingId, ratings, review, isAnonymous } = req.body;
        console.log('Rating request:', {
            bookingId,
            userId: req.user._id,
            ratingsProvided: !!ratings,
            isAnonymous: !!isAnonymous
        });
        // Validate required fields
        if (!bookingId || !ratings || !ratings.overall) {
            res.status(400).json({ message: 'Booking ID and overall rating are required' });
            return;
        }
        // Find the booking
        const booking = await Booking_1.default.findById(bookingId)
            .populate('routeId', 'name startLocation endLocation');
        if (!booking) {
            res.status(404).json({ message: 'Booking not found' });
            return;
        }
        // Verify user owns this booking
        if (booking.userId.toString() !== req.user._id.toString()) {
            res.status(403).json({ message: 'Not authorized to rate this booking' });
            return;
        }
        // Verify booking is completed and paid
        if (booking.status !== 'completed' || booking.paymentInfo.status !== 'completed') {
            res.status(400).json({ message: 'Only completed and paid bookings can be rated' });
            return;
        }
        // Check if already rated
        if ((_a = booking.ratingInfo) === null || _a === void 0 ? void 0 : _a.hasRated) {
            res.status(400).json({ message: 'This booking has already been rated' });
            return;
        }
        // Find the bus assigned to this route
        const assignment = await RouteAssignment_1.default.findOne({
            routeId: booking.routeId,
            status: { $in: ['approved', 'active'] },
            isActive: true
        });
        if (!assignment) {
            res.status(404).json({ message: 'No bus assignment found for this route' });
            return;
        }
        // Get device/bus info
        const device = await Device_1.default.findById(assignment.vehicleId);
        if (!device) {
            res.status(404).json({ message: 'Bus information not found' });
            return;
        }
        // Create the rating
        const busRating = new BusRating_1.default({
            bookingId: booking._id,
            userId: req.user._id,
            deviceId: device._id,
            routeId: booking.routeId,
            ratings: {
                overall: ratings.overall || 5,
                cleanliness: ratings.cleanliness || ratings.overall || 5,
                comfort: ratings.comfort || ratings.overall || 5,
                condition: ratings.condition || ratings.overall || 5,
                safety: ratings.safety || ratings.overall || 5,
                punctuality: ratings.punctuality || ratings.overall || 5
            },
            review: review ? {
                comment: review.comment || '',
                busProblems: review.busProblems || [],
                busHighlights: review.busHighlights || []
            } : undefined,
            journeyInfo: {
                travelDate: booking.travelDate,
                departureTime: booking.departureTime,
                routeName: booking.routeId.name || 'Unknown Route',
                vehicleNumber: device.vehicleNumber,
                seatNumber: booking.seatInfo.seatNumber
            },
            isAnonymous: isAnonymous || false,
            isVerifiedTrip: true
        });
        await busRating.save();
        // Update booking with rating info
        booking.ratingInfo = {
            hasRated: true,
            ratingId: busRating._id,
            ratedAt: new Date(),
            overallRating: ratings.overall,
            deviceId: device._id
        };
        await booking.save();
        console.log('Bus rating created successfully:', {
            ratingId: busRating.ratingId,
            busNumber: device.vehicleNumber,
            overallRating: ratings.overall
        });
        res.status(201).json({
            message: 'Rating submitted successfully',
            rating: {
                ratingId: busRating.ratingId,
                overallRating: ratings.overall,
                busNumber: device.vehicleNumber,
                createdAt: busRating.createdAt
            }
        });
    }
    catch (error) {
        console.error('CREATE BUS RATING ERROR:', error);
        res.status(500).json({
            message: 'Server error',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
exports.createBusRating = createBusRating;
// @desc    Get user's rating history
// @route   GET /api/ratings/my-ratings
// @access  Private
const getUserRatings = async (req, res) => {
    try {
        console.log('=== GET USER RATINGS ===');
        if (!req.user) {
            res.status(401).json({ message: 'Not authorized' });
            return;
        }
        const ratings = await BusRating_1.default.getUserRatings(req.user._id);
        res.json({
            ratings,
            total: ratings.length
        });
    }
    catch (error) {
        console.error('GET USER RATINGS ERROR:', error);
        res.status(500).json({
            message: 'Server error',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
exports.getUserRatings = getUserRatings;
// @desc    Get ratings for a specific bus
// @route   GET /api/ratings/bus/:deviceId
// @access  Private
const getBusRatings = async (req, res) => {
    try {
        console.log('=== GET BUS RATINGS ===');
        const { deviceId } = req.params;
        if (!deviceId) {
            res.status(400).json({ message: 'Device ID is required' });
            return;
        }
        // Get bus info
        const device = await Device_1.default.findById(deviceId);
        if (!device) {
            res.status(404).json({ message: 'Bus not found' });
            return;
        }
        // Get ratings and stats
        const [ratings, stats] = await Promise.all([
            BusRating_1.default.getBusRatings(new mongoose_1.Types.ObjectId(deviceId)),
            BusRating_1.default.getBusStats(new mongoose_1.Types.ObjectId(deviceId))
        ]);
        res.json({
            busInfo: {
                vehicleNumber: device.vehicleNumber,
                vehicleType: device.vehicleType
            },
            ratings,
            stats,
            total: ratings.length
        });
    }
    catch (error) {
        console.error('GET BUS RATINGS ERROR:', error);
        res.status(500).json({
            message: 'Server error',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
exports.getBusRatings = getBusRatings;
// @desc    Update a rating (user can edit their own rating)
// @route   PUT /api/ratings/:ratingId
// @access  Private
const updateBusRating = async (req, res) => {
    try {
        console.log('=== UPDATE BUS RATING ===');
        if (!req.user) {
            res.status(401).json({ message: 'Not authorized' });
            return;
        }
        const { ratingId } = req.params;
        const { ratings, review, isAnonymous } = req.body;
        const busRating = await BusRating_1.default.findOne({ ratingId });
        if (!busRating) {
            res.status(404).json({ message: 'Rating not found' });
            return;
        }
        // Verify user owns this rating
        if (busRating.userId.toString() !== req.user._id.toString()) {
            res.status(403).json({ message: 'Not authorized to update this rating' });
            return;
        }
        // Update ratings
        if (ratings) {
            busRating.ratings = {
                overall: ratings.overall || busRating.ratings.overall,
                cleanliness: ratings.cleanliness || busRating.ratings.cleanliness,
                comfort: ratings.comfort || busRating.ratings.comfort,
                condition: ratings.condition || busRating.ratings.condition,
                safety: ratings.safety || busRating.ratings.safety,
                punctuality: ratings.punctuality || busRating.ratings.punctuality
            };
        }
        // Update review
        if (review !== undefined) {
            busRating.review = review ? {
                comment: review.comment || '',
                busProblems: review.busProblems || [],
                busHighlights: review.busHighlights || []
            } : undefined;
        }
        // Update anonymity
        if (isAnonymous !== undefined) {
            busRating.isAnonymous = isAnonymous;
        }
        await busRating.save();
        // Update cached rating in booking
        const booking = await Booking_1.default.findById(busRating.bookingId);
        if (booking && booking.ratingInfo) {
            booking.ratingInfo.overallRating = busRating.ratings.overall;
            await booking.save();
        }
        console.log('Rating updated successfully:', ratingId);
        res.json({
            message: 'Rating updated successfully',
            rating: busRating
        });
    }
    catch (error) {
        console.error('UPDATE BUS RATING ERROR:', error);
        res.status(500).json({
            message: 'Server error',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
exports.updateBusRating = updateBusRating;
// @desc    Delete a rating
// @route   DELETE /api/ratings/:ratingId
// @access  Private
const deleteBusRating = async (req, res) => {
    try {
        console.log('=== DELETE BUS RATING ===');
        if (!req.user) {
            res.status(401).json({ message: 'Not authorized' });
            return;
        }
        const { ratingId } = req.params;
        const busRating = await BusRating_1.default.findOne({ ratingId });
        if (!busRating) {
            res.status(404).json({ message: 'Rating not found' });
            return;
        }
        // Verify user owns this rating
        if (busRating.userId.toString() !== req.user._id.toString()) {
            res.status(403).json({ message: 'Not authorized to delete this rating' });
            return;
        }
        // Remove rating
        await BusRating_1.default.findByIdAndDelete(busRating._id);
        // Update booking to remove rating info
        const booking = await Booking_1.default.findById(busRating.bookingId);
        if (booking) {
            booking.ratingInfo = {
                hasRated: false,
                ratingId: undefined,
                ratedAt: undefined,
                overallRating: undefined,
                deviceId: undefined
            };
            await booking.save();
        }
        console.log('Rating deleted successfully:', ratingId);
        res.json({
            message: 'Rating deleted successfully'
        });
    }
    catch (error) {
        console.error('DELETE BUS RATING ERROR:', error);
        res.status(500).json({
            message: 'Server error',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
exports.deleteBusRating = deleteBusRating;
