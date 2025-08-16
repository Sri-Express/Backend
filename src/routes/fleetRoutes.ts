// src/routes/fleetRoutes.ts - Fleet Operator Routes
import express from 'express';
import { protect } from '../middleware/authMiddleware'; // <-- CORRECTED
import { 
  getFleetDashboard,
  getFleetProfile,
  updateFleetProfile,
  getFleetVehicles,
  addVehicle,
  updateVehicle,
  getFleetRoutes,
  getFleetAnalytics
} from '../controllers/fleetController';

const router = express.Router();

// Apply authentication middleware to all routes
router.use(protect); // <-- CORRECTED

// Fleet Dashboard & Profile
router.get('/dashboard', getFleetDashboard);
router.get('/profile', getFleetProfile);
router.put('/profile', updateFleetProfile);

// Vehicle Management
router.get('/vehicles', getFleetVehicles);
router.post('/vehicles', addVehicle);
router.put('/vehicles/:id', updateVehicle);

// Route Management
router.get('/routes', getFleetRoutes);

// Analytics
router.get('/analytics', getFleetAnalytics);

export default router;