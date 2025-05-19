// src/routes/authRoutes.ts
import express from 'express';
import { 
  registerUser, 
  loginUser, 
  getUserProfile, 
  forgotPassword, 
  resetPasswordWithOtp 
} from '../controllers/authController';
import { protect } from '../middleware/authMiddleware';

const router = express.Router();

// Register a new user
router.post('/register', registerUser);

// Login user
router.post('/login', loginUser);

// Get user profile (protected route)
router.get('/profile', protect, getUserProfile);

// Forgot password - request OTP
router.post('/forgot-password', forgotPassword);

// Reset password with OTP
router.put('/reset-password', resetPasswordWithOtp);

export default router;