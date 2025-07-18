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
Object.defineProperty(exports, "__esModule", { value: true });
// src/models/Payment.ts
const mongoose_1 = __importStar(require("mongoose"));
const PaymentSchema = new mongoose_1.Schema({
    paymentId: {
        type: String,
        required: true,
        unique: true,
    },
    userId: {
        type: mongoose_1.default.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    bookingId: {
        type: mongoose_1.default.Schema.Types.ObjectId,
        ref: 'Booking',
        required: true,
    },
    amount: {
        subtotal: {
            type: Number,
            required: true,
            min: 0,
        },
        taxes: {
            type: Number,
            required: true,
            min: 0,
            default: 0,
        },
        fees: {
            type: Number,
            required: true,
            min: 0,
            default: 0,
        },
        discounts: {
            type: Number,
            required: true,
            min: 0,
            default: 0,
        },
        total: {
            type: Number,
            required: true,
            min: 0,
        },
        currency: {
            type: String,
            enum: ['LKR'],
            default: 'LKR',
        }
    },
    paymentMethod: {
        type: {
            type: String,
            enum: ['card', 'bank_transfer', 'digital_wallet', 'cash'],
            required: true,
        },
        provider: {
            type: String,
        },
        lastFourDigits: {
            type: String,
            validate: {
                validator: function (v) {
                    return !v || v.length === 4;
                },
                message: 'Last four digits must be exactly 4 characters'
            }
        },
        walletType: {
            type: String,
        }
    },
    transactionInfo: {
        transactionId: {
            type: String,
            required: true,
        },
        gatewayTransactionId: {
            type: String,
        },
        gatewayProvider: {
            type: String,
        },
        authorizationCode: {
            type: String,
        },
        merchantId: {
            type: String,
        }
    },
    status: {
        type: String,
        enum: ['pending', 'processing', 'completed', 'failed', 'cancelled', 'refunded', 'partially_refunded'],
        default: 'pending',
    },
    statusHistory: [{
            status: {
                type: String,
                required: true,
            },
            timestamp: {
                type: Date,
                required: true,
                default: Date.now,
            },
            reason: {
                type: String,
            },
            updatedBy: {
                type: mongoose_1.default.Schema.Types.ObjectId,
                ref: 'User',
            }
        }],
    billingInfo: {
        name: {
            type: String,
            required: true,
            trim: true,
        },
        email: {
            type: String,
            required: true,
            trim: true,
            lowercase: true,
        },
        phone: {
            type: String,
            trim: true,
        },
        address: {
            street: { type: String, trim: true },
            city: { type: String, trim: true },
            state: { type: String, trim: true },
            postalCode: { type: String, trim: true },
            country: { type: String, trim: true, default: 'Sri Lanka' }
        }
    },
    refundInfo: {
        refundId: {
            type: String,
        },
        refundAmount: {
            type: Number,
            min: 0,
        },
        refundReason: {
            type: String,
        },
        refundMethod: {
            type: String,
        },
        refundDate: {
            type: Date,
        },
        processedBy: {
            type: mongoose_1.default.Schema.Types.ObjectId,
            ref: 'User',
        },
        gatewayRefundId: {
            type: String,
        }
    },
    metadata: {
        ipAddress: {
            type: String,
        },
        userAgent: {
            type: String,
        },
        deviceId: {
            type: String,
        },
        sessionId: {
            type: String,
        },
        riskScore: {
            type: Number,
            min: 0,
            max: 100,
        }
    },
    timestamps: {
        initiatedAt: {
            type: Date,
            required: true,
            default: Date.now,
        },
        processedAt: {
            type: Date,
        },
        completedAt: {
            type: Date,
        },
        failedAt: {
            type: Date,
        },
        refundedAt: {
            type: Date,
        }
    },
    isActive: {
        type: Boolean,
        default: true,
    }
}, {
    timestamps: true,
});
// Indexes for better query performance
PaymentSchema.index({ paymentId: 1 });
PaymentSchema.index({ userId: 1 });
PaymentSchema.index({ bookingId: 1 });
PaymentSchema.index({ status: 1 });
PaymentSchema.index({ 'transactionInfo.transactionId': 1 });
PaymentSchema.index({ 'timestamps.initiatedAt': -1 });
PaymentSchema.index({ isActive: 1 });
// Compound indexes for common queries
PaymentSchema.index({ userId: 1, status: 1 });
PaymentSchema.index({ status: 1, 'timestamps.initiatedAt': -1 });
// Generate paymentId before saving
PaymentSchema.pre('save', function (next) {
    if (!this.paymentId) {
        this.paymentId = `PAY${Date.now()}${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;
    }
    // Add status to history if status changed
    if (this.isModified('status')) {
        this.statusHistory.push({
            status: this.status,
            timestamp: new Date(),
            reason: 'Status updated'
        });
    }
    next();
});
// Method to update status with history tracking
PaymentSchema.methods.updateStatus = function (newStatus, reason, updatedBy) {
    this.status = newStatus;
    this.statusHistory.push({
        status: newStatus,
        timestamp: new Date(),
        reason,
        updatedBy
    });
    // Update relevant timestamps
    switch (newStatus) {
        case 'processing':
            this.timestamps.processedAt = new Date();
            break;
        case 'completed':
            this.timestamps.completedAt = new Date();
            break;
        case 'failed':
            this.timestamps.failedAt = new Date();
            break;
        case 'refunded':
        case 'partially_refunded':
            this.timestamps.refundedAt = new Date();
            break;
    }
    return this.save();
};
// Method to process refund
PaymentSchema.methods.processRefund = function (refundAmount, reason, processedBy, refundMethod = 'original_method') {
    const refundId = `REF${Date.now()}${Math.floor(Math.random() * 1000)}`;
    this.refundInfo = {
        refundId,
        refundAmount,
        refundReason: reason,
        refundMethod,
        refundDate: new Date(),
        processedBy
    };
    const isPartialRefund = refundAmount < this.amount.total;
    const newStatus = isPartialRefund ? 'partially_refunded' : 'refunded';
    return this.updateStatus(newStatus, `Refund processed: ${reason}`, processedBy);
};
// Method to calculate processing fee
PaymentSchema.methods.calculateProcessingFee = function () {
    let feePercentage = 0;
    switch (this.paymentMethod.type) {
        case 'card':
            feePercentage = 2.9; // 2.9% for card payments
            break;
        case 'digital_wallet':
            feePercentage = 2.5; // 2.5% for digital wallets
            break;
        case 'bank_transfer':
            feePercentage = 1.0; // 1% for bank transfers
            break;
        case 'cash':
            feePercentage = 0; // No fee for cash
            break;
    }
    return Math.round(this.amount.subtotal * (feePercentage / 100));
};
// Static method to get payment statistics
PaymentSchema.statics.getPaymentStats = async function (userId) {
    const matchQuery = { isActive: true };
    if (userId)
        matchQuery.userId = userId;
    const stats = await this.aggregate([
        { $match: matchQuery },
        {
            $group: {
                _id: '$status',
                count: { $sum: 1 },
                totalAmount: { $sum: '$amount.total' },
                avgAmount: { $avg: '$amount.total' }
            }
        }
    ]);
    return stats;
};
// Static method to get revenue by time period
PaymentSchema.statics.getRevenueByPeriod = async function (startDate, endDate) {
    return this.aggregate([
        {
            $match: {
                status: 'completed',
                'timestamps.completedAt': {
                    $gte: startDate,
                    $lte: endDate
                }
            }
        },
        {
            $group: {
                _id: {
                    year: { $year: '$timestamps.completedAt' },
                    month: { $month: '$timestamps.completedAt' },
                    day: { $dayOfMonth: '$timestamps.completedAt' }
                },
                totalRevenue: { $sum: '$amount.total' },
                totalTransactions: { $sum: 1 },
                avgTransactionAmount: { $avg: '$amount.total' }
            }
        },
        { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
    ]);
};
// Static method to get payment method usage
PaymentSchema.statics.getPaymentMethodStats = async function () {
    return this.aggregate([
        { $match: { status: 'completed' } },
        {
            $group: {
                _id: '$paymentMethod.type',
                count: { $sum: 1 },
                totalAmount: { $sum: '$amount.total' },
                avgAmount: { $avg: '$amount.total' }
            }
        },
        { $sort: { count: -1 } }
    ]);
};
const Payment = mongoose_1.default.model('Payment', PaymentSchema);
exports.default = Payment;
