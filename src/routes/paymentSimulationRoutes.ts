// src/routes/paymentSimulationRoutes.ts - Payment Gateway Simulation Routes
import express from 'express';
import { protect } from '../middleware/authMiddleware';
import { 
  simulatePayment,
  simulateAllPayments,
  getPaymentGateway
} from '../controllers/paymentSimulationController';

const router = express.Router();

// All payment simulation routes are protected
router.use(protect);

// Payment simulation endpoints
router.get('/gateway/:bookingId', getPaymentGateway);        // Get payment gateway interface
router.post('/simulate/:bookingId', simulatePayment);       // Simulate payment for specific booking
router.post('/simulate-all', simulateAllPayments);          // Auto-process all pending payments

export default router;