// src/models/Booking.ts
import mongoose, { Document, Schema } from 'mongoose';

export interface IBooking extends Document {
  bookingId: string;
  userId: mongoose.Types.ObjectId;
  routeId: mongoose.Types.ObjectId;
  scheduleId: string;
  travelDate: Date;
  departureTime: string;
  passengerInfo: {
    name: string;
    phone: string;
    email: string;
    idType: 'nic' | 'passport';
    idNumber: string;
    passengerType: 'regular' | 'student' | 'senior' | 'military';
  };
  seatInfo: {
    seatNumber: string;
    seatType: 'window' | 'aisle' | 'middle';
    preferences: string[];
  };
  pricing: {
    basePrice: number;
    taxes: number;
    discounts: number;
    totalAmount: number;
    currency: 'LKR';
  };
  paymentInfo: {
    paymentId: mongoose.Types.ObjectId;
    method: 'card' | 'bank' | 'digital_wallet' | 'cash';
    status: 'pending' | 'completed' | 'failed' | 'refunded';
    paidAt?: Date;
    transactionId?: string;
  };
  status: 'confirmed' | 'pending' | 'cancelled' | 'completed' | 'no_show';
  qrCode: string;
  cancellationInfo?: {
    reason: string;
    cancelledAt: Date;
    refundAmount: number;
    refundStatus: 'pending' | 'processed';
    processedBy?: mongoose.Types.ObjectId;
  };
  checkInInfo?: {
    checkedIn: boolean;
    checkInTime?: Date;
    checkInLocation?: string;
  };
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const BookingSchema = new Schema<IBooking>(
  {
    bookingId: {
      type: String,
      required: true,
      unique: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    routeId: {
      type: mongoose.Schema.Types.ObjectId,
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
        type: mongoose.Schema.Types.ObjectId,
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
      required: true,
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
        type: mongoose.Schema.Types.ObjectId,
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
  },
  {
    timestamps: true,
  }
);

// Indexes for better query performance
BookingSchema.index({ bookingId: 1 });
BookingSchema.index({ userId: 1 });
BookingSchema.index({ routeId: 1 });
BookingSchema.index({ travelDate: 1 });
BookingSchema.index({ status: 1 });
BookingSchema.index({ 'paymentInfo.status': 1 });
BookingSchema.index({ isActive: 1 });
BookingSchema.index({ createdAt: 1 });

// Generate bookingId and QR code before saving
BookingSchema.pre('save', function(next) {
  if (!this.bookingId) {
    this.bookingId = `BK${Date.now()}${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;
  }
  
  if (!this.qrCode) {
    this.qrCode = this.bookingId;
  }
  
  next();
});

// Calculate refund amount method
BookingSchema.methods.calculateRefund = function() {
  const hoursUntilDeparture = this.getHoursUntilDeparture();
  let refundPercentage = 0;
  
  if (hoursUntilDeparture >= 24) {
    refundPercentage = 90; // 90% refund if cancelled 24+ hours before
  } else if (hoursUntilDeparture >= 2) {
    refundPercentage = 50; // 50% refund if cancelled 2-24 hours before
  } else {
    refundPercentage = 0; // No refund if cancelled less than 2 hours before
  }
  
  return Math.round(this.pricing.totalAmount * (refundPercentage / 100));
};

// Get hours until departure
BookingSchema.methods.getHoursUntilDeparture = function() {
  const departureDateTime = new Date(`${this.travelDate.toISOString().split('T')[0]}T${this.departureTime}:00`);
  const now = new Date();
  const diffMs = departureDateTime.getTime() - now.getTime();
  return Math.max(0, diffMs / (1000 * 60 * 60));
};

// Check if booking can be cancelled
BookingSchema.methods.canBeCancelled = function() {
  const validStatuses = ['confirmed', 'pending'];
  const hasMinimumTime = this.getHoursUntilDeparture() > 0.5; // At least 30 minutes before departure
  
  return validStatuses.includes(this.status) && hasMinimumTime;
};

// Check if booking can be modified
BookingSchema.methods.canBeModified = function() {
  const validStatuses = ['confirmed', 'pending'];
  const hasMinimumTime = this.getHoursUntilDeparture() > 2; // At least 2 hours before departure
  
  return validStatuses.includes(this.status) && hasMinimumTime;
};

// Static method to get booking statistics
BookingSchema.statics.getBookingStats = async function(userId?: mongoose.Types.ObjectId) {
  const matchQuery: any = { isActive: true };
  if (userId) matchQuery.userId = userId;
  
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

// Static method to get popular routes
BookingSchema.statics.getPopularRoutes = async function(limit: number = 10) {
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

const Booking = mongoose.model<IBooking>('Booking', BookingSchema);

export default Booking;