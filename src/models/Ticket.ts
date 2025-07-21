import mongoose, { Document, Schema } from 'mongoose';

// --- THIS IS THE FIX: Add the method signatures to the interface ---
export interface ITicket extends Document {
  ticketId: string;
  customerId: mongoose.Types.ObjectId;
  assignedAgent?: mongoose.Types.ObjectId;
  category: 'booking' | 'payment' | 'tracking' | 'route' | 'complaint' | 'technical' | 'general';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'open' | 'in_progress' | 'pending_customer' | 'resolved' | 'closed';
  subject: string;
  description: string;
  attachments: string[];
  tags: string[];
  relatedBooking?: mongoose.Types.ObjectId;
  relatedRoute?: mongoose.Types.ObjectId;
  timeline: Array<{
    action: string;
    agent?: mongoose.Types.ObjectId;
    timestamp: Date;
    note?: string;
    systemGenerated?: boolean;
  }>;
  resolution?: {
    solution: string;
    resolvedAt: Date;
    resolvedBy: mongoose.Types.ObjectId;
    customerSatisfaction?: number; // 1-5 rating
    feedback?: string;
  };
  escalation?: {
    escalated: boolean;
    escalatedAt?: Date;
    escalatedBy?: mongoose.Types.ObjectId;
    escalatedTo?: mongoose.Types.ObjectId;
    reason?: string;
  };
  aiAnalysis?: {
    sentiment: 'positive' | 'neutral' | 'negative';
    suggestedCategory?: string;
    suggestedPriority?: string;
    confidenceScore?: number; // 0-1
    keyPhrases?: string[];
  };
  customerInfo: {
    name: string;
    email: string;
    phone?: string;
    location?: string;
    previousTickets?: number;
  };
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;

  // Method signatures
  addTimelineEntry(action: string, agent?: string, note?: string): Promise<this>;
  escalateTicket(escalatedBy: string, escalatedTo: string, reason: string): Promise<this>;
  resolveTicket(solution: string, resolvedBy: string, satisfaction?: number, feedback?: string): Promise<this>;
}

const timelineSchema = new Schema({
  action: {
    type: String,
    required: true,
    enum: ['created', 'assigned', 'status_changed', 'note_added', 'escalated', 'resolved', 'closed', 'reopened']
  },
  agent: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  note: String,
  systemGenerated: {
    type: Boolean,
    default: false
  }
}, { _id: true });

const resolutionSchema = new Schema({
  solution: {
    type: String,
    required: true
  },
  resolvedAt: {
    type: Date,
    default: Date.now
  },
  resolvedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  customerSatisfaction: {
    type: Number,
    min: 1,
    max: 5
  },
  feedback: String
}, { _id: false });

const escalationSchema = new Schema({
  escalated: {
    type: Boolean,
    default: false
  },
  escalatedAt: Date,
  escalatedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  escalatedTo: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  reason: String
}, { _id: false });

const aiAnalysisSchema = new Schema({
  sentiment: {
    type: String,
    enum: ['positive', 'neutral', 'negative']
  },
  suggestedCategory: String,
  suggestedPriority: String,
  confidenceScore: {
    type: Number,
    min: 0,
    max: 1
  },
  keyPhrases: [String]
}, { _id: false });

const customerInfoSchema = new Schema({
  name: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true
  },
  phone: String,
  location: String,
  previousTickets: {
    type: Number,
    default: 0
  }
}, { _id: false });

const ticketSchema = new Schema<ITicket>({
  ticketId: {
    type: String,
    required: true,
    unique: true
  },
  customerId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  assignedAgent: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  category: {
    type: String,
    required: true,
    enum: ['booking', 'payment', 'tracking', 'route', 'complaint', 'technical', 'general'],
    default: 'general'
  },
  priority: {
    type: String,
    required: true,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  status: {
    type: String,
    required: true,
    enum: ['open', 'in_progress', 'pending_customer', 'resolved', 'closed'],
    default: 'open'
  },
  subject: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  description: {
    type: String,
    required: true,
    trim: true,
    maxlength: 2000
  },
  attachments: [String],
  tags: [String],
  relatedBooking: {
    type: Schema.Types.ObjectId,
    ref: 'Booking'
  },
  relatedRoute: {
    type: Schema.Types.ObjectId,
    ref: 'Route'
  },
  timeline: [timelineSchema],
  resolution: resolutionSchema,
  escalation: escalationSchema,
  aiAnalysis: aiAnalysisSchema,
  customerInfo: {
    type: customerInfoSchema,
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
ticketSchema.index({ ticketId: 1 }, { unique: true });
ticketSchema.index({ customerId: 1 });
ticketSchema.index({ assignedAgent: 1 });
ticketSchema.index({ status: 1 });
ticketSchema.index({ priority: 1 });
ticketSchema.index({ category: 1 });
ticketSchema.index({ createdAt: -1 });
ticketSchema.index({ 'customerInfo.email': 1 });

// Virtual for assigned agent info
ticketSchema.virtual('agentInfo', {
  ref: 'User',
  localField: 'assignedAgent',
  foreignField: '_id',
  justOne: true
});

// Virtual for customer info
ticketSchema.virtual('customer', {
  ref: 'User',
  localField: 'customerId',
  foreignField: '_id',
  justOne: true
});

// Virtual for related booking info
ticketSchema.virtual('bookingInfo', {
  ref: 'Booking',
  localField: 'relatedBooking',
  foreignField: '_id',
  justOne: true
});

// Generate unique ticket ID
ticketSchema.pre('save', async function(next) {
  if (this.isNew && !this.ticketId) {
    const count = await mongoose.model('Ticket').countDocuments();
    this.ticketId = `TKT${Date.now().toString().slice(-6)}${(count + 1).toString().padStart(4, '0')}`;
  }
  next();
});

// Add timeline entry on status change
ticketSchema.pre('save', function(next) {
  if (this.isModified('status') && !this.isNew) {
    this.timeline.push({
      action: 'status_changed',
      agent: this.assignedAgent,
      timestamp: new Date(),
      note: `Status changed to ${this.status}`,
      systemGenerated: true
    });
  }
  
  if (this.isModified('assignedAgent') && !this.isNew) {
    this.timeline.push({
      action: 'assigned',
      agent: this.assignedAgent,
      timestamp: new Date(),
      note: `Ticket assigned to agent`,
      systemGenerated: true
    });
  }
  
  next();
});

// Static methods
ticketSchema.statics.getTicketsByAgent = function(agentId: string) {
  return this.find({ 
    assignedAgent: agentId, 
    status: { $in: ['open', 'in_progress'] },
    isActive: true 
  }).populate('customer', 'name email phone');
};

ticketSchema.statics.getTicketsByPriority = function(priority: string) {
  return this.find({ 
    priority, 
    status: { $in: ['open', 'in_progress'] },
    isActive: true 
  }).sort({ createdAt: -1 });
};

ticketSchema.statics.getTicketStats = function() {
  return this.aggregate([
    { $match: { isActive: true } },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 }
      }
    }
  ]);
};

// Instance methods
ticketSchema.methods.addTimelineEntry = function(action: string, agent?: string, note?: string) {
  this.timeline.push({
    action,
    agent,
    timestamp: new Date(),
    note,
    systemGenerated: false
  });
  return this.save();
};

ticketSchema.methods.escalateTicket = function(escalatedBy: string, escalatedTo: string, reason: string) {
  this.escalation = {
    escalated: true,
    escalatedAt: new Date(),
    escalatedBy,
    escalatedTo,
    reason
  };
  this.priority = 'urgent';
  this.assignedAgent = escalatedTo;
  return this.save();
};

ticketSchema.methods.resolveTicket = function(solution: string, resolvedBy: string, satisfaction?: number, feedback?: string) {
  this.resolution = {
    solution,
    resolvedAt: new Date(),
    resolvedBy,
    customerSatisfaction: satisfaction,
    feedback
  };
  this.status = 'resolved';
  return this.save();
};

export default mongoose.model<ITicket>('Ticket', ticketSchema);