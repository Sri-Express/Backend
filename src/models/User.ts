// src/models/User.ts
import mongoose, { Document, Schema } from 'mongoose';
import bcrypt from 'bcrypt';
import crypto from 'crypto';

export interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  role: 'client' | 'customer_service' | 'route_admin' | 'company_admin' | 'system_admin';
  phone?: string;
  department?: string;
  company?: string;
  permissions?: string[];
  isActive: boolean;
  resetPasswordToken?: string;
  resetPasswordExpire?: Date;
  lastLogin?: Date;
  loginCount: number;
  profileUpdatedAt?: Date;
  twoFactorEnabled: boolean;
  emailVerified: boolean;
  emailVerificationToken?: string;
  comparePassword(candidatePassword: string): Promise<boolean>;
  getResetPasswordOtp(): string;
  updateLastLogin(): Promise<IUser>;
  incrementLoginCount(): Promise<IUser>;
  hasPermission(permission: string): boolean;
  addPermission(permission: string): Promise<IUser>;
  removePermission(permission: string): Promise<IUser>;
  updateProfile(): Promise<IUser>;
  getFullStats(): Promise<any>;
  createdAt: Date;
  updatedAt: Date;
  _id: mongoose.Types.ObjectId;
}

const UserSchema = new Schema<IUser>(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters long'],
    },
    role: {
      type: String,
      enum: ['client', 'customer_service', 'route_admin', 'company_admin', 'system_admin'],
      default: 'client',
    },
    phone: {
      type: String,
      trim: true,
    },
    department: {
      type: String,
      trim: true,
    },
    company: {
      type: String,
      trim: true,
    },
    permissions: [{
      type: String,
      trim: true,
    }],
    isActive: {
      type: Boolean,
      default: true,
    },
    resetPasswordToken: String,
    resetPasswordExpire: Date,
    lastLogin: {
      type: Date,
    },
    loginCount: {
      type: Number,
      default: 0,
      min: 0
    },
    profileUpdatedAt: {
      type: Date,
    },
    twoFactorEnabled: {
      type: Boolean,
      default: false
    },
    emailVerified: {
      type: Boolean,
      default: false
    },
    emailVerificationToken: String
  },
  {
    timestamps: true,
  }
);

// Indexes for better query performance
// UserSchema.index({ email: 1 }); // <-- THIS LINE IS REMOVED (unique:true handles it)
UserSchema.index({ role: 1 });
UserSchema.index({ isActive: 1 });
UserSchema.index({ createdAt: 1 });
UserSchema.index({ lastLogin: 1 });
UserSchema.index({ loginCount: 1 });

// Hash password before saving
UserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error instanceof Error ? error : new Error(String(error)));
  }
});

// Update profileUpdatedAt when profile fields change
UserSchema.pre('save', function (next) {
  if (this.isModified('name') || this.isModified('phone') || this.isModified('department') || this.isModified('company')) {
    this.profileUpdatedAt = new Date();
  }
  next();
});

// Compare password method
UserSchema.methods.comparePassword = async function (candidatePassword: string): Promise<boolean> {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    throw error;
  }
};

// Generate OTP for password reset
UserSchema.methods.getResetPasswordOtp = function (): string {
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  console.log(`[getResetPasswordOtp] Generated OTP for ${this.email}: ${otp}`);
  
  const hashedOtp = bcrypt.hashSync(otp, 10);
  console.log(`[getResetPasswordOtp] Hashed OTP stored in DB for ${this.email}`);
  
  this.resetPasswordToken = hashedOtp;
  this.resetPasswordExpire = new Date(Date.now() + 60 * 60 * 1000);
  console.log(`[getResetPasswordOtp] OTP will expire at ${this.resetPasswordExpire}`);
  
  return otp;
};

// Method to update last login and increment login count
UserSchema.methods.updateLastLogin = function (): Promise<IUser> {
  this.lastLogin = new Date();
  this.loginCount += 1;
  return this.save();
};

// Method to increment login count separately
UserSchema.methods.incrementLoginCount = function (): Promise<IUser> {
  this.loginCount += 1;
  return this.save();
};

// Method to update profile timestamp
UserSchema.methods.updateProfile = function (): Promise<IUser> {
  this.profileUpdatedAt = new Date();
  return this.save();
};

// Virtual for full name (if needed)
UserSchema.virtual('fullName').get(function() {
  return this.name;
});

// Virtual for days since last login
UserSchema.virtual('daysSinceLastLogin').get(function() {
  if (!this.lastLogin) return null;
  const diffTime = Math.abs(new Date().getTime() - this.lastLogin.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
});

// Virtual for account age in days
UserSchema.virtual('accountAge').get(function() {
  const diffTime = Math.abs(new Date().getTime() - this.createdAt.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
});

// Method to check if user has permission
UserSchema.methods.hasPermission = function(permission: string): boolean {
  if (!this.permissions || this.permissions.length === 0) return false;
  return this.permissions.includes(permission);
};

// Method to add permission
UserSchema.methods.addPermission = function(permission: string): Promise<IUser> {
  if (!this.permissions) {
    this.permissions = [];
  }
  if (!this.permissions.includes(permission)) {
    this.permissions.push(permission);
  }
  return this.save();
};

// Method to remove permission
UserSchema.methods.removePermission = function(permission: string): Promise<IUser> {
  if (!this.permissions) return this.save();
  this.permissions = this.permissions.filter((p: string) => p !== permission);
  return this.save();
};

// Method to get user's full statistics
UserSchema.methods.getFullStats = async function() {
  try {
    const UserActivity = mongoose.model('UserActivity');
    
    const totalActivities = await UserActivity.countDocuments({ userId: this._id });
    const loginActivities = await UserActivity.countDocuments({ 
      userId: this._id, 
      action: 'login' 
    });

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const recentActivities = await UserActivity.countDocuments({
      userId: this._id,
      timestamp: { $gte: thirtyDaysAgo }
    });

    const activityByCategory = await UserActivity.aggregate([
      { $match: { userId: this._id } },
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 }
        }
      }
    ]);

    return {
      basicInfo: {
        loginCount: this.loginCount,
        totalActivities,
        recentActivities,
        accountAge: this.accountAge,
        daysSinceLastLogin: this.daysSinceLastLogin,
        emailVerified: this.emailVerified,
        twoFactorEnabled: this.twoFactorEnabled
      },
      activityBreakdown: {
        loginActivities,
        byCategory: activityByCategory.reduce((acc: any, item: any) => {
          acc[item._id] = item.count;
          return acc;
        }, {})
      },
      timestamps: {
        createdAt: this.createdAt,
        updatedAt: this.updatedAt,
        lastLogin: this.lastLogin,
        profileUpdatedAt: this.profileUpdatedAt
      }
    };
  } catch (error) {
    console.error('Error getting user full stats:', error);
    return null;
  }
};

// Static method to get user statistics overview
UserSchema.statics.getStats = async function() {
  const stats = await this.aggregate([
    {
      $group: {
        _id: '$role',
        count: { $sum: 1 },
        active: { $sum: { $cond: ['$isActive', 1, 0] } },
        inactive: { $sum: { $cond: ['$isActive', 0, 1] } },
        avgLoginCount: { $avg: '$loginCount' },
        totalLogins: { $sum: '$loginCount' }
      }
    }
  ]);
  
  return stats;
};

// Static method to get users with high activity
UserSchema.statics.getActiveUsers = async function(limit: number = 10) {
  return this.find({ isActive: true })
    .sort({ loginCount: -1, lastLogin: -1 })
    .limit(limit)
    .select('-password');
};

// Static method to get recently registered users
UserSchema.statics.getRecentUsers = async function(days: number = 30) {
  const dateThreshold = new Date();
  dateThreshold.setDate(dateThreshold.getDate() - days);
  
  return this.find({ 
    createdAt: { $gte: dateThreshold },
    isActive: true 
  })
    .sort({ createdAt: -1 })
    .select('-password');
};

// Static method to get inactive users
UserSchema.statics.getInactiveUsers = async function(days: number = 30) {
  const dateThreshold = new Date();
  dateThreshold.setDate(dateThreshold.getDate() - days);
  
  return this.find({
    $or: [
      { lastLogin: { $lt: dateThreshold } },
      { lastLogin: null }
    ],
    isActive: true
  })
    .sort({ lastLogin: 1 })
    .select('-password');
};

const User = mongoose.model<IUser>('User', UserSchema);

export default User;