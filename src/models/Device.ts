// src/models/Device.ts - Updated with Vehicle Approval System
import mongoose, { Document, Schema } from 'mongoose';

export interface IDevice extends Document {
  deviceId: string;
  vehicleNumber: string;
  vehicleType: 'bus' | 'train' | 'van' | 'minibus';
  
  // APPROVAL SYSTEM FIELDS
  fleetId: mongoose.Types.ObjectId; // Associate with fleet
  approvalStatus: 'pending' | 'approved' | 'rejected';
  approvalDate?: Date;
  rejectionDate?: Date;
  rejectionReason?: string;
  notes?: string; // Admin notes
  
  status: 'online' | 'offline' | 'maintenance';
  lastSeen: Date;
  location: {
    latitude: number;
    longitude: number;
    address: string;
    lastUpdated: Date;
  };
  batteryLevel: number;
  signalStrength: number;
  assignedTo: {
    type: 'route_admin' | 'company_admin' | 'system';
    userId: mongoose.Types.ObjectId;
    name: string;
    adminId?: mongoose.Types.ObjectId; // Admin who approved/rejected
    assignedAt?: Date;
  };
  route?: {
    routeId: mongoose.Types.ObjectId;
    name: string;
  };
  firmwareVersion: string;
  installDate: Date;
  lastMaintenance?: Date;
  alerts: {
    count: number;
    messages: string[];
  };
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  updateLocation(latitude: number, longitude: number, address: string): Promise<IDevice>;
  addAlert(message: string): Promise<IDevice>;
  clearAlerts(): Promise<IDevice>;
  approve(adminId: mongoose.Types.ObjectId, notes?: string): Promise<IDevice>;
  reject(adminId: mongoose.Types.ObjectId, reason: string): Promise<IDevice>;
}

const DeviceSchema = new Schema<IDevice>(
  {
    deviceId: {
      type: String,
      required: [true, 'Device ID is required'],
      unique: true,
      trim: true,
    },
    vehicleNumber: {
      type: String,
      required: [true, 'Vehicle number is required'],
      trim: true,
    },
    vehicleType: {
      type: String,
      enum: ['bus', 'train', 'van', 'minibus'],
      required: [true, 'Vehicle type is required'],
    },
    
    // APPROVAL SYSTEM FIELDS
    fleetId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Fleet',
      required: [true, 'Fleet ID is required'],
    },
    approvalStatus: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
    approvalDate: {
      type: Date,
    },
    rejectionDate: {
      type: Date,
    },
    rejectionReason: {
      type: String,
      trim: true,
      maxlength: [300, 'Rejection reason cannot exceed 300 characters'],
    },
    notes: {
      type: String,
      trim: true,
      maxlength: [500, 'Notes cannot exceed 500 characters'],
    },
    
    status: {
      type: String,
      enum: ['online', 'offline', 'maintenance'],
      default: 'offline',
    },
    lastSeen: {
      type: Date,
      default: Date.now,
    },
    location: {
      latitude: {
        type: Number,
        default: 0,
      },
      longitude: {
        type: Number,
        default: 0,
      },
      address: {
        type: String,
        default: 'Location unknown',
      },
      lastUpdated: {
        type: Date,
        default: Date.now,
      },
    },
    batteryLevel: {
      type: Number,
      min: 0,
      max: 100,
      default: 100,
    },
    signalStrength: {
      type: Number,
      min: 0,
      max: 5,
      default: 0,
    },
    assignedTo: {
      type: {
        type: String,
        enum: ['route_admin', 'company_admin', 'system'],
        required: [true, 'Assignment type is required'],
      },
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: function(this: IDevice) {
          return this.assignedTo?.type !== 'system';
        },
      },
      name: {
        type: String,
        required: [true, 'Assigned name is required'],
      },
      adminId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User', // Admin who approved/rejected
      },
      assignedAt: {
        type: Date,
      },
    },
    route: {
      routeId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Route',
      },
      name: {
        type: String,
      },
    },
    firmwareVersion: {
      type: String,
      required: [true, 'Firmware version is required'],
    },
    installDate: {
      type: Date,
      required: [true, 'Install date is required'],
    },
    lastMaintenance: {
      type: Date,
    },
    alerts: {
      count: {
        type: Number,
        default: 0,
      },
      messages: [{
        type: String,
      }],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for better query performance
DeviceSchema.index({ vehicleNumber: 1 });
DeviceSchema.index({ fleetId: 1 });
DeviceSchema.index({ approvalStatus: 1 });
DeviceSchema.index({ status: 1 });
DeviceSchema.index({ 'assignedTo.userId': 1 });
DeviceSchema.index({ 'location.latitude': 1, 'location.longitude': 1 });

// Compound indexes for common queries
DeviceSchema.index({ fleetId: 1, approvalStatus: 1 });
DeviceSchema.index({ approvalStatus: 1, createdAt: 1 });

// Method to update device location
DeviceSchema.methods.updateLocation = function(latitude: number, longitude: number, address: string): Promise<IDevice> {
  this.location = {
    latitude,
    longitude,
    address,
    lastUpdated: new Date(),
  };
  this.lastSeen = new Date();
  this.status = 'online';
  return this.save();
};

// Method to add alert
DeviceSchema.methods.addAlert = function(message: string): Promise<IDevice> {
  this.alerts.messages.push(message);
  this.alerts.count = this.alerts.messages.length;
  return this.save();
};

// Method to clear alerts
DeviceSchema.methods.clearAlerts = function(): Promise<IDevice> {
  this.alerts.messages = [];
  this.alerts.count = 0;
  return this.save();
};

// Method to approve device
DeviceSchema.methods.approve = function(adminId: mongoose.Types.ObjectId, notes?: string): Promise<IDevice> {
  this.approvalStatus = 'approved';
  this.approvalDate = new Date();
  this.rejectionDate = undefined;
  this.rejectionReason = undefined;
  
  // Update assignedTo with admin info
  this.assignedTo = {
    ...this.assignedTo,
    adminId: adminId,
    assignedAt: new Date()
  };
  
  if (notes) {
    this.notes = notes;
  }
  
  return this.save();
};

// Method to reject device
DeviceSchema.methods.reject = function(adminId: mongoose.Types.ObjectId, reason: string): Promise<IDevice> {
  this.approvalStatus = 'rejected';
  this.rejectionDate = new Date();
  this.rejectionReason = reason;
  this.approvalDate = undefined;
  
  // Update assignedTo with admin info
  this.assignedTo = {
    ...this.assignedTo,
    adminId: adminId,
    assignedAt: new Date()
  };
  
  return this.save();
};

// Pre-save middleware to auto-generate deviceId if not provided
DeviceSchema.pre('save', function(next) {
  if (!this.deviceId) {
    this.deviceId = `DEV_${this.vehicleNumber}_${Date.now()}`;
  }
  next();
});

// Pre-save middleware for business rules
DeviceSchema.pre('save', function(next) {
  // Only approved devices can be assigned to routes
  if (this.approvalStatus !== 'approved' && this.route?.routeId) {
    return next(new Error('Only approved devices can be assigned to routes'));
  }
  
  // Rejection reason is required for rejected devices
  if (this.approvalStatus === 'rejected' && !this.rejectionReason) {
    return next(new Error('Rejection reason is required for rejected devices'));
  }
  
  next();
});

// Static method to get devices by approval status
DeviceSchema.statics.getByApprovalStatus = async function(status: string, fleetId?: string) {
  const query: any = { approvalStatus: status, isActive: true };
  if (fleetId) {
    query.fleetId = new mongoose.Types.ObjectId(fleetId);
  }
  
  return this.find(query)
    .populate('fleetId', 'companyName registrationNumber contactPerson email')
    .sort({ createdAt: 1 });
};

// Static method to get pending devices
DeviceSchema.statics.getPendingDevices = async function() {
  return this.find({
    approvalStatus: 'pending',
    isActive: true
  })
  .populate('fleetId', 'companyName registrationNumber contactPerson email')
  .sort({ createdAt: 1 });
};

const Device = mongoose.model<IDevice>('Device', DeviceSchema);

export default Device;