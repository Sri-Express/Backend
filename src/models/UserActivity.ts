// src/models/UserActivity.ts
import mongoose, { Document, Schema } from 'mongoose';

export interface IUserActivity extends Document {
  userId: mongoose.Types.ObjectId;
  action: string;
  description: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, any>;
  timestamp: Date;
  category: 'auth' | 'profile' | 'device' | 'trip' | 'system' | 'other';
  severity: 'low' | 'medium' | 'high';
  createdAt: Date;
}

const UserActivitySchema = new Schema<IUserActivity>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    action: {
      type: String,
      required: true,
      trim: true,
      index: true
    },
    description: {
      type: String,
      required: true,
      trim: true
    },
    ipAddress: {
      type: String,
      trim: true
    },
    userAgent: {
      type: String,
      trim: true
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {}
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true
    },
    category: {
      type: String,
      enum: ['auth', 'profile', 'device', 'trip', 'system', 'other'],
      default: 'other',
      index: true
    },
    severity: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'low'
    }
  },
  {
    timestamps: true
  }
);

// Compound indexes for better query performance
UserActivitySchema.index({ userId: 1, timestamp: -1 });
UserActivitySchema.index({ userId: 1, action: 1 });
UserActivitySchema.index({ userId: 1, category: 1 });

// Static method to log activity
UserActivitySchema.statics.logActivity = async function(
  userId: string | mongoose.Types.ObjectId,
  action: string,
  description: string,
  options: {
    ipAddress?: string;
    userAgent?: string;
    metadata?: Record<string, any>;
    category?: 'auth' | 'profile' | 'device' | 'trip' | 'system' | 'other';
    severity?: 'low' | 'medium' | 'high';
  } = {}
) {
  try {
    const activity = new this({
      userId,
      action,
      description,
      ipAddress: options.ipAddress,
      userAgent: options.userAgent,
      metadata: options.metadata || {},
      category: options.category || 'other',
      severity: options.severity || 'low',
      timestamp: new Date()
    });

    await activity.save();
    return activity;
  } catch (error) {
    console.error('Error logging user activity:', error);
    // Don't throw error to prevent breaking main functionality
    return null;
  }
};

// Static method to get user activity stats
UserActivitySchema.statics.getUserStats = async function(userId: string | mongoose.Types.ObjectId) {
  try {
    const stats = await this.aggregate([
      { $match: { userId: new mongoose.Types.ObjectId(userId) } },
      {
        $group: {
          _id: '$action',
          count: { $sum: 1 },
          lastOccurrence: { $max: '$timestamp' }
        }
      },
      { $sort: { count: -1 } }
    ]);

    const totalActivities = await this.countDocuments({ userId });
    const loginCount = await this.countDocuments({ 
      userId, 
      action: 'login' 
    });

    // Get last 30 days activity
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const recentActivities = await this.countDocuments({
      userId,
      timestamp: { $gte: thirtyDaysAgo }
    });

    return {
      totalActivities,
      loginCount,
      recentActivities,
      actionBreakdown: stats
    };
  } catch (error) {
    console.error('Error getting user activity stats:', error);
    return null;
  }
};

const UserActivity = mongoose.model<IUserActivity>('UserActivity', UserActivitySchema);

export default UserActivity;