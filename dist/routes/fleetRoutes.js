"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// src/routes/fleetRoutes.ts - Fleet Operator Routes
const express_1 = __importDefault(require("express"));
const authMiddleware_1 = require("../middleware/authMiddleware"); // <-- CORRECTED
const fleetController_1 = require("../controllers/fleetController");
const router = express_1.default.Router();
// Apply authentication middleware to all routes
router.use(authMiddleware_1.protect); // <-- CORRECTED
// Fleet Dashboard & Profile
router.get('/dashboard', fleetController_1.getFleetDashboard);
router.get('/profile', fleetController_1.getFleetProfile);
router.put('/profile', fleetController_1.updateFleetProfile);
// Vehicle Management
router.get('/vehicles', fleetController_1.getFleetVehicles);
router.post('/vehicles', fleetController_1.addVehicle);
router.put('/vehicles/:id', fleetController_1.updateVehicle);
// Route Management
router.get('/routes', fleetController_1.getFleetRoutes);
// Analytics
router.get('/analytics', fleetController_1.getFleetAnalytics);
exports.default = router;
