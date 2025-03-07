import Bet from '../models/Bet.model.js';
import MatchDetails from '../models/MatchDetails.model.js';
import User from '../models/User.model.js';
import mongoose from 'mongoose';

const betController = {
    async placeBet(req, res) {
        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            const { matchId, amount, prediction, marketType, betType } = req.body;

            // Verify match is available for betting
            const match = await MatchDetails.findOne({
                _id: matchId,
                status: betType === 'pre-match' ? 'upcoming' : 'live',
                'markets.type': marketType,
                'markets.status': 'open'
            });

            if (!match) {
                throw new Error('Match not available for betting');
            }

            // Create bet
            const bet = new Bet({
                userId: req.user._id,
                matchId,
                amount,
                prediction,
                betType,
                marketType,
                odds: match.markets.find(m => m.type === marketType).odds[prediction],
                metadata: {
                    gameType: match.gameType,
                    tournamentId: match.tournamentId
                }
            });

            // Deduct user balance
            await User.findByIdAndUpdate(req.user._id, {
                $inc: { balance: -amount }
            });

            await bet.save();
            await session.commitTransaction();

            res.status(201).json({
                success: true,
                message: 'Bet placed successfully',
                data: bet
            });
        } catch (error) {
            await session.abortTransaction();
            res.status(400).json({
                success: false,
                message: error.message
            });
        } finally {
            session.endSession();
        }
    },

    async getUserBets(req, res) {
        try {
            const { page = 1, limit = 20, status, sortBy = 'createdAt', order = 'desc' } = req.query;

            const query = { userId: req.user._id };
            if (status) query.status = status;

            const bets = await Bet.find(query)
                .sort({ [sortBy]: order === 'desc' ? -1 : 1 })
                .skip((page - 1) * limit)
                .limit(limit)
                .populate('matchId', 'teams scheduledTime')
                .populate('metadata.tournamentId', 'name');

            const total = await Bet.countDocuments(query);

            res.json({
                success: true,
                data: bets,
                pagination: {
                    total,
                    pages: Math.ceil(total / limit),
                    currentPage: page,
                    perPage: limit
                }
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    },

    async getActiveBets(req, res) {
        // ... existing implementation ...
    },

    async getBetHistory(req, res) {
        try {
            const { page = 1, limit = 20, status } = req.query;
            const query = { 
                userId: req.user._id,
                status: { $in: ['won', 'lost', 'cancelled', 'refunded'] }
            };

            const bets = await Bet.find(query)
                .sort({ createdAt: -1 })
                .skip((page - 1) * limit)
                .limit(limit)
                .populate('matchId', 'teams scheduledTime');

            res.json({
                success: true,
                data: bets
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    },

    async getBetById(req, res) {
        try {
            const bet = await Bet.findOne({
                _id: req.params.betId,
                userId: req.user._id
            }).populate('matchId', 'teams scheduledTime');

            if (!bet) {
                return res.status(404).json({
                    success: false,
                    message: 'Bet not found'
                });
            }

            res.json({
                success: true,
                data: bet
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    },

    async getBetStatistics(req, res) {
        try {
            const stats = await Bet.getUserStats(req.user._id);
            
            res.json({
                success: true,
                data: stats[0] || {
                    totalBets: 0,
                    totalAmount: 0,
                    totalWinnings: 0,
                    wonBets: 0,
                    winRate: 0,
                    profitLoss: 0
                }
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    },

    async cancelBet(req, res) {
        try {
            const bet = await Bet.findOne({
                _id: req.params.betId,
                userId: req.user._id,
                status: 'pending'
            });

            if (!bet) {
                return res.status(404).json({
                    success: false,
                    message: 'Bet not found or cannot be cancelled'
                });
            }

            // Add your cancellation logic here
            await bet.cancel('User requested cancellation');

            res.json({
                success: true,
                message: 'Bet cancelled successfully'
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }
};

export default betController; 