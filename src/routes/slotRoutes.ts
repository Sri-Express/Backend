// src/routes/slotRoutes.ts - Route Slot System Routes
import express from 'express';
import { SlotController } from '../controllers/slotController';
import { protect } from '../middleware/authMiddleware';

const router = express.Router();

// Apply authentication to all routes
router.use(protect);

// Route Admin Routes - Create and manage route slots for their assigned route
router.post('/routes/:routeId/slots', SlotController.createRouteSlots);
router.get('/route-admin/slots', SlotController.getRouteSlots);
router.get('/route-admin/assignments/pending', SlotController.getPendingAssignments);
router.patch('/route-admin/assignments/:assignmentId/status', SlotController.updateAssignmentStatus);

// Fleet Manager Routes - Assign vehicles to slots
router.post('/fleet/assignments/slots', SlotController.assignVehicleToSlot);

// Common Routes - View assignments
router.get('/slots/:slotId/assignments', SlotController.getApprovedAssignments);
router.get('/routes/:routeId/slots', SlotController.getRouteSlots);
router.delete('/assignments/:assignmentId', SlotController.removeAssignment);

export default router;