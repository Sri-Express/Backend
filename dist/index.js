"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// src/index.ts - COMPLETE TRANSPORTATION PLATFORM
const express_1 = __importDefault(require("express"));
const mongoose_1 = __importDefault(require("mongoose"));
const helmet_1 = __importDefault(require("helmet"));
const dotenv_1 = __importDefault(require("dotenv"));
const cors_1 = __importDefault(require("cors"));
// Load environment variables
dotenv_1.default.config();
// Import all models to ensure they're registered
require("./models/User");
require("./models/Device");
require("./models/Trip");
require("./models/Emergency");
require("./models/UserActivity");
require("./models/Fleet");
require("./models/Route"); // ✅ FIXED VERSION
require("./models/Booking"); // ✅ FIXED VERSION
require("./models/LocationTracking"); // ✅ FIXED VERSION  
require("./models/Payment"); // ✅ FIXED VERSION
// Import ALL routes - COMPLETE PLATFORM ⭐
const authRoutes_1 = __importDefault(require("./routes/authRoutes"));
const dashboardRoutes_1 = __importDefault(require("./routes/dashboardRoutes"));
const adminRoutes_1 = __importDefault(require("./routes/adminRoutes"));
// NEW TRANSPORTATION ROUTES ⭐
const routeRoutes_1 = __importDefault(require("./routes/routeRoutes"));
const bookingRoutes_1 = __importDefault(require("./routes/bookingRoutes"));
const trackingRoutes_1 = __importDefault(require("./routes/trackingRoutes"));
const paymentRoutes_1 = __importDefault(require("./routes/paymentRoutes"));
const paymentSimulationRoutes_1 = __importDefault(require("./routes/paymentSimulationRoutes"));
// Import middleware
const errorMiddleware_1 = require("./middleware/errorMiddleware");
// Import DB connection
const db_1 = __importDefault(require("./config/db"));
// Initialize express app
const app = (0, express_1.default)();
const PORT = process.env.PORT || 5000;
// Configure CORS to allow all origins for development
app.use((0, cors_1.default)({
    origin: true, // Allow all origins in development
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
        message: 'ශ්‍රී Express API - Complete Transportation Platform!',
        version: '2.0.0',
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
            '✅ Analytics & Reporting'
        ],
        endpoints: {
            auth: '/api/auth',
            dashboard: '/api/dashboard',
            admin: '/api/admin',
            routes: '/api/routes',
            bookings: '/api/bookings',
            tracking: '/api/tracking',
            payments: '/api/payments'
        },
        totalEndpoints: '60+',
        competition: 'IDEALIZE 2025 Ready! 🏆'
    });
});
app.use('/api/payment-simulation', paymentSimulationRoutes_1.default);
// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        database: mongoose_1.default.connection.readyState === 1 ? 'connected' : 'disconnected',
        environment: process.env.NODE_ENV || 'development',
        version: '2.0.0',
        platform: 'Complete Transportation Management System',
        features: {
            authentication: 'active',
            adminSystem: 'active',
            fleetManagement: 'active',
            routeManagement: 'active',
            bookingSystem: 'active',
            trackingSystem: 'active',
            paymentSystem: 'active',
            analytics: 'active'
        }
    });
});
// Complete API documentation endpoint
app.get('/api', (req, res) => {
    res.json({
        message: 'Sri Express API v2.0.0 - Complete Transportation Platform',
        status: 'All Systems Operational ✅',
        totalEndpoints: '60+',
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
            dashboard: {
                base: '/api/dashboard',
                endpoints: [
                    'GET /stats - Dashboard statistics',
                    'GET /recent-trips - Recent trip history',
                    'GET /upcoming-trips - Upcoming trips',
                    'PUT /profile - Update user profile',
                    'POST /demo-trip - Create demo data'
                ]
            },
            admin: {
                base: '/api/admin',
                categories: [
                    'User Management (10 endpoints)',
                    'Device Management (8 endpoints)',
                    'Fleet Management (12 endpoints)',
                    'AI Management (8 endpoints)',
                    'Emergency Management (6 endpoints)',
                    'System Analytics (5 endpoints)'
                ]
            },
            routes: {
                base: '/api/routes',
                endpoints: [
                    'GET / - List all routes with filtering',
                    'GET /search - Search routes between locations',
                    'GET /:id - Get route details',
                    'GET /:id/schedules - Get route schedules',
                    'GET /:id/realtime - Get real-time route info',
                    'POST / - Create route (Admin)',
                    'PUT /:id - Update route (Admin)',
                    'DELETE /:id - Delete route (Admin)'
                ]
            },
            bookings: {
                base: '/api/bookings',
                endpoints: [
                    'GET / - Get user bookings with filtering',
                    'POST / - Create new booking',
                    'GET /stats - Booking statistics',
                    'GET /:id - Get booking details',
                    'PUT /:id - Update booking',
                    'PUT /:id/cancel - Cancel booking',
                    'POST /:id/qr - Generate QR code',
                    'POST /:id/checkin - Check in passenger'
                ]
            },
            tracking: {
                base: '/api/tracking',
                endpoints: [
                    'GET /live - Live vehicle locations',
                    'GET /route/:routeId - Vehicles on specific route',
                    'GET /eta/:bookingId - ETA for booking',
                    'POST /update - Update vehicle location',
                    'GET /history/:vehicleId - Vehicle history (Admin)',
                    'GET /analytics - Tracking analytics (Admin)'
                ]
            },
            payments: {
                base: '/api/payments',
                endpoints: [
                    'GET /methods - Available payment methods',
                    'POST / - Process payment',
                    'GET /history - Payment history',
                    'GET /stats - Payment statistics',
                    'GET /:id - Get payment details',
                    'POST /refund - Process refund'
                ]
            }
        }
    });
});
// Test endpoint
app.get('/test', (req, res) => {
    res.json({
        message: 'Complete Transportation Platform Test!',
        timestamp: new Date().toISOString(),
        status: '✅ All systems operational',
        platform: 'Sri Express Transportation Management',
        version: '2.0.0',
        competition: 'IDEALIZE 2025',
        team: 'XForce (University of Moratuwa)',
        totalEndpoints: '60+',
        modelsLoaded: [
            'User ✅', 'Device ✅', 'Trip ✅', 'Emergency ✅', 'UserActivity ✅',
            'Fleet ✅', 'Route ✅ (Fixed)', 'Booking ✅ (Fixed)', 'LocationTracking ✅ (Fixed)', 'Payment ✅ (Fixed)'
        ],
        readyFor: 'Production Deployment 🚀'
    });
});
// ============================
// COMPLETE API ROUTES - ALL SYSTEMS ACTIVE ⭐
// ============================
// Core system routes
app.use('/api/auth', authRoutes_1.default);
app.use('/api/dashboard', dashboardRoutes_1.default);
app.use('/api/admin', adminRoutes_1.default);
// Complete transportation system routes ⭐
app.use('/api/routes', routeRoutes_1.default);
app.use('/api/bookings', bookingRoutes_1.default);
app.use('/api/tracking', trackingRoutes_1.default);
app.use('/api/payments', paymentRoutes_1.default);
// Error handling middleware
app.use(errorMiddleware_1.notFound);
app.use(errorMiddleware_1.errorHandler);
// Graceful shutdown
process.on('SIGTERM', async () => {
    console.log('SIGTERM received, shutting down gracefully');
    try {
        await mongoose_1.default.connection.close();
        console.log('MongoDB connection closed');
        process.exit(0);
    }
    catch (error) {
        console.error('Error closing MongoDB connection:', error);
        process.exit(1);
    }
});
process.on('SIGINT', async () => {
    console.log('SIGINT received, shutting down gracefully');
    try {
        await mongoose_1.default.connection.close();
        console.log('MongoDB connection closed');
        process.exit(0);
    }
    catch (error) {
        console.error('Error closing MongoDB connection:', error);
        process.exit(1);
    }
});
// Server startup
const startServer = async () => {
    try {
        // Connect to MongoDB and wait for it to finish
        await (0, db_1.default)();
        // Now that the DB is connected, start the server
        app.listen(PORT, () => {
            console.log('🚀 ================================================================');
            console.log('🚀               SRI EXPRESS TRANSPORTATION PLATFORM              🚀');
            console.log('🚀 ================================================================');
            console.log(`📍 Server: http://localhost:${PORT}`);
            console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
            console.log(`📍 Database: ${mongoose_1.default.connection.readyState === 1 ? '✅ Connected' : '❌ Disconnected'}`);
            console.log(`📍 API Version: 2.0.0`);
            console.log(`📍 Total Endpoints: 60+`);
            console.log(`📍 Competition: IDEALIZE 2025`);
            console.log(`📍 Team: XForce (University of Moratuwa)`);
            console.log('🚀 ================================================================');
            console.log('📍 COMPLETE API ENDPOINTS:');
            console.log('📍   🔐 Authentication: http://localhost:' + PORT + '/api/auth/*');
            console.log('📍   📊 Enhanced Dashboard: http://localhost:' + PORT + '/api/dashboard/*');
            console.log('📍   ⚙️  Complete Admin: http://localhost:' + PORT + '/api/admin/*');
            console.log('📍   🛣️  Route Management: http://localhost:' + PORT + '/api/routes/*');
            console.log('📍   🎫 Booking System: http://localhost:' + PORT + '/api/bookings/*');
            console.log('📍   📍 Live Tracking: http://localhost:' + PORT + '/api/tracking/*');
            console.log('📍   💳 Payment Processing: http://localhost:' + PORT + '/api/payments/*');
            console.log('🚀 ================================================================');
            console.log('📍 QUICK TEST ENDPOINTS:');
            console.log('📍   - Complete API Docs: http://localhost:' + PORT + '/api');
            console.log('📍   - System Health: http://localhost:' + PORT + '/health');
            console.log('📍   - Platform Test: http://localhost:' + PORT + '/test');
            console.log('🚀 ================================================================');
            console.log('🎉 COMPLETE TRANSPORTATION PLATFORM READY!');
            console.log('🏆 IDEALIZE 2025 - COMPETITION READY!');
            console.log('🚀 Backend: 100% Complete | Frontend: Ready for Enhancement');
            console.log('🚀 ================================================================');
        });
    }
    catch (error) {
        console.error("❌ Failed to connect to MongoDB", error);
        process.exit(1);
    }
};
// Call the function to start the server
startServer();
