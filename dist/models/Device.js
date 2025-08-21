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
// src/models/Device.ts
const mongoose_1 = __importStar(require("mongoose"));
const DeviceSchema = new mongoose_1.Schema({
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
            type: mongoose_1.default.Schema.Types.ObjectId,
            ref: 'User',
            required: function () {
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
            type: mongoose_1.default.Schema.Types.ObjectId,
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
}, {
    timestamps: true,
});
// Index for better query performance
// DeviceSchema.index({ deviceId: 1 }); // <-- THIS LINE IS REMOVED (unique:true handles it)
DeviceSchema.index({ vehicleNumber: 1 });
DeviceSchema.index({ status: 1 });
DeviceSchema.index({ 'assignedTo.userId': 1 });
DeviceSchema.index({ 'location.latitude': 1, 'location.longitude': 1 });
// Method to update device location
DeviceSchema.methods.updateLocation = function (latitude, longitude, address) {
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
DeviceSchema.methods.addAlert = function (message) {
    this.alerts.messages.push(message);
    this.alerts.count = this.alerts.messages.length;
    return this.save();
};
// Method to clear alerts
DeviceSchema.methods.clearAlerts = function () {
    this.alerts.messages = [];
    this.alerts.count = 0;
    return this.save();
};
const Device = mongoose_1.default.model('Device', DeviceSchema);
exports.default = Device;
