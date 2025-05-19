// src/models/User.ts (improved OTP generation)
import mongoose, { Document, Schema } from 'mongoose';
import bcrypt from 'bcrypt';
import crypto from 'crypto';

export interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  role: 'client' | 'customer_service' | 'route_admin' | 'company_admin' | 'system_admin';
  resetPasswordToken?: string;
  resetPasswordExpire?: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
  getResetPasswordOtp(): string; // OTP generator
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
    resetPasswordToken: String,
    resetPasswordExpire: Date,
  },
  {
    timestamps: true,
  }
);

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
  
  // Hash OTP before saving to database for security (use syncronous bcrypt for simplicity)
  const hashedOtp = bcrypt.hashSync(otp, 10);
  console.log(`[getResetPasswordOtp] Hashed OTP stored in DB for ${this.email}`);
  
  // Store the hashed OTP and set expiry
  this.resetPasswordToken = hashedOtp;
  
  // Set expire time - 1 hour
  this.resetPasswordExpire = new Date(Date.now() + 60 * 60 * 1000);
  console.log(`[getResetPasswordOtp] OTP will expire at ${this.resetPasswordExpire}`);
  
  return otp; // Return the plain OTP for sending via email
};

const User = mongoose.model<IUser>('User', UserSchema);

export default User;