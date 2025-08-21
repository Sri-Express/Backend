"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// src/routes/fleetRoutes.ts - Fleet Operator Routes
const express_1 = __importDefault(require("express"));
// --- CORRECTED IMPORT ---
// Import the correct middleware from the correct file.
const fleetMiddleware_1 = require("../middleware/fleetMiddleware");
const fleetController_1 = require("../controllers/fleetController");
const router = express_1.default.Router();
// --- CORRECTED MIDDLEWARE USAGE ---
// This single middleware handles both authentication (is user logged in?)
// and authorization (is user a fleet manager?).
router.use(fleetMiddleware_1.requireFleetManager);
// Now all these routes are properly secured
router.get('/dashboard', fleetController_1.getFleetDashboard);
router.get('/profile', fleetController_1.getFleetProfile);
router.put('/profile', fleetController_1.updateFleetProfile);
router.post('/profile', fleetController_1.updateFleetProfile); // Allow POST for creating new profiles
// Vehicle Management
router.get('/vehicles', fleetController_1.getFleetVehicles);
router.post('/vehicles', fleetController_1.addVehicle);
router.get('/vehicles/:id', fleetController_1.getVehicleDetails);
router.put('/vehicles/:id', fleetController_1.updateVehicle);
router.delete('/vehicles/:id', fleetController_1.deleteVehicle);
// Route Management
router.get('/routes', fleetController_1.getFleetRoutes);
// Analytics
router.get('/analytics', fleetController_1.getFleetAnalytics);
// Test endpoint to verify routes are working
router.get('/test', (req, res) => {
    var _a;
    res.json({
        message: 'Fleet routes are working properly!',
        user: ((_a = req.user) === null || _a === void 0 ? void 0 : _a.name) || 'Unknown',
        timestamp: new Date().toISOString(),
        availableRoutes: [
            'GET /api/fleet/dashboard',
            'GET /api/fleet/profile',
            'PUT /api/fleet/profile',
            'GET /api/fleet/vehicles',
            'POST /api/fleet/vehicles',
            'GET /api/fleet/vehicles/:id',
            'PUT /api/fleet/vehicles/:id',
            'DELETE /api/fleet/vehicles/:id',
            'GET /api/fleet/routes',
            'GET /api/fleet/analytics',
            'GET /api/fleet/test'
        ]
    });
});
exports.default = router;
