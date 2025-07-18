// src/routes/dashboardRoutes.ts - Simple Version (Works with your current controller)
import express from 'express';
import { protect } from '../middleware/authMiddleware';
import { 
  getDashboardStats,
  getRecentTrips,
  getUpcomingTrips,
  updateProfile,
  createDemoTrip
} from '../controllers/dashboardController';

const router = express.Router();

// All dashboard routes are protected
router.use(protect);

// Core dashboard endpoints (using your existing functions)
router.get('/stats', getDashboardStats);
router.get('/recent-trips', getRecentTrips);
router.get('/upcoming-trips', getUpcomingTrips);
router.put('/profile', updateProfile);
router.post('/demo-trip', createDemoTrip);

export default router;