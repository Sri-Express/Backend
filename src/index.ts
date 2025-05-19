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

// Configure CORS - UPDATED CODE HERE
const allowedOrigins = process.env.CORS_ORIGIN ? 
  process.env.CORS_ORIGIN.split(',') : 
  ['https://clownfish-app-ymy8k.ondigitalocean.app', 'http://localhost:3000'];

app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) === -1) {
      const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  },
  credentials: true
}));

// Rest of your code remains the same
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