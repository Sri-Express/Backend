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
// src/models/RouteAssignment.ts - Vehicle to Route Assignment Model
const mongoose_1 = __importStar(require("mongoose"));
const RouteAssignmentSchema = new mongoose_1.Schema({
    fleetId: {
        type: mongoose_1.default.Schema.Types.ObjectId,
        ref: 'Fleet',
        required: true
    },
    vehicleId: {
        type: mongoose_1.default.Schema.Types.ObjectId,
        ref: 'Device', // Assuming vehicles are tracked as devices
        required: true
    },
    routeId: {
        type: mongoose_1.default.Schema.Types.ObjectId,
        ref: 'Route',
        required: true
    },
    assignedAt: {
        type: Date,
        default: Date.now
    },
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected', 'active', 'inactive', 'suspended'],
        default: 'pending'
    },
    assignedBy: {
        type: mongoose_1.default.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    approvedAt: {
        type: Date
    },
    approvedBy: {
        type: mongoose_1.default.Schema.Types.ObjectId,
        ref: 'User'
    },
    rejectedAt: {
        type: Date
    },
    rejectedBy: {
        type: mongoose_1.default.Schema.Types.ObjectId,
        ref: 'User'
    },
    rejectionReason: {
        type: String
    },
    unassignedAt: {
        type: Date
    },
    unassignedBy: {
        type: mongoose_1.default.Schema.Types.ObjectId,
        ref: 'User'
    },
    unassignReason: {
        type: String
    },
    performance: {
        totalTrips: {
            type: Number,
            default: 0
        },
        completedTrips: {
            type: Number,
            default: 0
        },
        avgRating: {
            type: Number,
            default: 0,
            min: 0,
            max: 5
        },
        totalRevenue: {
            type: Number,
            default: 0,
            min: 0
        }
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true,
});
// Indexes for performance
RouteAssignmentSchema.index({ fleetId: 1, status: 1 });
RouteAssignmentSchema.index({ vehicleId: 1, status: 1 });
RouteAssignmentSchema.index({ routeId: 1, status: 1 });
RouteAssignmentSchema.index({ fleetId: 1, routeId: 1 });
RouteAssignmentSchema.index({ status: 1, isActive: 1 });
RouteAssignmentSchema.index({ assignedAt: -1 });
// Compound index to prevent duplicate active assignments
RouteAssignmentSchema.index({ vehicleId: 1, routeId: 1, status: 1 }, {
    unique: true,
    partialFilterExpression: { status: 'active' }
});
// Methods
RouteAssignmentSchema.methods.approve = async function (adminId) {
    this.status = 'approved';
    this.approvedAt = new Date();
    this.approvedBy = adminId;
    this.rejectedAt = undefined;
    this.rejectedBy = undefined;
    this.rejectionReason = undefined;
    return await this.save();
};
RouteAssignmentSchema.methods.reject = async function (adminId, reason) {
    this.status = 'rejected';
    this.rejectedAt = new Date();
    this.rejectedBy = adminId;
    this.rejectionReason = reason;
    this.approvedAt = undefined;
    this.approvedBy = undefined;
    return await this.save();
};
RouteAssignmentSchema.methods.suspend = async function (adminId, reason) {
    this.status = 'suspended';
    this.unassignedBy = adminId;
    this.unassignReason = reason;
    this.updatedAt = new Date();
    return await this.save();
};
RouteAssignmentSchema.methods.reactivate = async function (adminId) {
    this.status = 'approved'; // Changed from 'active' to 'approved'
    this.unassignedBy = undefined;
    this.unassignReason = undefined;
    this.updatedAt = new Date();
    return await this.save();
};
RouteAssignmentSchema.methods.unassign = async function (userId, reason) {
    this.status = 'inactive';
    this.unassignedAt = new Date();
    this.unassignedBy = userId;
    if (reason)
        this.unassignReason = reason;
    return await this.save();
};
// Static methods
RouteAssignmentSchema.statics.getActiveAssignmentsByFleet = function (fleetId) {
    return this.find({
        fleetId,
        status: { $in: ['approved', 'active'] },
        isActive: true
    })
        .populate('vehicleId', 'vehicleNumber vehicleType status')
        .populate('routeId', 'name routeId startLocation endLocation distance')
        .sort({ assignedAt: -1 });
};
RouteAssignmentSchema.statics.getAssignmentsByRoute = function (routeId) {
    return this.find({
        routeId,
        status: { $in: ['pending', 'approved', 'active'] },
        isActive: true
    })
        .populate('vehicleId', 'vehicleNumber vehicleType status')
        .populate('fleetId', 'companyName phone')
        .populate('assignedBy', 'name email')
        .populate('approvedBy', 'name email')
        .sort({ assignedAt: -1 });
};
RouteAssignmentSchema.statics.getVehicleAssignments = function (vehicleId) {
    return this.find({
        vehicleId,
        status: { $in: ['approved', 'active'] },
        isActive: true
    })
        .populate('routeId', 'name routeId startLocation endLocation distance pricing')
        .sort({ assignedAt: -1 });
};
RouteAssignmentSchema.statics.getPendingAssignments = function (routeId) {
    const query = {
        status: 'pending',
        isActive: true
    };
    if (routeId) {
        query.routeId = routeId;
    }
    return this.find(query)
        .populate('vehicleId', 'vehicleNumber vehicleType status')
        .populate('fleetId', 'companyName phone')
        .populate('assignedBy', 'name email')
        .sort({ assignedAt: -1 });
};
const RouteAssignment = mongoose_1.default.model('RouteAssignment', RouteAssignmentSchema);
exports.default = RouteAssignment;
