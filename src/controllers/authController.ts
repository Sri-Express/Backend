// src/controllers/authController.ts (fixed OTP comparison)
import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import User, { IUser } from '../models/User';
import mongoose from 'mongoose';
import { sendPasswordResetOTP } from '../utils/sendEmail';

// Generate JWT
const generateToken = (id: string): string => {
  return jwt.sign({ id }, process.env.JWT_SECRET || '', {
    expiresIn: '30d',
  });
};

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
export const registerUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, email, password } = req.body;

    // Check if user already exists
    const userExists = await User.findOne({ email });

    if (userExists) {
      res.status(400).json({ message: 'User already exists' });
      return;
    }

    // Create new user
    const user = await User.create({
      name,
      email,
      password,
      role: 'client', // Default role for new registrations is client
    });

    if (user) {
      // Get the ID as a string
      const userId = user._id.toString();
      
      res.status(201).json({
        _id: userId,
        name: user.name,
        email: user.email,
        role: user.role,
        token: generateToken(userId),
      });
    } else {
      res.status(400).json({ message: 'Invalid user data' });
    }
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ 
      message: 'Server error', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
};

// @desc    Login user & get token
// @route   POST /api/auth/login
// @access  Public
export const loginUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    // Find user by email
    const user = await User.findOne({ email });

    if (!user) {
      res.status(401).json({ message: 'Invalid email or password' });
      return;
    }

    // Check if password matches
    const isMatch = await user.comparePassword(password);

    if (!isMatch) {
      res.status(401).json({ message: 'Invalid email or password' });
      return;
    }

    // Get the ID as a string
    const userId = user._id.toString();

    // Return user information with token
    res.json({
      _id: userId,
      name: user.name,
      email: user.email,
      role: user.role,
      token: generateToken(userId),
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      message: 'Server error', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
};

// @desc    Get user profile
// @route   GET /api/auth/profile
// @access  Private
export const getUserProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Not authorized' });
      return;
    }

    const user = await User.findById(req.user._id).select('-password');

    if (user) {
      res.json({
        _id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
      });
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
    console.error('Profile error:', error);
    res.status(500).json({ 
      message: 'Server error', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
};

// @desc    Forgot password - Generate OTP & send email
// @route   POST /api/auth/forgot-password
// @access  Public
export const forgotPassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email } = req.body;
    console.log(`[forgotPassword] Request received for email: ${email}`);

    if (!email) {
      res.status(400).json({ message: 'Please provide an email address' });
      return;
    }

    // Find user by email
    const user = await User.findOne({ email });

    // For security, don't reveal if user exists or not
    if (!user) {
      console.log(`[forgotPassword] User not found: ${email}, but not revealing this info`);
      res.status(200).json({ 
        success: true, 
        message: 'If an account exists with this email, an OTP has been sent.' 
      });
      return;
    }

    // Generate OTP and get the plain text version
    const otp = user.getResetPasswordOtp();
    
    // Save the user with the hashed OTP and expiry time
    await user.save({ validateBeforeSave: false });

    // Send email with the plain OTP
    try {
      await sendPasswordResetOTP(user.email, otp, user.name);
      
      res.status(200).json({ 
        success: true, 
        message: 'If an account exists with this email, an OTP has been sent.' 
      });
    } catch (emailError) {
      console.error('Error sending password reset email:', emailError);
      
      // Clear the reset data if email fails
      user.resetPasswordToken = undefined;
      user.resetPasswordExpire = undefined;
      await user.save({ validateBeforeSave: false });
      
      res.status(500).json({ message: 'Email could not be sent. Please try again later.' });
    }
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ 
      message: 'Server error', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
};

// @desc    Reset password using email, OTP and new password
// @route   PUT /api/auth/reset-password
// @access  Public
export const resetPasswordWithOtp = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, otp, password } = req.body;
    
    if (!email || !otp || !password) {
      res.status(400).json({ message: 'Please provide email, OTP, and new password' });
      return;
    }
    
    if (password.length < 6) {
      res.status(400).json({ message: 'Password must be at least 6 characters long' });
      return;
    }

    // Find user with non-expired reset token
    const user = await User.findOne({
      email,
      resetPasswordToken: { $exists: true, $ne: null },
      resetPasswordExpire: { $gt: Date.now() }
    });

    if (!user) {
      res.status(400).json({ 
        message: 'Invalid OTP or expired reset request. Please try again.' 
      });
      return;
    }

    // Check if resetPasswordToken exists
    if (!user.resetPasswordToken) {
      res.status(400).json({ message: 'Reset token not found' });
      return;
    }

    // Verify OTP by comparing with hashed token in database
    const isOtpValid = await bcrypt.compare(otp, user.resetPasswordToken);
    
    if (!isOtpValid) {
      res.status(400).json({ message: 'Invalid OTP. Please check and try again.' });
      return;
    }

    // Set new password (will be hashed by pre-save hook)
    user.password = password;
    
    // Clear reset token fields
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    
    // Save user with new password
    await user.save();
    
    res.status(200).json({ 
      success: true, 
      message: 'Password reset successful. You can now login with your new password.' 
    });
    
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ 
      message: 'Server error', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
};