// src/routes/trackingRoutes.ts
import express from 'express';
import { protect } from '../middleware/authMiddleware';
import { requireSystemAdmin } from '../middleware/adminMiddleware';
import {
  getLiveLocations,
  getRouteVehicles,
  updateVehicleLocation,
  getETAForBooking,
  getVehicleHistory,
  getTrackingAnalytics
} from '../controllers/trackingController';

const router = express.Router();

// Public tracking routes
router.get('/live', getLiveLocations);
router.get('/route/:routeId', getRouteVehicles);

// Private tracking routes
router.get('/eta/:bookingId', protect, getETAForBooking);

// Device/Driver routes (for location updates)
router.post('/update', updateVehicleLocation);

// Admin routes
router.get('/history/:vehicleId', requireSystemAdmin, getVehicleHistory);
router.get('/analytics', requireSystemAdmin, getTrackingAnalytics);

export default router;