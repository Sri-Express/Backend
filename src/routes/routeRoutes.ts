// src/routes/routeRoutes.ts
import express from 'express';
import { protect } from '../middleware/authMiddleware';
import { requireSystemAdmin } from '../middleware/adminMiddleware';
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

// Public routes
router.get('/', getRoutes);
router.get('/search', searchRoutes);
router.get('/:id', getRouteById);
router.get('/:id/schedules', getRouteSchedules);
router.get('/:id/realtime', getRouteRealTime);

// Admin routes (protected)
router.post('/', requireSystemAdmin, createRoute);
router.put('/:id', requireSystemAdmin, updateRoute);
router.delete('/:id', requireSystemAdmin, deleteRoute);
router.get('/admin/stats', requireSystemAdmin, getRouteStats);

export default router;