"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// src/routes/busRatingRoutes.ts - Bus Rating System Routes
const express_1 = __importDefault(require("express"));
const busRatingController_1 = require("../controllers/busRatingController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const router = express_1.default.Router();
// Apply authentication to all rating routes
router.use(authMiddleware_1.protect);
// @route   GET /api/ratings/rateable-bookings
// @desc    Get user's completed bookings that can be rated
// @access  Private
router.get('/rateable-bookings', busRatingController_1.getRateableBookings);
// @route   POST /api/ratings
// @desc    Create a new bus rating
// @access  Private
router.post('/', busRatingController_1.createBusRating);
// @route   GET /api/ratings/my-ratings
// @desc    Get current user's rating history
// @access  Private
router.get('/my-ratings', busRatingController_1.getUserRatings);
// @route   GET /api/ratings/bus/:deviceId
// @desc    Get all ratings for a specific bus
// @access  Private
router.get('/bus/:deviceId', busRatingController_1.getBusRatings);
// @route   PUT /api/ratings/:ratingId
// @desc    Update a rating (user can edit their own rating)
// @access  Private
router.put('/:ratingId', busRatingController_1.updateBusRating);
// @route   DELETE /api/ratings/:ratingId
// @desc    Delete a rating
// @access  Private
router.delete('/:ratingId', busRatingController_1.deleteBusRating);
exports.default = router;
