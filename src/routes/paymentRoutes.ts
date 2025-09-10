// src/routes/paymentRoutes.ts - PayHere Payment Routes
import { Router } from 'express';
import { 
  handlePayHereWebhook, 
  verifyPayHerePayment, 
  testPayHereIntegration 
} from '../controllers/paymentController';

const router = Router();

// PayHere webhook endpoint
router.post('/webhook/payhere', handlePayHereWebhook);

// Payment verification endpoint
router.post('/verify', verifyPayHerePayment);

// Test endpoint for PayHere integration
router.get('/test', testPayHereIntegration);

export default router;