// src/routes/routeRoutes.ts
import express from 'express';
import { protect } from '../middleware/authMiddleware';
import { requireSystemAdmin } from '../middleware/adminMiddleware';
import { optionalFleetManager } from '../middleware/fleetMiddleware';
import {
  getRoutes,
  searchRoutes,
  getRouteById,
  getRouteSchedules,
  getRouteRealTime,
  createRoute,
  updateRoute,
  deleteRoute,
  getRouteStats
} from '../controllers/routeController';

const router = express.Router();

// Public routes (with optional authentication for better experience)
router.get('/', optionalFleetManager, getRoutes);
router.get('/search', optionalFleetManager, searchRoutes);
router.get('/:id', optionalFleetManager, getRouteById);
router.get('/:id/schedules', optionalFleetManager, getRouteSchedules);
router.get('/:id/realtime', optionalFleetManager, getRouteRealTime);

// Admin routes (protected)
router.post('/', requireSystemAdmin, createRoute);
router.put('/:id', requireSystemAdmin, updateRoute);
router.delete('/:id', requireSystemAdmin, deleteRoute);
router.get('/admin/stats', requireSystemAdmin, getRouteStats);

export default router;