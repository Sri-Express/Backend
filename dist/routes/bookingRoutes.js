"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// src/routes/bookingRoutes.ts
const express_1 = __importDefault(require("express"));
const authMiddleware_1 = require("../middleware/authMiddleware");
const bookingController_1 = require("../controllers/bookingController");
const router = express_1.default.Router();
// All booking routes require authentication
router.use(authMiddleware_1.protect);
// Booking management routes
router.get('/', bookingController_1.getUserBookings);
router.post('/', bookingController_1.createBooking);
router.get('/stats', bookingController_1.getBookingStats);
router.get('/seat-availability', bookingController_1.getSeatAvailability);
// Specific booking routes
router.get('/:id', bookingController_1.getBookingById);
router.put('/:id', bookingController_1.updateBooking);
router.put('/:id/cancel', bookingController_1.cancelBooking);
router.post('/:id/qr', bookingController_1.generateQRCode);
router.post('/:id/email-ticket', bookingController_1.sendTicketByEmail);
router.post('/:id/checkin', bookingController_1.checkInPassenger);
exports.default = router;
