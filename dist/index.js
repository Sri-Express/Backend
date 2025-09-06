"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// =============================================================================
// Sri Express Transportation Platform - Complete Server with Customer Service
// Version: 4.0.0 - IDEALIZE 2025 Competition Ready
// Team: XForce (University of Moratuwa)
// =============================================================================
const express_1 = __importDefault(require("express"));
const mongoose_1 = __importDefault(require("mongoose"));
const helmet_1 = __importDefault(require("helmet"));
const dotenv_1 = __importDefault(require("dotenv"));
const cors_1 = __importDefault(require("cors"));
const http_1 = require("http");
// Load environment variables
dotenv_1.default.config();
// Import all models to ensure they're registered
require("./models/User");
require("./models/Device");
require("./models/Trip");
require("./models/Emergency");
require("./models/UserActivity");
require("./models/Fleet");
require("./models/Route");
require("./models/Booking");
require("./models/LocationTracking");
require("./models/Payment");
require("./models/Ticket"); // ⭐ NEW - Customer Service Models
require("./models/Chat"); // ⭐ NEW - Customer Service Models
require("./models/KnowledgeBase"); // ⭐ NEW - Customer Service Models
require("./models/WeatherChat"); // ⭐ ADD THIS LINE
// Import ALL routes
const authRoutes_1 = __importDefault(require("./routes/authRoutes"));
const dashboardRoutes_1 = __importDefault(require("./routes/dashboardRoutes"));
const adminRoutes_1 = __importDefault(require("./routes/adminRoutes"));
const routeRoutes_1 = __importDefault(require("./routes/routeRoutes"));
const bookingRoutes_1 = __importDefault(require("./routes/bookingRoutes"));
const trackingRoutes_1 = __importDefault(require("./routes/trackingRoutes"));
const paymentRoutes_1 = __importDefault(require("./routes/paymentRoutes"));
const paymentSimulationRoutes_1 = __importDefault(require("./routes/paymentSimulationRoutes"));
const fleetRoutes_1 = __importDefault(require("./routes/fleetRoutes")); // ← ADD THIS LINE
const csRoutes_1 = __importDefault(require("./routes/csRoutes")); // ⭐ NEW - Customer Service Routes
const weatherRoutes_1 = __importDefault(require("./routes/weatherRoutes")); // ⭐ ADD THIS LINE
const routeAdminRoutes_1 = __importDefault(require("./routes/routeAdminRoutes"));
// Import middleware
const errorMiddleware_1 = require("./middleware/errorMiddleware");
// Import DB connection
const db_1 = __importDefault(require("./config/db"));
// Import Real-time Emergency Service
const realTimeEmergencyService_1 = require("./services/realTimeEmergencyService");
// Initialize express app
const app = (0, express_1.default)();
const PORT = process.env.PORT || 5001;
// Create HTTP server for Socket.io
const httpServer = (0, http_1.createServer)(app);
// Configure CORS to allow all origins for development
app.use((0, cors_1.default)({
    origin: true,
    credentials: true,
    optionsSuccessStatus: 200
}));
// Apply other middleware
app.use((0, helmet_1.default)({
    contentSecurityPolicy: false
}));
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: false, limit: '10mb' }));
// Request logging middleware
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
});
// Basic route for testing
app.get('/', (req, res) => {
    res.json({
        message: 'ශ්‍රී Express API - Complete Transportation Platform with Customer Service & Real-time Emergency Alerts!',
        version: '4.0.0',
        status: 'operational',
        timestamp: new Date().toISOString(),
        features: [
            '✅ User Authentication & Management',
            '✅ Complete Admin System (Fleet & AI)',
            '✅ Route Management & Search',
            '✅ Booking System & QR Codes',
            '✅ Real-time Vehicle Tracking',
            '✅ Payment Processing & Refunds',
            '✅ Enhanced Dashboard',
            '✅ Emergency Management',
            '✅ Analytics & Reporting',
            '✅ Weather Intelligence System', // ⭐ ADD THIS
            '🎯 CUSTOMER SERVICE PORTAL', // ⭐ NEW
            '🤖 AI CHATBOT INTEGRATION', // ⭐ NEW
            '🎫 TICKET MANAGEMENT SYSTEM', // ⭐ NEW
            '💬 REAL-TIME CHAT SUPPORT', // ⭐ NEW
            '📚 KNOWLEDGE BASE MANAGEMENT', // ⭐ NEW
            '🌤️ AI-Powered Weather Chatbot', // ⭐ ADD THIS
            '🚨 REAL-TIME EMERGENCY ALERTS',
            '🔔 LIVE NOTIFICATIONS',
            '⚡ WEBSOCKET CONNECTIONS'
        ],
        endpoints: {
            auth: '/api/auth',
            dashboard: '/api/dashboard',
            admin: '/api/admin',
            routes: '/api/routes',
            bookings: '/api/bookings',
            tracking: '/api/tracking',
            payments: '/api/payments',
            customerService: '/api/cs', // ⭐ NEW
            weather: '/api/weather', // ⭐ ADD THIS
            websocket: 'ws://localhost:' + PORT
        },
        totalEndpoints: '130+', // ⭐ UPDATED
        realTimeFeatures: {
            emergencyAlerts: 'Active',
            liveNotifications: 'Active',
            websocketConnections: 'Active',
            pushNotifications: 'Active',
            aiChatbot: 'Active', // ⭐ NEW
            liveChat: 'Active' // ⭐ NEW
        },
        competition: 'IDEALIZE 2025 Ready! 🏆'
    });
});
app.use('/api/payment-simulation', paymentSimulationRoutes_1.default);
// Health check endpoint with real-time status
app.get('/health', (req, res) => {
    let connectedUsers = 0;
    let realTimeActive = false;
    try {
        const realTimeService = (0, realTimeEmergencyService_1.getRealTimeEmergencyService)();
        connectedUsers = realTimeService.getConnectedUsersCount();
        realTimeActive = true;
    }
    catch (error) {
        // Service not initialized yet
    }
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        database: mongoose_1.default.connection.readyState === 1 ? 'connected' : 'disconnected',
        environment: process.env.NODE_ENV || 'development',
        version: '4.0.0', // ⭐ UPDATED
        platform: 'Complete Transportation Management System with Customer Service & Real-time Alerts',
        features: {
            authentication: 'active',
            adminSystem: 'active',
            fleetManagement: 'active',
            routeManagement: 'active',
            bookingSystem: 'active',
            trackingSystem: 'active',
            paymentSystem: 'active',
            analytics: 'active',
            customerService: 'active', // ⭐ NEW
            aiChatbot: 'active', // ⭐ NEW
            ticketSystem: 'active', // ⭐ NEW
            liveChat: 'active', // ⭐ NEW
            knowledgeBase: 'active', // ⭐ NEW
            weatherSystem: 'active', // ⭐ ADD THIS
            weatherChatbot: 'active', // ⭐ ADD THIS
            realTimeEmergency: realTimeActive ? 'active' : 'initializing',
            websocketServer: connectedUsers > 0 ? 'active' : 'ready'
        },
        realTimeStats: {
            connectedUsers: connectedUsers,
            websocketServer: 'running',
            emergencyAlertsActive: realTimeActive
        }
    });
});
// Real-time emergency test endpoint
app.get('/test-emergency', async (req, res) => {
    try {
        const realTimeService = (0, realTimeEmergencyService_1.getRealTimeEmergencyService)();
        // Send test emergency broadcast
        await realTimeService.sendSystemBroadcast('This is a test emergency broadcast from the system!', 'high', ['all']);
        res.json({
            message: 'Test emergency broadcast sent!',
            timestamp: new Date().toISOString(),
            connectedUsers: realTimeService.getConnectedUsersCount()
        });
    }
    catch (error) {
        res.status(500).json({
            message: 'Failed to send test broadcast - service not initialized',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
// WebSocket status endpoint
app.get('/websocket-status', (req, res) => {
    try {
        const realTimeService = (0, realTimeEmergencyService_1.getRealTimeEmergencyService)();
        const connectedUsers = realTimeService.getConnectedUsers();
        res.json({
            status: 'WebSocket server running',
            connectedUsers: connectedUsers.length,
            users: connectedUsers.map((user) => ({
                name: user.name,
                role: user.role,
                lastSeen: user.lastSeen,
                socketId: user.socketId.substring(0, 8) + '...' // Partial socket ID for privacy
            })),
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        res.status(500).json({
            message: 'WebSocket service not available',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
// Complete API documentation endpoint
app.get('/api', (req, res) => {
    res.json({
        message: 'Sri Express API v4.0.0 - Complete Transportation Platform with Customer Service & Real-time Emergency Alerts',
        status: 'All Systems Operational ✅',
        totalEndpoints: '130+', // ⭐ UPDATED
        newFeatures: {
            customerServicePortal: 'Complete CS agent dashboard and ticket management', // ⭐ NEW
            aiChatbot: 'Intelligent customer support with natural language processing', // ⭐ NEW
            ticketSystem: 'Full-featured support ticket lifecycle management', // ⭐ NEW
            liveChat: 'Real-time chat between customers and support agents', // ⭐ NEW
            knowledgeBase: 'Self-service FAQ and documentation with AI training', // ⭐ NEW
            realTimeEmergencyAlerts: 'Live emergency broadcasting system',
            websocketConnections: 'Real-time bi-directional communication',
            pushNotifications: 'Browser push notification support',
            liveUpdates: 'Instant dashboard and emergency updates'
        },
        documentation: {
            authentication: {
                base: '/api/auth',
                endpoints: [
                    'POST /register - User registration',
                    'POST /login - User login',
                    'GET /profile - Get user profile',
                    'POST /forgot-password - Password reset request',
                    'PUT /reset-password - Reset password with OTP'
                ]
            },
            customerService: {
                base: '/api/cs',
                endpoints: [
                    'GET /dashboard - CS agent dashboard with analytics',
                    'GET /tickets - Ticket management with filtering',
                    'POST /tickets - Create new support ticket',
                    'GET /chat/sessions - Live chat session management',
                    'POST /chat/sessions - Start new chat session',
                    'GET /knowledge - Knowledge base article management',
                    'POST /ai/respond - AI chatbot responses',
                    'GET /ai/suggestions - Agent response suggestions'
                ]
            },
            weather: {
                base: '/api/weather',
                endpoints: [
                    'GET /locations - Available weather locations',
                    'GET /current/:location - Current weather data',
                    'GET /comprehensive/:location - Complete weather data',
                    'POST /multiple - Weather for multiple locations',
                    'GET /route/:from/:to - Route weather analysis',
                    'GET /alerts/:location - Weather alerts',
                    'GET /chat/history - Weather chat history (auth)',
                    'POST /chat/save - Save weather chat (auth)',
                    'GET /preferences - Weather preferences (auth)',
                    'PUT /preferences - Update preferences (auth)'
                ]
            },
            realTimeEmergency: {
                base: 'WebSocket connection required',
                events: [
                    'emergency_alert - Real-time emergency notifications',
                    'emergency_created - New emergency incident',
                    'emergency_resolved - Emergency resolution',
                    'emergency_escalated - Emergency escalation',
                    'broadcast - System-wide announcements',
                    'push_notification_request - Browser push notifications',
                    'chat_message - Real-time chat messages', // ⭐ NEW
                    'ticket_update - Live ticket status updates' // ⭐ NEW
                ]
            },
            testing: {
                endpoints: [
                    'GET /test-emergency - Send test emergency broadcast',
                    'GET /websocket-status - Check WebSocket connections',
                    'GET /health - System health with real-time stats',
                    'GET /api/cs/health - Customer service system health' // ⭐ NEW
                ]
            }
        }
    });
});
// Test endpoint
app.get('/test', (req, res) => {
    res.json({
        message: 'Complete Transportation Platform with Customer Service & Real-time Emergency Alerts!',
        timestamp: new Date().toISOString(),
        status: '✅ All systems operational',
        platform: 'Sri Express Transportation Management',
        version: '4.0.0', // ⭐ UPDATED
        competition: 'IDEALIZE 2025',
        team: 'XForce (University of Moratuwa)',
        totalEndpoints: '130+', // ⭐ UPDATED
        newFeatures: [
            '🎯 Complete Customer Service Portal', // ⭐ NEW
            '🤖 AI-Powered Chatbot Support', // ⭐ NEW
            '🎫 Advanced Ticket Management', // ⭐ NEW
            '💬 Real-time Chat System', // ⭐ NEW
            '📚 Intelligent Knowledge Base', // ⭐ NEW
            '🚨 Real-time Emergency Alerts',
            '🔔 Live Push Notifications',
            '⚡ WebSocket Connections',
            '📡 Live Dashboard Updates',
            '🎯 Multi-channel Broadcasting'
        ],
        modelsLoaded: [
            'User ✅', 'Device ✅', 'Trip ✅', 'Emergency ✅', 'UserActivity ✅',
            'Fleet ✅', 'Route ✅', 'Booking ✅', 'LocationTracking ✅', 'Payment ✅',
            'Ticket ✅', 'Chat ✅', 'KnowledgeBase ✅' // ⭐ NEW
        ],
        readyFor: 'Production Deployment with Complete Customer Service & Live Emergency System 🚀'
    });
});
// ============================
// COMPLETE API ROUTES - ALL SYSTEMS ACTIVE + FLEET PORTAL
// ============================
// Core system routes
app.use('/api/auth', authRoutes_1.default);
app.use('/api/dashboard', dashboardRoutes_1.default);
app.use('/api/admin', adminRoutes_1.default);
// Complete transportation system routes
app.use('/api/routes', routeRoutes_1.default);
app.use('/api/bookings', bookingRoutes_1.default);
app.use('/api/tracking', trackingRoutes_1.default);
app.use('/api/payments', paymentRoutes_1.default);
// Fleet Portal routes ← NEW
app.use('/api/fleet', fleetRoutes_1.default); // ← ADD THIS LINE
// Customer Service routes
app.use('/api/cs', csRoutes_1.default);
// Weather routes
app.use('/api/weather', weatherRoutes_1.default);
// Error handling middleware
app.use(errorMiddleware_1.notFound);
app.use(errorMiddleware_1.errorHandler);
app.use('/api/route-admin', routeAdminRoutes_1.default);
// Global error handler for uncaught exceptions
process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    // Don't exit in production - log and continue
    if (process.env.NODE_ENV === 'production') {
        console.error('Production: Continuing after uncaught exception');
    }
});
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    // Don't exit in production - log and continue
    if (process.env.NODE_ENV === 'production') {
        console.error('Production: Continuing after unhandled rejection');
    }
});
// Graceful shutdown
process.on('SIGTERM', async () => {
    console.log('SIGTERM received, shutting down gracefully');
    try {
        await mongoose_1.default.connection.close();
        console.log('MongoDB connection closed');
        httpServer.close(() => {
            console.log('HTTP server closed');
            process.exit(0);
        });
    }
    catch (error) {
        console.error('Error during shutdown:', error);
        process.exit(1);
    }
});
process.on('SIGINT', async () => {
    console.log('SIGINT received, shutting down gracefully');
    try {
        await mongoose_1.default.connection.close();
        console.log('MongoDB connection closed');
        httpServer.close(() => {
            console.log('HTTP server closed');
            process.exit(0);
        });
    }
    catch (error) {
        console.error('Error during shutdown:', error);
        process.exit(1);
    }
});
// Server startup
const startServer = async () => {
    try {
        // Connect to MongoDB and wait for it to finish
        await (0, db_1.default)();
        // Initialize Real-time Emergency Service AFTER database connection
        console.log('🚨 Initializing Real-time Emergency Service...');
        const realTimeService = (0, realTimeEmergencyService_1.initializeRealTimeEmergencyService)(httpServer);
        console.log('✅ Real-time Emergency Service initialized successfully');
        // Now start the HTTP server with Socket.io
        httpServer.listen(PORT, () => {
            console.log('🚀 ================================================================');
            console.log('🚀            SRI EXPRESS TRANSPORTATION PLATFORM v4.0.0          🚀');
            console.log('🚀          WITH CUSTOMER SERVICE & REAL-TIME EMERGENCY ALERTS    🚀');
            console.log('🚀 ================================================================');
            console.log(`📍 Server: http://localhost:${PORT}`);
            console.log(`🔌 WebSocket: ws://localhost:${PORT}`);
            console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
            console.log(`📍 Database: ${mongoose_1.default.connection.readyState === 1 ? '✅ Connected' : '❌ Disconnected'}`);
            console.log(`📍 API Version: 4.0.0`);
            console.log(`📍 Total Endpoints: 130+`);
            console.log(`📍 Competition: IDEALIZE 2025`);
            console.log(`📍 Team: XForce (University of Moratuwa)`);
            console.log('🚀 ================================================================');
            console.log('📍 COMPLETE API ENDPOINTS:');
            console.log('📍   🔐 Authentication: http://localhost:' + PORT + '/api/auth/*');
            console.log('📍   📊 Enhanced Dashboard: http://localhost:' + PORT + '/api/dashboard/*');
            console.log('📍   ⚙️  Complete Admin: http://localhost:' + PORT + '/api/admin/*');
            console.log('📍   🛣️  Route Management: http://localhost:' + PORT + '/api/routes/*');
            console.log('📍   🚛 Fleet Portal: http://localhost:' + PORT + '/api/fleet/*');
            console.log('📍   🎫 Booking System: http://localhost:' + PORT + '/api/bookings/*');
            console.log('📍   📍 Live Tracking: http://localhost:' + PORT + '/api/tracking/*');
            console.log('📍   💳 Payment Processing: http://localhost:' + PORT + '/api/payments/*');
            console.log('📍   🌤️  Weather System: http://localhost:' + PORT + '/api/weather/*');
            console.log('🎯 ================================================================');
            console.log('🎯 CUSTOMER SERVICE ENDPOINTS:'); // ⭐ NEW
            console.log('🎯   🎫 CS Dashboard: http://localhost:' + PORT + '/api/cs/dashboard');
            console.log('🎯   🎫 Ticket System: http://localhost:' + PORT + '/api/cs/tickets/*');
            console.log('🎯   💬 Live Chat: http://localhost:' + PORT + '/api/cs/chat/*');
            console.log('🎯   📚 Knowledge Base: http://localhost:' + PORT + '/api/cs/knowledge/*');
            console.log('🎯   🤖 AI Chatbot: http://localhost:' + PORT + '/api/cs/ai/*');
            console.log('🎯   📊 CS Analytics: http://localhost:' + PORT + '/api/cs/analytics');
            console.log('🚨 ================================================================');
            console.log('🚨 REAL-TIME EMERGENCY FEATURES:');
            console.log('🚨   🔔 Emergency Alerts: WebSocket Connection Active');
            console.log('🚨   📡 Live Notifications: Real-time Broadcasting');
            console.log('🚨   ⚡ Push Notifications: Browser Integration Ready');
            console.log('🚨   🎯 Multi-channel Alerts: Email + Push + In-app');
            console.log('🚨   💬 Live Chat Messages: Real-time Customer Support'); // ⭐ NEW
            console.log('🚨   🎫 Live Ticket Updates: Instant Status Changes'); // ⭐ NEW
            console.log('🚀 ================================================================');
            console.log('📍 TESTING ENDPOINTS:');
            console.log('📍   - Emergency Test: http://localhost:' + PORT + '/test-emergency');
            console.log('📍   - WebSocket Status: http://localhost:' + PORT + '/websocket-status');
            console.log('📍   - Complete API Docs: http://localhost:' + PORT + '/api');
            console.log('📍   - System Health: http://localhost:' + PORT + '/health');
            console.log('📍   - Platform Test: http://localhost:' + PORT + '/test');
            console.log('📍   - CS Health Check: http://localhost:' + PORT + '/api/cs/health'); // ⭐ NEW
            console.log('🚀 ================================================================');
            console.log('🎉 COMPLETE TRANSPORTATION PLATFORM WITH CUSTOMER SERVICE READY!');
            console.log('🏆 IDEALIZE 2025 - COMPETITION READY WITH FULL SUPPORT SYSTEM!');
            console.log('🚀 Backend: 100% Complete | Customer Service: ACTIVE | Real-time: ACTIVE');
            console.log('🎯 Customer Service: LIVE AND OPERATIONAL! 🎯');
            console.log('🚨 Emergency System: LIVE AND OPERATIONAL! 🚨');
            console.log('🚀 ================================================================');
            console.log('🎯 NEW FEATURES ACTIVE:'); // ⭐ NEW
            console.log('🎯   ✅ AI-Powered Customer Support Chatbot');
            console.log('🎯   ✅ Real-time Chat Between Customers & Agents');
            console.log('🎯   ✅ Complete Ticket Management System');
            console.log('🎯   ✅ Knowledge Base with AI Training Integration');
            console.log('🎯   ✅ Customer Service Agent Dashboard');
            console.log('🎯   ✅ Automated Response Suggestions');
            console.log('🎯   ✅ Sentiment Analysis & Intent Recognition');
            console.log('🎯   ✅ Multi-channel Support (Web, Mobile, Chat)');
            console.log('🎯   ✅ AI-Powered Weather Intelligence System');
            console.log('🎯   ✅ Weather-based Route Planning');
            console.log('🎯   ✅ Real-time Weather Alerts & Notifications');
            console.log('🎯   ✅ Weather Chatbot for Travel Planning');
            console.log('🚀 ================================================================');
            // Send a test broadcast after 5 seconds to confirm system is working
            setTimeout(async () => {
                try {
                    await realTimeService.sendSystemBroadcast('Sri Express Customer Service & Emergency Alert System is now LIVE and operational! 🎯🚨', 'medium', ['all']);
                    console.log('✅ Test broadcast sent successfully');
                }
                catch (error) {
                    console.error('❌ Test broadcast failed:', error);
                }
            }, 5000);
        });
    }
    catch (error) {
        console.error("❌ Failed to start server", error);
        process.exit(1);
    }
};
// Start the server
startServer();
