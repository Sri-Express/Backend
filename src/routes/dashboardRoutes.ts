// src/routes/dashboardRoutes.ts
import express from 'express';
import { 
  getDashboardStats,
  getRecentTrips,
  getUpcomingTrips,
  updateProfile,
  createDemoTrip
} from '../controllers/dashboardController';
import { protect } from '../middleware/authMiddleware';

const router = express.Router();

// All dashboard routes are protected
router.use(protect);

// Get dashboard statistics
router.get('/stats', getDashboardStats);

// Get recent trips
router.get('/recent-trips', getRecentTrips);

// Get upcoming trips
router.get('/upcoming-trips', getUpcomingTrips);

// Update user profile
router.put('/profile', updateProfile);

// Create demo trips (for testing)
router.post('/demo-trip', createDemoTrip);

export default router;