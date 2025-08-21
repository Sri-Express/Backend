// src/routes/fleetRoutes.ts - Fleet Operator Routes
import express from 'express';

// --- CORRECTED IMPORT ---
// Import the correct middleware from the correct file.
import { requireFleetManager } from '../middleware/fleetMiddleware';

import { 
  getFleetDashboard,
  getFleetProfile,
  updateFleetProfile,
  getFleetVehicles,
  addVehicle,
  updateVehicle,
  getVehicleDetails,
  deleteVehicle,
  getFleetRoutes,
  getFleetAnalytics
} from '../controllers/fleetController';

const router = express.Router();

// --- CORRECTED MIDDLEWARE USAGE ---
// This single middleware handles both authentication (is user logged in?)
// and authorization (is user a fleet manager?).
router.use(requireFleetManager); 

// Now all these routes are properly secured
router.get('/dashboard', getFleetDashboard);
router.get('/profile', getFleetProfile);
router.put('/profile', updateFleetProfile);

// Vehicle Management
router.get('/vehicles', getFleetVehicles);
router.post('/vehicles', addVehicle);
router.get('/vehicles/:id', getVehicleDetails);
router.put('/vehicles/:id', updateVehicle);
router.delete('/vehicles/:id', deleteVehicle);

// Route Management
router.get('/routes', getFleetRoutes);

// Analytics
router.get('/analytics', getFleetAnalytics);

export default router;