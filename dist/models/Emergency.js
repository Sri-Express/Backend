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
// src/models/Emergency.ts
const mongoose_1 = __importStar(require("mongoose"));
const EmergencySchema = new mongoose_1.Schema({
    incidentId: {
        type: String,
        required: [true, 'Incident ID is required'],
        unique: true,
        trim: true,
    },
    type: {
        type: String,
        enum: ['accident', 'breakdown', 'security', 'medical', 'weather', 'system', 'other'],
        required: [true, 'Emergency type is required'],
    },
    priority: {
        type: String,
        enum: ['critical', 'high', 'medium', 'low'],
        default: 'medium',
    },
    status: {
        type: String,
        enum: ['active', 'responded', 'resolved', 'closed'],
        default: 'active',
    },
    title: {
        type: String,
        required: [true, 'Emergency title is required'],
        trim: true,
    },
    description: {
        type: String,
        required: [true, 'Emergency description is required'],
        trim: true,
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
        deviceId: String,
        vehicleNumber: String,
    },
    reportedBy: {
        userId: {
            type: mongoose_1.default.Schema.Types.ObjectId,
            ref: 'User',
            required: [true, 'Reporter user ID is required'],
        },
        name: {
            type: String,
            required: [true, 'Reporter name is required'],
        },
        role: {
            type: String,
            required: [true, 'Reporter role is required'],
        },
        contactMethod: {
            type: String,
            enum: ['app', 'call', 'sms', 'system'],
            default: 'app',
        },
    },
    assignedTeam: {
        teamId: String,
        teamName: String,
        members: [{
                userId: {
                    type: mongoose_1.default.Schema.Types.ObjectId,
                    ref: 'User',
                },
                name: String,
                role: String,
                contactNumber: String,
            }],
        responseTime: Date,
        arrivalTime: Date,
    },
    relatedDevice: {
        deviceId: {
            type: mongoose_1.default.Schema.Types.ObjectId,
            ref: 'Device',
        },
        deviceIdString: String,
        vehicleNumber: String,
        lastKnownLocation: {
            latitude: Number,
            longitude: Number,
            address: String,
        },
    },
    timeline: [{
            timestamp: {
                type: Date,
                default: Date.now,
            },
            action: {
                type: String,
                required: true,
            },
            performedBy: {
                userId: {
                    type: mongoose_1.default.Schema.Types.ObjectId,
                    ref: 'User',
                },
                name: String,
                role: String,
            },
            details: String,
        }],
    resolution: {
        resolvedBy: {
            userId: {
                type: mongoose_1.default.Schema.Types.ObjectId,
                ref: 'User',
            },
            name: String,
            role: String,
        },
        resolvedAt: Date,
        resolutionMethod: String,
        resolutionNotes: String,
        followUpRequired: {
            type: Boolean,
            default: false,
        },
        followUpDate: Date,
    },
    notifications: {
        sent: [{
                userId: {
                    type: mongoose_1.default.Schema.Types.ObjectId,
                    ref: 'User',
                },
                name: String,
                method: {
                    type: String,
                    enum: ['email', 'sms', 'push'],
                },
                sentAt: {
                    type: Date,
                    default: Date.now,
                },
                status: {
                    type: String,
                    enum: ['sent', 'delivered', 'failed'],
                    default: 'sent',
                },
            }],
        broadcast: [{
                message: String,
                sentAt: {
                    type: Date,
                    default: Date.now,
                },
                recipients: String,
                method: {
                    type: String,
                    enum: ['system', 'sms', 'email', 'push'],
                },
            }],
    },
    escalationLevel: {
        type: Number,
        default: 1,
        min: 1,
        max: 5,
    },
    estimatedResolutionTime: Date,
    actualResolutionTime: Date,
    severity: {
        type: String,
        enum: ['low', 'medium', 'high', 'critical'],
        default: 'medium',
    },
    affectedServices: [String],
    affectedUsers: {
        type: Number,
        default: 0,
    },
    isActive: {
        type: Boolean,
        default: true,
    },
}, {
    timestamps: true,
});
// Indexes for better query performance
// EmergencySchema.index({ incidentId: 1 }); // <-- THIS LINE IS REMOVED (unique:true handles it)
EmergencySchema.index({ status: 1 });
EmergencySchema.index({ priority: 1 });
EmergencySchema.index({ type: 1 });
EmergencySchema.index({ createdAt: -1 });
EmergencySchema.index({ 'location.latitude': 1, 'location.longitude': 1 });
EmergencySchema.index({ 'reportedBy.userId': 1 });
EmergencySchema.index({ 'assignedTeam.teamId': 1 });
// Pre-save middleware to generate incident ID
EmergencySchema.pre('save', async function (next) {
    if (!this.incidentId) {
        const date = new Date();
        const dateStr = date.getFullYear().toString() +
            (date.getMonth() + 1).toString().padStart(2, '0') +
            date.getDate().toString().padStart(2, '0');
        const randomNum = Math.floor(Math.random() * 9999).toString().padStart(4, '0');
        this.incidentId = `EMG-${dateStr}-${randomNum}`;
    }
    next();
});
// Method to add timeline entry
EmergencySchema.methods.addTimelineEntry = function (action, performedBy, details) {
    this.timeline.push({
        timestamp: new Date(),
        action,
        performedBy,
        details,
    });
    return this.save();
};
// Method to escalate emergency
EmergencySchema.methods.escalate = function () {
    if (this.escalationLevel < 5) {
        this.escalationLevel += 1;
        if (this.escalationLevel >= 4) {
            this.priority = 'critical';
            this.severity = 'critical';
        }
        else if (this.escalationLevel >= 3) {
            this.priority = 'high';
            this.severity = 'high';
        }
    }
    return this.save();
};
// Method to assign team
EmergencySchema.methods.assignTeam = function (teamData) {
    this.assignedTeam = {
        ...teamData,
        responseTime: new Date(),
    };
    this.status = 'responded';
    return this.save();
};
// Method to resolve emergency
EmergencySchema.methods.resolve = function (resolutionData) {
    this.resolution = {
        ...resolutionData,
        resolvedAt: new Date(),
    };
    this.status = 'resolved';
    this.actualResolutionTime = new Date();
    return this.save();
};
// Method to send notification
EmergencySchema.methods.sendNotification = function (recipients, message, method) {
    recipients.forEach(recipient => {
        this.notifications.sent.push({
            userId: recipient.userId,
            name: recipient.name,
            method: method,
            sentAt: new Date(),
            status: 'sent',
        });
    });
    return this.save();
};
// Method to broadcast message
EmergencySchema.methods.broadcast = function (message, method, recipients) {
    this.notifications.broadcast.push({
        message,
        sentAt: new Date(),
        recipients,
        method: method,
    });
    return this.save();
};
const Emergency = mongoose_1.default.model('Emergency', EmergencySchema);
exports.default = Emergency;
