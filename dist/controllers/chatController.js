"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getChatStats = exports.getWaitingQueue = exports.markAsRead = exports.endChat = exports.transferChat = exports.assignChat = exports.sendMessage = exports.startChat = exports.getChatById = exports.getChatSessions = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const Chat_1 = __importDefault(require("../models/Chat"));
const User_1 = __importDefault(require("../models/User"));
// Get all chat sessions with filtering and pagination
const getChatSessions = async (req, res) => {
    try {
        const { page = 1, limit = 20, status, assignedAgent, channel, search, sortBy = 'startedAt', sortOrder = 'desc', dateFrom, dateTo } = req.query;
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const skip = (pageNum - 1) * limitNum;
        // Build filter query
        const filter = { isActive: true };
        if (status)
            filter.status = status;
        if (channel)
            filter.channel = channel;
        if (assignedAgent && assignedAgent !== 'unassigned')
            filter.assignedAgent = assignedAgent;
        else if (assignedAgent === 'unassigned')
            filter.assignedAgent = { $exists: false };
        // Date range filter
        if (dateFrom || dateTo) {
            filter.startedAt = {};
            if (dateFrom)
                filter.startedAt.$gte = new Date(dateFrom);
            if (dateTo)
                filter.startedAt.$lte = new Date(dateTo);
        }
        // Search filter
        if (search) {
            filter.$or = [
                { sessionId: { $regex: search, $options: 'i' } },
                { 'customerInfo.name': { $regex: search, $options: 'i' } },
                { 'customerInfo.email': { $regex: search, $options: 'i' } },
                { 'messages.content': { $regex: search, $options: 'i' } }
            ];
        }
        // Sort configuration
        const sort = {};
        sort[sortBy] = sortOrder === 'desc' ? -1 : 1;
        const [chats, total] = await Promise.all([
            Chat_1.default.find(filter).sort(sort).skip(skip).limit(limitNum).populate('assignedAgent', 'name email role').populate('customer', 'name email phone').lean(),
            Chat_1.default.countDocuments(filter)
        ]);
        const totalPages = Math.ceil(total / limitNum);
        res.json({
            success: true,
            data: {
                sessions: chats,
                pagination: { current: pageNum, pages: totalPages, total, hasNext: pageNum < totalPages, hasPrev: pageNum > 1 },
                filters: { status, assignedAgent, channel, search, dateFrom, dateTo }
            }
        });
    }
    catch (error) {
        console.error('Get chat sessions error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch chat sessions', error: error instanceof Error ? error.message : 'Unknown error' });
    }
};
exports.getChatSessions = getChatSessions;
// Get single chat session by ID
const getChatById = async (req, res) => {
    try {
        const { id } = req.params;
        const chat = await Chat_1.default.findOne({ $or: [{ _id: mongoose_1.default.Types.ObjectId.isValid(id) ? id : null }, { sessionId: id }], isActive: true })
            .populate('assignedAgent', 'name email role')
            .populate('customer', 'name email phone')
            .populate('relatedTicket', 'ticketId subject status');
        if (!chat)
            return res.status(404).json({ success: false, message: 'Chat session not found' });
        // Get customer's previous chats
        const previousChats = await Chat_1.default.find({ customerId: chat.customerId, _id: { $ne: chat._id }, isActive: true })
            .select('sessionId status startedAt endedAt duration feedback.rating')
            .sort({ startedAt: -1 })
            .limit(5);
        res.json({ success: true, data: { chat, previousChats } });
    }
    catch (error) {
        console.error('Get chat error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch chat session', error: error instanceof Error ? error.message : 'Unknown error' });
    }
};
exports.getChatById = getChatById;
// Start new chat session
const startChat = async (req, res) => {
    var _a;
    try {
        let { customerId, channel = 'web', initialMessage } = req.body;
        // Handle both real users and anonymous users
        let customer;
        let customerInfo;
        if (customerId && customerId.startsWith('anonymous-')) {
            // Anonymous user - create a fake ObjectId
            const fakeObjectId = new mongoose_1.default.Types.ObjectId();
            customerInfo = {
                name: 'Anonymous User',
                email: 'anonymous@temp.com',
                phone: '',
                previousChats: 0,
                isReturning: false
            };
            customerId = fakeObjectId; // Use fake ObjectId
        }
        else if (customerId) {
            // Real user - try to find them
            try {
                customer = await User_1.default.findById(customerId);
                if (customer) {
                    customerInfo = {
                        name: customer.name,
                        email: customer.email,
                        phone: customer.phone || '',
                        previousChats: 0,
                        isReturning: false
                    };
                }
                else {
                    return res.status(400).json({ success: false, message: 'Customer not found' });
                }
            }
            catch (error) {
                return res.status(400).json({ success: false, message: 'Invalid customer ID format' });
            }
        }
        else {
            // No customer ID provided - create fake ObjectId
            const fakeObjectId = new mongoose_1.default.Types.ObjectId();
            customerInfo = {
                name: 'Guest User',
                email: 'guest@temp.com',
                phone: '',
                previousChats: 0,
                isReturning: false
            };
            customerId = fakeObjectId;
        }
        // Count previous chats
        const previousChats = await Chat_1.default.countDocuments({ customerId, isActive: true });
        // Generate sessionId manually
        const timestamp = Date.now().toString();
        const random = Math.random().toString(36).substring(2, 8);
        const sessionId = `CS${timestamp.slice(-6)}${random}`.toUpperCase();
        const chatData = {
            sessionId: sessionId, // <-- ADD THIS LINE
            customerId,
            channel,
            customerInfo: customerInfo,
            messages: [],
            queueInfo: await calculateQueuePosition()
        };
        const chat = new Chat_1.default(chatData);
        // Add initial message if provided
        if (initialMessage) {
            await chat.addMessage('customer', initialMessage, customerId);
        }
        // Add welcome system message
        await chat.addMessage('system', `Welcome to Sri Express support! ${customerInfo.name}, you are currently ${((_a = chat.queueInfo) === null || _a === void 0 ? void 0 : _a.queuePosition) ? `#${chat.queueInfo.queuePosition} in queue.` : 'being connected to an agent.'}`, undefined, 'system');
        await chat.save();
        await chat.populate('customer', 'name email');
        res.status(201).json({ success: true, message: 'Chat session started', data: { chat } });
    }
    catch (error) {
        console.error('Start chat error:', error);
        res.status(500).json({ success: false, message: 'Failed to start chat session', error: error instanceof Error ? error.message : 'Unknown error' });
    }
};
exports.startChat = startChat;
// Send message in chat
const sendMessage = async (req, res) => {
    var _a, _b, _c, _d;
    try {
        console.log('sendMessage called with:', { id: req.params.id, body: req.body, user: (_a = req.user) === null || _a === void 0 ? void 0 : _a.id });
        const { id } = req.params;
        const { content, message, sender = 'agent', messageType = 'text', metadata } = req.body;
        // Handle both 'content' and 'message' field names
        const messageContent = content || message;
        if (!messageContent || messageContent.trim().length === 0) {
            return res.status(400).json({ success: false, message: 'Message content is required' });
        }
        const chat = await Chat_1.default.findOne({
            $or: [
                { _id: mongoose_1.default.Types.ObjectId.isValid(id) ? id : null },
                { sessionId: id }
            ],
            isActive: true
        });
        if (!chat) {
            return res.status(404).json({ success: false, message: 'Chat session not found' });
        }
        // Add message
        await chat.addMessage(sender, messageContent.trim(), (_b = req.user) === null || _b === void 0 ? void 0 : _b.id, messageType, metadata);
        // If this is agent's first message and chat is waiting, activate it
        if (sender === 'agent' && chat.status === 'waiting') {
            const agent = await User_1.default.findById((_c = req.user) === null || _c === void 0 ? void 0 : _c.id);
            if (agent) {
                await chat.assignToAgent((_d = req.user) === null || _d === void 0 ? void 0 : _d.id, agent.name);
            }
        }
        await chat.save();
        await chat.populate('assignedAgent', 'name role');
        const latestMessage = chat.messages[chat.messages.length - 1];
        console.log('Message sent successfully:', latestMessage.messageId);
        res.json({
            success: true,
            message: 'Message sent successfully',
            data: {
                message: latestMessage,
                chat: { sessionId: chat.sessionId, status: chat.status }
            }
        });
    }
    catch (error) {
        console.error('Send message error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to send message',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
exports.sendMessage = sendMessage;
// Assign chat to agent
const assignChat = async (req, res) => {
    var _a, _b;
    try {
        console.log('assignChat called with:', { id: req.params.id, body: req.body, user: (_a = req.user) === null || _a === void 0 ? void 0 : _a.id });
        const { id } = req.params;
        const agentId = (_b = req.user) === null || _b === void 0 ? void 0 : _b.id; // Use current user as agent
        if (!agentId) {
            return res.status(400).json({ success: false, message: 'Agent ID not found in request' });
        }
        // Validate agent
        const agent = await User_1.default.findById(agentId);
        if (!agent || !['customer_service', 'system_admin'].includes(agent.role)) {
            return res.status(400).json({ success: false, message: 'Invalid agent or insufficient permissions' });
        }
        const chat = await Chat_1.default.findOne({
            $or: [
                { _id: mongoose_1.default.Types.ObjectId.isValid(id) ? id : null },
                { sessionId: id }
            ],
            isActive: true
        });
        if (!chat) {
            return res.status(404).json({ success: false, message: 'Chat session not found' });
        }
        // Check agent's current workload
        const currentChats = await Chat_1.default.countDocuments({
            assignedAgent: agentId,
            status: 'active',
            isActive: true
        });
        const maxConcurrentChats = 5;
        if (currentChats >= maxConcurrentChats) {
            return res.status(400).json({
                success: false,
                message: `Agent has reached maximum concurrent chats (${maxConcurrentChats})`
            });
        }
        await chat.assignToAgent(agentId, agent.name);
        await chat.populate('assignedAgent', 'name email role');
        console.log('Chat assigned successfully:', chat.sessionId);
        res.json({ success: true, message: 'Chat assigned successfully', data: { chat } });
    }
    catch (error) {
        console.error('Assign chat error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to assign chat',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
exports.assignChat = assignChat;
// Transfer chat to another agent
const transferChat = async (req, res) => {
    try {
        const { id } = req.params;
        const { newAgentId, reason } = req.body;
        if (!newAgentId)
            return res.status(400).json({ success: false, message: 'New agent ID is required' });
        const [newAgent, chat] = await Promise.all([
            User_1.default.findById(newAgentId),
            Chat_1.default.findOne({ $or: [{ _id: mongoose_1.default.Types.ObjectId.isValid(id) ? id : null }, { sessionId: id }], isActive: true })
        ]);
        if (!newAgent || !['customer_service', 'system_admin'].includes(newAgent.role))
            return res.status(400).json({ success: false, message: 'Invalid new agent' });
        if (!chat)
            return res.status(404).json({ success: false, message: 'Chat session not found' });
        await chat.transferToAgent(newAgentId, newAgent.name, reason);
        await chat.populate('assignedAgent', 'name email role');
        res.json({ success: true, message: 'Chat transferred successfully', data: { chat } });
    }
    catch (error) {
        console.error('Transfer chat error:', error);
        res.status(500).json({ success: false, message: 'Failed to transfer chat', error: error instanceof Error ? error.message : 'Unknown error' });
    }
};
exports.transferChat = transferChat;
// End chat session
const endChat = async (req, res) => {
    try {
        const { id } = req.params;
        const { feedback } = req.body;
        const chat = await Chat_1.default.findOne({ $or: [{ _id: mongoose_1.default.Types.ObjectId.isValid(id) ? id : null }, { sessionId: id }], isActive: true });
        if (!chat)
            return res.status(404).json({ success: false, message: 'Chat session not found' });
        await chat.endChat(feedback);
        res.json({ success: true, message: 'Chat session ended', data: { chat } });
    }
    catch (error) {
        console.error('End chat error:', error);
        res.status(500).json({ success: false, message: 'Failed to end chat session', error: error instanceof Error ? error.message : 'Unknown error' });
    }
};
exports.endChat = endChat;
// Mark messages as read
const markAsRead = async (req, res) => {
    try {
        const { id } = req.params;
        const { messageIds } = req.body;
        if (!messageIds || !Array.isArray(messageIds))
            return res.status(400).json({ success: false, message: 'Message IDs array is required' });
        const chat = await Chat_1.default.findOne({ $or: [{ _id: mongoose_1.default.Types.ObjectId.isValid(id) ? id : null }, { sessionId: id }], isActive: true });
        if (!chat)
            return res.status(404).json({ success: false, message: 'Chat session not found' });
        await chat.markAsRead(messageIds);
        res.json({ success: true, message: 'Messages marked as read' });
    }
    catch (error) {
        console.error('Mark as read error:', error);
        res.status(500).json({ success: false, message: 'Failed to mark messages as read', error: error instanceof Error ? error.message : 'Unknown error' });
    }
};
exports.markAsRead = markAsRead;
// Get waiting queue
const getWaitingQueue = async (req, res) => {
    try {
        const waitingChats = await Chat_1.default.find({ status: 'waiting', isActive: true })
            .select('sessionId customerInfo.name customerInfo.email startedAt channel queueInfo')
            .sort({ startedAt: 1 });
        const queueAnalytics = {
            totalWaiting: waitingChats.length,
            averageWaitTime: waitingChats.length > 0 ? waitingChats.reduce((sum, chat) => sum + (Date.now() - chat.startedAt.getTime()), 0) / waitingChats.length / 1000 : 0,
            longestWait: waitingChats.length > 0 ? Math.max(...waitingChats.map(chat => Date.now() - chat.startedAt.getTime())) / 1000 : 0
        };
        res.json({ success: true, data: { queue: waitingChats, analytics: queueAnalytics } });
    }
    catch (error) {
        console.error('Get waiting queue error:', error);
        res.status(500).json({ success: false, message: 'Failed to get waiting queue', error: error instanceof Error ? error.message : 'Unknown error' });
    }
};
exports.getWaitingQueue = getWaitingQueue;
// Get chat statistics
const getChatStats = async (req, res) => {
    try {
        const { period = '30', agentId } = req.query;
        const days = parseInt(period);
        const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
        const matchQuery = { startedAt: { $gte: startDate }, isActive: true };
        if (agentId)
            matchQuery.assignedAgent = new mongoose_1.default.Types.ObjectId(agentId);
        const [statusStats, channelStats, responseTime, satisfaction] = await Promise.all([
            Chat_1.default.aggregate([{ $match: matchQuery }, { $group: { _id: '$status', count: { $sum: 1 }, avgDuration: { $avg: '$duration' } } }]),
            Chat_1.default.aggregate([{ $match: matchQuery }, { $group: { _id: '$channel', count: { $sum: 1 } } }]),
            Chat_1.default.aggregate([{ $match: { ...matchQuery, status: 'ended' } }, { $group: { _id: null, avgResponseTime: { $avg: '$sessionMetrics.responseTime.averageAgent' }, avgDuration: { $avg: '$duration' } } }]),
            Chat_1.default.aggregate([{ $match: { ...matchQuery, 'feedback.rating': { $exists: true } } }, { $group: { _id: '$feedback.rating', count: { $sum: 1 } } }])
        ]);
        res.json({ success: true, data: { status: statusStats, channels: channelStats, responseTime: responseTime[0] || { avgResponseTime: 0, avgDuration: 0 }, satisfaction, period: days } });
    }
    catch (error) {
        console.error('Chat stats error:', error);
        res.status(500).json({ success: false, message: 'Failed to get chat statistics', error: error instanceof Error ? error.message : 'Unknown error' });
    }
};
exports.getChatStats = getChatStats;
// Helper function to calculate queue position
const calculateQueuePosition = async () => {
    const waitingCount = await Chat_1.default.countDocuments({ status: 'waiting', isActive: true });
    const activeAgents = await User_1.default.countDocuments({ role: { $in: ['customer_service', 'system_admin'] }, isActive: true });
    const avgChatDuration = 10 * 60; // 10 minutes in seconds
    return {
        queuePosition: waitingCount + 1,
        estimatedWaitTime: Math.max(0, Math.ceil((waitingCount / Math.max(activeAgents, 1)) * avgChatDuration)),
        queuedAt: new Date()
    };
};
exports.default = { getChatSessions: exports.getChatSessions, getChatById: exports.getChatById, startChat: exports.startChat, sendMessage: exports.sendMessage, assignChat: exports.assignChat, transferChat: exports.transferChat, endChat: exports.endChat, markAsRead: exports.markAsRead, getWaitingQueue: exports.getWaitingQueue, getChatStats: exports.getChatStats };
