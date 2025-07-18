// src/routes/paymentRoutes.ts
import express from 'express';
import { protect } from '../middleware/authMiddleware';
import {
  processPayment,
  getPaymentById,
  processRefund,
  getPaymentHistory,
  getPaymentMethods,
  getPaymentStats
} from '../controllers/paymentController';

const router = express.Router();

// Public routes
router.get('/methods', getPaymentMethods);

// Protected routes
router.use(protect);

router.post('/', processPayment);
router.get('/history', getPaymentHistory);
router.get('/stats', getPaymentStats);
router.get('/:id', getPaymentById);
router.post('/refund', processRefund);

export default router;