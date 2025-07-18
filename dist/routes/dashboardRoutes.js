"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// src/routes/dashboardRoutes.ts
const express_1 = __importDefault(require("express"));
const dashboardController_1 = require("../controllers/dashboardController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const router = express_1.default.Router();
// All dashboard routes are protected
router.use(authMiddleware_1.protect);
// Get dashboard statistics
router.get('/stats', dashboardController_1.getDashboardStats);
// Get recent trips
router.get('/recent-trips', dashboardController_1.getRecentTrips);
// Get upcoming trips
router.get('/upcoming-trips', dashboardController_1.getUpcomingTrips);
// Update user profile
router.put('/profile', dashboardController_1.updateProfile);
// Create demo trips (for testing)
router.post('/demo-trip', dashboardController_1.createDemoTrip);
exports.default = router;
