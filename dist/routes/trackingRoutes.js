"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// src/routes/trackingRoutes.ts
const express_1 = __importDefault(require("express"));
const authMiddleware_1 = require("../middleware/authMiddleware");
const adminMiddleware_1 = require("../middleware/adminMiddleware");
const trackingController_1 = require("../controllers/trackingController");
const router = express_1.default.Router();
// Public tracking routes
router.get('/live', trackingController_1.getLiveLocations);
router.get('/route/:routeId', trackingController_1.getRouteVehicles);
// Private tracking routes
router.get('/eta/:bookingId', authMiddleware_1.protect, trackingController_1.getETAForBooking);
// Device/Driver routes (for location updates)
router.post('/update', trackingController_1.updateVehicleLocation);
// Admin routes
router.get('/history/:vehicleId', adminMiddleware_1.requireSystemAdmin, trackingController_1.getVehicleHistory);
router.get('/analytics', adminMiddleware_1.requireSystemAdmin, trackingController_1.getTrackingAnalytics);
exports.default = router;
