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
// src/models/Vehicle.ts
const mongoose_1 = __importStar(require("mongoose"));
const VehicleSchema = new mongoose_1.Schema({
    fleetId: {
        type: mongoose_1.default.Schema.Types.ObjectId,
        ref: 'Fleet',
        required: [true, 'Fleet ID is required']
    },
    deviceId: {
        type: String,
        unique: true,
        required: [true, 'Device ID is required'],
        trim: true
    },
    vehicleNumber: {
        type: String,
        required: [true, 'Vehicle number is required'],
        trim: true,
        uppercase: true
    },
    vehicleType: {
        type: String,
        enum: {
            values: ['bus', 'van', 'minibus', 'train'],
            message: 'Vehicle type must be one of: bus, van, minibus, train'
        },
        required: [true, 'Vehicle type is required']
    },
    approvalStatus: {
        type: String,
        enum: {
            values: ['pending', 'approved', 'rejected'],
            message: 'Approval status must be one of: pending, approved, rejected'
        },
        default: 'pending'
    },
    status: {
        type: String,
        enum: {
            values: ['online', 'offline', 'maintenance'],
            message: 'Status must be one of: online, offline, maintenance'
        },
        default: 'offline'
    },
    firmwareVersion: {
        type: String,
        required: [true, 'Firmware version is required'],
        trim: true
    },
    installDate: {
        type: Date,
        required: [true, 'Install date is required']
    },
    registrationDate: {
        type: Date,
        default: Date.now
    },
    approvalDate: {
        type: Date
    },
    rejectionDate: {
        type: Date
    },
    approvedBy: {
        type: mongoose_1.default.Schema.Types.ObjectId,
        ref: 'User'
    },
    rejectedBy: {
        type: mongoose_1.default.Schema.Types.ObjectId,
        ref: 'User'
    },
    rejectionReason: {
        type: String,
        trim: true,
        maxlength: [300, 'Rejection reason cannot exceed 300 characters']
    },
    location: {
        latitude: {
            type: Number,
            default: 0,
            min: [-90, 'Latitude must be between -90 and 90'],
            max: [90, 'Latitude must be between -90 and 90']
        },
        longitude: {
            type: Number,
            default: 0,
            min: [-180, 'Longitude must be between -180 and 180'],
            max: [180, 'Longitude must be between -180 and 180']
        },
        address: {
            type: String,
            default: 'Location unknown',
            trim: true
        },
        lastUpdated: {
            type: Date,
            default: Date.now
        }
    },
    batteryLevel: {
        type: Number,
        default: 100,
        min: [0, 'Battery level cannot be negative'],
        max: [100, 'Battery level cannot exceed 100']
    },
    signalStrength: {
        type: Number,
        default: 5,
        min: [0, 'Signal strength must be between 0 and 5'],
        max: [5, 'Signal strength must be between 0 and 5']
    },
    lastSeen: {
        type: Date,
        default: Date.now
    },
    alerts: {
        count: {
            type: Number,
            default: 0,
            min: [0, 'Alert count cannot be negative']
        },
        messages: [{
                type: String,
                trim: true
            }]
    },
    assignedRoutes: [{
            type: String,
            trim: true
        }],
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});
// Indexes for better query performance
VehicleSchema.index({ fleetId: 1 });
VehicleSchema.index({ deviceId: 1 });
VehicleSchema.index({ vehicleNumber: 1 });
VehicleSchema.index({ approvalStatus: 1 });
VehicleSchema.index({ status: 1 });
VehicleSchema.index({ registrationDate: 1 });
// Compound indexes
VehicleSchema.index({ fleetId: 1, approvalStatus: 1 });
VehicleSchema.index({ approvalStatus: 1, registrationDate: 1 });
// Virtual for vehicle age in days
VehicleSchema.virtual('vehicleAge').get(function () {
    const diffTime = Math.abs(new Date().getTime() - this.registrationDate.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});
// Virtual for last seen formatted
VehicleSchema.virtual('lastSeenFormatted').get(function () {
    const now = new Date();
    const diffMs = now.getTime() - this.lastSeen.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1)
        return 'Just now';
    if (diffMins < 60)
        return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24)
        return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
});
// Method to approve vehicle
VehicleSchema.methods.approve = function (approvedBy, notes) {
    this.approvalStatus = 'approved';
    this.approvalDate = new Date();
    this.approvedBy = approvedBy;
    this.rejectionDate = undefined;
    this.rejectionReason = undefined;
    return this.save();
};
// Method to reject vehicle
VehicleSchema.methods.reject = function (rejectedBy, reason) {
    this.approvalStatus = 'rejected';
    this.rejectionDate = new Date();
    this.rejectedBy = rejectedBy;
    this.rejectionReason = reason;
    this.approvalDate = undefined;
    return this.save();
};
// Pre-save middleware to generate device ID if not provided
VehicleSchema.pre('save', function (next) {
    if (!this.deviceId) {
        this.deviceId = `DEV_${this.vehicleNumber}_${Date.now()}`;
    }
    next();
});
// Pre-save middleware to validate business rules
VehicleSchema.pre('save', function (next) {
    if (this.approvalStatus === 'rejected' && !this.rejectionReason) {
        return next(new Error('Rejection reason is required for rejected vehicles'));
    }
    // Only approved vehicles can be assigned to routes
    if (this.approvalStatus !== 'approved' && this.assignedRoutes.length > 0) {
        return next(new Error('Only approved vehicles can be assigned to routes'));
    }
    next();
});
// Static method to get vehicle statistics
VehicleSchema.statics.getStats = async function (fleetId) {
    const matchQuery = fleetId ? { fleetId: new mongoose_1.default.Types.ObjectId(fleetId), isActive: true } : { isActive: true };
    const stats = await this.aggregate([
        { $match: matchQuery },
        {
            $group: {
                _id: '$approvalStatus',
                count: { $sum: 1 },
                onlineCount: {
                    $sum: { $cond: [{ $eq: ['$status', 'online'] }, 1, 0] }
                },
                offlineCount: {
                    $sum: { $cond: [{ $eq: ['$status', 'offline'] }, 1, 0] }
                },
                maintenanceCount: {
                    $sum: { $cond: [{ $eq: ['$status', 'maintenance'] }, 1, 0] }
                }
            }
        }
    ]);
    return stats;
};
// Static method to get pending vehicles for admin approval
VehicleSchema.statics.getPendingVehicles = async function () {
    return this.find({
        approvalStatus: 'pending',
        isActive: true
    })
        .populate('fleetId', 'companyName registrationNumber contactPerson email')
        .populate('approvedBy rejectedBy', 'name email')
        .sort({ registrationDate: 1 });
};
// Static method to get approved vehicles for fleet
VehicleSchema.statics.getApprovedByFleet = async function (fleetId) {
    return this.find({
        fleetId: new mongoose_1.default.Types.ObjectId(fleetId),
        approvalStatus: 'approved',
        isActive: true
    }).sort({ vehicleNumber: 1 });
};
const Vehicle = mongoose_1.default.model('Vehicle', VehicleSchema);
exports.default = Vehicle;
