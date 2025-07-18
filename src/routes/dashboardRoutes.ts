// src/routes/dashboardRoutes.ts - Enhanced Version
import express from 'express';
import { protect } from '../middleware/authMiddleware';
import { 
  getDashboardStats,
  getRecentTrips,
  getUpcomingTrips,
  updateProfile,
  createDemoTrip,
  // New enhanced endpoints
  getRecentBookings,
  getUserActivity,
  getFavoriteRoutes,
  getTravelInsights
} from '../controllers/dashboardController';

const router = express.Router();

// All dashboard routes are protected
router.use(protect);

// ============================
// CORE DASHBOARD ENDPOINTS
// ============================

// Get dashboard statistics (enhanced with booking data)
router.get('/stats', getDashboardStats);

// Update user profile
router.put('/profile', updateProfile);

// ============================
// BOOKING & TRIP ENDPOINTS
// ============================

// Get recent bookings (new system)
router.get('/recent-bookings', getRecentBookings);

// Get upcoming trips (enhanced with live data)
router.get('/upcoming-trips', getUpcomingTrips);

// Get recent trips (legacy compatibility)
router.get('/recent-trips', getRecentTrips);

// ============================
// USER ACTIVITY & INSIGHTS
// ============================

// Get user activity summary
router.get('/activity', getUserActivity);

// Get favorite/frequently used routes
router.get('/favorite-routes', getFavoriteRoutes);

// Get travel insights and analytics
router.get('/insights', getTravelInsights);

// ============================
// UTILITY ENDPOINTS
// ============================

// Create demo trips (for testing)
router.post('/demo-trip', createDemoTrip);

export default router;