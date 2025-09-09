// src/models/RouteAssignment.ts - Vehicle to Route Assignment Model
import mongoose, { Document, Schema } from 'mongoose';

export interface IRouteAssignment extends Document {
  fleetId: mongoose.Types.ObjectId;
  vehicleId: mongoose.Types.ObjectId;
  routeId: mongoose.Types.ObjectId;
  assignedAt: Date;
  status: 'pending' | 'approved' | 'rejected' | 'active' | 'inactive' | 'suspended';
  assignedBy: mongoose.Types.ObjectId;
  approvedAt?: Date;
  approvedBy?: mongoose.Types.ObjectId;
  rejectedAt?: Date;
  rejectedBy?: mongoose.Types.ObjectId;
  rejectionReason?: string;
  unassignedAt?: Date;
  unassignedBy?: mongoose.Types.ObjectId;
  unassignReason?: string;
  performance: {
    totalTrips: number;
    completedTrips: number;
    avgRating: number;
    totalRevenue: number;
  };
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  approve(adminId: mongoose.Types.ObjectId): Promise<IRouteAssignment>;
  reject(adminId: mongoose.Types.ObjectId, reason?: string): Promise<IRouteAssignment>;
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
      enum: ['pending', 'approved', 'rejected', 'active', 'inactive', 'suspended'],
      default: 'pending'
    },
    assignedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    approvedAt: {
      type: Date
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    rejectedAt: {
      type: Date
    },
    rejectedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    rejectionReason: {
      type: String
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
RouteAssignmentSchema.methods.approve = async function(adminId: mongoose.Types.ObjectId) {
  this.status = 'approved';
  this.approvedAt = new Date();
  this.approvedBy = adminId;
  this.rejectedAt = undefined;
  this.rejectedBy = undefined;
  this.rejectionReason = undefined;
  return await this.save();
};

RouteAssignmentSchema.methods.reject = async function(adminId: mongoose.Types.ObjectId, reason?: string) {
  this.status = 'rejected';
  this.rejectedAt = new Date();
  this.rejectedBy = adminId;
  this.rejectionReason = reason;
  this.approvedAt = undefined;
  this.approvedBy = undefined;
  return await this.save();
};

RouteAssignmentSchema.methods.suspend = async function(adminId: mongoose.Types.ObjectId, reason: string) {
  this.status = 'suspended';
  this.unassignedBy = adminId;
  this.unassignReason = reason;
  this.updatedAt = new Date();
  return await this.save();
};

RouteAssignmentSchema.methods.reactivate = async function(adminId: mongoose.Types.ObjectId) {
  this.status = 'approved'; // Changed from 'active' to 'approved'
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
    status: { $in: ['approved', 'active'] },
    isActive: true 
  })
  .populate('vehicleId', 'vehicleNumber vehicleType status')
  .populate('routeId', 'name routeId startLocation endLocation distance')
  .sort({ assignedAt: -1 });
};

RouteAssignmentSchema.statics.getAssignmentsByRoute = function(routeId: mongoose.Types.ObjectId) {
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

RouteAssignmentSchema.statics.getVehicleAssignments = function(vehicleId: mongoose.Types.ObjectId) {
  return this.find({ 
    vehicleId, 
    status: { $in: ['approved', 'active'] },
    isActive: true 
  })
  .populate('routeId', 'name routeId startLocation endLocation distance pricing')
  .sort({ assignedAt: -1 });
};

RouteAssignmentSchema.statics.getPendingAssignments = function(routeId?: mongoose.Types.ObjectId) {
  const query: any = {
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

const RouteAssignment = mongoose.model<IRouteAssignment>('RouteAssignment', RouteAssignmentSchema);

export default RouteAssignment;