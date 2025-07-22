"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.resetPasswordWithOtp = exports.forgotPassword = exports.getUserProfile = exports.loginUser = exports.registerUser = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const bcrypt_1 = __importDefault(require("bcrypt"));
const User_1 = __importDefault(require("../models/User"));
const sendEmail_1 = require("../utils/sendEmail");
// Generate JWT
const generateToken = (id) => {
    // Ensure JWT_SECRET is loaded from your .env file
    const secret = process.env.JWT_SECRET;
    if (!secret) {
        console.error('FATAL ERROR: JWT_SECRET is not defined.');
        process.exit(1);
    }
    return jsonwebtoken_1.default.sign({ id }, secret, {
        expiresIn: '30d',
    });
};
// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
const registerUser = async (req, res) => {
    try {
        const { name, email, password } = req.body;
        // Check if user already exists
        const userExists = await User_1.default.findOne({ email });
        if (userExists) {
            res.status(400).json({ success: false, message: 'User already exists' });
            return;
        }
        // Create new user
        const user = await User_1.default.create({
            name,
            email,
            password,
            role: 'client', // Default role for new registrations is client
        });
        if (user) {
            const userId = user._id.toString();
            res.status(201).json({
                success: true,
                user: {
                    _id: userId,
                    name: user.name,
                    email: user.email,
                    role: user.role,
                },
                token: generateToken(userId),
            });
        }
        else {
            res.status(400).json({ success: false, message: 'Invalid user data' });
        }
    }
    catch (error) {
        console.error('Register error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error during registration',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
exports.registerUser = registerUser;
// @desc    Login user & get token
// @route   POST /api/auth/login
// @access  Public
const loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;
        console.log(`\n--- LOGIN ATTEMPT: ${new Date().toISOString()} ---`);
        console.log(`Attempting login for email: ${email}`);
        // Find user by email
        const user = await User_1.default.findOne({ email });
        if (!user) {
            console.log(`Result: User with email '${email}' NOT FOUND in database.`);
            console.log(`---------------------------------------------------\n`);
            res.status(401).json({ success: false, message: 'Invalid email or password' });
            return;
        }
        console.log(`Result: User FOUND. User ID: ${user._id}, Role: ${user.role}`);
        console.log(`Now comparing provided password with stored hash...`);
        // Check if password matches
        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            console.log(`Result: Password comparison FAILED.`);
            console.log(`---------------------------------------------------\n`);
            res.status(401).json({ success: false, message: 'Invalid email or password' });
            return;
        }
        console.log(`Result: Password comparison SUCCEEDED.`);
        console.log(`---------------------------------------------------\n`);
        // Get the ID as a string
        const userId = user._id.toString();
        // Return user information with token
        res.json({
            success: true,
            user: {
                _id: userId,
                name: user.name,
                email: user.email,
                role: user.role,
            },
            token: generateToken(userId),
        });
    }
    catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error during login',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
exports.loginUser = loginUser;
// @desc    Get user profile
// @route   GET /api/auth/profile
// @access  Private
const getUserProfile = async (req, res) => {
    try {
        // The 'protect' middleware should have already attached the user
        if (!req.user) {
            res.status(401).json({ success: false, message: 'Not authorized, no user found' });
            return;
        }
        // We can just send the user object from the request
        res.json({
            success: true,
            user: {
                _id: req.user._id.toString(),
                name: req.user.name,
                email: req.user.email,
                role: req.user.role,
            }
        });
    }
    catch (error) {
        console.error('Profile error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error fetching profile',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
exports.getUserProfile = getUserProfile;
// @desc    Forgot password - Generate OTP & send email
// @route   POST /api/auth/forgot-password
// @access  Public
const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        console.log(`[forgotPassword] Request received for email: ${email}`);
        if (!email) {
            res.status(400).json({ success: false, message: 'Please provide an email address' });
            return;
        }
        const user = await User_1.default.findOne({ email });
        if (!user) {
            console.log(`[forgotPassword] User not found: ${email}, but not revealing this info`);
            res.status(200).json({
                success: true,
                message: 'If an account with this email exists, a password reset OTP has been sent.'
            });
            return;
        }
        const otp = user.getResetPasswordOtp();
        await user.save({ validateBeforeSave: false });
        try {
            await (0, sendEmail_1.sendPasswordResetOTP)(user.email, otp, user.name);
            res.status(200).json({
                success: true,
                message: 'If an account with this email exists, a password reset OTP has been sent.'
            });
        }
        catch (emailError) {
            console.error('Error sending password reset email:', emailError);
            user.resetPasswordToken = undefined;
            user.resetPasswordExpire = undefined;
            await user.save({ validateBeforeSave: false });
            res.status(500).json({ success: false, message: 'Email could not be sent. Please try again later.' });
        }
    }
    catch (error) {
        console.error('Forgot password error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error during forgot password process',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
exports.forgotPassword = forgotPassword;
// @desc    Reset password using email, OTP and new password
// @route   PUT /api/auth/reset-password
// @access  Public
const resetPasswordWithOtp = async (req, res) => {
    try {
        const { email, otp, password } = req.body;
        if (!email || !otp || !password) {
            res.status(400).json({ success: false, message: 'Please provide email, OTP, and new password' });
            return;
        }
        if (password.length < 6) {
            res.status(400).json({ success: false, message: 'Password must be at least 6 characters long' });
            return;
        }
        const user = await User_1.default.findOne({
            email,
            resetPasswordToken: { $exists: true, $ne: null },
            resetPasswordExpire: { $gt: Date.now() }
        });
        if (!user || !user.resetPasswordToken) {
            res.status(400).json({
                success: false,
                message: 'Invalid OTP or expired reset request. Please try again.'
            });
            return;
        }
        const isOtpValid = await bcrypt_1.default.compare(otp, user.resetPasswordToken);
        if (!isOtpValid) {
            res.status(400).json({ success: false, message: 'Invalid OTP. Please check and try again.' });
            return;
        }
        user.password = password;
        user.resetPasswordToken = undefined;
        user.resetPasswordExpire = undefined;
        await user.save();
        res.status(200).json({
            success: true,
            message: 'Password reset successful. You can now login with your new password.'
        });
    }
    catch (error) {
        console.error('Reset password error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error during password reset',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
exports.resetPasswordWithOtp = resetPasswordWithOtp;
