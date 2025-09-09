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
// src/models/RouteSlot.ts - Route Time Slot Management Model
const mongoose_1 = __importStar(require("mongoose"));
const RouteSlotSchema = new mongoose_1.Schema({
    routeId: {
        type: mongoose_1.default.Schema.Types.ObjectId,
        ref: 'Route',
        required: true
    },
    slotNumber: {
        type: Number,
        required: true,
        min: 1
    },
    departureTime: {
        type: String,
        required: true,
        match: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/ // HH:MM format validation
    },
    arrivalTime: {
        type: String,
        required: true,
        match: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/
    },
    bufferMinutes: {
        type: Number,
        default: 15,
        min: 0,
        max: 60
    },
    daysOfWeek: {
        type: [String],
        enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
        required: true
    },
    slotType: {
        type: String,
        enum: ['regular', 'rush_hour', 'peak', 'night'],
        default: 'regular'
    },
    maxCapacity: {
        type: Number,
        default: 1,
        min: 1,
        max: 10
    },
    isActive: {
        type: Boolean,
        default: true
    },
    createdBy: {
        type: mongoose_1.default.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }
}, {
    timestamps: true
});
// Indexes
RouteSlotSchema.index({ routeId: 1, slotNumber: 1 });
RouteSlotSchema.index({ routeId: 1, departureTime: 1 });
RouteSlotSchema.index({ routeId: 1, isActive: 1 });
RouteSlotSchema.index({ daysOfWeek: 1, isActive: 1 });
// Compound unique index to prevent slot conflicts
RouteSlotSchema.index({ routeId: 1, slotNumber: 1 }, { unique: true });
// Static methods
RouteSlotSchema.statics.getActiveSlotsByRoute = function (routeId) {
    return this.find({
        routeId,
        isActive: true
    }).sort({ slotNumber: 1 });
};
RouteSlotSchema.statics.getSlotsByDay = function (routeId, dayOfWeek) {
    return this.find({
        routeId,
        daysOfWeek: dayOfWeek,
        isActive: true
    }).sort({ departureTime: 1 });
};
const RouteSlot = mongoose_1.default.model('RouteSlot', RouteSlotSchema);
exports.default = RouteSlot;
