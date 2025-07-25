// src/routes/csRoutes.ts - FIXED VERSION
import express from 'express';
import { protect } from '../middleware/authMiddleware';
import { requireAdmin } from '../middleware/adminMiddleware';
import { logActivity } from '../middleware/activityLogger';
import asyncHandler from '../utils/asyncHandler';

// Import controllers
import * as csController from '../controllers/csController';
import * as ticketController from '../controllers/ticketController';
import * as chatController from '../controllers/chatController';
import * as knowledgeController from '../controllers/knowledgeController';

const router = express.Router();

// ============================================================================
// SPECIFIC PROTECTED CHAT ROUTES
// ============================================================================
// These MUST be defined BEFORE the public '/chat/sessions/:id' route to avoid
// the '/:id' parameter from incorrectly capturing 'stats' or 'queue'.
router.get('/chat/sessions/stats', protect, logActivity, requireAdmin, asyncHandler(chatController.getChatStats));
router.get('/chat/sessions/queue', protect, logActivity, requireAdmin, asyncHandler(chatController.getWaitingQueue));


// ============================================================================
// PUBLIC ROUTES (No Auth Required) - For Customers
// ============================================================================
router.post('/chat/sessions', asyncHandler(chatController.startChat));
router.post('/chat/sessions/:id/messages', asyncHandler(chatController.sendMessage));
router.get('/chat/sessions/:id', asyncHandler(chatController.getChatById)); // Now this won't conflict
router.get('/knowledge/search', asyncHandler(knowledgeController.searchArticles));
router.get('/knowledge/:id', asyncHandler(knowledgeController.getArticleById));
router.post('/knowledge/:id/rate', asyncHandler(knowledgeController.rateArticle));

router.get('/categories', (req, res) => {
  res.json({ success: true, categories: ['booking', 'payment', 'route', 'technical'] });
});

router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Customer Service API is healthy',
    timestamp: new Date().toISOString(),
    status: 'operational'
  });
});

// ============================================================================
// PROTECTED ROUTES (Agent/Admin Auth Required) - For CS Agents
// ============================================================================
// The middleware below will apply to all subsequent routes in this file.
router.use(protect, logActivity, requireAdmin);

// CS Dashboard Routes
router.get('/dashboard', asyncHandler(csController.getDashboard));
router.get('/dashboard/workload', asyncHandler(csController.getAgentWorkload));
router.get('/dashboard/analytics', asyncHandler(csController.getAnalytics));

// Ticket Management Routes
router.get('/tickets', asyncHandler(ticketController.getTickets));
router.post('/tickets', asyncHandler(ticketController.createTicket));
router.get('/tickets/stats', asyncHandler(ticketController.getTicketStats));
router.get('/tickets/:id', asyncHandler(ticketController.getTicketById));
router.put('/tickets/:id', asyncHandler(ticketController.updateTicket));
router.put('/tickets/:id/assign', asyncHandler(ticketController.assignTicket));
router.post('/tickets/:id/notes', asyncHandler(ticketController.addNote));
router.put('/tickets/:id/escalate', asyncHandler(ticketController.escalateTicket));
router.put('/tickets/:id/resolve', asyncHandler(ticketController.resolveTicket));
router.put('/tickets/:id/close', asyncHandler(ticketController.closeTicket));

// Chat Management Routes (Agent Only)
// Note: /stats and /queue are defined above to avoid conflicts.
router.get('/chat/sessions', asyncHandler(chatController.getChatSessions));           // Agents list all chats
router.put('/chat/sessions/:id/assign', asyncHandler(chatController.assignChat));    // Agents assign chats
router.put('/chat/sessions/:id/transfer', asyncHandler(chatController.transferChat)); // Agents transfer chats
router.put('/chat/sessions/:id/end', asyncHandler(chatController.endChat));          // Agents end chats
router.put('/chat/sessions/:id/read', asyncHandler(chatController.markAsRead));      // Agents mark as read

// Knowledge Base Management Routes
router.get('/knowledge', asyncHandler(knowledgeController.getArticles));
router.post('/knowledge', asyncHandler(knowledgeController.createArticle));
router.put('/knowledge/:id', asyncHandler(knowledgeController.updateArticle));
router.delete('/knowledge/:id', asyncHandler(knowledgeController.deleteArticle));
router.put('/knowledge/:id/publish', asyncHandler(knowledgeController.publishArticle));
router.get('/knowledge/stats', asyncHandler(knowledgeController.getKnowledgeStats));
router.get('/knowledge/ai-training', asyncHandler(knowledgeController.getAITrainingData));
router.put('/knowledge/:id/ai-training', asyncHandler(knowledgeController.addToAITraining));

// Other CS Routes
router.get('/agents', (req, res) => {
  res.json({ success: true, agents: [] });
});

export default router;