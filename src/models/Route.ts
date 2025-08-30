// src/models/Route.ts - Updated with Route Admin Assignment Support
import mongoose, { Document, Schema } from 'mongoose';

export interface IRoute extends Document {
  routeId: string;
  name: string;
  startLocation: {
    name: string;
    coordinates: [number, number];
    address: string;
  };
  endLocation: {
    name: string;
    coordinates: [number, number];
    address: string;
  };
  waypoints: [{
    name: string;
    coordinates: [number, number];
    estimatedTime: number; // minutes from start
    order: number;
  }];
  distance: number; // kilometers
  estimatedDuration: number; // minutes
  schedules: [{
    departureTime: string; // "08:30"
    arrivalTime: string;   // "12:15"
    frequency: number;     // minutes between departures
    daysOfWeek: string[];  // ["monday", "tuesday", ...]
    isActive: boolean;
    toObject(): any;
  }];
  operatorInfo: {
    fleetId: mongoose.Types.ObjectId;
    companyName: string;
    contactNumber: string;
  };
  vehicleInfo: {
    type: 'bus' | 'train';
    capacity: number;
    amenities: string[];
  };
  pricing: {
    basePrice: number;
    pricePerKm: number;
    discounts: [{
      type: 'student' | 'senior' | 'military';
      percentage: number;
    }];
  };
  
  // Approval Workflow Fields
  approvalStatus: 'pending' | 'approved' | 'rejected';
  submittedAt: Date;
  reviewedAt?: Date;
  reviewedBy?: mongoose.Types.ObjectId;
  rejectionReason?: string;
  adminNotes?: string;

  // NEW: Route Admin Assignment Fields
  routeAdminId?: mongoose.Types.ObjectId;
  routeAdminAssignment?: {
    assignedAt: Date;
    assignedBy: mongoose.Types.ObjectId;
    status: 'assigned' | 'unassigned';
    unassignedAt?: Date;
    unassignedBy?: mongoose.Types.ObjectId;
    unassignReason?: string;
  };
  
  // Operational Status (separate from approval)
  status: 'active' | 'inactive' | 'maintenance';
  avgRating: number;
  totalReviews: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  
  // Methods
  calculatePrice(passengerType?: string): number;
  getNextDepartures(limit?: number): any[];
  approve(adminId: mongoose.Types.ObjectId, notes?: string): Promise<IRoute>;
  reject(adminId: mongoose.Types.ObjectId, reason: string): Promise<IRoute>;
  resubmit(): Promise<IRoute>;
  
  // NEW: Route Admin Assignment Methods
  assignRouteAdmin(adminId: mongoose.Types.ObjectId, assignedBy: mongoose.Types.ObjectId): Promise<IRoute>;
  unassignRouteAdmin(unassignedBy: mongoose.Types.ObjectId, reason?: string): Promise<IRoute>;
  hasRouteAdmin(): boolean;
}

const RouteSchema = new Schema<IRoute>(
  {
    routeId: {
      type: String,
      required: false,  // Remove required since it's auto-generated
      unique: true,
      default: function() {
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
          validator: function(v: number[]) {
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
          validator: function(v: number[]) {
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
          validator: function(v: number[]) {
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
        type: mongoose.Schema.Types.ObjectId,
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
      type: mongoose.Schema.Types.ObjectId,
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
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    routeAdminAssignment: {
      assignedAt: {
        type: Date
      },
      assignedBy: {
        type: mongoose.Schema.Types.ObjectId,
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
        type: mongoose.Schema.Types.ObjectId,
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
  },
  {
    timestamps: true,
  }
);

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
RouteSchema.methods.calculatePrice = function(passengerType: string = 'regular') {
  let totalPrice = this.pricing.basePrice + (this.distance * this.pricing.pricePerKm);
  
  const discount = this.pricing.discounts.find((d: any) => d.type === passengerType);
  if (discount) {
    totalPrice = totalPrice * (1 - discount.percentage / 100);
  }
  
  return Math.round(totalPrice);
};

// Get next departures method
RouteSchema.methods.getNextDepartures = function(limit: number = 5) {
  const now = new Date();
  const currentDay = now.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
  const currentTime = now.toTimeString().slice(0, 5);
  
  return this.schedules
    .filter((schedule: any) => 
      schedule.isActive && 
      schedule.daysOfWeek.includes(currentDay) &&
      schedule.departureTime > currentTime
    )
    .slice(0, limit);
};

// Approval workflow methods
RouteSchema.methods.approve = async function(adminId: mongoose.Types.ObjectId, notes?: string) {
  this.approvalStatus = 'approved';
  this.reviewedAt = new Date();
  this.reviewedBy = adminId;
  this.rejectionReason = undefined;
  if (notes) this.adminNotes = notes;
  return await this.save();
};

RouteSchema.methods.reject = async function(adminId: mongoose.Types.ObjectId, reason: string) {
  this.approvalStatus = 'rejected';
  this.reviewedAt = new Date();
  this.reviewedBy = adminId;
  this.rejectionReason = reason;
  this.status = 'inactive'; // Rejected routes are inactive
  return await this.save();
};

RouteSchema.methods.resubmit = async function() {
  this.approvalStatus = 'pending';
  this.submittedAt = new Date();
  this.reviewedAt = undefined;
  this.reviewedBy = undefined;
  this.rejectionReason = undefined;
  this.status = 'active'; // Reset to active when resubmitting
  return await this.save();
};

// NEW: Route Admin Assignment Methods
RouteSchema.methods.assignRouteAdmin = async function(adminId: mongoose.Types.ObjectId, assignedBy: mongoose.Types.ObjectId) {
  // Check if route is approved
  if (this.approvalStatus !== 'approved') {
    throw new Error('Only approved routes can have route admins assigned');
  }

  // Check if route admin is already assigned
  if (this.routeAdminId && this.routeAdminAssignment?.status === 'assigned') {
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

RouteSchema.methods.unassignRouteAdmin = async function(unassignedBy: mongoose.Types.ObjectId, reason?: string) {
  if (!this.routeAdminId || this.routeAdminAssignment?.status !== 'assigned') {
    throw new Error('No route admin is currently assigned to this route');
  }

  // Update assignment record
  if (this.routeAdminAssignment) {
    this.routeAdminAssignment.status = 'unassigned';
    this.routeAdminAssignment.unassignedAt = new Date();
    this.routeAdminAssignment.unassignedBy = unassignedBy;
    if (reason) this.routeAdminAssignment.unassignReason = reason;
  }

  // Clear route admin ID
  this.routeAdminId = undefined;

  return await this.save();
};

RouteSchema.methods.hasRouteAdmin = function() {
  return !!(this.routeAdminId && this.routeAdminAssignment?.status === 'assigned');
};

// Static methods for route admin queries
RouteSchema.statics.findByRouteAdmin = function(routeAdminId: mongoose.Types.ObjectId) {
  return this.findOne({
    routeAdminId: routeAdminId,
    'routeAdminAssignment.status': 'assigned',
    approvalStatus: 'approved',
    isActive: true
  });
};

RouteSchema.statics.findUnassignedRoutes = function() {
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

RouteSchema.statics.getRouteAdminStats = async function() {
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

const Route = mongoose.model<IRoute>('Route', RouteSchema);

export default Route;