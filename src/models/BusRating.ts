// src/models/BusRating.ts - Bus Rating System
import mongoose, { Document, Schema, Model } from 'mongoose';

export interface IBusRating extends Document {
  ratingId: string;
  bookingId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  deviceId: mongoose.Types.ObjectId;      // The bus/device that was rated
  routeId: mongoose.Types.ObjectId;       // For context
  
  // Bus-specific ratings (1-5 stars each)
  ratings: {
    overall: number;
    cleanliness: number;         // Bus interior cleanliness
    comfort: number;             // Seat comfort, legroom, AC
    condition: number;           // Bus mechanical condition, noise
    safety: number;              // Safety equipment, driving
    punctuality: number;         // On-time performance
  };
  
  // Text review about the BUS
  review?: {
    comment: string;
    busProblems?: string[];      // AC not working, dirty seats, etc.
    busHighlights?: string[];    // Clean, comfortable, good AC, etc.
  };
  
  // Journey context
  journeyInfo: {
    travelDate: Date;
    departureTime: string;
    routeName: string;
    vehicleNumber: string;       // For display purposes
    seatNumber: string;
  };
  
  // Metadata
  isAnonymous: boolean;
  isVerifiedTrip: boolean;       // Confirmed the journey actually happened
  helpfulVotes: number;          // Other users found this helpful
  reportedCount: number;         // If reported as inappropriate
  
  createdAt: Date;
  updatedAt: Date;
}

// Interface for static methods
export interface IBusRatingModel extends Model<IBusRating> {
  getBusRatings(deviceId: mongoose.Types.ObjectId): Promise<any>;
  getUserRatings(userId: mongoose.Types.ObjectId): Promise<IBusRating[]>;
  getAverageRating(deviceId: mongoose.Types.ObjectId): Promise<number>;
  getBusStats(deviceId: mongoose.Types.ObjectId): Promise<any>;
}

const BusRatingSchema = new Schema<IBusRating>(
  {
    ratingId: {
      type: String,
      unique: true,
      default: function() {
        return `RT${Date.now()}${Math.floor(Math.random() * 1000)}`;
      }
    },
    bookingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Booking',
      required: true,
      unique: true  // One rating per booking
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    deviceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Device',
      required: true,
    },
    routeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Route',
      required: true,
    },
    
    // Bus ratings
    ratings: {
      overall: {
        type: Number,
        required: true,
        min: 1,
        max: 5
      },
      cleanliness: {
        type: Number,
        required: true,
        min: 1,
        max: 5
      },
      comfort: {
        type: Number,
        required: true,
        min: 1,
        max: 5
      },
      condition: {
        type: Number,
        required: true,
        min: 1,
        max: 5
      },
      safety: {
        type: Number,
        required: true,
        min: 1,
        max: 5
      },
      punctuality: {
        type: Number,
        required: true,
        min: 1,
        max: 5
      }
    },
    
    // Optional review
    review: {
      comment: {
        type: String,
        maxlength: 500,
        trim: true
      },
      busProblems: [{
        type: String,
        trim: true
      }],
      busHighlights: [{
        type: String,
        trim: true
      }]
    },
    
    // Journey context
    journeyInfo: {
      travelDate: {
        type: Date,
        required: true
      },
      departureTime: {
        type: String,
        required: true
      },
      routeName: {
        type: String,
        required: true
      },
      vehicleNumber: {
        type: String,
        required: true
      },
      seatNumber: {
        type: String,
        required: true
      }
    },
    
    // Metadata
    isAnonymous: {
      type: Boolean,
      default: false
    },
    isVerifiedTrip: {
      type: Boolean,
      default: true
    },
    helpfulVotes: {
      type: Number,
      default: 0,
      min: 0
    },
    reportedCount: {
      type: Number,
      default: 0,
      min: 0
    }
  },
  {
    timestamps: true,
  }
);

// Indexes for performance
BusRatingSchema.index({ deviceId: 1, createdAt: -1 });
BusRatingSchema.index({ userId: 1, createdAt: -1 });
BusRatingSchema.index({ bookingId: 1 });
BusRatingSchema.index({ routeId: 1 });
BusRatingSchema.index({ 'ratings.overall': -1 });
BusRatingSchema.index({ isVerifiedTrip: 1, reportedCount: 1 });

// Compound indexes
BusRatingSchema.index({ deviceId: 1, isVerifiedTrip: 1, reportedCount: 1 });
BusRatingSchema.index({ userId: 1, deviceId: 1 }, { unique: true });

// Static method to get bus ratings with stats
BusRatingSchema.statics.getBusRatings = async function(deviceId: mongoose.Types.ObjectId) {
  const ratings = await this.find({
    deviceId,
    isVerifiedTrip: true,
    reportedCount: { $lt: 3 }  // Exclude heavily reported ratings
  })
  .populate('userId', 'name')
  .populate('bookingId', 'bookingId travelDate')
  .sort({ createdAt: -1 })
  .limit(50);  // Latest 50 ratings

  return ratings;
};

// Static method to get user's ratings
BusRatingSchema.statics.getUserRatings = async function(userId: mongoose.Types.ObjectId) {
  return this.find({ userId })
    .populate('deviceId', 'vehicleNumber vehicleType')
    .populate('routeId', 'name')
    .sort({ createdAt: -1 });
};

// Static method to get average rating for a bus
BusRatingSchema.statics.getAverageRating = async function(deviceId: mongoose.Types.ObjectId) {
  const stats = await this.aggregate([
    { 
      $match: { 
        deviceId, 
        isVerifiedTrip: true,
        reportedCount: { $lt: 3 }
      } 
    },
    {
      $group: {
        _id: null,
        avgOverall: { $avg: '$ratings.overall' },
        avgCleanliness: { $avg: '$ratings.cleanliness' },
        avgComfort: { $avg: '$ratings.comfort' },
        avgCondition: { $avg: '$ratings.condition' },
        avgSafety: { $avg: '$ratings.safety' },
        avgPunctuality: { $avg: '$ratings.punctuality' },
        totalRatings: { $sum: 1 }
      }
    }
  ]);

  if (stats.length === 0) {
    return {
      avgOverall: 0,
      avgCleanliness: 0,
      avgComfort: 0,
      avgCondition: 0,
      avgSafety: 0,
      avgPunctuality: 0,
      totalRatings: 0
    };
  }

  return stats[0];
};

// Static method to get comprehensive bus stats
BusRatingSchema.statics.getBusStats = async function(deviceId: mongoose.Types.ObjectId) {
  // First get averages using the same aggregation logic
  const averages = await this.aggregate([
    { 
      $match: { 
        deviceId, 
        isVerifiedTrip: true,
        reportedCount: { $lt: 3 }
      } 
    },
    {
      $group: {
        _id: null,
        avgOverall: { $avg: '$ratings.overall' },
        avgCleanliness: { $avg: '$ratings.cleanliness' },
        avgComfort: { $avg: '$ratings.comfort' },
        avgCondition: { $avg: '$ratings.condition' },
        avgSafety: { $avg: '$ratings.safety' },
        avgPunctuality: { $avg: '$ratings.punctuality' },
        totalRatings: { $sum: 1 }
      }
    }
  ]);

  const averageResult = averages[0] || {
    avgOverall: 0,
    avgCleanliness: 0,
    avgComfort: 0,
    avgCondition: 0,
    avgSafety: 0,
    avgPunctuality: 0,
    totalRatings: 0
  };

  const [distribution, recentTrend] = await Promise.all([
    
    // Rating distribution
    this.aggregate([
      { 
        $match: { 
          deviceId, 
          isVerifiedTrip: true,
          reportedCount: { $lt: 3 }
        } 
      },
      {
        $group: {
          _id: '$ratings.overall',
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: -1 } }
    ]),
    
    // Recent trend (last 30 days)
    this.aggregate([
      { 
        $match: { 
          deviceId,
          isVerifiedTrip: true,
          reportedCount: { $lt: 3 },
          createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
        } 
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
            day: { $dayOfMonth: '$createdAt' }
          },
          avgRating: { $avg: '$ratings.overall' },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
    ])
  ]);

  return {
    averages: averageResult,
    distribution,
    recentTrend
  };
};

const BusRating = mongoose.model<IBusRating, IBusRatingModel>('BusRating', BusRatingSchema);

export default BusRating;