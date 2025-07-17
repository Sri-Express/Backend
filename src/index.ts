// src/index.ts - FIXED VERSION WITH ALL IMPORTS
import express from 'express';
import mongoose from 'mongoose';
import helmet from 'helmet';
import dotenv from 'dotenv';
import cors from 'cors';

// Load environment variables
dotenv.config();

// Import all models to ensure they're registered
import User from './models/User';
import Device from './models/Device';
import Trip from './models/Trip';
import Emergency from './models/Emergency';
import UserActivity from './models/UserActivity';
// Import Fleet model (create this file if it doesn't exist)
// import Fleet from './models/Fleet';

// Import routes
import authRoutes from './routes/authRoutes';
import dashboardRoutes from './routes/dashboardRoutes';
import adminRoutes from './routes/adminRoutes';

// Import middleware
import { notFound, errorHandler } from './middleware/errorMiddleware';

// Import DB connection
import connectDB from './config/db';

// Connect to MongoDB
connectDB();

// Initialize express app
const app = express();
const PORT = process.env.PORT || 5000;

// Configure CORS to allow all origins for development
app.use(cors({
  origin: true, // Allow all origins in development
  credentials: true,
  optionsSuccessStatus: 200
}));

// Apply other middleware
app.use(helmet({
  contentSecurityPolicy: false
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: false, limit: '10mb' }));

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
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
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
app.use('/api/auth', authRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/admin', adminRoutes);

// Error handling middleware
app.use(notFound);
app.use(errorHandler);

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully');
  try {
    await mongoose.connection.close();
    console.log('MongoDB connection closed');
    process.exit(0);
  } catch (error) {
    console.error('Error closing MongoDB connection:', error);
    process.exit(1);
  }
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully');
  try {
    await mongoose.connection.close();
    console.log('MongoDB connection closed');
    process.exit(0);
  } catch (error) {
    console.error('Error closing MongoDB connection:', error);
    process.exit(1);
  }
});

// Start server
app.listen(PORT, () => {
  console.log('🚀 ========================================');
  console.log(`🚀 Sri Express Backend Server Started!`);
  console.log('🚀 ========================================');
  console.log(`📍 Server: http://localhost:${PORT}`);
  console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`📍 Database: ${mongoose.connection.readyState === 1 ? '✅ Connected' : '❌ Disconnected'}`);
  console.log(`📍 Available endpoints:`);
  console.log(`   - Test: http://localhost:${PORT}/test`);
  console.log(`   - Health: http://localhost:${PORT}/health`);
  console.log(`   - Auth: http://localhost:${PORT}/api/auth`);
  console.log(`   - Dashboard: http://localhost:${PORT}/api/dashboard`);
  console.log(`   - Admin: http://localhost:${PORT}/api/admin`);
  console.log('🚀 ========================================');
});