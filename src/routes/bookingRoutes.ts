// src/routes/bookingRoutes.ts
import express from 'express';
import { protect } from '../middleware/authMiddleware';
import {
  getUserBookings,
  createBooking,
  getBookingById,
  updateBooking,
  cancelBooking,
  generateQRCode,
  checkInPassenger,
  getBookingStats
} from '../controllers/bookingController';

const router = express.Router();

// All booking routes require authentication
router.use(protect);

// Booking management routes
router.get('/', getUserBookings);
router.post('/', createBooking);
router.get('/stats', getBookingStats);

// Specific booking routes
router.get('/:id', getBookingById);
router.put('/:id', updateBooking);
router.put('/:id/cancel', cancelBooking);
router.post('/:id/qr', generateQRCode);
router.post('/:id/checkin', checkInPassenger);

export default router;