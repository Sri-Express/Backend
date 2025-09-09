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
// src/models/SlotAssignment.ts - Vehicle to Slot Assignment Model
const mongoose_1 = __importStar(require("mongoose"));
const SlotAssignmentSchema = new mongoose_1.Schema({
    slotId: {
        type: mongoose_1.default.Schema.Types.ObjectId,
        ref: 'RouteSlot',
        required: true
    },
    vehicleId: {
        type: mongoose_1.default.Schema.Types.ObjectId,
        ref: 'Device', // Vehicles are tracked as devices
        required: true
    },
    fleetId: {
        type: mongoose_1.default.Schema.Types.ObjectId,
        ref: 'Fleet',
        required: true
    },
    routeId: {
        type: mongoose_1.default.Schema.Types.ObjectId,
        ref: 'Route',
        required: true
    },
    assignedBy: {
        type: mongoose_1.default.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected', 'active', 'inactive'],
        default: 'pending'
    },
    assignedAt: {
        type: Date,
        default: Date.now
    },
    approvedAt: Date,
    approvedBy: {
        type: mongoose_1.default.Schema.Types.ObjectId,
        ref: 'User'
    },
    rejectedAt: Date,
    rejectedBy: {
        type: mongoose_1.default.Schema.Types.ObjectId,
        ref: 'User'
    },
    rejectionReason: String,
    startDate: {
        type: Date,
        default: Date.now
    },
    endDate: Date,
    priority: {
        type: Number,
        default: 1,
        min: 1,
        max: 10
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
        onTimePerformance: {
            type: Number,
            default: 0,
            min: 0,
            max: 100
        }
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});
// Indexes for performance
SlotAssignmentSchema.index({ slotId: 1, status: 1 });
SlotAssignmentSchema.index({ vehicleId: 1, status: 1 });
SlotAssignmentSchema.index({ fleetId: 1, status: 1 });
SlotAssignmentSchema.index({ routeId: 1, status: 1 });
SlotAssignmentSchema.index({ assignedBy: 1, status: 1 });
SlotAssignmentSchema.index({ startDate: 1, endDate: 1 });
SlotAssignmentSchema.index({ status: 1, isActive: 1 });
// Prevent duplicate active assignments for same vehicle/slot
SlotAssignmentSchema.index({ vehicleId: 1, slotId: 1, status: 1 }, {
    unique: true,
    partialFilterExpression: {
        status: { $in: ['approved', 'active'] },
        isActive: true
    }
});
// Instance methods
SlotAssignmentSchema.methods.approve = async function (approvedBy) {
    this.status = 'approved';
    this.approvedAt = new Date();
    this.approvedBy = approvedBy;
    this.rejectedAt = undefined;
    this.rejectedBy = undefined;
    this.rejectionReason = undefined;
    return await this.save();
};
SlotAssignmentSchema.methods.reject = async function (rejectedBy, reason) {
    this.status = 'rejected';
    this.rejectedAt = new Date();
    this.rejectedBy = rejectedBy;
    this.rejectionReason = reason;
    this.approvedAt = undefined;
    this.approvedBy = undefined;
    return await this.save();
};
SlotAssignmentSchema.methods.activate = async function () {
    this.status = 'active';
    return await this.save();
};
SlotAssignmentSchema.methods.deactivate = async function () {
    this.status = 'inactive';
    return await this.save();
};
// Static methods
SlotAssignmentSchema.statics.getPendingAssignments = function (routeId) {
    const query = {
        status: 'pending',
        isActive: true
    };
    if (routeId) {
        query.routeId = routeId;
    }
    return this.find(query)
        .populate('slotId')
        .populate('vehicleId', 'vehicleNumber vehicleType status')
        .populate('fleetId', 'companyName phone')
        .populate('assignedBy', 'name email')
        .sort({ assignedAt: -1 });
};
SlotAssignmentSchema.statics.getApprovedAssignments = function (routeId) {
    const query = {
        status: { $in: ['approved', 'active'] },
        isActive: true
    };
    if (routeId) {
        query.routeId = routeId;
    }
    return this.find(query)
        .populate('slotId')
        .populate('vehicleId', 'vehicleNumber vehicleType status')
        .populate('fleetId', 'companyName phone')
        .sort({ 'slotId.departureTime': 1 });
};
SlotAssignmentSchema.statics.getAssignmentsBySlot = function (slotId) {
    return this.find({
        slotId,
        status: { $in: ['approved', 'active'] },
        isActive: true
    })
        .populate('vehicleId', 'vehicleNumber vehicleType status')
        .populate('fleetId', 'companyName phone')
        .sort({ priority: 1, assignedAt: -1 });
};
const SlotAssignment = mongoose_1.default.model('SlotAssignment', SlotAssignmentSchema);
exports.default = SlotAssignment;
