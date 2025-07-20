"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// src/routes/paymentRoutes.ts
const express_1 = __importDefault(require("express"));
const authMiddleware_1 = require("../middleware/authMiddleware");
const paymentController_1 = require("../controllers/paymentController");
const router = express_1.default.Router();
// Public routes
router.get('/methods', paymentController_1.getPaymentMethods);
// Protected routes
router.use(authMiddleware_1.protect);
router.post('/', paymentController_1.processPayment);
router.get('/history', paymentController_1.getPaymentHistory);
router.get('/stats', paymentController_1.getPaymentStats);
router.get('/:id', paymentController_1.getPaymentById);
router.post('/refund', paymentController_1.processRefund);
exports.default = router;
