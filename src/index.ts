// src/index.ts
import express from 'express';
import mongoose from 'mongoose';
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

// Custom CORS middleware - most reliable approach
app.use((req, res, next) => {
  // Define allowed origins - include both your custom domain and default DigitalOcean domains
  const allowedOrigins = [
    'https://sri-express.mehara.io',
    'https://clownfish-app-ymy8k.ondigitalocean.app',
    'http://localhost:3000'
  ];
  
  const origin = req.headers.origin;
  
  // Set CORS headers for all requests
  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else {
    // For development or unknown origins
    res.setHeader('Access-Control-Allow-Origin', '*');
  }
  
  // Allow credentials
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  
  // Allow specific headers
  res.setHeader('Access-Control-Allow-Headers', 
    'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  
  // Allow specific methods
  res.setHeader('Access-Control-Allow-Methods', 
    'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  
  // Handle preflight requests (OPTIONS)
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  // Move to the next middleware
  next();
});

// Apply other middleware
app.use(helmet({
  // Disable contentSecurityPolicy for simplicity in development
  // In production, you might want to configure this properly
  contentSecurityPolicy: false
}));
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