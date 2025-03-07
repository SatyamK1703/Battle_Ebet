import User from '../models/User.model.js';
import Transaction from '../models/Transaction.model.js';
import mongoose from 'mongoose';

const walletController = {
    async getBalance(req, res) {
        try {
            const user = await User.findById(req.user._id)
                .select('balance');

            res.json({
                success: true,
                data: { balance: user.balance }
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    },

    async deposit(req, res) {
        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            const { amount, paymentMethod } = req.body;

            const transaction = new Transaction({
                userId: req.user._id,
                type: 'deposit',
                amount,
                paymentMethod,
                status: 'pending'
            });

            await transaction.save();

            res.json({
                success: true,
                message: 'Deposit initiated',
                data: {
                    transactionId: transaction._id,
                    paymentUrl: `${process.env.PAYMENT_URL}/${transaction._id}`
                }
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

    async withdraw(req, res) {
        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            const { amount, bankDetails } = req.body;

            // Check balance
            const user = await User.findById(req.user._id);
            if (user.balance < amount) {
                throw new Error('Insufficient balance');
            }

            // Create withdrawal request
            const transaction = new Transaction({
                userId: req.user._id,
                type: 'withdrawal',
                amount,
                bankDetails,
                status: 'pending'
            });

            // Update user balance
            await User.findByIdAndUpdate(req.user._id, {
                $inc: { balance: -amount }
            });

            await transaction.save();
            await session.commitTransaction();

            res.json({
                success: true,
                message: 'Withdrawal initiated',
                data: transaction
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
    }
};

export default walletController; 