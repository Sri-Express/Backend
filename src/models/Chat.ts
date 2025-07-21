// src/models/Chat.ts
import mongoose, { Document, Schema, Model } from 'mongoose';

export interface IMessage {
  messageId: string;
  sender: 'customer' | 'agent' | 'ai_bot' | 'system';
  senderId?: mongoose.Types.ObjectId;
  content: string;
  messageType: 'text' | 'image' | 'file' | 'system' | 'quick_reply';
  timestamp: Date;
  isRead: boolean;
  aiGenerated: boolean;
  metadata?: {
    fileName?: string;
    fileSize?: number;
    fileUrl?: string;
    quickReplyOptions?: string[];
    systemAction?: string;
  };
}

// --- THIS IS THE FIX: Add method signatures to the document interface ---
export interface IChat extends Document {
  sessionId: string;
  customerId: mongoose.Types.ObjectId;
  assignedAgent?: mongoose.Types.ObjectId;
  status: 'waiting' | 'active' | 'ended' | 'transferred';
  channel: 'web' | 'mobile' | 'whatsapp' | 'facebook' | 'email';
  messages: IMessage[];
  customerInfo: {
    name: string;
    email: string;
    phone?: string;
    location?: string;
    previousChats: number;
    isReturning: boolean;
  };
  agentInfo?: {
    agentId: mongoose.Types.ObjectId;
    name: string;
    joinedAt: Date;
    leftAt?: Date;
  };
  aiMetrics: {
    botHandledPercentage: number;
    transferredToHuman: boolean;
    transferReason?: string;
    aiResponseCount: number;
    aiConfidenceAvg: number;
    customerSatisfaction?: number;
  };
  queueInfo?: {
    queuePosition: number;
    estimatedWaitTime: number;
    queuedAt: Date;
  };
  sessionMetrics: {
    responseTime: {
      averageAgent: number;
      averageAI: number;
      firstResponse: number;
    };
    messageCount: {
      customer: number;
      agent: number;
      ai: number;
      total: number;
    };
  };
  tags: string[];
  relatedTicket?: mongoose.Types.ObjectId;
  feedback?: {
    rating: number;
    comment?: string;
    submittedAt: Date;
  };
  startedAt: Date;
  endedAt?: Date;
  duration?: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;

  // Method signatures
  addMessage(
    sender: 'customer' | 'agent' | 'ai_bot' | 'system',
    content: string,
    senderId?: mongoose.Types.ObjectId | string,
    messageType?: 'text' | 'image' | 'file' | 'system' | 'quick_reply',
    metadata?: any
  ): Promise<this>;
  assignToAgent(agentId: mongoose.Types.ObjectId | string, agentName: string): Promise<this>;
  transferToAgent(newAgentId: mongoose.Types.ObjectId | string, newAgentName: string, reason?: string): Promise<this>;
  endChat(feedback?: { rating: number; comment?: string }): Promise<this>;
  markAsRead(messageIds: string[]): Promise<this>;
}

// --- NEW: Interface for the static methods ---
export interface IChatModel extends Model<IChat> {
  getActiveChatsByAgent(agentId: string): Promise<IChat[]>;
  getWaitingChats(): Promise<IChat[]>;
  getChatStats(): Promise<any[]>;
}


const messageSchema = new Schema<IMessage>({
  messageId: { type: String, required: true, unique: true },
  sender: { type: String, required: true, enum: ['customer', 'agent', 'ai_bot', 'system'] },
  senderId: { type: Schema.Types.ObjectId, ref: 'User' },
  content: { type: String, required: true, maxlength: 1000 },
  messageType: { type: String, required: true, enum: ['text', 'image', 'file', 'system', 'quick_reply'], default: 'text' },
  timestamp: { type: Date, default: Date.now },
  isRead: { type: Boolean, default: false },
  aiGenerated: { type: Boolean, default: false },
  metadata: {
    fileName: String,
    fileSize: Number,
    fileUrl: String,
    quickReplyOptions: [String],
    systemAction: String
  }
}, { _id: false });

const chatSchema = new Schema<IChat>({
  sessionId: { type: String, required: true, unique: true },
  customerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  assignedAgent: { type: Schema.Types.ObjectId, ref: 'User' },
  status: { type: String, required: true, enum: ['waiting', 'active', 'ended', 'transferred'], default: 'waiting' },
  channel: { type: String, required: true, enum: ['web', 'mobile', 'whatsapp', 'facebook', 'email'], default: 'web' },
  messages: [messageSchema],
  customerInfo: {
    name: { type: String, required: true },
    email: { type: String, required: true },
    phone: String,
    location: String,
    previousChats: { type: Number, default: 0 },
    isReturning: { type: Boolean, default: false }
  },
  agentInfo: {
    agentId: { type: Schema.Types.ObjectId, ref: 'User' },
    name: String,
    joinedAt: { type: Date, default: Date.now },
    leftAt: Date
  },
  aiMetrics: {
    botHandledPercentage: { type: Number, default: 0, min: 0, max: 100 },
    transferredToHuman: { type: Boolean, default: false },
    transferReason: String,
    aiResponseCount: { type: Number, default: 0 },
    aiConfidenceAvg: { type: Number, default: 0, min: 0, max: 1 },
    customerSatisfaction: { type: Number, min: 1, max: 5 }
  },
  queueInfo: {
    queuePosition: Number,
    estimatedWaitTime: Number,
    queuedAt: { type: Date, default: Date.now }
  },
  sessionMetrics: {
    responseTime: {
      averageAgent: { type: Number, default: 0 },
      averageAI: { type: Number, default: 0 },
      firstResponse: { type: Number, default: 0 }
    },
    messageCount: {
      customer: { type: Number, default: 0 },
      agent: { type: Number, default: 0 },
      ai: { type: Number, default: 0 },
      total: { type: Number, default: 0 }
    }
  },
  tags: [String],
  relatedTicket: { type: Schema.Types.ObjectId, ref: 'Ticket' },
  feedback: {
    rating: { type: Number, min: 1, max: 5 },
    comment: String,
    submittedAt: { type: Date, default: Date.now }
  },
  startedAt: { type: Date, default: Date.now },
  endedAt: Date,
  duration: Number,
  isActive: { type: Boolean, default: true }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
chatSchema.index({ sessionId: 1 }, { unique: true });
chatSchema.index({ customerId: 1 });
chatSchema.index({ assignedAgent: 1 });
chatSchema.index({ status: 1 });
chatSchema.index({ startedAt: -1 });

// Virtuals
chatSchema.virtual('customer', {
  ref: 'User',
  localField: 'customerId',
  foreignField: '_id',
  justOne: true
});

chatSchema.virtual('agent', {
  ref: 'User',
  localField: 'assignedAgent',
  foreignField: '_id',
  justOne: true
});

// Pre-save hooks
chatSchema.pre('save', async function(next) {
  if (this.isNew && !this.sessionId) {
    const timestamp = Date.now().toString();
    const random = Math.random().toString(36).substring(2, 8);
    this.sessionId = `CS${timestamp.slice(-6)}${random}`.toUpperCase();
  }
  next();
});

chatSchema.pre('save', function(next) {
  if (this.isModified('status') && this.status === 'ended' && !this.endedAt) {
    this.endedAt = new Date();
    this.duration = Math.floor((this.endedAt.getTime() - this.startedAt.getTime()) / 1000);
  }
  next();
});

// Static methods
chatSchema.statics.getActiveChatsByAgent = function(agentId: string) {
  return this.find({ 
    assignedAgent: agentId, 
    status: 'active',
    isActive: true 
  }).populate('customer', 'name email');
};

chatSchema.statics.getWaitingChats = function() {
  return this.find({ 
    status: 'waiting',
    isActive: true 
  }).sort({ startedAt: 1 });
};

chatSchema.statics.getChatStats = function() {
  return this.aggregate([
    { $match: { isActive: true } },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        avgDuration: { $avg: '$duration' }
      }
    }
  ]);
};

// Instance methods
chatSchema.methods.addMessage = function(
  sender: 'customer' | 'agent' | 'ai_bot' | 'system',
  content: string,
  senderId?: mongoose.Types.ObjectId | string,
  messageType: 'text' | 'image' | 'file' | 'system' | 'quick_reply' = 'text',
  metadata?: any
) {
  const messageId = `MSG${Date.now()}${Math.random().toString(36).substring(2, 5)}`.toUpperCase();
  
  const message: IMessage = {
    messageId,
    sender,
    senderId: senderId ? new mongoose.Types.ObjectId(senderId) : undefined,
    content,
    messageType,
    timestamp: new Date(),
    isRead: false,
    aiGenerated: sender === 'ai_bot',
    metadata
  };
  
  this.messages.push(message);
  
  if (!this.sessionMetrics) {
    this.sessionMetrics = {
      responseTime: { averageAgent: 0, averageAI: 0, firstResponse: 0 },
      messageCount: { customer: 0, agent: 0, ai: 0, total: 0 }
    };
  }
  
  if (sender === 'customer') this.sessionMetrics.messageCount.customer++;
  else if (sender === 'agent') this.sessionMetrics.messageCount.agent++;
  else if (sender === 'ai_bot') this.sessionMetrics.messageCount.ai++;
  
  this.sessionMetrics.messageCount.total++;
  
  return this.save();
};

chatSchema.methods.assignToAgent = function(agentId: mongoose.Types.ObjectId | string, agentName: string) {
  this.assignedAgent = new mongoose.Types.ObjectId(agentId);
  this.agentInfo = {
    agentId: new mongoose.Types.ObjectId(agentId),
    name: agentName,
    joinedAt: new Date()
  };
  this.status = 'active';
  
  return this.save();
};

// --- NEW: Added transferToAgent method ---
chatSchema.methods.transferToAgent = function(newAgentId: mongoose.Types.ObjectId | string, newAgentName: string, reason?: string) {
    if (this.agentInfo) {
        this.agentInfo.leftAt = new Date();
    }
    this.status = 'transferred';
    this.messages.push({
        messageId: `MSG${Date.now()}${Math.random().toString(36).substring(2, 5)}`.toUpperCase(),
        sender: 'system',
        content: `Chat transferred to ${newAgentName}. Reason: ${reason || 'N/A'}`,
        messageType: 'system',
        timestamp: new Date(),
        isRead: false,
        aiGenerated: false
    });
    this.assignedAgent = new mongoose.Types.ObjectId(newAgentId);
    this.agentInfo = {
        agentId: new mongoose.Types.ObjectId(newAgentId),
        name: newAgentName,
        joinedAt: new Date()
    };
    this.status = 'active'; // Set back to active for the new agent
    return this.save();
};

chatSchema.methods.endChat = function(feedback?: { rating: number; comment?: string }) {
  this.status = 'ended';
  this.endedAt = new Date();
  this.duration = Math.floor((this.endedAt.getTime() - this.startedAt.getTime()) / 1000);
  
  if (feedback) {
    this.feedback = {
      rating: feedback.rating,
      comment: feedback.comment,
      submittedAt: new Date()
    };
  }
  
  return this.save();
};

chatSchema.methods.markAsRead = function(messageIds: string[]) {
  messageIds.forEach(msgId => {
    const message = this.messages.find((m: IMessage) => m.messageId === msgId);
    if (message) {
      message.isRead = true;
    }
  });
  
  return this.save();
};

export default mongoose.model<IChat, IChatModel>('Chat', chatSchema);