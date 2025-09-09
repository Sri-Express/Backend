"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// src/routes/slotRoutes.ts - Route Slot System Routes
const express_1 = __importDefault(require("express"));
const slotController_1 = require("../controllers/slotController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const router = express_1.default.Router();
// Apply authentication to all routes
router.use(authMiddleware_1.protect);
// Route Admin Routes - Create and manage route slots for their assigned route
router.post('/routes/:routeId/slots', slotController_1.SlotController.createRouteSlots);
router.get('/route-admin/slots', slotController_1.SlotController.getRouteSlots);
router.get('/route-admin/assignments/pending', slotController_1.SlotController.getPendingAssignments);
router.patch('/route-admin/assignments/:assignmentId/status', slotController_1.SlotController.updateAssignmentStatus);
// Fleet Manager Routes - Assign vehicles to slots
router.post('/fleet/assignments/slots', slotController_1.SlotController.assignVehicleToSlot);
// Common Routes - View assignments
router.get('/slots/:slotId/assignments', slotController_1.SlotController.getApprovedAssignments);
router.get('/routes/:routeId/slots', slotController_1.SlotController.getRouteSlots);
router.delete('/assignments/:assignmentId', slotController_1.SlotController.removeAssignment);
exports.default = router;
