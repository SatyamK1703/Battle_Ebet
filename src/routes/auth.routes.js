import express from 'express';
import { auth } from '../middlewares/auth.middleware.js';
import authController from '../controllers/auth.controller.js';
import { authRateLimiter } from '../middlewares/rateLimiter.middleware.js';

const router = express.Router();

// User Authentication
router.post('/register', 
    authRateLimiter.register,
    authController.registerUser
);
router.post('/login', 
    authRateLimiter.login,
    authController.loginUser
);
router.post('/logout', auth, authController.logoutUser);
router.post('/verify-otp', authController.verifyOTP);
router.post('/resend-otp', authController.resendOTP);
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);

export default router; 