import User from '../models/User.model.js';
import Bet from '../models/Bet.model.js';
import { createError } from '../utils/error.util.js';

// Check user balance for betting
export const checkBalance = async (req, res, next) => {
    try {
        const { amount } = req.body;

        // Basic amount validation
        if (!amount || isNaN(amount)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid amount specified'
            });
        }

        // Get user with current balance
        const user = await User.findById(req.user._id)
            .select('balance betLimit dailyBetLimit status');

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Check if user is active
        if (user.status !== 'active') {
            return res.status(403).json({
                success: false,
                message: 'Account is not active for betting'
            });
        }

        // Check minimum bet amount
        const minBetAmount = process.env.MIN_BET_AMOUNT || 10;
        if (amount < minBetAmount) {
            return res.status(400).json({
                success: false,
                message: `Minimum bet amount is ${minBetAmount}`,
                data: { minBetAmount }
            });
        }

        // Check maximum bet amount
        const maxBetAmount = process.env.MAX_BET_AMOUNT || 100000;
        if (amount > maxBetAmount) {
            return res.status(400).json({
                success: false,
                message: `Maximum bet amount is ${maxBetAmount}`,
                data: { maxBetAmount }
            });
        }

        // Check sufficient balance
        if (user.balance < amount) {
            return res.status(400).json({
                success: false,
                message: 'Insufficient balance',
                data: {
                    required: amount,
                    available: user.balance,
                    shortfall: amount - user.balance
                }
            });
        }

        // Check daily betting limit
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const dailyBets = await Bet.aggregate([
            {
                $match: {
                    userId: user._id,
                    createdAt: { $gte: today },
                    status: { $in: ['pending', 'won', 'lost'] }
                }
            },
            {
                $group: {
                    _id: null,
                    totalAmount: { $sum: '$amount' },
                    count: { $sum: 1 }
                }
            }
        ]);

        const dailyTotal = (dailyBets[0]?.totalAmount || 0) + amount;
        const dailyLimit = user.dailyBetLimit || process.env.DEFAULT_DAILY_LIMIT || 1000000;

        if (dailyTotal > dailyLimit) {
            return res.status(400).json({
                success: false,
                message: 'Daily betting limit exceeded',
                data: {
                    limit: dailyLimit,
                    used: dailyBets[0]?.totalAmount || 0,
                    remaining: dailyLimit - (dailyBets[0]?.totalAmount || 0),
                    betsCount: dailyBets[0]?.count || 0
                }
            });
        }

        // Check pending bets limit
        const pendingBets = await Bet.countDocuments({
            userId: user._id,
            status: 'pending'
        });

        const maxPendingBets = process.env.MAX_PENDING_BETS || 10;
        if (pendingBets >= maxPendingBets) {
            return res.status(400).json({
                success: false,
                message: `Maximum ${maxPendingBets} pending bets allowed`,
                data: { currentPendingBets: pendingBets }
            });
        }

        // Add user balance info to request
        req.userBalance = {
            current: user.balance,
            afterBet: user.balance - amount,
            dailyTotal: dailyTotal,
            pendingBets: pendingBets
        };

        next();
    } catch (error) {
        next(createError(500, 'Error checking balance: ' + error.message));
    }
};

// Check balance for withdrawals
export const checkWithdrawalBalance = async (req, res, next) => {
    try {
        const { amount } = req.body;

        // Basic amount validation
        if (!amount || isNaN(amount)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid withdrawal amount'
            });
        }

        const user = await User.findById(req.user._id)
            .select('balance withdrawLimit dailyWithdrawLimit status');

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Check minimum withdrawal
        const minWithdrawal = process.env.MIN_WITHDRAWAL || 100;
        if (amount < minWithdrawal) {
            return res.status(400).json({
                success: false,
                message: `Minimum withdrawal amount is ${minWithdrawal}`,
                data: { minWithdrawal }
            });
        }

        // Check maximum withdrawal
        const maxWithdrawal = process.env.MAX_WITHDRAWAL || 1000000;
        if (amount > maxWithdrawal) {
            return res.status(400).json({
                success: false,
                message: `Maximum withdrawal amount is ${maxWithdrawal}`,
                data: { maxWithdrawal }
            });
        }

        // Get pending bets amount
        const pendingBetsAmount = await Bet.aggregate([
            {
                $match: {
                    userId: user._id,
                    status: 'pending'
                }
            },
            {
                $group: {
                    _id: null,
                    total: { $sum: '$amount' }
                }
            }
        ]);

        const lockedAmount = pendingBetsAmount[0]?.total || 0;
        const availableBalance = user.balance - lockedAmount;

        if (availableBalance < amount) {
            return res.status(400).json({
                success: false,
                message: 'Insufficient available balance',
                data: {
                    totalBalance: user.balance,
                    lockedInBets: lockedAmount,
                    availableBalance,
                    requestedAmount: amount
                }
            });
        }

        // Check daily withdrawal limit
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const dailyWithdrawals = await Transaction.aggregate([
            {
                $match: {
                    userId: user._id,
                    type: 'withdrawal',
                    status: { $in: ['pending', 'completed'] },
                    createdAt: { $gte: today }
                }
            },
            {
                $group: {
                    _id: null,
                    total: { $sum: '$amount' }
                }
            }
        ]);

        const dailyWithdrawalTotal = (dailyWithdrawals[0]?.total || 0) + amount;
        const dailyWithdrawalLimit = user.dailyWithdrawLimit || process.env.DEFAULT_DAILY_WITHDRAWAL_LIMIT || 1000000;

        if (dailyWithdrawalTotal > dailyWithdrawalLimit) {
            return res.status(400).json({
                success: false,
                message: 'Daily withdrawal limit exceeded',
                data: {
                    limit: dailyWithdrawalLimit,
                    used: dailyWithdrawals[0]?.total || 0,
                    remaining: dailyWithdrawalLimit - (dailyWithdrawals[0]?.total || 0)
                }
            });
        }

        // Add withdrawal info to request
        req.withdrawal = {
            amount,
            availableBalance,
            lockedAmount,
            dailyTotal: dailyWithdrawalTotal
        };

        next();
    } catch (error) {
        next(createError(500, 'Error checking withdrawal balance: ' + error.message));
    }
}; 