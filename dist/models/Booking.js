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
// src/models/Booking.ts - FIXED VERSION - Remove required from auto-generated fields
const mongoose_1 = __importStar(require("mongoose"));
const BookingSchema = new mongoose_1.Schema({
    bookingId: {
        type: String,
        // ✅ FIXED: Remove required - this is auto-generated
        unique: true,
    },
    userId: {
        type: mongoose_1.default.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    routeId: {
        type: mongoose_1.default.Schema.Types.ObjectId,
        ref: 'Route',
        required: true,
    },
    scheduleId: {
        type: String,
        required: true,
    },
    travelDate: {
        type: Date,
        required: true,
    },
    departureTime: {
        type: String,
        required: true,
    },
    passengerInfo: {
        name: {
            type: String,
            required: true,
            trim: true,
        },
        phone: {
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
        idType: {
            type: String,
            enum: ['nic', 'passport'],
            required: true,
        },
        idNumber: {
            type: String,
            required: true,
            trim: true,
        },
        passengerType: {
            type: String,
            enum: ['regular', 'student', 'senior', 'military'],
            default: 'regular',
        }
    },
    seatInfo: {
        seatNumber: {
            type: String,
            required: true,
        },
        seatType: {
            type: String,
            enum: ['window', 'aisle', 'middle'],
            required: true,
        },
        preferences: {
            type: [String],
            default: []
        }
    },
    pricing: {
        basePrice: {
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
        discounts: {
            type: Number,
            required: true,
            min: 0,
            default: 0,
        },
        totalAmount: {
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
    paymentInfo: {
        paymentId: {
            type: mongoose_1.default.Schema.Types.ObjectId,
            ref: 'Payment',
        },
        method: {
            type: String,
            enum: ['card', 'bank', 'digital_wallet', 'cash'],
            required: true,
        },
        status: {
            type: String,
            enum: ['pending', 'completed', 'failed', 'refunded'],
            default: 'pending',
        },
        paidAt: {
            type: Date,
        },
        transactionId: {
            type: String,
        }
    },
    status: {
        type: String,
        enum: ['confirmed', 'pending', 'cancelled', 'completed', 'no_show'],
        default: 'pending',
    },
    qrCode: {
        type: String,
        // ✅ FIXED: Remove required - this is auto-generated
    },
    cancellationInfo: {
        reason: {
            type: String,
        },
        cancelledAt: {
            type: Date,
        },
        refundAmount: {
            type: Number,
            min: 0,
        },
        refundStatus: {
            type: String,
            enum: ['pending', 'processed'],
        },
        processedBy: {
            type: mongoose_1.default.Schema.Types.ObjectId,
            ref: 'User',
        }
    },
    checkInInfo: {
        checkedIn: {
            type: Boolean,
            default: false,
        },
        checkInTime: {
            type: Date,
        },
        checkInLocation: {
            type: String,
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
BookingSchema.index({ bookingId: 1 });
BookingSchema.index({ userId: 1 });
BookingSchema.index({ routeId: 1 });
BookingSchema.index({ travelDate: 1 });
BookingSchema.index({ status: 1 });
BookingSchema.index({ 'paymentInfo.status': 1 });
BookingSchema.index({ isActive: 1 });
BookingSchema.index({ createdAt: 1 });
// ✅ FIXED: Enhanced pre-save middleware to ensure fields are set before validation
BookingSchema.pre('validate', function (next) {
    // Generate bookingId before validation if not present
    if (!this.bookingId) {
        this.bookingId = `BK${Date.now()}${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;
    }
    // Generate QR code before validation if not present
    if (!this.qrCode) {
        this.qrCode = this.bookingId;
    }
    // ✅ FIXED: Auto-calculate pricing if not provided
    if (!this.pricing.totalAmount && this.pricing.basePrice) {
        this.pricing.taxes = Math.round(this.pricing.basePrice * 0.02);
        this.pricing.totalAmount = this.pricing.basePrice + this.pricing.taxes - this.pricing.discounts;
    }
    next();
});
// Keep the original pre-save as backup
BookingSchema.pre('save', function (next) {
    // Double-check that required fields are set
    if (!this.bookingId) {
        this.bookingId = `BK${Date.now()}${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;
    }
    if (!this.qrCode) {
        this.qrCode = this.bookingId;
    }
    next();
});
// Instance Methods
BookingSchema.methods.calculateRefund = function () {
    const hoursUntilDeparture = this.getHoursUntilDeparture();
    let refundPercentage = 0;
    if (hoursUntilDeparture >= 24) {
        refundPercentage = 90; // 90% refund if cancelled 24+ hours before
    }
    else if (hoursUntilDeparture >= 2) {
        refundPercentage = 50; // 50% refund if cancelled 2-24 hours before
    }
    else {
        refundPercentage = 0; // No refund if cancelled less than 2 hours before
    }
    return Math.round(this.pricing.totalAmount * (refundPercentage / 100));
};
BookingSchema.methods.getHoursUntilDeparture = function () {
    const departureDateTime = new Date(`${this.travelDate.toISOString().split('T')[0]}T${this.departureTime}:00`);
    const now = new Date();
    const diffMs = departureDateTime.getTime() - now.getTime();
    return Math.max(0, diffMs / (1000 * 60 * 60));
};
BookingSchema.methods.canBeCancelled = function () {
    const validStatuses = ['confirmed', 'pending'];
    const hasMinimumTime = this.getHoursUntilDeparture() > 0.5; // At least 30 minutes before departure
    return validStatuses.includes(this.status) && hasMinimumTime;
};
BookingSchema.methods.canBeModified = function () {
    const validStatuses = ['confirmed', 'pending'];
    const hasMinimumTime = this.getHoursUntilDeparture() > 2; // At least 2 hours before departure
    return validStatuses.includes(this.status) && hasMinimumTime;
};
// Static Methods
BookingSchema.statics.getBookingStats = async function (userId) {
    const matchQuery = { isActive: true };
    if (userId)
        matchQuery.userId = userId;
    const stats = await this.aggregate([
        { $match: matchQuery },
        {
            $group: {
                _id: '$status',
                count: { $sum: 1 },
                totalAmount: { $sum: '$pricing.totalAmount' }
            }
        }
    ]);
    return stats;
};
BookingSchema.statics.getPopularRoutes = async function (limit = 10) {
    return this.aggregate([
        { $match: { isActive: true, status: { $in: ['confirmed', 'completed'] } } },
        {
            $group: {
                _id: '$routeId',
                bookingCount: { $sum: 1 },
                totalRevenue: { $sum: '$pricing.totalAmount' }
            }
        },
        { $sort: { bookingCount: -1 } },
        { $limit: limit },
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
};
const Booking = mongoose_1.default.model('Booking', BookingSchema);
exports.default = Booking;
