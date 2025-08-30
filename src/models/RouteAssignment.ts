// src/models/RouteAssignment.ts - Vehicle to Route Assignment Model
import mongoose, { Document, Schema } from 'mongoose';

export interface IRouteAssignment extends Document {
  fleetId: mongoose.Types.ObjectId;
  vehicleId: mongoose.Types.ObjectId;
  routeId: mongoose.Types.ObjectId;
  assignedAt: Date;
  status: 'active' | 'inactive' | 'suspended';
  assignedBy: mongoose.Types.ObjectId;
  unassignedAt?: Date;
  unassignedBy?: mongoose.Types.ObjectId;
  unassignReason?: string;
  // Fixed: Changed from tuple to array type
  schedules?: {
    startTime: string;
    endTime: string;
    daysOfWeek: string[];
    isActive: boolean;
  }[];
  performance: {
    totalTrips: number;
    completedTrips: number;
    avgRating: number;
    totalRevenue: number;
  };
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  suspend(adminId: mongoose.Types.ObjectId, reason: string): Promise<IRouteAssignment>;
  reactivate(adminId: mongoose.Types.ObjectId): Promise<IRouteAssignment>;
  unassign(userId: mongoose.Types.ObjectId, reason?: string): Promise<IRouteAssignment>;
}

const RouteAssignmentSchema = new Schema<IRouteAssignment>(
  {
    fleetId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Fleet',
      required: true
    },
    vehicleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Device', // Assuming vehicles are tracked as devices
      required: true
    },
    routeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Route',
      required: true
    },
    assignedAt: {
      type: Date,
      default: Date.now
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'suspended'],
      default: 'active'
    },
    assignedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
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
    },
    // Fixed: Changed from tuple syntax to proper array schema
    schedules: [{
      startTime: { 
        type: String,
        required: true
      },
      endTime: { 
        type: String,
        required: true
      },
      daysOfWeek: {
        type: [String],
        enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
        required: true
      },
      isActive: { 
        type: Boolean, 
        default: true 
      }
    }],
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
  },
  {
    timestamps: true,
  }
);

// Indexes for performance
RouteAssignmentSchema.index({ fleetId: 1, status: 1 });
RouteAssignmentSchema.index({ vehicleId: 1, status: 1 });
RouteAssignmentSchema.index({ routeId: 1, status: 1 });
RouteAssignmentSchema.index({ fleetId: 1, routeId: 1 });
RouteAssignmentSchema.index({ status: 1, isActive: 1 });
RouteAssignmentSchema.index({ assignedAt: -1 });

// Compound index to prevent duplicate active assignments
RouteAssignmentSchema.index(
  { vehicleId: 1, routeId: 1, status: 1 }, 
  { 
    unique: true,
    partialFilterExpression: { status: 'active' }
  }
);

// Methods
RouteAssignmentSchema.methods.suspend = async function(adminId: mongoose.Types.ObjectId, reason: string) {
  this.status = 'suspended';
  this.unassignedBy = adminId;
  this.unassignReason = reason;
  this.updatedAt = new Date();
  return await this.save();
};

RouteAssignmentSchema.methods.reactivate = async function(adminId: mongoose.Types.ObjectId) {
  this.status = 'active';
  this.unassignedBy = undefined;
  this.unassignReason = undefined;
  this.updatedAt = new Date();
  return await this.save();
};

RouteAssignmentSchema.methods.unassign = async function(userId: mongoose.Types.ObjectId, reason?: string) {
  this.status = 'inactive';
  this.unassignedAt = new Date();
  this.unassignedBy = userId;
  if (reason) this.unassignReason = reason;
  return await this.save();
};

// Static methods
RouteAssignmentSchema.statics.getActiveAssignmentsByFleet = function(fleetId: mongoose.Types.ObjectId) {
  return this.find({ 
    fleetId, 
    status: 'active', 
    isActive: true 
  })
  .populate('vehicleId', 'vehicleNumber vehicleType status')
  .populate('routeId', 'name routeId startLocation endLocation distance')
  .sort({ assignedAt: -1 });
};

RouteAssignmentSchema.statics.getAssignmentsByRoute = function(routeId: mongoose.Types.ObjectId) {
  return this.find({ 
    routeId, 
    status: 'active', 
    isActive: true 
  })
  .populate('vehicleId', 'vehicleNumber vehicleType status')
  .populate('fleetId', 'companyName phone') // Changed from contactNumber to phone
  .sort({ assignedAt: -1 });
};

RouteAssignmentSchema.statics.getVehicleAssignments = function(vehicleId: mongoose.Types.ObjectId) {
  return this.find({ 
    vehicleId, 
    status: 'active', 
    isActive: true 
  })
  .populate('routeId', 'name routeId startLocation endLocation distance pricing')
  .sort({ assignedAt: -1 });
};

const RouteAssignment = mongoose.model<IRouteAssignment>('RouteAssignment', RouteAssignmentSchema);

export default RouteAssignment;