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
// src/models/Chat.ts
const mongoose_1 = __importStar(require("mongoose"));
const messageSchema = new mongoose_1.Schema({
    messageId: { type: String, required: true, unique: true },
    sender: { type: String, required: true, enum: ['customer', 'agent', 'ai_bot', 'system'] },
    senderId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User' },
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
const chatSchema = new mongoose_1.Schema({
    sessionId: { type: String, required: true, unique: true },
    customerId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true },
    assignedAgent: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User' },
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
        agentId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User' },
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
    relatedTicket: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Ticket' },
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
chatSchema.pre('save', async function (next) {
    if (this.isNew && !this.sessionId) {
        const timestamp = Date.now().toString();
        const random = Math.random().toString(36).substring(2, 8);
        this.sessionId = `CS${timestamp.slice(-6)}${random}`.toUpperCase();
    }
    next();
});
chatSchema.pre('save', function (next) {
    if (this.isModified('status') && this.status === 'ended' && !this.endedAt) {
        this.endedAt = new Date();
        this.duration = Math.floor((this.endedAt.getTime() - this.startedAt.getTime()) / 1000);
    }
    next();
});
// Static methods
chatSchema.statics.getActiveChatsByAgent = function (agentId) {
    return this.find({
        assignedAgent: agentId,
        status: 'active',
        isActive: true
    }).populate('customer', 'name email');
};
chatSchema.statics.getWaitingChats = function () {
    return this.find({
        status: 'waiting',
        isActive: true
    }).sort({ startedAt: 1 });
};
chatSchema.statics.getChatStats = function () {
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
chatSchema.methods.addMessage = function (sender, content, senderId, messageType = 'text', metadata) {
    const messageId = `MSG${Date.now()}${Math.random().toString(36).substring(2, 5)}`.toUpperCase();
    const message = {
        messageId,
        sender,
        senderId: senderId ? new mongoose_1.default.Types.ObjectId(senderId) : undefined,
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
    if (sender === 'customer')
        this.sessionMetrics.messageCount.customer++;
    else if (sender === 'agent')
        this.sessionMetrics.messageCount.agent++;
    else if (sender === 'ai_bot')
        this.sessionMetrics.messageCount.ai++;
    this.sessionMetrics.messageCount.total++;
    return this.save();
};
chatSchema.methods.assignToAgent = function (agentId, agentName) {
    this.assignedAgent = new mongoose_1.default.Types.ObjectId(agentId);
    this.agentInfo = {
        agentId: new mongoose_1.default.Types.ObjectId(agentId),
        name: agentName,
        joinedAt: new Date()
    };
    this.status = 'active';
    return this.save();
};
// --- NEW: Added transferToAgent method ---
chatSchema.methods.transferToAgent = function (newAgentId, newAgentName, reason) {
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
    this.assignedAgent = new mongoose_1.default.Types.ObjectId(newAgentId);
    this.agentInfo = {
        agentId: new mongoose_1.default.Types.ObjectId(newAgentId),
        name: newAgentName,
        joinedAt: new Date()
    };
    this.status = 'active'; // Set back to active for the new agent
    return this.save();
};
chatSchema.methods.endChat = function (feedback) {
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
chatSchema.methods.markAsRead = function (messageIds) {
    messageIds.forEach(msgId => {
        const message = this.messages.find((m) => m.messageId === msgId);
        if (message) {
            message.isRead = true;
        }
    });
    return this.save();
};
exports.default = mongoose_1.default.model('Chat', chatSchema);
