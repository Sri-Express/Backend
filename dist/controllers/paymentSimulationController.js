"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPaymentGateway = exports.simulateAllPayments = exports.simulatePayment = void 0;
const Payment_1 = __importDefault(require("../models/Payment"));
const Booking_1 = __importDefault(require("../models/Booking"));
// @desc    Simulate payment processing (auto-complete payments)
// @route   POST /api/payments/simulate/:bookingId
// @access  Private
const simulatePayment = async (req, res) => {
    try {
        if (!req.user) {
            res.status(401).json({ message: 'Not authorized' });
            return;
        }
        const { bookingId } = req.params;
        // Find the booking
        const booking = await Booking_1.default.findById(bookingId);
        if (!booking) {
            res.status(404).json({ message: 'Booking not found' });
            return;
        }
        // Check if user owns this booking
        if (booking.userId.toString() !== req.user._id.toString()) {
            res.status(403).json({ message: 'Not authorized to pay for this booking' });
            return;
        }
        // Check if already paid
        if (booking.paymentInfo.status === 'completed') {
            res.status(400).json({ message: 'Booking is already paid' });
            return;
        }
        console.log(`💳 Simulating payment for booking: ${booking.bookingId}`);
        // Find or create payment record
        let payment;
        if (booking.paymentInfo.paymentId) {
            payment = await Payment_1.default.findById(booking.paymentInfo.paymentId);
        }
        if (!payment) {
            // Create new payment record
            payment = new Payment_1.default({
                userId: req.user._id,
                bookingId: booking._id,
                amount: {
                    subtotal: booking.pricing.basePrice || booking.pricing.totalAmount,
                    taxes: booking.pricing.taxes || 0,
                    fees: 0,
                    discounts: booking.pricing.discounts || 0,
                    total: booking.pricing.totalAmount,
                    currency: 'LKR'
                },
                paymentMethod: {
                    type: booking.paymentInfo.method === 'bank' ? 'bank_transfer' : booking.paymentInfo.method,
                    provider: 'Sri Express Simulation'
                },
                transactionInfo: {
                    transactionId: `SIM${Date.now()}${Math.floor(Math.random() * 1000)}`
                },
                billingInfo: {
                    name: booking.passengerInfo.name,
                    email: booking.passengerInfo.email,
                    phone: booking.passengerInfo.phone
                },
                status: 'pending'
            });
            await payment.save();
            // Link payment to booking
            booking.paymentInfo.paymentId = payment._id;
            booking.paymentInfo.transactionId = payment.transactionInfo.transactionId;
        }
        // ✅ SIMULATE PAYMENT PROCESSING
        console.log(`🎯 Processing payment simulation...`);
        // Simulate processing delay (optional)
        await new Promise(resolve => setTimeout(resolve, 1000));
        // Mark payment as completed
        payment.status = 'completed';
        payment.timestamps.processedAt = new Date();
        payment.timestamps.completedAt = new Date();
        await payment.save();
        // Update booking status
        booking.paymentInfo.status = 'completed';
        booking.paymentInfo.paidAt = new Date();
        booking.status = 'confirmed';
        await booking.save();
        console.log(`✅ Payment simulation completed for ${booking.bookingId}`);
        res.json({
            success: true,
            message: 'Payment processed successfully!',
            payment: {
                id: payment._id,
                paymentId: payment.paymentId,
                status: payment.status,
                amount: payment.amount,
                transactionId: payment.transactionInfo.transactionId
            },
            booking: {
                id: booking._id,
                bookingId: booking.bookingId,
                status: booking.status,
                paymentStatus: booking.paymentInfo.status
            }
        });
    }
    catch (error) {
        console.error('💥 Payment simulation error:', error);
        res.status(500).json({
            message: 'Payment simulation failed',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
exports.simulatePayment = simulatePayment;
// @desc    Auto-process all pending payments (for testing)
// @route   POST /api/payments/simulate-all
// @access  Private
const simulateAllPayments = async (req, res) => {
    try {
        if (!req.user) {
            res.status(401).json({ message: 'Not authorized' });
            return;
        }
        // Find all pending bookings for this user
        const pendingBookings = await Booking_1.default.find({
            userId: req.user._id,
            'paymentInfo.status': 'pending',
            status: 'pending',
            isActive: true
        });
        console.log(`🔄 Found ${pendingBookings.length} pending payments to simulate`);
        const results = [];
        for (const booking of pendingBookings) {
            try {
                // Find or create payment
                let payment = await Payment_1.default.findById(booking.paymentInfo.paymentId);
                if (!payment) {
                    payment = new Payment_1.default({
                        userId: req.user._id,
                        bookingId: booking._id,
                        amount: {
                            subtotal: booking.pricing.basePrice || booking.pricing.totalAmount,
                            taxes: booking.pricing.taxes || 0,
                            fees: 0,
                            discounts: booking.pricing.discounts || 0,
                            total: booking.pricing.totalAmount,
                            currency: 'LKR'
                        },
                        paymentMethod: {
                            type: booking.paymentInfo.method === 'bank' ? 'bank_transfer' : booking.paymentInfo.method,
                            provider: 'Sri Express Simulation'
                        },
                        transactionInfo: {
                            transactionId: `SIM${Date.now()}${Math.floor(Math.random() * 1000)}`
                        },
                        billingInfo: {
                            name: booking.passengerInfo.name,
                            email: booking.passengerInfo.email,
                            phone: booking.passengerInfo.phone
                        },
                        status: 'pending'
                    });
                    await payment.save();
                    booking.paymentInfo.paymentId = payment._id;
                }
                // Process payment
                payment.status = 'completed';
                payment.timestamps.processedAt = new Date();
                payment.timestamps.completedAt = new Date();
                await payment.save();
                // Update booking
                booking.paymentInfo.status = 'completed';
                booking.paymentInfo.paidAt = new Date();
                booking.paymentInfo.transactionId = payment.transactionInfo.transactionId;
                booking.status = 'confirmed';
                await booking.save();
                results.push({
                    bookingId: booking.bookingId,
                    paymentId: payment.paymentId,
                    amount: payment.amount.total,
                    status: 'completed'
                });
                console.log(`✅ Processed payment for booking ${booking.bookingId}`);
            }
            catch (error) {
                console.error(`❌ Failed to process payment for booking ${booking.bookingId}:`, error);
                results.push({
                    bookingId: booking.bookingId,
                    status: 'failed',
                    error: error instanceof Error ? error.message : 'Unknown error'
                });
            }
        }
        res.json({
            success: true,
            message: `Processed ${results.filter(r => r.status === 'completed').length} payments successfully`,
            totalProcessed: results.filter(r => r.status === 'completed').length,
            totalFailed: results.filter(r => r.status === 'failed').length,
            results
        });
    }
    catch (error) {
        console.error('💥 Bulk payment simulation error:', error);
        res.status(500).json({
            message: 'Bulk payment simulation failed',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
exports.simulateAllPayments = simulateAllPayments;
// @desc    Get payment gateway simulation interface
// @route   GET /api/payments/gateway/:bookingId
// @access  Private
const getPaymentGateway = async (req, res) => {
    try {
        if (!req.user) {
            res.status(401).json({ message: 'Not authorized' });
            return;
        }
        const { bookingId } = req.params;
        const booking = await Booking_1.default.findById(bookingId);
        if (!booking) {
            res.status(404).json({ message: 'Booking not found' });
            return;
        }
        // Check if user owns this booking
        if (booking.userId.toString() !== req.user._id.toString()) {
            res.status(403).json({ message: 'Not authorized' });
            return;
        }
        // Payment gateway simulation data
        const gatewayData = {
            booking: {
                id: booking._id,
                bookingId: booking.bookingId,
                amount: booking.pricing.totalAmount,
                currency: booking.pricing.currency,
                status: booking.status,
                paymentStatus: booking.paymentInfo.status
            },
            paymentMethods: [
                { id: 'card', name: 'Credit/Debit Card', fee: 0, available: true },
                { id: 'bank', name: 'Bank Transfer', fee: 0, available: true },
                { id: 'digital_wallet', name: 'Digital Wallet', fee: 0, available: true },
                { id: 'cash', name: 'Cash Payment', fee: 0, available: true }
            ],
            merchantInfo: {
                name: 'Sri Express Transport',
                id: 'SRIEXP001',
                description: 'Bus and Train Ticket Payment'
            }
        };
        res.json(gatewayData);
    }
    catch (error) {
        console.error('Get payment gateway error:', error);
        res.status(500).json({
            message: 'Server error',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
exports.getPaymentGateway = getPaymentGateway;
