// src/models/Payment.ts - FIXED VERSION - Auto-generate paymentId
import mongoose, { Document, Schema, Model } from 'mongoose';

export interface IPayment extends Document {
  paymentId: string;
  userId: mongoose.Types.ObjectId;
  bookingId: mongoose.Types.ObjectId;
  amount: {
    subtotal: number;
    taxes: number;
    fees: number;
    discounts: number;
    total: number;
    currency: 'LKR';
  };
  paymentMethod: {
    type: 'card' | 'bank' | 'bank_transfer' | 'digital_wallet' | 'cash';
    provider?: string;
    lastFourDigits?: string;
    walletType?: string;
  };
  transactionInfo: {
    transactionId: string;
    gatewayTransactionId?: string;
    gatewayProvider?: string;
    authorizationCode?: string;
    merchantId?: string;
    gatewayResponse?: any;
  };
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled' | 'refunded' | 'partially_refunded';
  statusHistory: [{
    status: string;
    timestamp: Date;
    reason?: string;
    updatedBy?: mongoose.Types.ObjectId;
  }];
  billingInfo: {
    name: string;
    email: string;
    phone?: string;
    address?: {
      street: string;
      city: string;
      state: string;
      postalCode: string;
      country: string;
    };
  };
  refundInfo?: {
    refundId: string;
    refundAmount: number;
    refundReason: string;
    refundMethod: string;
    refundDate: Date;
    processedBy: mongoose.Types.ObjectId;
    gatewayRefundId?: string;
  };
  metadata: {
    ipAddress?: string;
    userAgent?: string;
    deviceId?: string;
    sessionId?: string;
    riskScore?: number;
  };
  timestamps: {
    initiatedAt: Date;
    processedAt?: Date;
    completedAt?: Date;
    failedAt?: Date;
    refundedAt?: Date;
  };
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;

  // Instance methods
  updateStatus(newStatus: string, reason?: string, updatedBy?: mongoose.Types.ObjectId): Promise<IPayment>;
  processRefund(refundAmount: number, reason: string, processedBy: mongoose.Types.ObjectId, refundMethod?: string): Promise<IPayment>;
  calculateProcessingFee(): number;
}

// Interface for static methods
export interface IPaymentModel extends Model<IPayment> {
  getPaymentStats(userId?: mongoose.Types.ObjectId): Promise<any[]>;
  getRevenueByPeriod(startDate: Date, endDate: Date): Promise<any[]>;
  getPaymentMethodStats(): Promise<any[]>;
}

const PaymentSchema = new Schema<IPayment>(
  {
    paymentId: {
      type: String,
      // ✅ FIXED: Remove required - this is auto-generated
      unique: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    bookingId: {
      type: mongoose.Schema.Types.ObjectId,
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
        // ✅ FIXED: Include 'bank' in enum for frontend compatibility
        enum: ['card', 'bank', 'bank_transfer', 'digital_wallet', 'cash'],
        required: true,
      },
      provider: {
        type: String,
      },
      lastFourDigits: {
        type: String,
        validate: {
          validator: function(v: string) {
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
      },
      gatewayResponse: {
        type: Schema.Types.Mixed,
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
        type: mongoose.Schema.Types.ObjectId,
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
        type: mongoose.Schema.Types.ObjectId,
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
  },
  {
    timestamps: true,
  }
);

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

// ✅ FIXED: Add pre('validate') middleware to run BEFORE validation
PaymentSchema.pre('validate', function(next) {
  // Generate paymentId before validation if not present
  if (!this.paymentId) {
    this.paymentId = `PAY${Date.now()}${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;
  }
  
  // ✅ FIXED: Map 'bank' to 'bank_transfer' for internal consistency
  if (this.paymentMethod && this.paymentMethod.type === 'bank') {
    this.paymentMethod.type = 'bank_transfer';
  }
  
  next();
});

// Keep the original pre-save as backup
PaymentSchema.pre('save', function(next) {
  // Double-check that paymentId is set
  if (!this.paymentId) {
    this.paymentId = `PAY${Date.now()}${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;
  }
  
  // Add status to history if status changed
  if (this.isModified('status')) {
    this.statusHistory.push({
      status: this.status,
      timestamp: new Date(),
      reason: 'Status updated'
    } as any);
  }
  
  next();
});

// Instance Methods
PaymentSchema.methods.updateStatus = function(
  newStatus: string, 
  reason?: string, 
  updatedBy?: mongoose.Types.ObjectId
) {
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

PaymentSchema.methods.processRefund = function(
  refundAmount: number,
  reason: string,
  processedBy: mongoose.Types.ObjectId,
  refundMethod: string = 'original_method'
) {
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

PaymentSchema.methods.calculateProcessingFee = function() {
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

// Static Methods
PaymentSchema.statics.getPaymentStats = async function(userId?: mongoose.Types.ObjectId) {
  const matchQuery: any = { isActive: true };
  if (userId) matchQuery.userId = userId;
  
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

PaymentSchema.statics.getRevenueByPeriod = async function(
  startDate: Date,
  endDate: Date
) {
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

PaymentSchema.statics.getPaymentMethodStats = async function() {
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

const Payment = mongoose.model<IPayment, IPaymentModel>('Payment', PaymentSchema);

export default Payment;