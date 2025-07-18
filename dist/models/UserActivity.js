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
// src/models/UserActivity.ts - REQUIRED MODEL FOR API TO WORK
const mongoose_1 = __importStar(require("mongoose"));
const UserActivitySchema = new mongoose_1.Schema({
    userId: {
        type: mongoose_1.Schema.Types.ObjectId,
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
        type: mongoose_1.Schema.Types.Mixed,
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
        type: mongoose_1.Schema.Types.Mixed,
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
const UserActivity = mongoose_1.default.model('UserActivity', UserActivitySchema);
exports.default = UserActivity;
