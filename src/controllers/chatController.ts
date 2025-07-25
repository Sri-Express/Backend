// src/controllers/chatController.ts
import { Request, Response } from 'express';
import mongoose from 'mongoose';
import Chat from '../models/Chat';
import User from '../models/User';
import Ticket from '../models/Ticket';
import { Session } from 'inspector/promises';

// Get all chat sessions with filtering and pagination
export const getChatSessions = async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 20, status, assignedAgent, channel, search, sortBy = 'startedAt', sortOrder = 'desc', dateFrom, dateTo } = req.query;
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    // Build filter query
    const filter: any = { isActive: true };
    if (status) filter.status = status;
    if (channel) filter.channel = channel;
    if (assignedAgent && assignedAgent !== 'unassigned') filter.assignedAgent = assignedAgent;
    else if (assignedAgent === 'unassigned') filter.assignedAgent = { $exists: false };

    // Date range filter
    if (dateFrom || dateTo) {
      filter.startedAt = {};
      if (dateFrom) filter.startedAt.$gte = new Date(dateFrom as string);
      if (dateTo) filter.startedAt.$lte = new Date(dateTo as string);
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
    const sort: any = {};
    sort[sortBy as string] = sortOrder === 'desc' ? -1 : 1;

    const [chats, total] = await Promise.all([
      Chat.find(filter).sort(sort).skip(skip).limit(limitNum).populate('assignedAgent', 'name email role').populate('customer', 'name email phone').lean(),
      Chat.countDocuments(filter)
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

  } catch (error) {
    console.error('Get chat sessions error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch chat sessions', error: error instanceof Error ? error.message : 'Unknown error' });
  }
};

// Get single chat session by ID
export const getChatById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const chat = await Chat.findOne({ $or: [{ _id: mongoose.Types.ObjectId.isValid(id) ? id : null }, { sessionId: id }], isActive: true })
      .populate('assignedAgent', 'name email role')
      .populate('customer', 'name email phone')
      .populate('relatedTicket', 'ticketId subject status');

    if (!chat) return res.status(404).json({ success: false, message: 'Chat session not found' });

    // Get customer's previous chats
    const previousChats = await Chat.find({ customerId: chat.customerId, _id: { $ne: chat._id }, isActive: true })
      .select('sessionId status startedAt endedAt duration feedback.rating')
      .sort({ startedAt: -1 })
      .limit(5);

    res.json({ success: true, data: { chat, previousChats } });

  } catch (error) {
    console.error('Get chat error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch chat session', error: error instanceof Error ? error.message : 'Unknown error' });
  }
};

// Start new chat session
export const startChat = async (req: Request, res: Response) => {
  try {
    let { customerId, channel = 'web', initialMessage } = req.body;

    // Handle both real users and anonymous users
let customer;
let customerInfo;

if (customerId && customerId.startsWith('anonymous-')) {
  // Anonymous user - create a fake ObjectId
  const fakeObjectId = new mongoose.Types.ObjectId();
  customerInfo = {
    name: 'Anonymous User',
    email: 'anonymous@temp.com',
    phone: '',
    previousChats: 0,
    isReturning: false
  };
  customerId = fakeObjectId; // Use fake ObjectId
} else if (customerId) {
  // Real user - try to find them
  try {
    customer = await User.findById(customerId);
    if (customer) {
      customerInfo = {
        name: customer.name,
        email: customer.email,
        phone: customer.phone || '',
        previousChats: 0,
        isReturning: false
      };
    } else {
      return res.status(400).json({ success: false, message: 'Customer not found' });
    }
  } catch (error) {
    return res.status(400).json({ success: false, message: 'Invalid customer ID format' });
  }
} else {
  // No customer ID provided - create fake ObjectId
  const fakeObjectId = new mongoose.Types.ObjectId();
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
    const previousChats = await Chat.countDocuments({ customerId, isActive: true });

    // Generate sessionId manually
    const timestamp = Date.now().toString();
    const random = Math.random().toString(36).substring(2, 8);
    const sessionId = `CS${timestamp.slice(-6)}${random}`.toUpperCase();

    const chatData = {
      sessionId: sessionId,  // <-- ADD THIS LINE
      customerId,
      channel,
      customerInfo: customerInfo,
      messages: [],
      queueInfo: await calculateQueuePosition()
    };

    const chat = new Chat(chatData);

    // Add initial message if provided
    if (initialMessage) {
      await chat.addMessage('customer', initialMessage, customerId);
    }

    // Add welcome system message
    await chat.addMessage('system', `Welcome to Sri Express support! ${customerInfo.name}, you are currently ${chat.queueInfo?.queuePosition ? `#${chat.queueInfo.queuePosition} in queue.` : 'being connected to an agent.'}`, undefined, 'system');

    await chat.save();
    await chat.populate('customer', 'name email');

    res.status(201).json({ success: true, message: 'Chat session started', data: { chat } });

  } catch (error) {
    console.error('Start chat error:', error);
    res.status(500).json({ success: false, message: 'Failed to start chat session', error: error instanceof Error ? error.message : 'Unknown error' });
  }
};

// Send message in chat
export const sendMessage = async (req: Request, res: Response) => {
  try {
    console.log('sendMessage called with:', { id: req.params.id, body: req.body, user: req.user?.id });
    
    const { id } = req.params;
    const { content, message, sender = 'agent', messageType = 'text', metadata } = req.body;
    
    // Handle both 'content' and 'message' field names
    const messageContent = content || message;
    
    if (!messageContent || messageContent.trim().length === 0) {
      return res.status(400).json({ success: false, message: 'Message content is required' });
    }

    const chat = await Chat.findOne({ 
      $or: [
        { _id: mongoose.Types.ObjectId.isValid(id) ? id : null }, 
        { sessionId: id }
      ], 
      isActive: true 
    });
    
    if (!chat) {
      return res.status(404).json({ success: false, message: 'Chat session not found' });
    }

    // Add message
    await chat.addMessage(sender, messageContent.trim(), req.user?.id, messageType, metadata);

    // If this is agent's first message and chat is waiting, activate it
    if (sender === 'agent' && chat.status === 'waiting') {
      const agent = await User.findById(req.user?.id);
      if (agent) {
        await chat.assignToAgent(req.user?.id, agent.name);
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

  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to send message', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
};

// Assign chat to agent
export const assignChat = async (req: Request, res: Response) => {
  try {
    console.log('assignChat called with:', { id: req.params.id, body: req.body, user: req.user?.id });
    
    const { id } = req.params;
    const agentId = req.user?.id; // Use current user as agent
    
    if (!agentId) {
      return res.status(400).json({ success: false, message: 'Agent ID not found in request' });
    }

    // Validate agent
    const agent = await User.findById(agentId);
    if (!agent || !['customer_service', 'system_admin'].includes(agent.role)) {
      return res.status(400).json({ success: false, message: 'Invalid agent or insufficient permissions' });
    }

    const chat = await Chat.findOne({ 
      $or: [
        { _id: mongoose.Types.ObjectId.isValid(id) ? id : null }, 
        { sessionId: id }
      ], 
      isActive: true 
    });
    
    if (!chat) {
      return res.status(404).json({ success: false, message: 'Chat session not found' });
    }

    // Check agent's current workload
    const currentChats = await Chat.countDocuments({ 
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

  } catch (error) {
    console.error('Assign chat error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to assign chat', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
};

// Transfer chat to another agent
export const transferChat = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { newAgentId, reason } = req.body;

    if (!newAgentId) return res.status(400).json({ success: false, message: 'New agent ID is required' });

    const [newAgent, chat] = await Promise.all([
      User.findById(newAgentId),
      Chat.findOne({ $or: [{ _id: mongoose.Types.ObjectId.isValid(id) ? id : null }, { sessionId: id }], isActive: true })
    ]);

    if (!newAgent || !['customer_service', 'system_admin'].includes(newAgent.role)) return res.status(400).json({ success: false, message: 'Invalid new agent' });
    if (!chat) return res.status(404).json({ success: false, message: 'Chat session not found' });

    await chat.transferToAgent(newAgentId, newAgent.name, reason);
    await chat.populate('assignedAgent', 'name email role');

    res.json({ success: true, message: 'Chat transferred successfully', data: { chat } });

  } catch (error) {
    console.error('Transfer chat error:', error);
    res.status(500).json({ success: false, message: 'Failed to transfer chat', error: error instanceof Error ? error.message : 'Unknown error' });
  }
};

// End chat session
export const endChat = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { feedback } = req.body;

    const chat = await Chat.findOne({ $or: [{ _id: mongoose.Types.ObjectId.isValid(id) ? id : null }, { sessionId: id }], isActive: true });
    if (!chat) return res.status(404).json({ success: false, message: 'Chat session not found' });

    await chat.endChat(feedback);

    res.json({ success: true, message: 'Chat session ended', data: { chat } });

  } catch (error) {
    console.error('End chat error:', error);
    res.status(500).json({ success: false, message: 'Failed to end chat session', error: error instanceof Error ? error.message : 'Unknown error' });
  }
};

// Mark messages as read
export const markAsRead = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { messageIds } = req.body;

    if (!messageIds || !Array.isArray(messageIds)) return res.status(400).json({ success: false, message: 'Message IDs array is required' });

    const chat = await Chat.findOne({ $or: [{ _id: mongoose.Types.ObjectId.isValid(id) ? id : null }, { sessionId: id }], isActive: true });
    if (!chat) return res.status(404).json({ success: false, message: 'Chat session not found' });

    await chat.markAsRead(messageIds);

    res.json({ success: true, message: 'Messages marked as read' });

  } catch (error) {
    console.error('Mark as read error:', error);
    res.status(500).json({ success: false, message: 'Failed to mark messages as read', error: error instanceof Error ? error.message : 'Unknown error' });
  }
};

// Get waiting queue
export const getWaitingQueue = async (req: Request, res: Response) => {
  try {
    const waitingChats = await Chat.find({ status: 'waiting', isActive: true })
      .select('sessionId customerInfo.name customerInfo.email startedAt channel queueInfo')
      .sort({ startedAt: 1 });

    const queueAnalytics = {
      totalWaiting: waitingChats.length,
      averageWaitTime: waitingChats.length > 0 ? waitingChats.reduce((sum, chat) => sum + (Date.now() - chat.startedAt.getTime()), 0) / waitingChats.length / 1000 : 0,
      longestWait: waitingChats.length > 0 ? Math.max(...waitingChats.map(chat => Date.now() - chat.startedAt.getTime())) / 1000 : 0
    };

    res.json({ success: true, data: { queue: waitingChats, analytics: queueAnalytics } });

  } catch (error) {
    console.error('Get waiting queue error:', error);
    res.status(500).json({ success: false, message: 'Failed to get waiting queue', error: error instanceof Error ? error.message : 'Unknown error' });
  }
};

// Get chat statistics
export const getChatStats = async (req: Request, res: Response) => {
  try {
    const { period = '30', agentId } = req.query;
    const days = parseInt(period as string);
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const matchQuery: any = { startedAt: { $gte: startDate }, isActive: true };
    if (agentId) matchQuery.assignedAgent = new mongoose.Types.ObjectId(agentId as string);

    const [statusStats, channelStats, responseTime, satisfaction] = await Promise.all([
      Chat.aggregate([{ $match: matchQuery }, { $group: { _id: '$status', count: { $sum: 1 }, avgDuration: { $avg: '$duration' } } }]),
      Chat.aggregate([{ $match: matchQuery }, { $group: { _id: '$channel', count: { $sum: 1 } } }]),
      Chat.aggregate([{ $match: { ...matchQuery, status: 'ended' } }, { $group: { _id: null, avgResponseTime: { $avg: '$sessionMetrics.responseTime.averageAgent' }, avgDuration: { $avg: '$duration' } } }]),
      Chat.aggregate([{ $match: { ...matchQuery, 'feedback.rating': { $exists: true } } }, { $group: { _id: '$feedback.rating', count: { $sum: 1 } } }])
    ]);

    res.json({ success: true, data: { status: statusStats, channels: channelStats, responseTime: responseTime[0] || { avgResponseTime: 0, avgDuration: 0 }, satisfaction, period: days } });

  } catch (error) {
    console.error('Chat stats error:', error);
    res.status(500).json({ success: false, message: 'Failed to get chat statistics', error: error instanceof Error ? error.message : 'Unknown error' });
  }
};

// Helper function to calculate queue position
const calculateQueuePosition = async () => {
  const waitingCount = await Chat.countDocuments({ status: 'waiting', isActive: true });
  const activeAgents = await User.countDocuments({ role: { $in: ['customer_service', 'system_admin'] }, isActive: true });
  const avgChatDuration = 10 * 60; // 10 minutes in seconds

  return {
    queuePosition: waitingCount + 1,
    estimatedWaitTime: Math.max(0, Math.ceil((waitingCount / Math.max(activeAgents, 1)) * avgChatDuration)),
    queuedAt: new Date()
  };
};

export default { getChatSessions, getChatById, startChat, sendMessage, assignChat, transferChat, endChat, markAsRead, getWaitingQueue, getChatStats };