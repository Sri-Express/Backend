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
  comparePassword(candidatePassword: string): Promise<boolean>;
  getResetPasswordOtp(): string;
  updateLastLogin(): Promise<IUser>;
  hasPermission(permission: string): boolean;
  addPermission(permission: string): Promise<IUser>;
  removePermission(permission: string): Promise<IUser>;
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
  },
  {
    timestamps: true,
  }
);

// Index for better query performance
UserSchema.index({ email: 1 });
UserSchema.index({ role: 1 });
UserSchema.index({ isActive: 1 });
UserSchema.index({ createdAt: 1 });

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
  // Generate a 6-digit numeric OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  console.log(`[getResetPasswordOtp] Generated OTP for ${this.email}: ${otp}`);
  
  // Hash OTP before saving to database for security
  const hashedOtp = bcrypt.hashSync(otp, 10);
  console.log(`[getResetPasswordOtp] Hashed OTP stored in DB for ${this.email}`);
  
  // Store the hashed OTP and set expiry
  this.resetPasswordToken = hashedOtp;
  
  // Set expire time - 1 hour
  this.resetPasswordExpire = new Date(Date.now() + 60 * 60 * 1000);
  console.log(`[getResetPasswordOtp] OTP will expire at ${this.resetPasswordExpire}`);
  
  return otp; // Return the plain OTP for sending via email
};

// Method to update last login
UserSchema.methods.updateLastLogin = function (): Promise<IUser> {
  this.lastLogin = new Date();
  return this.save();
};

// Virtual for full name (if needed)
UserSchema.virtual('fullName').get(function() {
  return this.name;
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

// Static method to get user statistics
UserSchema.statics.getStats = async function() {
  const stats = await this.aggregate([
    {
      $group: {
        _id: '$role',
        count: { $sum: 1 },
        active: { $sum: { $cond: ['$isActive', 1, 0] } },
        inactive: { $sum: { $cond: ['$isActive', 0, 1] } }
      }
    }
  ]);
  
  return stats;
};

const User = mongoose.model<IUser>('User', UserSchema);

export default User;