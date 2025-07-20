"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// src/routes/dashboardRoutes.ts - FIXED VERSION - Remove createDemoTrip
const express_1 = __importDefault(require("express"));
const authMiddleware_1 = require("../middleware/authMiddleware");
const dashboardController_1 = require("../controllers/dashboardController");
const router = express_1.default.Router();
// All dashboard routes are protected
router.use(authMiddleware_1.protect);
// Core dashboard endpoints
router.get('/stats', dashboardController_1.getDashboardStats);
router.get('/recent-trips', dashboardController_1.getRecentTrips);
router.get('/upcoming-trips', dashboardController_1.getUpcomingTrips);
router.put('/profile', dashboardController_1.updateProfile);
// ✅ REMOVED: Demo trip creation route - production ready
// router.post('/demo-trip', createDemoTrip);
exports.default = router;
