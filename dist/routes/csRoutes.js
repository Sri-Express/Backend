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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// src/routes/csRoutes.ts - UPDATED WITH FEEDBACK ROUTE
const express_1 = __importDefault(require("express"));
const authMiddleware_1 = require("../middleware/authMiddleware");
const adminMiddleware_1 = require("../middleware/adminMiddleware");
const activityLogger_1 = require("../middleware/activityLogger");
const asyncHandler_1 = __importDefault(require("../utils/asyncHandler"));
// Import controllers
const csController = __importStar(require("../controllers/csController"));
const ticketController = __importStar(require("../controllers/ticketController"));
const chatController = __importStar(require("../controllers/chatController"));
const knowledgeController = __importStar(require("../controllers/knowledgeController"));
const router = express_1.default.Router();
// ============================================================================
// SPECIFIC PROTECTED CHAT ROUTES
// ============================================================================
// These MUST be defined BEFORE the public '/chat/sessions/:id' route to avoid
// the '/:id' parameter from incorrectly capturing 'stats' or 'queue'.
router.get('/chat/sessions/stats', authMiddleware_1.protect, activityLogger_1.logActivity, adminMiddleware_1.requireAdmin, (0, asyncHandler_1.default)(chatController.getChatStats));
router.get('/chat/sessions/queue', authMiddleware_1.protect, activityLogger_1.logActivity, adminMiddleware_1.requireAdmin, (0, asyncHandler_1.default)(chatController.getWaitingQueue));
// ============================================================================
// PUBLIC ROUTES (No Auth Required) - For Customers
// ============================================================================
router.post('/chat/sessions', (0, asyncHandler_1.default)(chatController.startChat));
router.post('/chat/sessions/:id/messages', (0, asyncHandler_1.default)(chatController.sendMessage));
router.get('/chat/sessions/:id', (0, asyncHandler_1.default)(chatController.getChatById));
// NEW: Customer feedback route (must be public so customers can rate without auth)
router.post('/chat/sessions/:id/feedback', (0, asyncHandler_1.default)(chatController.submitFeedback));
router.get('/knowledge/search', (0, asyncHandler_1.default)(knowledgeController.searchArticles));
router.get('/knowledge/:id', (0, asyncHandler_1.default)(knowledgeController.getArticleById));
router.post('/knowledge/:id/rate', (0, asyncHandler_1.default)(knowledgeController.rateArticle));
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
// NEW: Public ticket submission for customers - MUST BE BEFORE AUTH MIDDLEWARE
router.post('/tickets/submit', (0, asyncHandler_1.default)(ticketController.submitCustomerTicket));
router.get('/tickets/track/:ticketId', (0, asyncHandler_1.default)(ticketController.trackTicket));
// ============================================================================
// PROTECTED ROUTES (Agent/Admin Auth Required) - For CS Agents
// ============================================================================
// The middleware below will apply to all subsequent routes in this file.
router.use(authMiddleware_1.protect, adminMiddleware_1.requireAdmin); // Temporarily disabled logActivity
// CS Dashboard Routes
router.get('/dashboard', (0, asyncHandler_1.default)(csController.getDashboard));
router.get('/dashboard/workload', (0, asyncHandler_1.default)(csController.getAgentWorkload));
router.get('/dashboard/analytics', (0, asyncHandler_1.default)(csController.getAnalytics));
// Customer Profile Routes
router.get('/customers/:id', (0, asyncHandler_1.default)(csController.getCustomerProfile));
router.post('/customers/:id/notes', (0, asyncHandler_1.default)(csController.addCustomerNote));
// Ticket Management Routes
router.get('/tickets', (0, asyncHandler_1.default)(ticketController.getTickets));
router.post('/tickets', (0, asyncHandler_1.default)(ticketController.createTicket));
router.get('/tickets/stats', (0, asyncHandler_1.default)(ticketController.getTicketStats));
router.get('/tickets/:id', (0, asyncHandler_1.default)(ticketController.getTicketById));
router.put('/tickets/:id', (0, asyncHandler_1.default)(ticketController.updateTicket));
router.put('/tickets/:id/assign', (0, asyncHandler_1.default)(ticketController.assignTicket));
router.post('/tickets/:id/notes', (0, asyncHandler_1.default)(ticketController.addNote));
router.put('/tickets/:id/escalate', (0, asyncHandler_1.default)(ticketController.escalateTicket));
router.put('/tickets/:id/resolve', (0, asyncHandler_1.default)(ticketController.resolveTicket));
router.put('/tickets/:id/close', (0, asyncHandler_1.default)(ticketController.closeTicket));
// Chat Management Routes (Agent Only)
// Note: /stats and /queue are defined above to avoid conflicts.
router.get('/chat/sessions', (0, asyncHandler_1.default)(chatController.getChatSessions)); // Agents list all chats
router.put('/chat/sessions/:id/assign', (0, asyncHandler_1.default)(chatController.assignChat)); // Agents assign chats
router.put('/chat/sessions/:id/transfer', (0, asyncHandler_1.default)(chatController.transferChat)); // Agents transfer chats
router.put('/chat/sessions/:id/end', (0, asyncHandler_1.default)(chatController.endChat)); // Agents end chats
router.put('/chat/sessions/:id/read', (0, asyncHandler_1.default)(chatController.markAsRead)); // Agents mark as read
// Knowledge Base Management Routes
router.get('/knowledge', (0, asyncHandler_1.default)(knowledgeController.getArticles));
router.post('/knowledge', (0, asyncHandler_1.default)(knowledgeController.createArticle));
router.put('/knowledge/:id', (0, asyncHandler_1.default)(knowledgeController.updateArticle));
router.delete('/knowledge/:id', (0, asyncHandler_1.default)(knowledgeController.deleteArticle));
router.put('/knowledge/:id/publish', (0, asyncHandler_1.default)(knowledgeController.publishArticle));
router.get('/knowledge/stats', (0, asyncHandler_1.default)(knowledgeController.getKnowledgeStats));
router.get('/knowledge/ai-training', (0, asyncHandler_1.default)(knowledgeController.getAITrainingData));
router.put('/knowledge/:id/ai-training', (0, asyncHandler_1.default)(knowledgeController.addToAITraining));
// Other CS Routes
router.get('/agents', (req, res) => {
    res.json({ success: true, agents: [] });
});
exports.default = router;
