// src/models/UserActivity.ts - REQUIRED MODEL FOR API TO WORK
import mongoose, { Schema, Document } from 'mongoose';

export interface IUserActivity extends Document {
  userId: mongoose.Types.ObjectId;
  action: string;
  description: string;
  category: 'auth' | 'profile' | 'device' | 'trip' | 'system' | 'admin' | 'security' | 'other';
  details?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  endpoint?: string;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  statusCode?: number;
  responseTime?: number;
  severity?: 'low' | 'medium' | 'high' | 'critical';
  metadata?: Record<string, any>;
  timestamp: Date;
  createdAt: Date;
  updatedAt: Date;
}

const UserActivitySchema: Schema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  action: {
    type: String,
    required: true,
    enum: [
      // Authentication actions
      'login',
      'logout',
      'login_failed',
      'password_change',
      'password_reset_request',
      'password_reset_complete',
      
      // Profile actions
      'profile_view',
      'profile_update',
      'profile_photo_update',
      
      // Admin actions
      'user_created',
      'user_updated',
      'user_deleted',
      'user_status_changed',
      'users_list_view',
      'user_details_view',
      
      // Device actions
      'device_created',
      'device_updated',
      'device_deleted',
      'device_location_updated',
      'device_alert_added',
      'device_alert_cleared',
      'devices_list_view',
      'device_details_view',
      
      // Trip actions
      'trip_booking',
      'trip_cancelled',
      'trip_completed',
      'trip_updated',
      
      // System actions
      'system_settings_updated',
      'system_health_checked',
      'system_analytics_viewed',
      
      // Emergency actions
      'emergency_alert_created',
      'emergency_incident_resolved',
      'emergency_broadcast_sent',
      
      // Security actions
      'suspicious_activity_detected',
      'security_violation',
      'access_denied',
      
      // Other actions
      'other'
    ]
  },
  description: {
    type: String,
    required: true
  },
  category: {
    type: String,
    required: true,
    enum: ['auth', 'profile', 'device', 'trip', 'system', 'admin', 'security', 'other'],
    default: 'other'
  },
  details: {
    type: Schema.Types.Mixed,
    default: {}
  },
  ipAddress: {
    type: String,
    trim: true
  },
  userAgent: {
    type: String,
    trim: true
  },
  endpoint: {
    type: String,
    trim: true
  },
  method: {
    type: String,
    enum: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    default: 'GET'
  },
  statusCode: {
    type: Number,
    min: 100,
    max: 599
  },
  responseTime: {
    type: Number,
    min: 0
  },
  severity: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'low'
  },
  metadata: {
    type: Schema.Types.Mixed,
    default: {}
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  }
}, {
  timestamps: true,
  collection: 'useractivities'
});

// Compound indexes for efficient queries
UserActivitySchema.index({ userId: 1, timestamp: -1 });
UserActivitySchema.index({ userId: 1, category: 1, timestamp: -1 });
UserActivitySchema.index({ userId: 1, action: 1, timestamp: -1 });
UserActivitySchema.index({ category: 1, timestamp: -1 });
UserActivitySchema.index({ action: 1, timestamp: -1 });

const UserActivity = mongoose.model<IUserActivity>('UserActivity', UserActivitySchema);

export default UserActivity;