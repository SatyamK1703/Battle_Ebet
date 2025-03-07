import express from 'express';
import { body } from 'express-validator';
import adminAuthController from '../controllers/adminAuth.controller.js';
import { validate } from '../middlewares/validate.middleware.js';
import { adminAuth } from '../middlewares/adminAuth.middleware.js';

const router = express.Router();

// Validation rules
const loginValidation = [
    body('username').trim().notEmpty().withMessage('Username is required'),
    body('password').notEmpty().withMessage('Password is required')
];

const changePasswordValidation = [
    body('currentPassword').notEmpty().withMessage('Current password is required'),
    body('newPassword')
        .isLength({ min: 6 })
        .withMessage('New password must be at least 6 characters long')
];

// Routes
router.post('/login', loginValidation, validate, adminAuthController.login);
router.post('/logout', adminAuth, adminAuthController.logout);
router.get('/profile', adminAuth, adminAuthController.getProfile);
router.post('/change-password', 
    adminAuth, 
    changePasswordValidation, 
    validate, 
    adminAuthController.changePassword
);

export default router; 