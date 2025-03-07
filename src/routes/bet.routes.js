import express from 'express';
import { body, query } from 'express-validator';
import { auth } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import betController from '../controllers/bet.controller.js';
import { checkBalance } from '../middlewares/balance.middleware.js';
import { rateLimiter } from '../middlewares/rateLimiter.middleware.js';

const router = express.Router();

// Apply auth middleware to all betting routes
router.use(auth);

// Validation schemas
const placeBetValidation = [
    body('matchId')
        .isMongoId()
        .withMessage('Invalid match ID'),
    body('amount')
        .isFloat({ min: 10, max: 100000 })
        .withMessage('Bet amount must be between 10 and 100000'),
    body('prediction')
        .isIn(['team1', 'team2', 'draw'])
        .withMessage('Invalid prediction')
];

// Core betting routes
router.post('/place',
    rateLimiter('place-bet', 5, 60),
    placeBetValidation,
    validate,
    checkBalance,
    betController.placeBet
);

router.get('/my-bets',
    betController.getUserBets
);

router.get('/active',
    betController.getActiveBets
);

// Export routes
export default router; 