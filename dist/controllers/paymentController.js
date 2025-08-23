"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPaymentStats = exports.getPaymentMethods = exports.getPaymentHistory = exports.processRefund = exports.getPaymentById = exports.confirmPayment = exports.processPayment = void 0;
const Payment_1 = __importDefault(require("../models/Payment"));
const Booking_1 = __importDefault(require("../models/Booking"));
// @desc    Process payment
// @route   POST /api/payments
// @access  Private
const processPayment = async (req, res) => {
    try {
        if (!req.user) {
            res.status(401).json({ message: 'Not authorized' });
            return;
        }
        const { bookingId, paymentMethod, billingInfo, cardInfo, amount, transactionId, status } = req.body;
        console.log('💳 Processing payment:', { bookingId, paymentMethod, amount, transactionId, status });
        if (!bookingId) {
            res.status(400).json({ message: 'Booking ID is required' });
            return;
        }
        // 🔥 FIXED: Find booking by bookingId (not MongoDB _id)
        let booking = await Booking_1.default.findOne({
            $or: [
                { bookingId: bookingId },
                { _id: bookingId }
            ]
        });
        if (!booking) {
            console.error('❌ Booking not found for ID:', bookingId);
            res.status(404).json({ message: 'Booking not found' });
            return;
        }
        console.log('✅ Found booking:', booking.bookingId, 'Current status:', booking.status);
        // Check if user owns this booking
        if (booking.userId.toString() !== req.user._id.toString()) {
            res.status(403).json({ message: 'Not authorized to pay for this booking' });
            return;
        }
        // 🔥 FIXED: Handle both new payments and payment confirmations
        let paymentResult;
        if (status === 'completed' && transactionId) {
            // This is a payment confirmation from the frontend (payment already processed)
            console.log('💎 Confirming completed payment:', transactionId);
            paymentResult = {
                success: true,
                transactionId: transactionId,
                authorizationCode: `CONFIRMED_${Math.random().toString(36).substr(2, 9)}`,
                gatewayResponse: {
                    status: 'confirmed',
                    message: 'Payment confirmed successfully'
                }
            };
        }
        else {
            // This is a new payment request (process payment)
            console.log('🚀 Processing new payment...');
            if (!paymentMethod || !billingInfo) {
                res.status(400).json({ message: 'Missing required payment information' });
                return;
            }
            // Check if booking is already paid
            if (booking.paymentInfo.status === 'completed') {
                res.status(400).json({ message: 'Booking is already paid' });
                return;
            }
            // Process payment based on method
            try {
                switch (paymentMethod.type || paymentMethod) {
                    case 'card':
                        paymentResult = await processCardPayment(cardInfo, booking.pricing.totalAmount);
                        break;
                    case 'mobile':
                    case 'digital_wallet':
                        paymentResult = await processMobilePayment(paymentMethod.provider || 'digital_wallet', booking.pricing.totalAmount);
                        break;
                    case 'bank':
                        paymentResult = await processBankTransfer(paymentMethod.bankInfo || {}, booking.pricing.totalAmount);
                        break;
                    default:
                        throw new Error('Unsupported payment method');
                }
            }
            catch (paymentError) {
                console.error('💥 Payment processing failed:', paymentError);
                res.status(400).json({
                    message: 'Payment processing failed',
                    error: paymentError instanceof Error ? paymentError.message : 'Payment error'
                });
                return;
            }
        }
        // 🔥 FIXED: Create or update payment record
        let payment;
        // Check if payment record already exists
        const existingPayment = await Payment_1.default.findOne({
            $or: [
                { transactionId: transactionId },
                { bookingId: booking._id }
            ]
        });
        if (existingPayment && status === 'completed') {
            // Update existing payment
            console.log('🔄 Updating existing payment record...');
            existingPayment.status = 'completed';
            existingPayment.transactionInfo.gatewayResponse = paymentResult.gatewayResponse;
            await existingPayment.save();
            payment = existingPayment;
        }
        else {
            // Create new payment record
            console.log('📝 Creating new payment record...');
            const paymentData = {
                userId: req.user._id,
                bookingId: booking._id,
                amount: {
                    subtotal: booking.pricing.basePrice,
                    taxes: booking.pricing.taxes,
                    fees: 0,
                    discounts: booking.pricing.discounts,
                    total: booking.pricing.totalAmount,
                    currency: booking.pricing.currency
                },
                paymentMethod: {
                    type: paymentMethod.type || paymentMethod,
                    provider: 'Sri Express Payment'
                },
                transactionInfo: {
                    transactionId: paymentResult.transactionId,
                    gatewayResponse: paymentResult.gatewayResponse,
                    authorizationCode: paymentResult.authorizationCode
                },
                billingInfo: billingInfo || {
                    name: booking.passengerInfo.name,
                    email: booking.passengerInfo.email,
                    phone: booking.passengerInfo.phone
                },
                status: paymentResult.success ? 'completed' : 'failed'
            };
            payment = new Payment_1.default(paymentData);
            await payment.save();
        }
        // 🔥 FIXED: Always update booking status if payment successful
        if (paymentResult.success) {
            console.log('✅ Payment successful, updating booking status...');
            booking.paymentInfo.status = 'completed';
            booking.paymentInfo.paymentId = payment._id;
            booking.paymentInfo.paidAt = new Date();
            booking.paymentInfo.transactionId = paymentResult.transactionId;
            booking.status = 'confirmed';
            await booking.save();
            console.log('🎫 Booking status updated to confirmed:', booking.bookingId);
        }
        res.status(201).json({
            message: paymentResult.success ? 'Payment processed successfully' : 'Payment failed',
            payment: {
                id: payment._id,
                paymentId: payment.paymentId,
                status: payment.status,
                amount: payment.amount,
                transactionId: payment.transactionInfo.transactionId
            },
            booking: paymentResult.success ? {
                id: booking._id,
                bookingId: booking.bookingId,
                status: booking.status,
                paymentStatus: booking.paymentInfo.status,
                qrCode: booking.qrCode
            } : null
        });
    }
    catch (error) {
        console.error('💥 Process payment error:', error);
        res.status(500).json({
            message: 'Server error',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
exports.processPayment = processPayment;
// 🔥 NEW: Add endpoint to confirm existing payments
// @desc    Confirm payment completion (for frontend-initiated payments)
// @route   POST /api/payments/confirm
// @access  Private
const confirmPayment = async (req, res) => {
    try {
        if (!req.user) {
            res.status(401).json({ message: 'Not authorized' });
            return;
        }
        const { bookingId, transactionId, paymentData } = req.body;
        console.log('🔍 Confirming payment:', { bookingId, transactionId });
        if (!bookingId || !transactionId) {
            res.status(400).json({ message: 'Booking ID and Transaction ID are required' });
            return;
        }
        // Find the booking
        const booking = await Booking_1.default.findOne({
            $or: [
                { bookingId: bookingId },
                { _id: bookingId }
            ]
        });
        if (!booking) {
            res.status(404).json({ message: 'Booking not found' });
            return;
        }
        // Check ownership
        if (booking.userId.toString() !== req.user._id.toString()) {
            res.status(403).json({ message: 'Not authorized' });
            return;
        }
        // Update booking status
        booking.status = 'confirmed';
        booking.paymentInfo.status = 'completed';
        booking.paymentInfo.transactionId = transactionId;
        booking.paymentInfo.paidAt = new Date();
        await booking.save();
        console.log('✅ Payment confirmed and booking updated:', booking.bookingId);
        res.json({
            message: 'Payment confirmed successfully',
            booking: {
                id: booking._id,
                bookingId: booking.bookingId,
                status: booking.status,
                paymentStatus: booking.paymentInfo.status
            }
        });
    }
    catch (error) {
        console.error('💥 Confirm payment error:', error);
        res.status(500).json({
            message: 'Server error',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
exports.confirmPayment = confirmPayment;
// @desc    Get payment by ID
// @route   GET /api/payments/:id
// @access  Private
const getPaymentById = async (req, res) => {
    try {
        if (!req.user) {
            res.status(401).json({ message: 'Not authorized' });
            return;
        }
        const { id } = req.params;
        const payment = await Payment_1.default.findById(id).populate('bookingId', 'bookingId status travelDate passengerInfo routeId').populate({ path: 'bookingId', populate: { path: 'routeId', select: 'name startLocation endLocation' } });
        if (!payment) {
            res.status(404).json({ message: 'Payment not found' });
            return;
        }
        // Check if user owns this payment
        if (payment.userId.toString() !== req.user._id.toString()) {
            res.status(403).json({ message: 'Not authorized to view this payment' });
            return;
        }
        res.json(payment);
    }
    catch (error) {
        console.error('Get payment by ID error:', error);
        res.status(500).json({ message: 'Server error', error: error instanceof Error ? error.message : 'Unknown error' });
    }
};
exports.getPaymentById = getPaymentById;
// @desc    Process refund
// @route   POST /api/payments/refund
// @access  Private
const processRefund = async (req, res) => {
    try {
        if (!req.user) {
            res.status(401).json({ message: 'Not authorized' });
            return;
        }
        const { paymentId, refundAmount, reason } = req.body;
        if (!paymentId || !refundAmount || !reason) {
            res.status(400).json({ message: 'Missing required refund information' });
            return;
        }
        const payment = await Payment_1.default.findById(paymentId);
        if (!payment) {
            res.status(404).json({ message: 'Payment not found' });
            return;
        }
        // Check if user owns this payment
        if (payment.userId.toString() !== req.user._id.toString()) {
            res.status(403).json({ message: 'Not authorized to refund this payment' });
            return;
        }
        // Process refund
        const refund = await payment.processRefund(refundAmount, reason, req.user._id);
        res.json({ message: 'Refund processed successfully', refund });
    }
    catch (error) {
        console.error('Process refund error:', error);
        res.status(500).json({ message: 'Server error', error: error instanceof Error ? error.message : 'Unknown error' });
    }
};
exports.processRefund = processRefund;
// @desc    Get payment history
// @route   GET /api/payments/history
// @access  Private
const getPaymentHistory = async (req, res) => {
    try {
        if (!req.user) {
            res.status(401).json({ message: 'Not authorized' });
            return;
        }
        const { page = 1, limit = 10, status, startDate, endDate, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const skip = (pageNum - 1) * limitNum;
        // Build filter query
        const filter = { userId: req.user._id };
        if (status && status !== 'all')
            filter.status = status;
        if (startDate || endDate) {
            filter.createdAt = {};
            if (startDate)
                filter.createdAt.$gte = new Date(startDate);
            if (endDate)
                filter.createdAt.$lte = new Date(endDate);
        }
        // Build sort object
        const sortObject = {};
        sortObject[sortBy] = sortOrder === 'desc' ? -1 : 1;
        // Get payments with booking information
        const payments = await Payment_1.default.find(filter).populate('bookingId', 'bookingId travelDate passengerInfo routeId').populate({ path: 'bookingId', populate: { path: 'routeId', select: 'name startLocation endLocation' } }).sort(sortObject).skip(skip).limit(limitNum);
        const totalPayments = await Payment_1.default.countDocuments(filter);
        const totalPages = Math.ceil(totalPayments / limitNum);
        res.json({ payments, pagination: { currentPage: pageNum, totalPages, totalPayments, hasNextPage: pageNum < totalPages, hasPrevPage: pageNum > 1 } });
    }
    catch (error) {
        console.error('Get payment history error:', error);
        res.status(500).json({ message: 'Server error', error: error instanceof Error ? error.message : 'Unknown error' });
    }
};
exports.getPaymentHistory = getPaymentHistory;
// @desc    Get available payment methods
// @route   GET /api/payments/methods
// @access  Public
const getPaymentMethods = async (req, res) => {
    try {
        const paymentMethods = [
            { type: 'card', name: 'Credit/Debit Card', description: 'Visa, MasterCard, American Express', processingFee: 2.5, isAvailable: true, acceptedCards: ['visa', 'mastercard', 'amex'] },
            { type: 'mobile', name: 'Mobile Payment', description: 'Dialog eZ Cash, Mobitel mCash', processingFee: 1.5, isAvailable: true, providers: [{ id: 'dialog', name: 'Dialog eZ Cash', logo: '/images/dialog.png' }, { id: 'mobitel', name: 'Mobitel mCash', logo: '/images/mobitel.png' }] },
            { type: 'bank', name: 'Bank Transfer', description: 'Direct bank transfer', processingFee: 0, isAvailable: true, supportedBanks: ['Bank of Ceylon', 'People\'s Bank', 'Commercial Bank', 'Hatton National Bank', 'Sampath Bank'] },
            { type: 'wallet', name: 'Digital Wallet', description: 'PayPal, Apple Pay, Google Pay', processingFee: 2.0, isAvailable: false }
        ];
        res.json({ paymentMethods: paymentMethods.filter(method => method.isAvailable), currency: 'LKR', minimumAmount: 50, maximumAmount: 50000 });
    }
    catch (error) {
        console.error('Get payment methods error:', error);
        res.status(500).json({ message: 'Server error', error: error instanceof Error ? error.message : 'Unknown error' });
    }
};
exports.getPaymentMethods = getPaymentMethods;
// @desc    Get payment statistics
// @route   GET /api/payments/stats
// @access  Private
const getPaymentStats = async (req, res) => {
    try {
        if (!req.user) {
            res.status(401).json({ message: 'Not authorized' });
            return;
        }
        const userId = req.user._id;
        // Get user's payment statistics
        const stats = await Payment_1.default.aggregate([
            { $match: { userId } },
            { $group: { _id: null, totalPayments: { $sum: 1 }, totalSpent: { $sum: '$amount.total' }, avgPayment: { $avg: '$amount.total' }, successfulPayments: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } }, failedPayments: { $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] } } } }
        ]);
        // Get payment method distribution
        const methodStats = await Payment_1.default.aggregate([
            { $match: { userId, status: 'completed' } },
            { $group: { _id: '$paymentMethod.type', count: { $sum: 1 }, totalAmount: { $sum: '$amount.total' } } }
        ]);
        // Get monthly spending (last 6 months)
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
        const monthlySpending = await Payment_1.default.aggregate([
            { $match: { userId, status: 'completed', createdAt: { $gte: sixMonthsAgo } } },
            { $group: { _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } }, totalSpent: { $sum: '$amount.total' }, transactionCount: { $sum: 1 } } },
            { $sort: { '_id.year': 1, '_id.month': 1 } }
        ]);
        res.json({ overview: stats[0] || { totalPayments: 0, totalSpent: 0, avgPayment: 0, successfulPayments: 0, failedPayments: 0 }, methodStats, monthlySpending });
    }
    catch (error) {
        console.error('Get payment stats error:', error);
        res.status(500).json({ message: 'Server error', error: error instanceof Error ? error.message : 'Unknown error' });
    }
};
exports.getPaymentStats = getPaymentStats;
// Helper functions for payment processing
async function processCardPayment(cardInfo, amount) {
    // Mock card payment processing - In real implementation, integrate with payment gateway (Stripe, PayHere, etc.)
    console.log('💳 Processing card payment for amount:', amount);
    return {
        success: true,
        transactionId: `TXN_CARD_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
        authorizationCode: `AUTH_${Math.random().toString(36).substr(2, 9)}`,
        gatewayResponse: {
            status: 'approved',
            message: 'Card payment processed successfully'
        }
    };
}
async function processMobilePayment(provider, amount) {
    // Mock mobile payment processing
    console.log('📱 Processing mobile payment via:', provider, 'for amount:', amount);
    return {
        success: true,
        transactionId: `TXN_${provider.toUpperCase()}_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
        authorizationCode: `MOBILE_${Math.random().toString(36).substr(2, 9)}`,
        gatewayResponse: {
            status: 'approved',
            provider,
            message: 'Mobile payment processed successfully'
        }
    };
}
async function processBankTransfer(bankInfo, amount) {
    // Mock bank transfer processing
    console.log('🏦 Processing bank transfer for amount:', amount);
    return {
        success: true,
        transactionId: `TXN_BANK_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
        authorizationCode: `BANK_${Math.random().toString(36).substr(2, 9)}`,
        gatewayResponse: {
            status: 'approved',
            bank: bankInfo.bankName || 'Unknown Bank',
            message: 'Bank transfer initiated successfully'
        }
    };
}
