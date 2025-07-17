// src/models/Route.ts
import mongoose, { Document, Schema } from 'mongoose';

export interface IRoute extends Document {
  routeId: string;
  name: string;
  startLocation: {
    name: string;
    coordinates: [number, number];
    address: string;
  };
  endLocation: {
    name: string;
    coordinates: [number, number];
    address: string;
  };
  waypoints: [{
    name: string;
    coordinates: [number, number];
    estimatedTime: number; // minutes from start
    order: number;
  }];
  distance: number; // kilometers
  estimatedDuration: number; // minutes
  schedules: [{
    departureTime: string; // "08:30"
    arrivalTime: string;   // "12:15"
    frequency: number;     // minutes between departures
    daysOfWeek: string[];  // ["monday", "tuesday", ...]
    isActive: boolean;
  }];
  operatorInfo: {
    fleetId: mongoose.Types.ObjectId;
    companyName: string;
    contactNumber: string;
  };
  vehicleInfo: {
    type: 'bus' | 'train';
    capacity: number;
    amenities: string[]; // ["AC", "WiFi", "Charging"]
  };
  pricing: {
    basePrice: number;
    pricePerKm: number;
    discounts: [{
      type: 'student' | 'senior' | 'military';
      percentage: number;
    }];
  };
  status: 'active' | 'inactive' | 'maintenance';
  avgRating: number;
  totalReviews: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const RouteSchema = new Schema<IRoute>(
  {
    routeId: {
      type: String,
      required: true,
      unique: true,
    },
    name: {
      type: String,
      required: true,
    },
    startLocation: {
      name: { type: String, required: true },
      coordinates: {
        type: [Number],
        required: true,
        validate: {
          validator: function(v: number[]) {
            return v.length === 2;
          },
          message: 'Coordinates must be [longitude, latitude]'
        }
      },
      address: { type: String, required: true }
    },
    endLocation: {
      name: { type: String, required: true },
      coordinates: {
        type: [Number],
        required: true,
        validate: {
          validator: function(v: number[]) {
            return v.length === 2;
          },
          message: 'Coordinates must be [longitude, latitude]'
        }
      },
      address: { type: String, required: true }
    },
    waypoints: [{
      name: { type: String, required: true },
      coordinates: {
        type: [Number],
        required: true,
        validate: {
          validator: function(v: number[]) {
            return v.length === 2;
          },
          message: 'Coordinates must be [longitude, latitude]'
        }
      },
      estimatedTime: { type: Number, required: true },
      order: { type: Number, required: true }
    }],
    distance: {
      type: Number,
      required: true,
      min: 0
    },
    estimatedDuration: {
      type: Number,
      required: true,
      min: 0
    },
    schedules: [{
      departureTime: { type: String, required: true },
      arrivalTime: { type: String, required: true },
      frequency: { type: Number, required: true, min: 5 },
      daysOfWeek: {
        type: [String],
        required: true,
        enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
      },
      isActive: { type: Boolean, default: true }
    }],
    operatorInfo: {
      fleetId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Fleet',
        required: true
      },
      companyName: { type: String, required: true },
      contactNumber: { type: String, required: true }
    },
    vehicleInfo: {
      type: {
        type: String,
        enum: ['bus', 'train'],
        required: true
      },
      capacity: {
        type: Number,
        required: true,
        min: 1
      },
      amenities: {
        type: [String],
        default: []
      }
    },
    pricing: {
      basePrice: {
        type: Number,
        required: true,
        min: 0
      },
      pricePerKm: {
        type: Number,
        required: true,
        min: 0
      },
      discounts: [{
        type: {
          type: String,
          enum: ['student', 'senior', 'military'],
          required: true
        },
        percentage: {
          type: Number,
          required: true,
          min: 0,
          max: 100
        }
      }]
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'maintenance'],
      default: 'active'
    },
    avgRating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5
    },
    totalReviews: {
      type: Number,
      default: 0,
      min: 0
    },
    isActive: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true,
  }
);

// Indexes for better query performance
RouteSchema.index({ routeId: 1 });
RouteSchema.index({ 'startLocation.name': 1 });
RouteSchema.index({ 'endLocation.name': 1 });
RouteSchema.index({ status: 1 });
RouteSchema.index({ isActive: 1 });
RouteSchema.index({ 'operatorInfo.fleetId': 1 });
RouteSchema.index({ 'vehicleInfo.type': 1 });

// Generate routeId before saving
RouteSchema.pre('save', function(next) {
  if (!this.routeId) {
    this.routeId = `RT${Date.now()}${Math.floor(Math.random() * 1000)}`;
  }
  next();
});

// Calculate price method
RouteSchema.methods.calculatePrice = function(passengerType: string = 'regular') {
  let totalPrice = this.pricing.basePrice + (this.distance * this.pricing.pricePerKm);
  
  // Apply discounts
  const discount = this.pricing.discounts.find((d: any) => d.type === passengerType);
  if (discount) {
    totalPrice = totalPrice * (1 - discount.percentage / 100);
  }
  
  return Math.round(totalPrice);
};

// Get next departures method
RouteSchema.methods.getNextDepartures = function(limit: number = 5) {
  const now = new Date();
  const currentDay = now.toLocaleLString('en-US', { weekday: 'lowercase' });
  const currentTime = now.toTimeString().slice(0, 5); // HH:MM format
  
  return this.schedules
    .filter((schedule: any) => 
      schedule.isActive && 
      schedule.daysOfWeek.includes(currentDay) &&
      schedule.departureTime > currentTime
    )
    .slice(0, limit);
};

const Route = mongoose.model<IRoute>('Route', RouteSchema);

export default Route;