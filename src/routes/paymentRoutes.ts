// src/routes/paymentRoutes.ts - PayHere Payment Routes
import { Router } from 'express';
import { 
  handlePayHereWebhook, 
  verifyPayHerePayment, 
  testPayHereIntegration,
  processPayment,
  confirmPayment,
  getPaymentById,
  processRefund,
  getPaymentHistory,
  getPaymentMethods,
  getPaymentStats
} from '../controllers/paymentController';
import { protect } from '../middleware/authMiddleware';

const router = Router();

// PayHere webhook endpoint
router.post('/webhook/payhere', handlePayHereWebhook);

// Payment verification endpoint
router.post('/verify', verifyPayHerePayment);

// Test endpoint for PayHere integration
router.get('/test', testPayHereIntegration);

// Protected payment routes
router.post('/', protect, processPayment);
router.post('/confirm', protect, confirmPayment);
router.get('/history', protect, getPaymentHistory);
router.get('/methods', getPaymentMethods);
router.get('/stats', protect, getPaymentStats);
router.get('/:id', protect, getPaymentById);
router.post('/refund', protect, processRefund);

export default router;