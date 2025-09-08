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
// Weather preferences schema
const WeatherPreferencesSchema = new mongoose_1.Schema({
    defaultLocation: {
        type: String,
        default: 'Colombo',
        enum: [
            'Colombo', 'Kandy', 'Galle', 'Jaffna', 'Anuradhapura',
            'Batticaloa', 'Matara', 'Negombo', 'Trincomalee',
            'Badulla', 'Ratnapura', 'Kurunegala'
        ]
    },
    temperatureUnit: {
        type: String,
        enum: ['celsius', 'fahrenheit'],
        default: 'celsius'
    },
    windSpeedUnit: {
        type: String,
        enum: ['kmh', 'mph', 'ms'],
        default: 'kmh'
    },
    notificationsEnabled: {
        type: Boolean,
        default: true
    },
    alertTypes: [{
            type: String,
            enum: ['rain', 'wind', 'temperature', 'humidity', 'storm', 'flood'],
            default: ['rain', 'wind', 'temperature']
        }],
    autoRefreshInterval: {
        type: Number,
        default: 10,
        min: 1,
        max: 60
    },
    favoriteLocations: [{
            type: String,
            enum: [
                'Colombo', 'Kandy', 'Galle', 'Jaffna', 'Anuradhapura',
                'Batticaloa', 'Matara', 'Negombo', 'Trincomalee',
                'Badulla', 'Ratnapura', 'Kurunegala'
            ]
        }],
    updatedAt: {
        type: Date,
        default: Date.now
    }
}, { _id: false });
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
    emailVerificationToken: String,
    // ⭐ NEW - Weather preferences field
    weatherPreferences: {
        type: WeatherPreferencesSchema,
        default: () => ({
            defaultLocation: 'Colombo',
            temperatureUnit: 'celsius',
            windSpeedUnit: 'kmh',
            notificationsEnabled: true,
            alertTypes: ['rain', 'wind', 'temperature'],
            autoRefreshInterval: 10,
            favoriteLocations: ['Colombo', 'Kandy'],
            updatedAt: new Date()
        })
    }
}, {
    timestamps: true,
});
// Indexes for better query performance
UserSchema.index({ role: 1 });
UserSchema.index({ isActive: 1 });
UserSchema.index({ createdAt: 1 });
UserSchema.index({ lastLogin: 1 });
UserSchema.index({ loginCount: 1 });
UserSchema.index({ 'weatherPreferences.defaultLocation': 1 }); // ⭐ NEW - Weather index
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
// Update profileUpdatedAt when profile fields change
UserSchema.pre('save', function (next) {
    if (this.isModified('name') || this.isModified('phone') || this.isModified('department') || this.isModified('company')) {
        this.profileUpdatedAt = new Date();
    }
    next();
});
// ⭐ NEW - Update weatherPreferences.updatedAt when weather preferences change
UserSchema.pre('save', function (next) {
    if (this.isModified('weatherPreferences')) {
        if (this.weatherPreferences) {
            this.weatherPreferences.updatedAt = new Date();
        }
    }
    next();
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
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    console.log(`[getResetPasswordOtp] Generated OTP for ${this.email}: ${otp}`);
    const hashedOtp = bcrypt_1.default.hashSync(otp, 10);
    console.log(`[getResetPasswordOtp] Hashed OTP stored in DB for ${this.email}`);
    this.resetPasswordToken = hashedOtp;
    this.resetPasswordExpire = new Date(Date.now() + 60 * 60 * 1000);
    console.log(`[getResetPasswordOtp] OTP will expire at ${this.resetPasswordExpire}`);
    return otp;
};
// Method to update last login and increment login count
UserSchema.methods.updateLastLogin = function () {
    this.lastLogin = new Date();
    this.loginCount += 1;
    return this.save();
};
// Method to increment login count separately
UserSchema.methods.incrementLoginCount = function () {
    this.loginCount += 1;
    return this.save();
};
// Method to update profile timestamp
UserSchema.methods.updateProfile = function () {
    this.profileUpdatedAt = new Date();
    return this.save();
};
// Virtual for full name (if needed)
UserSchema.virtual('fullName').get(function () {
    return this.name;
});
// Virtual for days since last login
UserSchema.virtual('daysSinceLastLogin').get(function () {
    if (!this.lastLogin)
        return null;
    const diffTime = Math.abs(new Date().getTime() - this.lastLogin.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
});
// Virtual for account age in days
UserSchema.virtual('accountAge').get(function () {
    if (!this.createdAt)
        return 0;
    const diffTime = Math.abs(new Date().getTime() - this.createdAt.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
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
// Method to get user's full statistics
UserSchema.methods.getFullStats = async function () {
    try {
        const UserActivity = mongoose_1.default.model('UserActivity');
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
                byCategory: activityByCategory.reduce((acc, item) => {
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
    }
    catch (error) {
        console.error('Error getting user full stats:', error);
        return null;
    }
};
// Static method to get user statistics overview
UserSchema.statics.getStats = async function () {
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
UserSchema.statics.getActiveUsers = async function (limit = 10) {
    return this.find({ isActive: true })
        .sort({ loginCount: -1, lastLogin: -1 })
        .limit(limit)
        .select('-password');
};
// Static method to get recently registered users
UserSchema.statics.getRecentUsers = async function (days = 30) {
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
UserSchema.statics.getInactiveUsers = async function (days = 30) {
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
const User = mongoose_1.default.model('User', UserSchema);
exports.default = User;
