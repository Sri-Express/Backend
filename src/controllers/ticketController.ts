import { Request, Response } from 'express';
import mongoose from 'mongoose';
import Ticket from '../models/Ticket';
import User, { IUser } from '../models/User'; // Import the IUser interface
import Booking from '../models/Booking';
import Route from '../models/Route';

// Define a custom request type to include the user property
// THIS IS THE FIX: The user property now expects the full IUser object
interface AuthenticatedRequest extends Request {
  user?: IUser;
}

// Get all tickets with filtering and pagination
export const getTickets = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      priority,
      category,
      assignedAgent,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      dateFrom,
      dateTo
    } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const filter: any = { isActive: true };

    if (status) filter.status = status;
    if (priority) filter.priority = priority;
    if (category) filter.category = category;
    if (assignedAgent && assignedAgent !== 'unassigned') {
      filter.assignedAgent = assignedAgent;
    } else if (assignedAgent === 'unassigned') {
      filter.assignedAgent = { $exists: false };
    }

    if (dateFrom || dateTo) {
      filter.createdAt = {};
      if (dateFrom) filter.createdAt.$gte = new Date(dateFrom as string);
      if (dateTo) filter.createdAt.$lte = new Date(dateTo as string);
    }

    if (search) {
      filter.$or = [
        { ticketId: { $regex: search, $options: 'i' } },
        { subject: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { 'customerInfo.name': { $regex: search, $options: 'i' } },
        { 'customerInfo.email': { $regex: search, $options: 'i' } }
      ];
    }

    const sort: any = {};
    sort[sortBy as string] = sortOrder === 'desc' ? -1 : 1;

    const [tickets, total] = await Promise.all([
      Ticket.find(filter)
        .sort(sort)
        .skip(skip)
        .limit(limitNum)
        .populate('assignedAgent', 'name email role')
        .populate('customer', 'name email phone')
        .populate('relatedBooking', 'bookingId travelDate passengerInfo')
        .populate('relatedRoute', 'name startLocation.name endLocation.name')
        .lean(),
      Ticket.countDocuments(filter)
    ]);

    const totalPages = Math.ceil(total / limitNum);
    const hasNextPage = pageNum < totalPages;
    const hasPrevPage = pageNum > 1;

    res.json({
      success: true,
      data: {
        tickets,
        pagination: {
          current: pageNum,
          pages: totalPages,
          total,
          hasNext: hasNextPage,
          hasPrev: hasPrevPage
        },
        filters: {
          status,
          priority,
          category,
          assignedAgent,
          search,
          dateFrom,
          dateTo
        }
      }
    });

  } catch (error) {
    console.error('Get tickets error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch tickets',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Get single ticket by ID
export const getTicketById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
        const ticketByTicketId = await Ticket.findOne({ ticketId: id, isActive: true })
            .populate('assignedAgent', 'name email role')
            .populate('customer', 'name email phone')
            .populate('relatedBooking', 'bookingId travelDate passengerInfo pricing')
            .populate('relatedRoute', 'name startLocation endLocation distance')
            .populate('timeline.agent', 'name role');

        if (!ticketByTicketId) {
            res.status(404).json({ success: false, message: 'Ticket not found' });
            return;
        }
        const relatedTickets = await Ticket.find({
            customerId: ticketByTicketId.customerId,
            _id: { $ne: ticketByTicketId._id },
            isActive: true
        }).select('ticketId subject status priority createdAt').sort({ createdAt: -1 }).limit(5);

        res.json({ success: true, data: { ticket: ticketByTicketId, relatedTickets } });
        return;
    }

    const ticket = await Ticket.findById(id)
    .populate('assignedAgent', 'name email role')
    .populate('customer', 'name email phone')
    .populate('relatedBooking', 'bookingId travelDate passengerInfo pricing')
    .populate('relatedRoute', 'name startLocation endLocation distance')
    .populate('timeline.agent', 'name role');

    if (!ticket || !ticket.isActive) {
      res.status(404).json({ success: false, message: 'Ticket not found' });
      return;
    }

    const relatedTickets = await Ticket.find({
      customerId: ticket.customerId,
      _id: { $ne: ticket._id },
      isActive: true
    })
    .select('ticketId subject status priority createdAt')
    .sort({ createdAt: -1 })
    .limit(5);

    res.json({
      success: true,
      data: {
        ticket,
        relatedTickets
      }
    });

  } catch (error) {
    console.error('Get ticket error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch ticket',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Create new ticket
export const createTicket = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      customerId,
      subject,
      description,
      category = 'general',
      priority = 'medium',
      relatedBooking,
      relatedRoute,
      tags = [],
      assignedAgent
    } = req.body;

    if (!customerId || !subject || !description) {
      res.status(400).json({
        success: false,
        message: 'Customer ID, subject, and description are required'
      });
      return;
    }

    const customer = await User.findById(customerId);
    if (!customer) {
      res.status(400).json({
        success: false,
        message: 'Customer not found'
      });
      return;
    }

    const previousTickets = await Ticket.countDocuments({ 
      customerId,
      isActive: true 
    });

    const ticketData: any = {
      customerId,
      subject: subject.trim(),
      description: description.trim(),
      category,
      priority,
      tags,
      relatedBooking,
      relatedRoute,
      customerInfo: {
        name: customer.name,
        email: customer.email,
        phone: customer.phone || '',
        previousTickets
      },
      timeline: [{
        action: 'created',
        timestamp: new Date(),
        note: 'Ticket created',
        systemGenerated: true
      }]
    };

    if (assignedAgent) {
      const agent = await User.findById(assignedAgent);
      if (agent && ['customer_service', 'system_admin'].includes(agent.role)) {
        ticketData.assignedAgent = assignedAgent;
        ticketData.timeline.push({
          action: 'assigned',
          agent: assignedAgent,
          timestamp: new Date(),
          note: `Auto-assigned to ${agent.name}`,
          systemGenerated: true
        });
      }
    }

    const ticket = new Ticket(ticketData);
    await ticket.save();

    await ticket.populate([
      { path: 'assignedAgent', select: 'name email role' },
      { path: 'customer', select: 'name email phone' },
      { path: 'relatedBooking', select: 'bookingId travelDate' },
      { path: 'relatedRoute', select: 'name startLocation.name endLocation.name' }
    ]);

    res.status(201).json({
      success: true,
      message: 'Ticket created successfully',
      data: { ticket }
    });

  } catch (error) {
    console.error('Create ticket error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create ticket',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Update ticket
export const updateTicket = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const {
      subject,
      description,
      category,
      priority,
      status,
      tags,
      relatedBooking,
      relatedRoute
    } = req.body;

    const ticket = await Ticket.findOne({
      $or: [
        { _id: mongoose.Types.ObjectId.isValid(id) ? id : null },
        { ticketId: id }
      ],
      isActive: true
    });

    if (!ticket) {
      res.status(404).json({
        success: false,
        message: 'Ticket not found'
      });
      return;
    }

    const changes = [];
    if (subject && subject !== ticket.subject) {
      changes.push(`Subject changed`);
      ticket.subject = subject.trim();
    }
    if (description && description !== ticket.description) {
      changes.push(`Description updated`);
      ticket.description = description.trim();
    }
    if (category && category !== ticket.category) {
      changes.push(`Category changed to ${category}`);
      ticket.category = category;
    }
    if (priority && priority !== ticket.priority) {
      changes.push(`Priority changed to ${priority}`);
      ticket.priority = priority;
    }
    if (status && status !== ticket.status) {
      changes.push(`Status changed to ${status}`);
      ticket.status = status;
    }
    if (tags) ticket.tags = tags;
    if (relatedBooking) ticket.relatedBooking = relatedBooking;
    if (relatedRoute) ticket.relatedRoute = relatedRoute;

    if (changes.length > 0) {
      ticket.timeline.push({
        action: 'note_added',
        agent: req.user!._id, // Use the full user object's _id
        timestamp: new Date(),
        note: changes.join(', '),
        systemGenerated: false
      });
    }

    await ticket.save();

    await ticket.populate([
      { path: 'assignedAgent', select: 'name email role' },
      { path: 'customer', select: 'name email phone' },
      { path: 'timeline.agent', select: 'name role' }
    ]);

    res.json({
      success: true,
      message: 'Ticket updated successfully',
      data: { ticket }
    });

  } catch (error) {
    console.error('Update ticket error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update ticket',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Assign ticket to agent
export const assignTicket = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { agentId } = req.body;

    if (!agentId) {
      res.status(400).json({
        success: false,
        message: 'Agent ID is required'
      });
      return;
    }

    const agent = await User.findById(agentId);
    if (!agent || !['customer_service', 'system_admin'].includes(agent.role)) {
      res.status(400).json({
        success: false,
        message: 'Invalid agent or agent does not have required permissions'
      });
      return;
    }

    const ticket = await Ticket.findOne({
      $or: [
        { _id: mongoose.Types.ObjectId.isValid(id) ? id : null },
        { ticketId: id }
      ],
      isActive: true
    });

    if (!ticket) {
      res.status(404).json({
        success: false,
        message: 'Ticket not found'
      });
      return;
    }

    const previousAgent = ticket.assignedAgent;
    ticket.assignedAgent = new mongoose.Types.ObjectId(agentId);

    ticket.timeline.push({
      action: 'assigned',
      agent: req.user!._id, // Use the full user object's _id
      timestamp: new Date(),
      note: previousAgent 
        ? `Reassigned to ${agent.name}` 
        : `Assigned to ${agent.name}`,
      systemGenerated: false
    });

    await ticket.save();
    await ticket.populate('assignedAgent', 'name email role');

    res.json({
      success: true,
      message: 'Ticket assigned successfully',
      data: { ticket }
    });

  } catch (error) {
    console.error('Assign ticket error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to assign ticket',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Add note to ticket
export const addNote = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { note } = req.body;

    if (!note || note.trim().length === 0) {
      res.status(400).json({
        success: false,
        message: 'Note content is required'
      });
      return;
    }

    const ticket = await Ticket.findOne({
      $or: [
        { _id: mongoose.Types.ObjectId.isValid(id) ? id : null },
        { ticketId: id }
      ],
      isActive: true
    });

    if (!ticket) {
      res.status(404).json({
        success: false,
        message: 'Ticket not found'
      });
      return;
    }

    ticket.timeline.push({
      action: 'note_added',
      agent: req.user!._id, // Use the full user object's _id
      timestamp: new Date(),
      note: note.trim(),
      systemGenerated: false
    });

    await ticket.save();
    await ticket.populate('timeline.agent', 'name role');

    res.json({
      success: true,
      message: 'Note added successfully',
      data: { 
        timeline: ticket.timeline,
        latestNote: ticket.timeline[ticket.timeline.length - 1]
      }
    });

  } catch (error) {
    console.error('Add note error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add note',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Escalate ticket
export const escalateTicket = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { escalatedTo, reason } = req.body;

    if (!escalatedTo || !reason) {
      res.status(400).json({
        success: false,
        message: 'Escalated agent and reason are required'
      });
      return;
    }

    const targetAgent = await User.findById(escalatedTo);
    if (!targetAgent || !['customer_service', 'system_admin'].includes(targetAgent.role)) {
      res.status(400).json({
        success: false,
        message: 'Invalid escalation target'
      });
      return;
    }

    const ticket = await Ticket.findOne({
      $or: [
        { _id: mongoose.Types.ObjectId.isValid(id) ? id : null },
        { ticketId: id }
      ],
      isActive: true
    });

    if (!ticket) {
      res.status(404).json({
        success: false,
        message: 'Ticket not found'
      });
      return;
    }

    await ticket.escalateTicket(req.user!._id.toString(), escalatedTo, reason);
    await ticket.populate([
      { path: 'assignedAgent', select: 'name email role' },
      { path: 'escalation.escalatedBy', select: 'name role' },
      { path: 'escalation.escalatedTo', select: 'name role' }
    ]);

    res.json({
      success: true,
      message: 'Ticket escalated successfully',
      data: { ticket }
    });

  } catch (error) {
    console.error('Escalate ticket error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to escalate ticket',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Resolve ticket
export const resolveTicket = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { solution, customerSatisfaction, feedback } = req.body;

    if (!solution || solution.trim().length === 0) {
      res.status(400).json({
        success: false,
        message: 'Solution is required to resolve ticket'
      });
      return;
    }

    const ticket = await Ticket.findOne({
      $or: [
        { _id: mongoose.Types.ObjectId.isValid(id) ? id : null },
        { ticketId: id }
      ],
      isActive: true
    });

    if (!ticket) {
      res.status(404).json({
        success: false,
        message: 'Ticket not found'
      });
      return;
    }

    await ticket.resolveTicket(
      solution.trim(), 
      req.user!._id.toString(), 
      customerSatisfaction, 
      feedback
    );

    await ticket.populate([
      { path: 'assignedAgent', select: 'name email role' },
      { path: 'resolution.resolvedBy', select: 'name role' }
    ]);

    res.json({
      success: true,
      message: 'Ticket resolved successfully',
      data: { ticket }
    });

  } catch (error) {
    console.error('Resolve ticket error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to resolve ticket',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Close ticket
export const closeTicket = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const ticket = await Ticket.findOne({
      $or: [
        { _id: mongoose.Types.ObjectId.isValid(id) ? id : null },
        { ticketId: id }
      ],
      isActive: true
    });

    if (!ticket) {
      res.status(404).json({
        success: false,
        message: 'Ticket not found'
      });
      return;
    }

    if (ticket.status !== 'resolved') {
      res.status(400).json({
        success: false,
        message: 'Only resolved tickets can be closed'
      });
      return;
    }

    ticket.status = 'closed';
    ticket.timeline.push({
      action: 'closed',
      agent: req.user!._id, // Use the full user object's _id
      timestamp: new Date(),
      note: 'Ticket closed',
      systemGenerated: false
    });

    await ticket.save();

    res.json({
      success: true,
      message: 'Ticket closed successfully',
      data: { ticket }
    });

  } catch (error) {
    console.error('Close ticket error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to close ticket',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Get ticket statistics
export const getTicketStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const { period = '30', agentId } = req.query;
    const days = parseInt(period as string);
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const matchQuery: any = { 
      createdAt: { $gte: startDate },
      isActive: true 
    };

    if (agentId) {
      matchQuery.assignedAgent = new mongoose.Types.ObjectId(agentId as string);
    }

    const [statusStats, categoryStats, priorityStats, resolutionTime] = await Promise.all([
      Ticket.aggregate([
        { $match: matchQuery },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 }
          }
        }
      ]),
      Ticket.aggregate([
        { $match: matchQuery },
        {
          $group: {
            _id: '$category',
            count: { $sum: 1 }
          }
        }
      ]),
      Ticket.aggregate([
        { $match: matchQuery },
        {
          $group: {
            _id: '$priority',
            count: { $sum: 1 }
          }
        }
      ]),
      Ticket.aggregate([
        { 
          $match: { 
            ...matchQuery, 
            status: 'resolved',
            'resolution.resolvedAt': { $exists: true }
          } 
        },
        {
          $project: {
            resolutionTime: {
              $divide: [
                { $subtract: ['$resolution.resolvedAt', '$createdAt'] },
                3600000
              ]
            }
          }
        },
        {
          $group: {
            _id: null,
            avgResolutionTime: { $avg: '$resolutionTime' },
            totalResolved: { $sum: 1 }
          }
        }
      ])
    ]);

    res.json({
      success: true,
      data: {
        status: statusStats,
        category: categoryStats,
        priority: priorityStats,
        resolutionTime: resolutionTime[0] || { avgResolutionTime: 0, totalResolved: 0 },
        period: days
      }
    });

  } catch (error) {
    console.error('Ticket stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get ticket statistics',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

export default {
  getTickets,
  getTicketById,
  createTicket,
  updateTicket,
  assignTicket,
  addNote,
  escalateTicket,
  resolveTicket,
  closeTicket,
  getTicketStats
};