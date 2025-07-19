// src/routes/dashboardRoutes.ts - FIXED VERSION - Remove createDemoTrip
import express from 'express';
import { protect } from '../middleware/authMiddleware';
import { 
  getDashboardStats,
  getRecentTrips,
  getUpcomingTrips,
  updateProfile
  // ✅ REMOVED: createDemoTrip - no longer needed in production
} from '../controllers/dashboardController';

const router = express.Router();

// All dashboard routes are protected
router.use(protect);

// Core dashboard endpoints
router.get('/stats', getDashboardStats);
router.get('/recent-trips', getRecentTrips);
router.get('/upcoming-trips', getUpcomingTrips);
router.put('/profile', updateProfile);

// ✅ REMOVED: Demo trip creation route - production ready
// router.post('/demo-trip', createDemoTrip);

export default router;