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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// src/models/User.ts
const mongoose_1 = __importStar(require("mongoose"));
const bcrypt_1 = __importDefault(require("bcrypt"));
const UserSchema = new mongoose_1.Schema({
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
}, {
    timestamps: true,
});
// Index for better query performance
UserSchema.index({ email: 1 });
UserSchema.index({ role: 1 });
UserSchema.index({ isActive: 1 });
UserSchema.index({ createdAt: 1 });
// Hash password before saving
UserSchema.pre('save', async function (next) {
    if (!this.isModified('password'))
        return next();
    try {
        const salt = await bcrypt_1.default.genSalt(10);
        this.password = await bcrypt_1.default.hash(this.password, salt);
        next();
    }
    catch (error) {
        next(error instanceof Error ? error : new Error(String(error)));
    }
});
// Compare password method
UserSchema.methods.comparePassword = async function (candidatePassword) {
    try {
        return await bcrypt_1.default.compare(candidatePassword, this.password);
    }
    catch (error) {
        throw error;
    }
};
// Generate OTP for password reset
UserSchema.methods.getResetPasswordOtp = function () {
    // Generate a 6-digit numeric OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    console.log(`[getResetPasswordOtp] Generated OTP for ${this.email}: ${otp}`);
    // Hash OTP before saving to database for security
    const hashedOtp = bcrypt_1.default.hashSync(otp, 10);
    console.log(`[getResetPasswordOtp] Hashed OTP stored in DB for ${this.email}`);
    // Store the hashed OTP and set expiry
    this.resetPasswordToken = hashedOtp;
    // Set expire time - 1 hour
    this.resetPasswordExpire = new Date(Date.now() + 60 * 60 * 1000);
    console.log(`[getResetPasswordOtp] OTP will expire at ${this.resetPasswordExpire}`);
    return otp; // Return the plain OTP for sending via email
};
// Method to update last login
UserSchema.methods.updateLastLogin = function () {
    this.lastLogin = new Date();
    return this.save();
};
// Virtual for full name (if needed)
UserSchema.virtual('fullName').get(function () {
    return this.name;
});
// Method to check if user has permission
UserSchema.methods.hasPermission = function (permission) {
    if (!this.permissions || this.permissions.length === 0)
        return false;
    return this.permissions.includes(permission);
};
// Method to add permission
UserSchema.methods.addPermission = function (permission) {
    if (!this.permissions) {
        this.permissions = [];
    }
    if (!this.permissions.includes(permission)) {
        this.permissions.push(permission);
    }
    return this.save();
};
// Method to remove permission
UserSchema.methods.removePermission = function (permission) {
    if (!this.permissions)
        return this.save();
    this.permissions = this.permissions.filter((p) => p !== permission);
    return this.save();
};
// Static method to get user statistics
UserSchema.statics.getStats = async function () {
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
const User = mongoose_1.default.model('User', UserSchema);
exports.default = User;
