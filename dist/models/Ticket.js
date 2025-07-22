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
const mongoose_1 = __importStar(require("mongoose"));
const timelineSchema = new mongoose_1.Schema({
    action: {
        type: String,
        required: true,
        enum: ['created', 'assigned', 'status_changed', 'note_added', 'escalated', 'resolved', 'closed', 'reopened']
    },
    agent: {
        type: mongoose_1.Schema.Types.ObjectId,
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
const resolutionSchema = new mongoose_1.Schema({
    solution: {
        type: String,
        required: true
    },
    resolvedAt: {
        type: Date,
        default: Date.now
    },
    resolvedBy: {
        type: mongoose_1.Schema.Types.ObjectId,
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
const escalationSchema = new mongoose_1.Schema({
    escalated: {
        type: Boolean,
        default: false
    },
    escalatedAt: Date,
    escalatedBy: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User'
    },
    escalatedTo: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User'
    },
    reason: String
}, { _id: false });
const aiAnalysisSchema = new mongoose_1.Schema({
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
const customerInfoSchema = new mongoose_1.Schema({
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
const ticketSchema = new mongoose_1.Schema({
    ticketId: {
        type: String,
        required: true,
        unique: true
    },
    customerId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    assignedAgent: {
        type: mongoose_1.Schema.Types.ObjectId,
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
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Booking'
    },
    relatedRoute: {
        type: mongoose_1.Schema.Types.ObjectId,
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
ticketSchema.pre('save', async function (next) {
    if (this.isNew && !this.ticketId) {
        const count = await mongoose_1.default.model('Ticket').countDocuments();
        this.ticketId = `TKT${Date.now().toString().slice(-6)}${(count + 1).toString().padStart(4, '0')}`;
    }
    next();
});
// Add timeline entry on status change
ticketSchema.pre('save', function (next) {
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
ticketSchema.statics.getTicketsByAgent = function (agentId) {
    return this.find({
        assignedAgent: agentId,
        status: { $in: ['open', 'in_progress'] },
        isActive: true
    }).populate('customer', 'name email phone');
};
ticketSchema.statics.getTicketsByPriority = function (priority) {
    return this.find({
        priority,
        status: { $in: ['open', 'in_progress'] },
        isActive: true
    }).sort({ createdAt: -1 });
};
ticketSchema.statics.getTicketStats = function () {
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
ticketSchema.methods.addTimelineEntry = function (action, agent, note) {
    this.timeline.push({
        action,
        agent,
        timestamp: new Date(),
        note,
        systemGenerated: false
    });
    return this.save();
};
ticketSchema.methods.escalateTicket = function (escalatedBy, escalatedTo, reason) {
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
ticketSchema.methods.resolveTicket = function (solution, resolvedBy, satisfaction, feedback) {
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
exports.default = mongoose_1.default.model('Ticket', ticketSchema);
