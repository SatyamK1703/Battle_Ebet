import { validationResult, body } from 'express-validator';

export const validate = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            status: 'error',
            errors: errors.array().map(error => ({
                field: error.param,
                message: error.msg
            }))
        });
    }
    next();
};

// Common validation schemas
export const userValidationRules = {
    register: [
        body('fullname').trim().notEmpty().withMessage('Full name is required'),
        body('mobile').matches(/^\d{10}$/).withMessage('Invalid mobile number'),
        body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
        body('email').optional().isEmail().withMessage('Invalid email format')
    ],
    login: [
        body('mobile').matches(/^\d{10}$/).withMessage('Invalid mobile number'),
        body('password').notEmpty().withMessage('Password is required')
    ]
}; 