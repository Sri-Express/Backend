// src/models/RouteSlot.ts - Route Time Slot Management Model
import mongoose, { Document, Schema } from 'mongoose';

export interface IRouteSlot extends Document {
  routeId: mongoose.Types.ObjectId;
  slotNumber: number; // Sequential slot number (1, 2, 3, etc.)
  departureTime: string; // HH:MM format
  arrivalTime: string; // HH:MM format
  bufferMinutes: number; // Buffer time before next slot (default: 15)
  daysOfWeek: string[]; // ['monday', 'tuesday', etc.]
  slotType: 'regular' | 'rush_hour' | 'peak' | 'night';
  maxCapacity: number; // How many vehicles can use this slot
  isActive: boolean;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const RouteSlotSchema = new Schema<IRouteSlot>(
  {
    routeId: {
      type: mongoose.Schema.Types.ObjectId,
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
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    }
  },
  {
    timestamps: true
  }
);

// Indexes
RouteSlotSchema.index({ routeId: 1, slotNumber: 1 });
RouteSlotSchema.index({ routeId: 1, departureTime: 1 });
RouteSlotSchema.index({ routeId: 1, isActive: 1 });
RouteSlotSchema.index({ daysOfWeek: 1, isActive: 1 });

// Compound unique index to prevent slot conflicts
RouteSlotSchema.index(
  { routeId: 1, slotNumber: 1 },
  { unique: true }
);

// Static methods
RouteSlotSchema.statics.getActiveSlotsByRoute = function(routeId: mongoose.Types.ObjectId) {
  return this.find({
    routeId,
    isActive: true
  }).sort({ slotNumber: 1 });
};

RouteSlotSchema.statics.getSlotsByDay = function(routeId: mongoose.Types.ObjectId, dayOfWeek: string) {
  return this.find({
    routeId,
    daysOfWeek: dayOfWeek,
    isActive: true
  }).sort({ departureTime: 1 });
};

const RouteSlot = mongoose.model<IRouteSlot>('RouteSlot', RouteSlotSchema);

export default RouteSlot;