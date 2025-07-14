// src/models/Trip.ts
import mongoose, { Document, Schema } from 'mongoose';

export interface ITrip extends Document {
  userId: mongoose.Types.ObjectId;
  route: string;
  fromLocation: string;
  toLocation: string;
  date: Date;
  time: string;
  seat?: string;
  price: number;
  status: 'upcoming' | 'completed' | 'cancelled';
  bookingId?: string;
  createdAt: Date;
  updatedAt: Date;
}

const TripSchema = new Schema<ITrip>(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    route: {
      type: String,
      required: true,
    },
    fromLocation: {
      type: String,
      required: true,
    },
    toLocation: {
      type: String,
      required: true,
    },
    date: {
      type: Date,
      required: true,
    },
    time: {
      type: String,
      required: true,
    },
    seat: {
      type: String,
    },
    price: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: ['upcoming', 'completed', 'cancelled'],
      default: 'upcoming',
    },
    bookingId: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

const Trip = mongoose.model<ITrip>('Trip', TripSchema);

export default Trip;