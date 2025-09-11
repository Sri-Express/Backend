"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// src/routes/paymentRoutes.ts - PayHere Payment Routes
const express_1 = require("express");
const paymentController_1 = require("../controllers/paymentController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const router = (0, express_1.Router)();
// PayHere webhook endpoint
router.post('/webhook/payhere', paymentController_1.handlePayHereWebhook);
// Payment verification endpoint
router.post('/verify', paymentController_1.verifyPayHerePayment);
// Test endpoint for PayHere integration
router.get('/test', paymentController_1.testPayHereIntegration);
// Protected payment routes
router.post('/', authMiddleware_1.protect, paymentController_1.processPayment);
router.post('/confirm', authMiddleware_1.protect, paymentController_1.confirmPayment);
router.get('/history', authMiddleware_1.protect, paymentController_1.getPaymentHistory);
router.get('/methods', paymentController_1.getPaymentMethods);
router.get('/stats', authMiddleware_1.protect, paymentController_1.getPaymentStats);
router.get('/:id', authMiddleware_1.protect, paymentController_1.getPaymentById);
router.post('/refund', authMiddleware_1.protect, paymentController_1.processRefund);
exports.default = router;
