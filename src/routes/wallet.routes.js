import express from 'express';
import { auth } from '../middlewares/auth.middleware.js';
import walletController from '../controllers/wallet.controller.js';
import { walletRateLimiter } from '../middlewares/rateLimiter.middleware.js';

const router = express.Router();

router.use(auth);

router.get('/balance', walletController.getBalance);
router.post('/deposit', walletController.deposit);
router.post('/withdraw',
    auth,
    walletRateLimiter.withdraw,
    checkWithdrawalBalance,
    walletController.withdraw
);
router.get('/transactions', walletController.getTransactions);
router.get('/transaction/:id', walletController.getTransactionById);
router.post('/verify-payment', walletController.verifyPayment);

export default router; 