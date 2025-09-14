// src/models/LostAndFound.ts
import mongoose, { Document, Schema } from 'mongoose';

export interface ILostAndFound extends Document {
  // Basic item information
  title: string;
  description: string;
  category: 'electronics' | 'personal' | 'documents' | 'clothing' | 'accessories' | 'bags' | 'books' | 'keys' | 'other';
  brand?: string;
  color?: string;
  size?: string;
  
  // Status and type
  type: 'lost' | 'found';
  status: 'active' | 'matched' | 'claimed' | 'expired' | 'cancelled';
  
  // Location information
  locationFound?: string;
  locationLost?: string;
  routeId?: mongoose.Types.ObjectId;
  vehicleId?: string;
  stopName?: string;
  
  // Date and time
  dateReported: Date;
  dateLostOrFound: Date;
  
  // User information
  reportedBy: mongoose.Types.ObjectId;
  contactName: string;
  contactPhone?: string;
  contactEmail?: string;
  
  // Media
  images?: string[]; // S3 URLs for uploaded images
  
  // Matching and claims
  potentialMatches?: mongoose.Types.ObjectId[];
  claimedBy?: mongoose.Types.ObjectId;
  claimDate?: Date;
  
  // Privacy and security
  isPublic: boolean; // Whether to show contact details publicly
  verificationCode?: string; // Code for claiming items
  
  // Additional details
  additionalInfo?: string;
  reward?: number; // Optional reward amount
  
  // System fields
  isActive: boolean;
  expiryDate: Date; // Auto-expire after certain period
  viewCount: number;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  _id: mongoose.Types.ObjectId;

  // Instance methods
  incrementViewCount(): Promise<ILostAndFound>;
  claimItem(userId: mongoose.Types.ObjectId): Promise<ILostAndFound>;
  markAsMatched(matchId: mongoose.Types.ObjectId): Promise<ILostAndFound>;
  extendExpiry(days?: number): Promise<ILostAndFound>;
}

const LostAndFoundSchema = new Schema<ILostAndFound>(
  {
    // Basic item information
    title: {
      type: String,
      required: [true, 'Item title is required'],
      trim: true,
      maxlength: [100, 'Title cannot exceed 100 characters']
    },
    description: {
      type: String,
      required: [true, 'Item description is required'],
      trim: true,
      maxlength: [1000, 'Description cannot exceed 1000 characters']
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      enum: ['electronics', 'personal', 'documents', 'clothing', 'accessories', 'bags', 'books', 'keys', 'other'],
      default: 'other'
    },
    brand: {
      type: String,
      trim: true,
      maxlength: [50, 'Brand cannot exceed 50 characters']
    },
    color: {
      type: String,
      trim: true,
      maxlength: [30, 'Color cannot exceed 30 characters']
    },
    size: {
      type: String,
      trim: true,
      maxlength: [20, 'Size cannot exceed 20 characters']
    },
    
    // Status and type
    type: {
      type: String,
      required: [true, 'Type is required'],
      enum: ['lost', 'found']
    },
    status: {
      type: String,
      enum: ['active', 'matched', 'claimed', 'expired', 'cancelled'],
      default: 'active'
    },
    
    // Location information
    locationFound: {
      type: String,
      trim: true,
      maxlength: [200, 'Location cannot exceed 200 characters']
    },
    locationLost: {
      type: String,
      trim: true,
      maxlength: [200, 'Location cannot exceed 200 characters']
    },
    routeId: {
      type: Schema.Types.ObjectId,
      ref: 'Route'
    },
    vehicleId: {
      type: String,
      trim: true
    },
    stopName: {
      type: String,
      trim: true,
      maxlength: [100, 'Stop name cannot exceed 100 characters']
    },
    
    // Date and time
    dateReported: {
      type: Date,
      default: Date.now
    },
    dateLostOrFound: {
      type: Date,
      required: [true, 'Date lost or found is required']
    },
    
    // User information
    reportedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Reporter is required']
    },
    contactName: {
      type: String,
      required: [true, 'Contact name is required'],
      trim: true,
      maxlength: [100, 'Contact name cannot exceed 100 characters']
    },
    contactPhone: {
      type: String,
      trim: true,
      validate: {
        validator: function(v: string) {
          if (!v) return true; // Optional field
          return /^\+?[\d\s-()]+$/.test(v);
        },
        message: 'Please provide a valid phone number'
      }
    },
    contactEmail: {
      type: String,
      trim: true,
      lowercase: true,
      validate: {
        validator: function(v: string) {
          if (!v) return true; // Optional field
          return /^\S+@\S+\.\S+$/.test(v);
        },
        message: 'Please provide a valid email address'
      }
    },
    
    // Media
    images: [{
      type: String,
      validate: {
        validator: function(v: string) {
          return /^https?:\/\/.+/.test(v);
        },
        message: 'Image must be a valid URL'
      }
    }],
    
    // Matching and claims
    potentialMatches: [{
      type: Schema.Types.ObjectId,
      ref: 'LostAndFound'
    }],
    claimedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    claimDate: Date,
    
    // Privacy and security
    isPublic: {
      type: Boolean,
      default: true
    },
    verificationCode: {
      type: String,
      maxlength: [10, 'Verification code cannot exceed 10 characters']
    },
    
    // Additional details
    additionalInfo: {
      type: String,
      trim: true,
      maxlength: [500, 'Additional info cannot exceed 500 characters']
    },
    reward: {
      type: Number,
      min: [0, 'Reward cannot be negative'],
      max: [1000000, 'Reward cannot exceed 1,000,000']
    },
    
    // System fields
    isActive: {
      type: Boolean,
      default: true
    },
    expiryDate: {
      type: Date,
      required: true,
      default: function() {
        // Default expiry: 90 days from now
        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + 90);
        return expiryDate;
      }
    },
    viewCount: {
      type: Number,
      default: 0,
      min: 0
    }
  },
  {
    timestamps: true,
  }
);

// Indexes for better query performance
LostAndFoundSchema.index({ type: 1, status: 1 });
LostAndFoundSchema.index({ category: 1 });
LostAndFoundSchema.index({ routeId: 1 });
LostAndFoundSchema.index({ reportedBy: 1 });
LostAndFoundSchema.index({ dateReported: -1 });
LostAndFoundSchema.index({ dateLostOrFound: -1 });
LostAndFoundSchema.index({ expiryDate: 1 });
LostAndFoundSchema.index({ isActive: 1 });
LostAndFoundSchema.index({ 
  title: 'text', 
  description: 'text', 
  brand: 'text',
  color: 'text',
  locationFound: 'text',
  locationLost: 'text' 
});

// Pre-save middleware to generate verification code for found items
LostAndFoundSchema.pre('save', function (next) {
  if (this.isNew && this.type === 'found' && !this.verificationCode) {
    this.verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
  }
  next();
});

// Virtual for days since reported
LostAndFoundSchema.virtual('daysSinceReported').get(function() {
  if (!this.dateReported) return 0;
  const diffTime = Math.abs(new Date().getTime() - this.dateReported.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
});

// Virtual for days until expiry
LostAndFoundSchema.virtual('daysUntilExpiry').get(function() {
  if (!this.expiryDate) return 0;
  const diffTime = this.expiryDate.getTime() - new Date().getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return Math.max(0, diffDays);
});

// Virtual for is expired
LostAndFoundSchema.virtual('isExpired').get(function() {
  return new Date() > this.expiryDate;
});

// Method to increment view count
LostAndFoundSchema.methods.incrementViewCount = function() {
  this.viewCount += 1;
  return this.save();
};

// Method to claim item
LostAndFoundSchema.methods.claimItem = function(userId: mongoose.Types.ObjectId) {
  this.status = 'claimed';
  this.claimedBy = userId;
  this.claimDate = new Date();
  return this.save();
};

// Method to mark as matched
LostAndFoundSchema.methods.markAsMatched = function(matchId: mongoose.Types.ObjectId) {
  this.status = 'matched';
  if (!this.potentialMatches) {
    this.potentialMatches = [];
  }
  if (!this.potentialMatches.includes(matchId)) {
    this.potentialMatches.push(matchId);
  }
  return this.save();
};

// Method to extend expiry date
LostAndFoundSchema.methods.extendExpiry = function(days: number = 30) {
  const newExpiryDate = new Date(this.expiryDate);
  newExpiryDate.setDate(newExpiryDate.getDate() + days);
  this.expiryDate = newExpiryDate;
  return this.save();
};

// Static method to get active items
LostAndFoundSchema.statics.getActiveItems = function(type?: 'lost' | 'found') {
  const query: any = { 
    isActive: true, 
    status: 'active',
    expiryDate: { $gt: new Date() }
  };
  
  if (type) {
    query.type = type;
  }
  
  return this.find(query)
    .populate('reportedBy', 'name')
    .populate('routeId', 'name')
    .sort({ dateReported: -1 });
};

// Static method to get items by category
LostAndFoundSchema.statics.getByCategory = function(category: string, type?: 'lost' | 'found') {
  const query: any = { 
    category,
    isActive: true, 
    status: 'active',
    expiryDate: { $gt: new Date() }
  };
  
  if (type) {
    query.type = type;
  }
  
  return this.find(query)
    .populate('reportedBy', 'name')
    .populate('routeId', 'name')
    .sort({ dateReported: -1 });
};

// Static method to search items
LostAndFoundSchema.statics.searchItems = function(searchTerm: string, type?: 'lost' | 'found') {
  const query: any = {
    $text: { $search: searchTerm },
    isActive: true,
    status: 'active',
    expiryDate: { $gt: new Date() }
  };
  
  if (type) {
    query.type = type;
  }
  
  return this.find(query)
    .populate('reportedBy', 'name')
    .populate('routeId', 'name')
    .sort({ score: { $meta: 'textScore' } });
};

// Static method to find potential matches
LostAndFoundSchema.statics.findPotentialMatches = async function(itemId: string) {
  const item = await this.findById(itemId);
  if (!item) return [];
  
  const oppositeType = item.type === 'lost' ? 'found' : 'lost';
  const dateRange = 7; // days
  
  const query: any = {
    type: oppositeType,
    category: item.category,
    isActive: true,
    status: 'active',
    expiryDate: { $gt: new Date() },
    _id: { $ne: item._id }
  };
  
  // Add date range filter
  const startDate = new Date(item.dateLostOrFound);
  startDate.setDate(startDate.getDate() - dateRange);
  const endDate = new Date(item.dateLostOrFound);
  endDate.setDate(endDate.getDate() + dateRange);
  
  query.dateLostOrFound = { $gte: startDate, $lte: endDate };
  
  // Add color match if available
  if (item.color) {
    query.color = new RegExp(item.color, 'i');
  }
  
  // Add brand match if available
  if (item.brand) {
    query.brand = new RegExp(item.brand, 'i');
  }
  
  return this.find(query)
    .populate('reportedBy', 'name')
    .populate('routeId', 'name')
    .limit(10);
};

// Static method to get statistics
LostAndFoundSchema.statics.getStats = async function() {
  const stats = await this.aggregate([
    {
      $group: {
        _id: {
          type: '$type',
          status: '$status'
        },
        count: { $sum: 1 }
      }
    }
  ]);
  
  const categoryStats = await this.aggregate([
    {
      $group: {
        _id: '$category',
        lost: { $sum: { $cond: [{ $eq: ['$type', 'lost'] }, 1, 0] } },
        found: { $sum: { $cond: [{ $eq: ['$type', 'found'] }, 1, 0] } }
      }
    }
  ]);
  
  return { statusStats: stats, categoryStats };
};

// Interface for the model with static methods
interface ILostAndFoundModel extends mongoose.Model<ILostAndFound> {
  getActiveItems(type?: 'lost' | 'found'): Promise<ILostAndFound[]>;
  getByCategory(category: string, type?: 'lost' | 'found'): Promise<ILostAndFound[]>;
  searchItems(searchTerm: string, type?: 'lost' | 'found'): Promise<ILostAndFound[]>;
  findPotentialMatches(itemId: string): Promise<ILostAndFound[]>;
  getStats(): Promise<any>;
}

const LostAndFound = mongoose.model<ILostAndFound, ILostAndFoundModel>('LostAndFound', LostAndFoundSchema);

export default LostAndFound;