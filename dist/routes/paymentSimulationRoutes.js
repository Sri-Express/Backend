"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// src/routes/paymentSimulationRoutes.ts - Payment Gateway Simulation Routes
const express_1 = __importDefault(require("express"));
const authMiddleware_1 = require("../middleware/authMiddleware");
const paymentSimulationController_1 = require("../controllers/paymentSimulationController");
const router = express_1.default.Router();
// All payment simulation routes are protected
router.use(authMiddleware_1.protect);
// Payment simulation endpoints
router.get('/gateway/:bookingId', paymentSimulationController_1.getPaymentGateway); // Get payment gateway interface
router.post('/simulate/:bookingId', paymentSimulationController_1.simulatePayment); // Simulate payment for specific booking
router.post('/simulate-all', paymentSimulationController_1.simulateAllPayments); // Auto-process all pending payments
exports.default = router;
