// src/index.ts
import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Import routes
import authRoutes from './routes/authRoutes';

// Import middleware
import { notFound, errorHandler } from './middleware/errorMiddleware';

// Import DB connection
import connectDB from './config/db';

// Connect to MongoDB
connectDB();

// Initialize express app
const app = express();
const PORT = process.env.PORT || 5000;

// Configure CORS to include your custom domain
const allowedOrigins = process.env.CORS_ORIGIN ? 
  process.env.CORS_ORIGIN.split(',') : 
  [
    'https://clownfish-app-ymy8k.ondigitalocean.app', 
    'http://localhost:3000',
    'https://sri-express.mehara.io'  // Add your custom domain here
  ];

app.use(cors({
  origin: allowedOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Other middleware
app.use(helmet());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Basic route for testing
app.get('/', (req, res) => {
  res.send('ශ්‍රී Express API is running');
});

// Routes
app.use('/api/auth', authRoutes);

// Error handling middleware
app.use(notFound);
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`http://localhost:${PORT}`);
});