"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// src/index.ts - FIXED VERSION
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
// Import routes
const authRoutes_1 = __importDefault(require("./routes/authRoutes"));
const dashboardRoutes_1 = __importDefault(require("./routes/dashboardRoutes"));
const adminRoutes_1 = __importDefault(require("./routes/adminRoutes"));
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
        message: 'ශ්‍රී Express API is running successfully!',
        version: '2.0.0',
        status: 'operational',
        timestamp: new Date().toISOString(),
        endpoints: {
            auth: '/api/auth',
            dashboard: '/api/dashboard',
            admin: '/api/admin'
        }
    });
});
// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        database: mongoose_1.default.connection.readyState === 1 ? 'connected' : 'disconnected',
        environment: process.env.NODE_ENV || 'development'
    });
});
// Test endpoint to verify server is working
app.get('/test', (req, res) => {
    res.json({
        message: 'Test endpoint working!',
        timestamp: new Date().toISOString(),
        headers: req.headers
    });
});
// Routes
app.use('/api/auth', authRoutes_1.default);
app.use('/api/dashboard', dashboardRoutes_1.default);
app.use('/api/admin', adminRoutes_1.default);
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
// --- CORRECTED SERVER STARTUP ---
const startServer = async () => {
    try {
        // Connect to MongoDB and wait for it to finish
        await (0, db_1.default)();
        // Now that the DB is connected, start the server
        app.listen(PORT, () => {
            console.log('🚀 ========================================');
            console.log(`🚀 Sri Express Backend Server Started!`);
            console.log('🚀 ========================================');
            console.log(`📍 Server: http://localhost:${PORT}`);
            console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
            // This will now correctly show "Connected"
            console.log(`📍 Database: ${mongoose_1.default.connection.readyState === 1 ? '✅ Connected' : '❌ Disconnected'}`);
            console.log(`📍 Available endpoints:`);
            console.log(`   - Test: http://localhost:${PORT}/test`);
            console.log(`   - Health: http://localhost:${PORT}/health`);
            console.log(`   - Auth: http://localhost:${PORT}/api/auth`);
            console.log(`   - Dashboard: http://localhost:${PORT}/api/dashboard`);
            console.log(`   - Admin: http://localhost:${PORT}/api/admin`);
            console.log('🚀 ========================================');
        });
    }
    catch (error) {
        console.error("❌ Failed to connect to MongoDB", error);
        process.exit(1); // Exit the process with an error code
    }
};
// Call the function to start the server
startServer();
