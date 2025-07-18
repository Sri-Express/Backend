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
// src/models/LocationTracking.ts
const mongoose_1 = __importStar(require("mongoose"));
const LocationTrackingSchema = new mongoose_1.Schema({
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
    vehicleId: {
        type: String,
        required: true,
    },
    vehicleNumber: {
        type: String,
        required: true,
    },
    location: {
        latitude: {
            type: Number,
            required: true,
            min: -90,
            max: 90,
        },
        longitude: {
            type: Number,
            required: true,
            min: -180,
            max: 180,
        },
        accuracy: {
            type: Number,
            required: true,
            min: 0,
        },
        heading: {
            type: Number,
            required: true,
            min: 0,
            max: 360,
        },
        speed: {
            type: Number,
            required: true,
            min: 0,
        },
        altitude: {
            type: Number,
        }
    },
    routeProgress: {
        currentWaypoint: {
            type: Number,
            required: true,
            min: 0,
        },
        distanceCovered: {
            type: Number,
            required: true,
            min: 0,
        },
        estimatedTimeToDestination: {
            type: Number,
            required: true,
            min: 0,
        },
        nextStopETA: {
            type: Date,
            required: true,
        },
        progressPercentage: {
            type: Number,
            required: true,
            min: 0,
            max: 100,
        }
    },
    passengerLoad: {
        currentCapacity: {
            type: Number,
            required: true,
            min: 0,
        },
        maxCapacity: {
            type: Number,
            required: true,
            min: 1,
        },
        boardingCount: {
            type: Number,
            required: true,
            min: 0,
            default: 0,
        },
        alightingCount: {
            type: Number,
            required: true,
            min: 0,
            default: 0,
        },
        loadPercentage: {
            type: Number,
            required: true,
            min: 0,
            max: 100,
        }
    },
    operationalInfo: {
        driverInfo: {
            driverId: {
                type: String,
                required: true,
            },
            driverName: {
                type: String,
                required: true,
            },
            contactNumber: {
                type: String,
                required: true,
            }
        },
        tripInfo: {
            tripId: {
                type: String,
                required: true,
            },
            scheduleId: {
                type: String,
                required: true,
            },
            departureTime: {
                type: String,
                required: true,
            },
            estimatedArrival: {
                type: Date,
                required: true,
            }
        },
        status: {
            type: String,
            enum: ['on_route', 'at_stop', 'delayed', 'breakdown', 'off_duty'],
            default: 'on_route',
        },
        delays: {
            currentDelay: {
                type: Number,
                default: 0,
                min: 0,
            },
            reason: {
                type: String,
            },
            reportedAt: {
                type: Date,
            }
        }
    },
    environmentalData: {
        weather: {
            type: String,
        },
        temperature: {
            type: Number,
        },
        trafficCondition: {
            type: String,
            enum: ['light', 'moderate', 'heavy', 'severe'],
            default: 'light',
        }
    },
    timestamp: {
        type: Date,
        required: true,
        default: Date.now,
    },
    isActive: {
        type: Boolean,
        default: true,
    }
}, {
    timestamps: true,
});
// Indexes for better query performance
LocationTrackingSchema.index({ deviceId: 1 });
LocationTrackingSchema.index({ routeId: 1 });
LocationTrackingSchema.index({ vehicleId: 1 });
LocationTrackingSchema.index({ timestamp: -1 });
LocationTrackingSchema.index({ isActive: 1 });
LocationTrackingSchema.index({ 'operationalInfo.status': 1 });
LocationTrackingSchema.index({ 'location.latitude': 1, 'location.longitude': 1 });
// Compound indexes for common queries
LocationTrackingSchema.index({ routeId: 1, timestamp: -1 });
LocationTrackingSchema.index({ deviceId: 1, timestamp: -1 });
LocationTrackingSchema.index({ vehicleId: 1, isActive: 1, timestamp: -1 });
// Pre-save middleware to calculate derived fields
LocationTrackingSchema.pre('save', function (next) {
    // Calculate load percentage
    if (this.passengerLoad.maxCapacity > 0) {
        this.passengerLoad.loadPercentage = Math.round((this.passengerLoad.currentCapacity / this.passengerLoad.maxCapacity) * 100);
    }
    // Update timestamp if not provided
    if (!this.timestamp) {
        this.timestamp = new Date();
    }
    next();
});
// Method to check if vehicle is delayed
LocationTrackingSchema.methods.isDelayed = function (thresholdMinutes = 5) {
    return this.operationalInfo.delays.currentDelay >= thresholdMinutes;
};
// Method to get estimated arrival time
LocationTrackingSchema.methods.getEstimatedArrival = function () {
    const baseETA = new Date(this.operationalInfo.tripInfo.estimatedArrival);
    const delayMs = this.operationalInfo.delays.currentDelay * 60 * 1000;
    return new Date(baseETA.getTime() + delayMs);
};
// Method to check if vehicle is near capacity
LocationTrackingSchema.methods.isNearCapacity = function (threshold = 80) {
    return this.passengerLoad.loadPercentage >= threshold;
};
// Static method to get real-time locations for a route
LocationTrackingSchema.statics.getRouteVehicles = async function (routeId) {
    return this.find({
        routeId,
        isActive: true,
        timestamp: {
            $gte: new Date(Date.now() - 5 * 60 * 1000) // Last 5 minutes
        }
    })
        .sort({ timestamp: -1 })
        .populate('deviceId', 'deviceId vehicleNumber status')
        .populate('routeId', 'name startLocation endLocation');
};
// Static method to get latest location for a vehicle
LocationTrackingSchema.statics.getLatestLocation = async function (vehicleId) {
    return this.findOne({
        vehicleId,
        isActive: true
    })
        .sort({ timestamp: -1 })
        .populate('routeId', 'name startLocation endLocation waypoints');
};
// Static method to get vehicles by area
LocationTrackingSchema.statics.getVehiclesByArea = async function (bounds) {
    return this.find({
        isActive: true,
        timestamp: {
            $gte: new Date(Date.now() - 5 * 60 * 1000) // Last 5 minutes
        },
        'location.latitude': {
            $gte: bounds.southWest.lat,
            $lte: bounds.northEast.lat
        },
        'location.longitude': {
            $gte: bounds.southWest.lng,
            $lte: bounds.northEast.lng
        }
    })
        .sort({ timestamp: -1 })
        .populate('routeId', 'name startLocation endLocation');
};
// Static method to get tracking statistics
LocationTrackingSchema.statics.getTrackingStats = async function () {
    const stats = await this.aggregate([
        {
            $match: {
                isActive: true,
                timestamp: {
                    $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
                }
            }
        },
        {
            $group: {
                _id: '$operationalInfo.status',
                count: { $sum: 1 },
                avgSpeed: { $avg: '$location.speed' },
                avgDelay: { $avg: '$operationalInfo.delays.currentDelay' },
                avgLoad: { $avg: '$passengerLoad.loadPercentage' }
            }
        }
    ]);
    return stats;
};
const LocationTracking = mongoose_1.default.model('LocationTracking', LocationTrackingSchema);
exports.default = LocationTracking;
