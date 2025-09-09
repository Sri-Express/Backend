// src/models/SlotAssignment.ts - Vehicle to Slot Assignment Model
import mongoose, { Document, Schema } from 'mongoose';

export interface ISlotAssignment extends Document {
  slotId: mongoose.Types.ObjectId;
  vehicleId: mongoose.Types.ObjectId;
  fleetId: mongoose.Types.ObjectId;
  routeId: mongoose.Types.ObjectId; // Denormalized for faster queries
  assignedBy: mongoose.Types.ObjectId;
  status: 'pending' | 'approved' | 'rejected' | 'active' | 'inactive';
  assignedAt: Date;
  approvedAt?: Date;
  approvedBy?: mongoose.Types.ObjectId;
  rejectedAt?: Date;
  rejectedBy?: mongoose.Types.ObjectId;
  rejectionReason?: string;
  startDate: Date; // When this assignment becomes effective
  endDate?: Date; // When this assignment expires (optional)
  priority: number; // 1 = highest priority for slot conflicts
  performance: {
    totalTrips: number;
    completedTrips: number;
    avgRating: number;
    onTimePerformance: number; // Percentage of on-time departures
  };
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const SlotAssignmentSchema = new Schema<ISlotAssignment>(
  {
    slotId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'RouteSlot',
      required: true
    },
    vehicleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Device', // Vehicles are tracked as devices
      required: true
    },
    fleetId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Fleet',
      required: true
    },
    routeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Route',
      required: true
    },
    assignedBy: {
      type: mongoose.Schema.Types.ObjectId,
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
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    rejectedAt: Date,
    rejectedBy: {
      type: mongoose.Schema.Types.ObjectId,
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
  },
  {
    timestamps: true
  }
);

// Indexes for performance
SlotAssignmentSchema.index({ slotId: 1, status: 1 });
SlotAssignmentSchema.index({ vehicleId: 1, status: 1 });
SlotAssignmentSchema.index({ fleetId: 1, status: 1 });
SlotAssignmentSchema.index({ routeId: 1, status: 1 });
SlotAssignmentSchema.index({ assignedBy: 1, status: 1 });
SlotAssignmentSchema.index({ startDate: 1, endDate: 1 });
SlotAssignmentSchema.index({ status: 1, isActive: 1 });

// Prevent duplicate active assignments for same vehicle/slot
SlotAssignmentSchema.index(
  { vehicleId: 1, slotId: 1, status: 1 },
  {
    unique: true,
    partialFilterExpression: { 
      status: { $in: ['approved', 'active'] },
      isActive: true
    }
  }
);

// Instance methods
SlotAssignmentSchema.methods.approve = async function(approvedBy: mongoose.Types.ObjectId) {
  this.status = 'approved';
  this.approvedAt = new Date();
  this.approvedBy = approvedBy;
  this.rejectedAt = undefined;
  this.rejectedBy = undefined;
  this.rejectionReason = undefined;
  return await this.save();
};

SlotAssignmentSchema.methods.reject = async function(rejectedBy: mongoose.Types.ObjectId, reason?: string) {
  this.status = 'rejected';
  this.rejectedAt = new Date();
  this.rejectedBy = rejectedBy;
  this.rejectionReason = reason;
  this.approvedAt = undefined;
  this.approvedBy = undefined;
  return await this.save();
};

SlotAssignmentSchema.methods.activate = async function() {
  this.status = 'active';
  return await this.save();
};

SlotAssignmentSchema.methods.deactivate = async function() {
  this.status = 'inactive';
  return await this.save();
};

// Static methods
SlotAssignmentSchema.statics.getPendingAssignments = function(routeId?: mongoose.Types.ObjectId) {
  const query: any = {
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

SlotAssignmentSchema.statics.getApprovedAssignments = function(routeId?: mongoose.Types.ObjectId) {
  const query: any = {
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

SlotAssignmentSchema.statics.getAssignmentsBySlot = function(slotId: mongoose.Types.ObjectId) {
  return this.find({
    slotId,
    status: { $in: ['approved', 'active'] },
    isActive: true
  })
    .populate('vehicleId', 'vehicleNumber vehicleType status')
    .populate('fleetId', 'companyName phone')
    .sort({ priority: 1, assignedAt: -1 });
};

const SlotAssignment = mongoose.model<ISlotAssignment>('SlotAssignment', SlotAssignmentSchema);

export default SlotAssignment;