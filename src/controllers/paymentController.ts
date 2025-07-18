// src/controllers/paymentController.ts - FIXED VERSION
import { Request, Response } from 'express';
import { Types } from 'mongoose';
import Payment from '../models/Payment';
import Booking from '../models/Booking';
import User from '../models/User';

// @desc    Process payment
// @route   POST /api/payments
// @access  Private
export const processPayment = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) { res.status(401).json({ message: 'Not authorized' }); return; }

    const { bookingId, paymentMethod, billingInfo, cardInfo } = req.body;
    if (!bookingId || !paymentMethod || !billingInfo) { res.status(400).json({ message: 'Missing required payment information' }); return; }

    // Get booking information
    const booking = await Booking.findById(bookingId);
    if (!booking) { res.status(404).json({ message: 'Booking not found' }); return; }

    // Check if user owns this booking
    if (booking.userId.toString() !== req.user._id.toString()) { res.status(403).json({ message: 'Not authorized to pay for this booking' }); return; }

    // Check if booking is already paid
    if (booking.paymentInfo.status === 'completed') { res.status(400).json({ message: 'Booking is already paid' }); return; }

    // Process payment based on method
    let paymentResult;
    try {
      switch (paymentMethod.type) {
        case 'card': paymentResult = await processCardPayment(cardInfo, booking.pricing.totalAmount); break;
        case 'mobile': paymentResult = await processMobilePayment(paymentMethod.provider, booking.pricing.totalAmount); break;
        case 'bank': paymentResult = await processBankTransfer(paymentMethod.bankInfo, booking.pricing.totalAmount); break;
        default: throw new Error('Unsupported payment method');
      }
    } catch (paymentError) {
      res.status(400).json({ message: 'Payment processing failed', error: paymentError instanceof Error ? paymentError.message : 'Payment error' });
      return;
    }

    // Create payment record
    const payment = new Payment({ userId: req.user._id, bookingId: booking._id, amount: { subtotal: booking.pricing.basePrice, taxes: booking.pricing.taxes, fees: 0, discounts: booking.pricing.discounts, total: booking.pricing.totalAmount, currency: booking.pricing.currency }, paymentMethod, transactionInfo: { transactionId: paymentResult.transactionId, gatewayResponse: paymentResult.gatewayResponse, authorizationCode: paymentResult.authorizationCode }, billingInfo, status: paymentResult.success ? 'completed' : 'failed' });
    await payment.save();

    // Update booking payment status
    if (paymentResult.success) {
      booking.paymentInfo.status = 'completed';
      // ✅ FIXED: Cast payment._id to proper ObjectId type
      booking.paymentInfo.paymentId = payment._id as Types.ObjectId;
      booking.paymentInfo.paidAt = new Date();
      booking.status = 'confirmed';
      await booking.save();
    }

    res.status(201).json({ message: paymentResult.success ? 'Payment processed successfully' : 'Payment failed', payment: { id: payment._id, paymentId: payment.paymentId, status: payment.status, amount: payment.amount, transactionId: payment.transactionInfo.transactionId }, booking: paymentResult.success ? { id: booking._id, status: booking.status, qrCode: booking.qrCode } : null });
  } catch (error) {
    console.error('Process payment error:', error);
    res.status(500).json({ message: 'Server error', error: error instanceof Error ? error.message : 'Unknown error' });
  }
};

// @desc    Get payment by ID
// @route   GET /api/payments/:id
// @access  Private
export const getPaymentById = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) { res.status(401).json({ message: 'Not authorized' }); return; }

    const { id } = req.params;
    const payment = await Payment.findById(id).populate('bookingId', 'bookingId status travelDate passengerInfo routeId').populate({ path: 'bookingId', populate: { path: 'routeId', select: 'name startLocation endLocation' } });
    if (!payment) { res.status(404).json({ message: 'Payment not found' }); return; }

    // Check if user owns this payment
    if (payment.userId.toString() !== req.user._id.toString()) { res.status(403).json({ message: 'Not authorized to view this payment' }); return; }

    res.json(payment);
  } catch (error) {
    console.error('Get payment by ID error:', error);
    res.status(500).json({ message: 'Server error', error: error instanceof Error ? error.message : 'Unknown error' });
  }
};

// @desc    Process refund
// @route   POST /api/payments/refund
// @access  Private
export const processRefund = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) { res.status(401).json({ message: 'Not authorized' }); return; }

    const { paymentId, refundAmount, reason } = req.body;
    if (!paymentId || !refundAmount || !reason) { res.status(400).json({ message: 'Missing required refund information' }); return; }

    const payment = await Payment.findById(paymentId);
    if (!payment) { res.status(404).json({ message: 'Payment not found' }); return; }

    // Check if user owns this payment
    if (payment.userId.toString() !== req.user._id.toString()) { res.status(403).json({ message: 'Not authorized to refund this payment' }); return; }

    // Process refund
    const refund = await payment.processRefund(refundAmount, reason, req.user._id);

    res.json({ message: 'Refund processed successfully', refund });
  } catch (error) {
    console.error('Process refund error:', error);
    res.status(500).json({ message: 'Server error', error: error instanceof Error ? error.message : 'Unknown error' });
  }
};

// @desc    Get payment history
// @route   GET /api/payments/history
// @access  Private
export const getPaymentHistory = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) { res.status(401).json({ message: 'Not authorized' }); return; }

    const { page = 1, limit = 10, status, startDate, endDate, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
    const pageNum = parseInt(page as string); const limitNum = parseInt(limit as string); const skip = (pageNum - 1) * limitNum;

    // Build filter query
    const filter: any = { userId: req.user._id };
    if (status && status !== 'all') filter.status = status;
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate as string);
      if (endDate) filter.createdAt.$lte = new Date(endDate as string);
    }

    // Build sort object
    const sortObject: any = {}; sortObject[sortBy as string] = sortOrder === 'desc' ? -1 : 1;

    // Get payments with booking information
    const payments = await Payment.find(filter).populate('bookingId', 'bookingId travelDate passengerInfo routeId').populate({ path: 'bookingId', populate: { path: 'routeId', select: 'name startLocation endLocation' } }).sort(sortObject).skip(skip).limit(limitNum);
    const totalPayments = await Payment.countDocuments(filter); const totalPages = Math.ceil(totalPayments / limitNum);

    res.json({ payments, pagination: { currentPage: pageNum, totalPages, totalPayments, hasNextPage: pageNum < totalPages, hasPrevPage: pageNum > 1 } });
  } catch (error) {
    console.error('Get payment history error:', error);
    res.status(500).json({ message: 'Server error', error: error instanceof Error ? error.message : 'Unknown error' });
  }
};

// @desc    Get available payment methods
// @route   GET /api/payments/methods
// @access  Public
export const getPaymentMethods = async (req: Request, res: Response): Promise<void> => {
  try {
    const paymentMethods = [
      { type: 'card', name: 'Credit/Debit Card', description: 'Visa, MasterCard, American Express', processingFee: 2.5, isAvailable: true, acceptedCards: ['visa', 'mastercard', 'amex'] },
      { type: 'mobile', name: 'Mobile Payment', description: 'Dialog eZ Cash, Mobitel mCash', processingFee: 1.5, isAvailable: true, providers: [{ id: 'dialog', name: 'Dialog eZ Cash', logo: '/images/dialog.png' }, { id: 'mobitel', name: 'Mobitel mCash', logo: '/images/mobitel.png' }] },
      { type: 'bank', name: 'Bank Transfer', description: 'Direct bank transfer', processingFee: 0, isAvailable: true, supportedBanks: ['Bank of Ceylon', 'People\'s Bank', 'Commercial Bank', 'Hatton National Bank', 'Sampath Bank'] },
      { type: 'wallet', name: 'Digital Wallet', description: 'PayPal, Apple Pay, Google Pay', processingFee: 2.0, isAvailable: false }
    ];

    res.json({ paymentMethods: paymentMethods.filter(method => method.isAvailable), currency: 'LKR', minimumAmount: 50, maximumAmount: 50000 });
  } catch (error) {
    console.error('Get payment methods error:', error);
    res.status(500).json({ message: 'Server error', error: error instanceof Error ? error.message : 'Unknown error' });
  }
};

// @desc    Get payment statistics
// @route   GET /api/payments/stats
// @access  Private
export const getPaymentStats = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) { res.status(401).json({ message: 'Not authorized' }); return; }

    const userId = req.user._id;

    // Get user's payment statistics
    const stats = await Payment.aggregate([
      { $match: { userId } },
      { $group: { _id: null, totalPayments: { $sum: 1 }, totalSpent: { $sum: '$amount.total' }, avgPayment: { $avg: '$amount.total' }, successfulPayments: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } }, failedPayments: { $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] } } } }
    ]);

    // Get payment method distribution
    const methodStats = await Payment.aggregate([
      { $match: { userId, status: 'completed' } },
      { $group: { _id: '$paymentMethod.type', count: { $sum: 1 }, totalAmount: { $sum: '$amount.total' } } }
    ]);

    // Get monthly spending (last 6 months)
    const sixMonthsAgo = new Date(); sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    const monthlySpending = await Payment.aggregate([
      { $match: { userId, status: 'completed', createdAt: { $gte: sixMonthsAgo } } },
      { $group: { _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } }, totalSpent: { $sum: '$amount.total' }, transactionCount: { $sum: 1 } } },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    res.json({ overview: stats[0] || { totalPayments: 0, totalSpent: 0, avgPayment: 0, successfulPayments: 0, failedPayments: 0 }, methodStats, monthlySpending });
  } catch (error) {
    console.error('Get payment stats error:', error);
    res.status(500).json({ message: 'Server error', error: error instanceof Error ? error.message : 'Unknown error' });
  }
};

// Helper functions for payment processing
async function processCardPayment(cardInfo: any, amount: number) {
  // Mock card payment processing - In real implementation, integrate with payment gateway (Stripe, PayHere, etc.)
  return { success: true, transactionId: `TXN_CARD_${Date.now()}`, authorizationCode: `AUTH_${Math.random().toString(36).substr(2, 9)}`, gatewayResponse: { status: 'approved', message: 'Payment processed successfully' } };
}

async function processMobilePayment(provider: string, amount: number) {
  // Mock mobile payment processing
  return { success: true, transactionId: `TXN_${provider.toUpperCase()}_${Date.now()}`, authorizationCode: `MOBILE_${Math.random().toString(36).substr(2, 9)}`, gatewayResponse: { status: 'approved', provider, message: 'Mobile payment processed successfully' } };
}

async function processBankTransfer(bankInfo: any, amount: number) {
  // Mock bank transfer processing
  return { success: true, transactionId: `TXN_BANK_${Date.now()}`, authorizationCode: `BANK_${Math.random().toString(36).substr(2, 9)}`, gatewayResponse: { status: 'approved', bank: bankInfo.bankName, message: 'Bank transfer initiated successfully' } };
}