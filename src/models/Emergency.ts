// src/models/Emergency.ts
import mongoose, { Document, Schema } from 'mongoose';

export interface IEmergency extends Document {
  incidentId: string;
  type: 'accident' | 'breakdown' | 'security' | 'medical' | 'weather' | 'system' | 'other';
  priority: 'critical' | 'high' | 'medium' | 'low';
  status: 'active' | 'responded' | 'resolved' | 'closed';
  title: string;
  description: string;
  location: {
    latitude: number;
    longitude: number;
    address: string;
    deviceId?: string;
    vehicleNumber?: string;
  };
  reportedBy: {
    userId: mongoose.Types.ObjectId;
    name: string;
    role: string;
    contactMethod: 'app' | 'call' | 'sms' | 'system';
  };
  assignedTeam: {
    teamId: string;
    teamName: string;
    members: {
      userId: mongoose.Types.ObjectId;
      name: string;
      role: string;
      contactNumber: string;
    }[];
    responseTime?: Date;
    arrivalTime?: Date;
  };
  relatedDevice?: {
    deviceId: mongoose.Types.ObjectId;
    deviceIdString: string;
    vehicleNumber: string;
    lastKnownLocation: {
      latitude: number;
      longitude: number;
      address: string;
    };
  };
  timeline: {
    timestamp: Date;
    action: string;
    performedBy: {
      userId: mongoose.Types.ObjectId;
      name: string;
      role: string;
    };
    details: string;
  }[];
  resolution?: {
    resolvedBy: {
      userId: mongoose.Types.ObjectId;
      name: string;
      role: string;
    };
    resolvedAt: Date;
    resolutionMethod: string;
    resolutionNotes: string;
    followUpRequired: boolean;
    followUpDate?: Date;
  };
  notifications: {
    sent: {
      userId: mongoose.Types.ObjectId;
      name: string;
      method: 'email' | 'sms' | 'push';
      sentAt: Date;
      status: 'sent' | 'delivered' | 'failed';
    }[];
    broadcast: {
      message: string;
      sentAt: Date;
      recipients: string;
      method: 'system' | 'sms' | 'email' | 'push';
    }[];
  };
  escalationLevel: number;
  estimatedResolutionTime?: Date;
  actualResolutionTime?: Date;
  severity: 'low' | 'medium' | 'high' | 'critical';
  affectedServices: string[];
  affectedUsers: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  addTimelineEntry(action: string, performedBy: any, details: string): Promise<IEmergency>;
  escalate(): Promise<IEmergency>;
  assignTeam(teamData: any): Promise<IEmergency>;
  resolve(resolutionData: any): Promise<IEmergency>;
  sendNotification(recipients: any[], message: string, method: string): Promise<IEmergency>;
  broadcast(message: string, method: string, recipients: string): Promise<IEmergency>;
}

const EmergencySchema = new Schema<IEmergency>(
  {
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
        type: mongoose.Schema.Types.ObjectId,
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
          type: mongoose.Schema.Types.ObjectId,
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
        type: mongoose.Schema.Types.ObjectId,
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
          type: mongoose.Schema.Types.ObjectId,
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
          type: mongoose.Schema.Types.ObjectId,
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
          type: mongoose.Schema.Types.ObjectId,
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
  },
  {
    timestamps: true,
  }
);

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
EmergencySchema.methods.addTimelineEntry = function(action: string, performedBy: any, details: string): Promise<IEmergency> {
  this.timeline.push({
    timestamp: new Date(),
    action,
    performedBy,
    details,
  });
  return this.save();
};

// Method to escalate emergency
EmergencySchema.methods.escalate = function(): Promise<IEmergency> {
  if (this.escalationLevel < 5) {
    this.escalationLevel += 1;
    
    if (this.escalationLevel >= 4) {
      this.priority = 'critical';
      this.severity = 'critical';
    } else if (this.escalationLevel >= 3) {
      this.priority = 'high';
      this.severity = 'high';
    }
  }
  return this.save();
};

// Method to assign team
EmergencySchema.methods.assignTeam = function(teamData: any): Promise<IEmergency> {
  this.assignedTeam = {
    ...teamData,
    responseTime: new Date(),
  };
  this.status = 'responded';
  return this.save();
};

// Method to resolve emergency
EmergencySchema.methods.resolve = function(resolutionData: any): Promise<IEmergency> {
  this.resolution = {
    ...resolutionData,
    resolvedAt: new Date(),
  };
  this.status = 'resolved';
  this.actualResolutionTime = new Date();
  return this.save();
};

// Method to send notification
EmergencySchema.methods.sendNotification = function(recipients: any[], message: string, method: string): Promise<IEmergency> {
  recipients.forEach(recipient => {
    this.notifications.sent.push({
      userId: recipient.userId,
      name: recipient.name,
      method: method as 'email' | 'sms' | 'push',
      sentAt: new Date(),
      status: 'sent',
    });
  });
  return this.save();
};

// Method to broadcast message
EmergencySchema.methods.broadcast = function(message: string, method: string, recipients: string): Promise<IEmergency> {
  this.notifications.broadcast.push({
    message,
    sentAt: new Date(),
    recipients,
    method: method as 'system' | 'sms' | 'email' | 'push',
  });
  return this.save();
};

const Emergency = mongoose.model<IEmergency>('Emergency', EmergencySchema);

export default Emergency;