"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// src/routes/authRoutes.ts
const express_1 = __importDefault(require("express"));
const authController_1 = require("../controllers/authController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const router = express_1.default.Router();
// Register a new user
router.post('/register', authController_1.registerUser);
// Login user
router.post('/login', authController_1.loginUser);
// Get user profile (protected route)
router.get('/profile', authMiddleware_1.protect, authController_1.getUserProfile);
// Forgot password - request OTP
router.post('/forgot-password', authController_1.forgotPassword);
// Reset password with OTP
router.put('/reset-password', authController_1.resetPasswordWithOtp);
exports.default = router;
