// src/routes/busRatingRoutes.ts - Bus Rating System Routes
import express from 'express';
import {
  getRateableBookings,
  createBusRating,
  getUserRatings,
  getBusRatings,
  updateBusRating,
  deleteBusRating
} from '../controllers/busRatingController';
import { protect } from '../middleware/authMiddleware';

const router = express.Router();

// Apply authentication to all rating routes
router.use(protect);

// @route   GET /api/ratings/rateable-bookings
// @desc    Get user's completed bookings that can be rated
// @access  Private
router.get('/rateable-bookings', getRateableBookings);

// @route   POST /api/ratings
// @desc    Create a new bus rating
// @access  Private
router.post('/', createBusRating);

// @route   GET /api/ratings/my-ratings
// @desc    Get current user's rating history
// @access  Private
router.get('/my-ratings', getUserRatings);

// @route   GET /api/ratings/bus/:deviceId
// @desc    Get all ratings for a specific bus
// @access  Private
router.get('/bus/:deviceId', getBusRatings);

// @route   PUT /api/ratings/:ratingId
// @desc    Update a rating (user can edit their own rating)
// @access  Private
router.put('/:ratingId', updateBusRating);

// @route   DELETE /api/ratings/:ratingId
// @desc    Delete a rating
// @access  Private
router.delete('/:ratingId', deleteBusRating);

export default router;