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
// src/models/Route.ts - Updated with Route Admin Assignment Support
const mongoose_1 = __importStar(require("mongoose"));
const RouteSchema = new mongoose_1.Schema({
    routeId: {
        type: String,
        required: false, // Remove required since it's auto-generated
        unique: true,
        default: function () {
            return `RT${Date.now()}${Math.floor(Math.random() * 1000)}`;
        }
    },
    name: {
        type: String,
        required: true,
    },
    startLocation: {
        name: { type: String, required: true },
        coordinates: {
            type: [Number],
            required: true,
            validate: {
                validator: function (v) {
                    return v.length === 2;
                },
                message: 'Coordinates must be [longitude, latitude]'
            }
        },
        address: { type: String, required: true }
    },
    endLocation: {
        name: { type: String, required: true },
        coordinates: {
            type: [Number],
            required: true,
            validate: {
                validator: function (v) {
                    return v.length === 2;
                },
                message: 'Coordinates must be [longitude, latitude]'
            }
        },
        address: { type: String, required: true }
    },
    waypoints: [{
            name: { type: String, required: true },
            coordinates: {
                type: [Number],
                required: true,
                validate: {
                    validator: function (v) {
                        return v.length === 2;
                    },
                    message: 'Coordinates must be [longitude, latitude]'
                }
            },
            estimatedTime: { type: Number, required: true },
            order: { type: Number, required: true }
        }],
    distance: {
        type: Number,
        required: true,
        min: 0
    },
    estimatedDuration: {
        type: Number,
        required: true,
        min: 0
    },
    schedules: [{
            departureTime: { type: String, required: true },
            arrivalTime: { type: String, required: true },
            frequency: { type: Number, required: true, min: 5 },
            daysOfWeek: {
                type: [String],
                required: true,
                enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
            },
            isActive: { type: Boolean, default: true }
        }],
    operatorInfo: {
        fleetId: {
            type: mongoose_1.default.Schema.Types.ObjectId,
            ref: 'Fleet',
            required: true
        },
        companyName: { type: String, required: true },
        contactNumber: { type: String, required: true }
    },
    vehicleInfo: {
        type: {
            type: String,
            enum: ['bus', 'train'],
            required: true
        },
        capacity: {
            type: Number,
            required: true,
            min: 1
        },
        amenities: {
            type: [String],
            default: []
        }
    },
    pricing: {
        basePrice: {
            type: Number,
            required: true,
            min: 0
        },
        pricePerKm: {
            type: Number,
            required: true,
            min: 0
        },
        discounts: [{
                type: {
                    type: String,
                    enum: ['student', 'senior', 'military'],
                    required: true
                },
                percentage: {
                    type: Number,
                    required: true,
                    min: 0,
                    max: 100
                }
            }]
    },
    // Approval Workflow Fields
    approvalStatus: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending'
    },
    submittedAt: {
        type: Date,
        default: Date.now
    },
    reviewedAt: {
        type: Date
    },
    reviewedBy: {
        type: mongoose_1.default.Schema.Types.ObjectId,
        ref: 'User'
    },
    rejectionReason: {
        type: String
    },
    adminNotes: {
        type: String
    },
    // NEW: Route Admin Assignment Fields
    routeAdminId: {
        type: mongoose_1.default.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    routeAdminAssignment: {
        assignedAt: {
            type: Date
        },
        assignedBy: {
            type: mongoose_1.default.Schema.Types.ObjectId,
            ref: 'User'
        },
        status: {
            type: String,
            enum: ['assigned', 'unassigned'],
            default: 'unassigned'
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
        }
    },
    // Operational Status
    status: {
        type: String,
        enum: ['active', 'inactive', 'maintenance'],
        default: 'active'
    },
    avgRating: {
        type: Number,
        default: 0,
        min: 0,
        max: 5
    },
    totalReviews: {
        type: Number,
        default: 0,
        min: 0
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true,
});
// Indexes
RouteSchema.index({ routeId: 1 });
RouteSchema.index({ approvalStatus: 1 });
RouteSchema.index({ 'operatorInfo.fleetId': 1 });
RouteSchema.index({ status: 1 });
RouteSchema.index({ isActive: 1 });
RouteSchema.index({ submittedAt: -1 });
RouteSchema.index({ 'startLocation.name': 1 });
RouteSchema.index({ 'endLocation.name': 1 });
// NEW: Route Admin indexes
RouteSchema.index({ routeAdminId: 1 });
RouteSchema.index({ routeAdminId: 1, approvalStatus: 1 });
RouteSchema.index({ 'routeAdminAssignment.status': 1 });
// Calculate price method
RouteSchema.methods.calculatePrice = function (passengerType = 'regular') {
    let totalPrice = this.pricing.basePrice + (this.distance * this.pricing.pricePerKm);
    const discount = this.pricing.discounts.find((d) => d.type === passengerType);
    if (discount) {
        totalPrice = totalPrice * (1 - discount.percentage / 100);
    }
    return Math.round(totalPrice);
};
// Get next departures method
RouteSchema.methods.getNextDepartures = function (limit = 5) {
    const now = new Date();
    const currentDay = now.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
    const currentTime = now.toTimeString().slice(0, 5);
    return this.schedules
        .filter((schedule) => schedule.isActive &&
        schedule.daysOfWeek.includes(currentDay) &&
        schedule.departureTime > currentTime)
        .slice(0, limit);
};
// Approval workflow methods
RouteSchema.methods.approve = async function (adminId, notes) {
    this.approvalStatus = 'approved';
    this.reviewedAt = new Date();
    this.reviewedBy = adminId;
    this.rejectionReason = undefined;
    if (notes)
        this.adminNotes = notes;
    return await this.save();
};
RouteSchema.methods.reject = async function (adminId, reason) {
    this.approvalStatus = 'rejected';
    this.reviewedAt = new Date();
    this.reviewedBy = adminId;
    this.rejectionReason = reason;
    this.status = 'inactive'; // Rejected routes are inactive
    return await this.save();
};
RouteSchema.methods.resubmit = async function () {
    this.approvalStatus = 'pending';
    this.submittedAt = new Date();
    this.reviewedAt = undefined;
    this.reviewedBy = undefined;
    this.rejectionReason = undefined;
    this.status = 'active'; // Reset to active when resubmitting
    return await this.save();
};
// NEW: Route Admin Assignment Methods
RouteSchema.methods.assignRouteAdmin = async function (adminId, assignedBy) {
    var _a;
    // Check if route is approved
    if (this.approvalStatus !== 'approved') {
        throw new Error('Only approved routes can have route admins assigned');
    }
    // Check if route admin is already assigned
    if (this.routeAdminId && this.routeAdminId !== null && ((_a = this.routeAdminAssignment) === null || _a === void 0 ? void 0 : _a.status) === 'assigned') {
        throw new Error('Route already has a route admin assigned');
    }
    this.routeAdminId = adminId;
    this.routeAdminAssignment = {
        assignedAt: new Date(),
        assignedBy: assignedBy,
        status: 'assigned'
    };
    return await this.save();
};
RouteSchema.methods.unassignRouteAdmin = async function (unassignedBy, reason) {
    var _a;
    if (!this.routeAdminId || this.routeAdminId === null || ((_a = this.routeAdminAssignment) === null || _a === void 0 ? void 0 : _a.status) !== 'assigned') {
        throw new Error('No route admin is currently assigned to this route');
    }
    // Update assignment record
    if (this.routeAdminAssignment) {
        this.routeAdminAssignment.status = 'unassigned';
        this.routeAdminAssignment.unassignedAt = new Date();
        this.routeAdminAssignment.unassignedBy = unassignedBy;
        if (reason)
            this.routeAdminAssignment.unassignReason = reason;
    }
    // Clear route admin ID - set to null instead of undefined for better MongoDB querying
    this.routeAdminId = null;
    return await this.save();
};
RouteSchema.methods.hasRouteAdmin = function () {
    var _a;
    return !!(this.routeAdminId && this.routeAdminId !== null && ((_a = this.routeAdminAssignment) === null || _a === void 0 ? void 0 : _a.status) === 'assigned');
};
// Static methods for route admin queries
RouteSchema.statics.findByRouteAdmin = function (routeAdminId) {
    return this.findOne({
        routeAdminId: routeAdminId,
        'routeAdminAssignment.status': 'assigned',
        approvalStatus: 'approved',
        isActive: true
    });
};
RouteSchema.statics.findUnassignedRoutes = function () {
    return this.find({
        $or: [
            { routeAdminId: { $exists: false } },
            { routeAdminId: null },
            { 'routeAdminAssignment.status': 'unassigned' }
        ],
        approvalStatus: 'approved',
        isActive: true
    });
};
RouteSchema.statics.getRouteAdminStats = async function () {
    const stats = await this.aggregate([
        { $match: { approvalStatus: 'approved', isActive: true } },
        {
            $group: {
                _id: null,
                totalRoutes: { $sum: 1 },
                assignedRoutes: {
                    $sum: {
                        $cond: [
                            {
                                $and: [
                                    { $ne: ['$routeAdminId', null] },
                                    { $eq: ['$routeAdminAssignment.status', 'assigned'] }
                                ]
                            },
                            1,
                            0
                        ]
                    }
                },
                unassignedRoutes: {
                    $sum: {
                        $cond: [
                            {
                                $or: [
                                    { $eq: ['$routeAdminId', null] },
                                    { $eq: ['$routeAdminAssignment.status', 'unassigned'] }
                                ]
                            },
                            1,
                            0
                        ]
                    }
                }
            }
        }
    ]);
    return stats[0] || { totalRoutes: 0, assignedRoutes: 0, unassignedRoutes: 0 };
};
const Route = mongoose_1.default.model('Route', RouteSchema);
exports.default = Route;
