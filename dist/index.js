"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// src/index.ts
const express_1 = __importDefault(require("express"));
const mongoose_1 = __importDefault(require("mongoose"));
const helmet_1 = __importDefault(require("helmet"));
const dotenv_1 = __importDefault(require("dotenv"));
const cors_1 = __importDefault(require("cors"));
// Load environment variables
dotenv_1.default.config();
// Import routes
const authRoutes_1 = __importDefault(require("./routes/authRoutes"));
const dashboardRoutes_1 = __importDefault(require("./routes/dashboardRoutes"));
const adminRoutes_1 = __importDefault(require("./routes/adminRoutes"));
// Import middleware
const errorMiddleware_1 = require("./middleware/errorMiddleware");
// Import DB connection
const db_1 = __importDefault(require("./config/db"));
// Connect to MongoDB
(0, db_1.default)();
// Initialize express app
const app = (0, express_1.default)();
const PORT = process.env.PORT || 5000;
// Define allowed origins
const allowedOrigins = [
    'https://sri-express.mehara.io',
    'https://clownfish-app-ymy8k.ondigitalocean.app',
    'http://localhost:3000'
];
// Configure CORS - keep it simple
app.use((0, cors_1.default)({
    origin: function (origin, callback) {
        // Allow requests with no origin (mobile apps, curl, etc)
        if (!origin)
            return callback(null, true);
        if (allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        }
        else {
            callback(null, true); // For development: allow all origins
            // For production: callback(new Error('Not allowed by CORS'), false);
        }
    },
    credentials: true
}));
// Apply other middleware
app.use((0, helmet_1.default)({
    contentSecurityPolicy: false
}));
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: false, limit: '10mb' }));
// Request logging middleware for development
if (process.env.NODE_ENV === 'development') {
    app.use((req, res, next) => {
        console.log(`${req.method} ${req.path} - ${new Date().toISOString()}`);
        next();
    });
}
// Basic route for testing
app.get('/', (req, res) => {
    res.json({
        message: 'ශ්‍රී Express API is running',
        version: '1.0.0',
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
        database: mongoose_1.default.connection.readyState === 1 ? 'connected' : 'disconnected'
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
// Start server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`MongoDB: ${mongoose_1.default.connection.readyState === 1 ? 'Connected' : 'Disconnected'}`);
    console.log(`Available endpoints:`);
    console.log(`  - Health: http://localhost:${PORT}/health`);
    console.log(`  - Auth: http://localhost:${PORT}/api/auth`);
    console.log(`  - Dashboard: http://localhost:${PORT}/api/dashboard`);
    console.log(`  - Admin: http://localhost:${PORT}/api/admin`);
});
