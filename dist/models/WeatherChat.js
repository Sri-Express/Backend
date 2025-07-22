"use strict";
// /models/WeatherChat.ts
// Weather Chat Model for Sri Express Transportation Platform
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
exports.getDefaultWeatherPreferences = exports.validateWeatherPreferences = void 0;
const mongoose_1 = __importStar(require("mongoose"));
// Weather Chat Schema
const WeatherChatSchema = new mongoose_1.Schema({
    userId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true,
    },
    sessionId: {
        type: String,
        required: true,
        index: true,
        trim: true,
    },
    userMessage: {
        type: String,
        required: true,
        trim: true,
        maxlength: [2000, 'User message cannot exceed 2000 characters'],
    },
    aiResponse: {
        type: String,
        required: true,
        trim: true,
        maxlength: [5000, 'AI response cannot exceed 5000 characters'],
    },
    location: {
        type: String,
        required: true,
        trim: true,
        enum: [
            'Colombo', 'Kandy', 'Galle', 'Jaffna', 'Anuradhapura',
            'Batticaloa', 'Matara', 'Negombo', 'Trincomalee',
            'Badulla', 'Ratnapura', 'Kurunegala'
        ],
        index: true,
    },
    weatherContext: {
        temperature: {
            type: Number,
            min: [-10, 'Temperature cannot be below -10°C'],
            max: [50, 'Temperature cannot exceed 50°C'],
        },
        condition: {
            type: String,
            enum: ['Clear', 'Clouds', 'Rain', 'Drizzle', 'Thunderstorm', 'Snow', 'Mist', 'Fog'],
        },
        humidity: {
            type: Number,
            min: [0, 'Humidity cannot be negative'],
            max: [100, 'Humidity cannot exceed 100%'],
        },
        windSpeed: {
            type: Number,
            min: [0, 'Wind speed cannot be negative'],
            max: [200, 'Wind speed cannot exceed 200 km/h'],
        },
        precipitation: {
            type: Number,
            min: [0, 'Precipitation chance cannot be negative'],
            max: [100, 'Precipitation chance cannot exceed 100%'],
        },
        visibility: {
            type: Number,
            min: [0, 'Visibility cannot be negative'],
            max: [50, 'Visibility cannot exceed 50 km'],
        },
        pressure: {
            type: Number,
            min: [900, 'Pressure too low'],
            max: [1100, 'Pressure too high'],
        },
        uvIndex: {
            type: Number,
            min: [0, 'UV Index cannot be negative'],
            max: [15, 'UV Index cannot exceed 15'],
        },
        timestamp: {
            type: Date,
            default: Date.now,
        },
    },
    metadata: {
        responseTime: {
            type: Number,
            min: [0, 'Response time cannot be negative'],
        },
        tokensUsed: {
            type: Number,
            min: [0, 'Tokens used cannot be negative'],
        },
        confidence: {
            type: Number,
            min: [0, 'Confidence cannot be negative'],
            max: [1, 'Confidence cannot exceed 1'],
        },
        feedbackRating: {
            type: Number,
            min: [1, 'Rating must be at least 1'],
            max: [5, 'Rating cannot exceed 5'],
        },
        feedbackComment: {
            type: String,
            trim: true,
            maxlength: [500, 'Feedback comment cannot exceed 500 characters'],
        },
        ipAddress: {
            type: String,
            trim: true,
        },
        userAgent: {
            type: String,
            trim: true,
        },
    },
    tags: [{
            type: String,
            trim: true,
            lowercase: true,
            enum: [
                'forecast', 'current', 'route', 'alert', 'comparison',
                'transportation', 'travel', 'delay', 'safety', 'recommendation',
                'emergency', 'planning', 'analytics', 'historical'
            ],
        }],
    isArchived: {
        type: Boolean,
        default: false,
        index: true,
    },
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
});
// Indexes for better query performance
WeatherChatSchema.index({ userId: 1, createdAt: -1 });
WeatherChatSchema.index({ sessionId: 1, createdAt: -1 });
WeatherChatSchema.index({ location: 1, createdAt: -1 });
WeatherChatSchema.index({ tags: 1 });
WeatherChatSchema.index({ 'weatherContext.condition': 1 });
WeatherChatSchema.index({ isArchived: 1, createdAt: -1 });
// Compound index for analytics
WeatherChatSchema.index({
    userId: 1,
    location: 1,
    createdAt: -1
});
// Virtual for chat age
WeatherChatSchema.virtual('ageInDays').get(function () {
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - this.createdAt.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});
// Virtual for chat duration (if we track session duration)
WeatherChatSchema.virtual('sessionDuration').get(function () {
    return this.metadata.responseTime || 0;
});
// Instance Methods
WeatherChatSchema.methods.addFeedback = function (rating, comment) {
    this.metadata.feedbackRating = rating;
    if (comment) {
        this.metadata.feedbackComment = comment;
    }
    return this.save();
};
WeatherChatSchema.methods.addTag = function (tag) {
    if (!this.tags.includes(tag.toLowerCase())) {
        this.tags.push(tag.toLowerCase());
        return this.save();
    }
    return Promise.resolve(this);
};
WeatherChatSchema.methods.archive = function () {
    this.isArchived = true;
    return this.save();
};
WeatherChatSchema.methods.unarchive = function () {
    this.isArchived = false;
    return this.save();
};
// Static Methods
WeatherChatSchema.statics.getPopularLocations = function () {
    return this.aggregate([
        { $match: { isArchived: false } },
        { $group: { _id: '$location', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
        { $project: { location: '$_id', count: 1, _id: 0 } }
    ]);
};
WeatherChatSchema.statics.getPopularQueries = function () {
    return this.aggregate([
        { $match: { isArchived: false } },
        { $group: {
                _id: { $toLower: { $substr: ['$userMessage', 0, 50] } },
                count: { $sum: 1 },
                examples: { $push: '$userMessage' }
            } },
        { $sort: { count: -1 } },
        { $limit: 20 },
        { $project: {
                query: '$_id',
                count: 1,
                example: { $arrayElemAt: ['$examples', 0] },
                _id: 0
            } }
    ]);
};
WeatherChatSchema.statics.getUserStats = function (userId) {
    return this.aggregate([
        { $match: { userId, isArchived: false } },
        {
            $group: {
                _id: null,
                totalChats: { $sum: 1 },
                averageResponseTime: { $avg: '$metadata.responseTime' },
                locations: { $addToSet: '$location' },
                conditions: { $addToSet: '$weatherContext.condition' },
                tags: { $push: '$tags' },
                avgRating: { $avg: '$metadata.feedbackRating' },
                firstChat: { $min: '$createdAt' },
                lastChat: { $max: '$createdAt' },
            }
        },
        {
            $project: {
                _id: 0,
                totalChats: 1,
                averageResponseTime: { $round: ['$averageResponseTime', 2] },
                uniqueLocations: { $size: '$locations' },
                uniqueConditions: { $size: '$conditions' },
                avgRating: { $round: ['$avgRating', 1] },
                firstChat: 1,
                lastChat: 1,
                daysSinceFirstChat: {
                    $round: [{
                            $divide: [
                                { $subtract: [new Date(), '$firstChat'] },
                                1000 * 60 * 60 * 24
                            ]
                        }]
                }
            }
        }
    ]);
};
WeatherChatSchema.statics.getLocationTrends = function (location, days = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    return this.aggregate([
        {
            $match: {
                location,
                isArchived: false,
                createdAt: { $gte: startDate }
            }
        },
        {
            $group: {
                _id: {
                    date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
                    condition: '$weatherContext.condition'
                },
                count: { $sum: 1 },
                avgTemp: { $avg: '$weatherContext.temperature' },
                avgHumidity: { $avg: '$weatherContext.humidity' },
                avgWindSpeed: { $avg: '$weatherContext.windSpeed' },
            }
        },
        { $sort: { '_id.date': 1 } }
    ]);
};
// Pre-save middleware
WeatherChatSchema.pre('save', function (next) {
    // Auto-tag based on content
    const message = this.userMessage.toLowerCase();
    if (message.includes('forecast') || message.includes('tomorrow') || message.includes('week')) {
        if (!this.tags.includes('forecast'))
            this.tags.push('forecast');
    }
    if (message.includes('current') || message.includes('now') || message.includes('today')) {
        if (!this.tags.includes('current'))
            this.tags.push('current');
    }
    if (message.includes('travel') || message.includes('trip') || message.includes('journey')) {
        if (!this.tags.includes('travel'))
            this.tags.push('travel');
    }
    if (message.includes('route') || message.includes(' to ') || message.includes('from')) {
        if (!this.tags.includes('route'))
            this.tags.push('route');
    }
    if (message.includes('delay') || message.includes('affect') || message.includes('impact')) {
        if (!this.tags.includes('transportation'))
            this.tags.push('transportation');
    }
    if (message.includes('alert') || message.includes('warning') || message.includes('dangerous')) {
        if (!this.tags.includes('alert'))
            this.tags.push('alert');
    }
    next();
});
// Post-save middleware for analytics
WeatherChatSchema.post('save', function () {
    // Could trigger analytics updates here
    console.log(`💾 Weather chat saved: ${this.location} - ${this.userMessage.slice(0, 50)}...`);
});
// Model creation
const WeatherChat = mongoose_1.default.model('WeatherChat', WeatherChatSchema);
exports.default = WeatherChat;
// Helper function to validate weather preferences
const validateWeatherPreferences = (preferences) => {
    const errors = [];
    if (preferences.temperatureUnit && !['celsius', 'fahrenheit'].includes(preferences.temperatureUnit)) {
        errors.push('Invalid temperature unit. Must be celsius or fahrenheit.');
    }
    if (preferences.windSpeedUnit && !['kmh', 'mph', 'ms'].includes(preferences.windSpeedUnit)) {
        errors.push('Invalid wind speed unit. Must be kmh, mph, or ms.');
    }
    if (preferences.pressureUnit && !['hpa', 'mmhg', 'inhg'].includes(preferences.pressureUnit)) {
        errors.push('Invalid pressure unit. Must be hpa, mmhg, or inhg.');
    }
    if (preferences.autoRefreshInterval && (preferences.autoRefreshInterval < 1 || preferences.autoRefreshInterval > 60)) {
        errors.push('Auto refresh interval must be between 1 and 60 minutes.');
    }
    if (preferences.favoriteLocations && preferences.favoriteLocations.length > 10) {
        errors.push('Cannot have more than 10 favorite locations.');
    }
    return errors;
};
exports.validateWeatherPreferences = validateWeatherPreferences;
// Helper function to get default weather preferences
const getDefaultWeatherPreferences = () => ({
    defaultLocation: 'Colombo',
    temperatureUnit: 'celsius',
    windSpeedUnit: 'kmh',
    pressureUnit: 'hpa',
    notificationsEnabled: true,
    alertTypes: ['rain', 'wind', 'temperature'],
    autoRefreshInterval: 10,
    favoriteLocations: ['Colombo', 'Kandy'],
    chatSettings: {
        voiceEnabled: true,
        autoSpeak: false,
        language: 'en',
        responseLength: 'detailed',
    },
    privacySettings: {
        saveChatHistory: true,
        shareLocationData: true,
        allowAnalytics: true,
    },
    updatedAt: new Date(),
});
exports.getDefaultWeatherPreferences = getDefaultWeatherPreferences;
/*
Usage Examples:
===============

// Create a new weather chat
const chat = new WeatherChat({
  userId: user._id,
  sessionId: 'session_123',
  userMessage: 'Will it rain tomorrow in Colombo?',
  aiResponse: 'Tomorrow in Colombo, there is a 30% chance of rain...',
  location: 'Colombo',
  weatherContext: {
    temperature: 28,
    condition: 'Clouds',
    humidity: 75,
    precipitation: 30,
  },
});

// Save with automatic tagging
await chat.save();

// Add feedback
await chat.addFeedback(5, 'Very helpful response!');

// Get user statistics
const stats = await WeatherChat.getUserStats(userId);

// Get popular locations
const popularLocations = await WeatherChat.getPopularLocations();

// Get location trends
const trends = await WeatherChat.getLocationTrends('Colombo', 30);

// Validate preferences
const preferences = { temperatureUnit: 'celsius', windSpeedUnit: 'kmh' };
const errors = validateWeatherPreferences(preferences);

*/ 
