"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// src/routes/routeRoutes.ts
const express_1 = __importDefault(require("express"));
const adminMiddleware_1 = require("../middleware/adminMiddleware");
const routeController_1 = require("../controllers/routeController");
const router = express_1.default.Router();
// Public routes
router.get('/', routeController_1.getRoutes);
router.get('/search', routeController_1.searchRoutes);
router.get('/:id', routeController_1.getRouteById);
router.get('/:id/schedules', routeController_1.getRouteSchedules);
router.get('/:id/realtime', routeController_1.getRouteRealTime);
// Admin routes (protected)
router.post('/', adminMiddleware_1.requireSystemAdmin, routeController_1.createRoute);
router.put('/:id', adminMiddleware_1.requireSystemAdmin, routeController_1.updateRoute);
router.delete('/:id', adminMiddleware_1.requireSystemAdmin, routeController_1.deleteRoute);
router.get('/admin/stats', adminMiddleware_1.requireSystemAdmin, routeController_1.getRouteStats);
exports.default = router;
