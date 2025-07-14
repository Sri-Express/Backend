// src/models/Device.ts
import mongoose, { Document, Schema } from 'mongoose';

export interface IDevice extends Document {
  deviceId: string;
  vehicleNumber: string;
  vehicleType: 'bus' | 'train';
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
      enum: ['bus', 'train'],
      required: [true, 'Vehicle type is required'],
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
        required: [true, 'Latitude is required'],
      },
      longitude: {
        type: Number,
        required: [true, 'Longitude is required'],
      },
      address: {
        type: String,
        required: [true, 'Address is required'],
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
        required: function() {
          return this.assignedTo.type !== 'system';
        },
      },
      name: {
        type: String,
        required: [true, 'Assigned name is required'],
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

// Index for better query performance
DeviceSchema.index({ deviceId: 1 });
DeviceSchema.index({ vehicleNumber: 1 });
DeviceSchema.index({ status: 1 });
DeviceSchema.index({ 'assignedTo.userId': 1 });
DeviceSchema.index({ 'location.latitude': 1, 'location.longitude': 1 });

// Method to update device location
DeviceSchema.methods.updateLocation = function(latitude: number, longitude: number, address: string) {
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
DeviceSchema.methods.addAlert = function(message: string) {
  this.alerts.messages.push(message);
  this.alerts.count = this.alerts.messages.length;
  return this.save();
};

// Method to clear alerts
DeviceSchema.methods.clearAlerts = function() {
  this.alerts.messages = [];
  this.alerts.count = 0;
  return this.save();
};

const Device = mongoose.model<IDevice>('Device', DeviceSchema);

export default Device;