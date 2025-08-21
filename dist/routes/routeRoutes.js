"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// src/routes/routeRoutes.ts
const express_1 = __importDefault(require("express"));
const adminMiddleware_1 = require("../middleware/adminMiddleware");
const fleetMiddleware_1 = require("../middleware/fleetMiddleware");
const routeController_1 = require("../controllers/routeController");
const router = express_1.default.Router();
// Public routes (with optional authentication for better experience)
router.get('/', fleetMiddleware_1.optionalFleetManager, routeController_1.getRoutes);
router.get('/search', fleetMiddleware_1.optionalFleetManager, routeController_1.searchRoutes);
router.get('/:id', fleetMiddleware_1.optionalFleetManager, routeController_1.getRouteById);
router.get('/:id/schedules', fleetMiddleware_1.optionalFleetManager, routeController_1.getRouteSchedules);
router.get('/:id/realtime', fleetMiddleware_1.optionalFleetManager, routeController_1.getRouteRealTime);
// Admin routes (protected)
router.post('/', adminMiddleware_1.requireSystemAdmin, routeController_1.createRoute);
router.put('/:id', adminMiddleware_1.requireSystemAdmin, routeController_1.updateRoute);
router.delete('/:id', adminMiddleware_1.requireSystemAdmin, routeController_1.deleteRoute);
router.get('/admin/stats', adminMiddleware_1.requireSystemAdmin, routeController_1.getRouteStats);
exports.default = router;
