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
// src/models/BusRating.ts - Bus Rating System
const mongoose_1 = __importStar(require("mongoose"));
const BusRatingSchema = new mongoose_1.Schema({
    ratingId: {
        type: String,
        unique: true,
        default: function () {
            return `RT${Date.now()}${Math.floor(Math.random() * 1000)}`;
        }
    },
    bookingId: {
        type: mongoose_1.default.Schema.Types.ObjectId,
        ref: 'Booking',
        required: true,
        unique: true // One rating per booking
    },
    userId: {
        type: mongoose_1.default.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    deviceId: {
        type: mongoose_1.default.Schema.Types.ObjectId,
        ref: 'Device',
        required: true,
    },
    routeId: {
        type: mongoose_1.default.Schema.Types.ObjectId,
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
}, {
    timestamps: true,
});
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
BusRatingSchema.statics.getBusRatings = async function (deviceId) {
    const ratings = await this.find({
        deviceId,
        isVerifiedTrip: true,
        reportedCount: { $lt: 3 } // Exclude heavily reported ratings
    })
        .populate('userId', 'name')
        .populate('bookingId', 'bookingId travelDate')
        .sort({ createdAt: -1 })
        .limit(50); // Latest 50 ratings
    return ratings;
};
// Static method to get user's ratings
BusRatingSchema.statics.getUserRatings = async function (userId) {
    return this.find({ userId })
        .populate('deviceId', 'vehicleNumber vehicleType')
        .populate('routeId', 'name')
        .sort({ createdAt: -1 });
};
// Static method to get average rating for a bus
BusRatingSchema.statics.getAverageRating = async function (deviceId) {
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
BusRatingSchema.statics.getBusStats = async function (deviceId) {
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
const BusRating = mongoose_1.default.model('BusRating', BusRatingSchema);
exports.default = BusRating;
