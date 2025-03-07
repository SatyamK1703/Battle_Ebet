import mongoose from 'mongoose';

const betSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    matchId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'MatchDetails',
        required: true,
        index: true
    },
    amount: {
        type: Number,
        required: true,
        min: [10, 'Minimum bet amount is 10'],
        max: [100000, 'Maximum bet amount is 100000']
    },
    odds: {
        type: Number,
        required: true,
        min: 1
    },
    prediction: {
        type: String,
        required: true,
        enum: ['team1', 'team2', 'draw'],
        index: true
    },
    potentialWinning: {
        type: Number,
        required: true
    },
    winningAmount: {
        type: Number,
        default: 0
    },
    status: {
        type: String,
        enum: ['pending', 'won', 'lost', 'cancelled', 'refunded'],
        default: 'pending',
        index: true
    },
    settledAt: {
        type: Date
    },
    betType: {
        type: String,
        enum: ['pre-match', 'live'],
        default: 'pre-match'
    },
    marketType: {
        type: String,
        enum: ['match-winner', 'total-kills', 'first-blood', 'first-tower'],
        default: 'match-winner'
    },
    metadata: {
        gameType: {
            type: String,
            enum: ['dota2', 'csgo', 'lol', 'valorant'],
            required: true
        },
        tournamentId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Tournament',
            required: true
        },
        selectedTeam: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Team'
        },
        predictedValue: {
            type: String // For non match-winner bets (e.g., "over 21.5" for total-kills)
        }
    },
    riskLevel: {
        type: String,
        enum: ['low', 'medium', 'high'],
        default: 'medium'
    }
}, {
    timestamps: true
});

// Indexes for better query performance
betSchema.index({ createdAt: -1 });
betSchema.index({ status: 1, createdAt: -1 });
betSchema.index({ userId: 1, status: 1 });
betSchema.index({ matchId: 1, status: 1 });

// Virtual field for profit/loss
betSchema.virtual('profitLoss').get(function() {
    if (this.status === 'won') {
        return this.winningAmount - this.amount;
    } else if (this.status === 'lost') {
        return -this.amount;
    }
    return 0;
});

// Methods
betSchema.methods = {
    // Calculate potential winning based on amount and odds
    calculatePotentialWinning() {
        return this.amount * this.odds;
    },

    // Settle bet based on match result
    async settle(matchResult) {
        if (this.status !== 'pending') {
            throw new Error('Bet already settled');
        }

        if (matchResult === this.prediction) {
            this.status = 'won';
            this.winningAmount = this.potentialWinning;
        } else {
            this.status = 'lost';
            this.winningAmount = 0;
        }

        this.settledAt = new Date();
        await this.save();
        return this;
    },

    // Cancel bet and refund amount
    async cancel(reason) {
        if (this.status !== 'pending') {
            throw new Error('Cannot cancel settled bet');
        }

        this.status = 'cancelled';
        this.settledAt = new Date();
        await this.save();

        // Add to cancellation history
        await BetCancellation.create({
            betId: this._id,
            reason: reason,
            refundAmount: this.amount
        });

        return this;
    }
};

// Statics
betSchema.statics = {
    // Get user betting statistics
    async getUserStats(userId) {
        return this.aggregate([
            { $match: { userId: new mongoose.Types.ObjectId(userId) } },
            {
                $group: {
                    _id: null,
                    totalBets: { $sum: 1 },
                    totalAmount: { $sum: '$amount' },
                    totalWinnings: { $sum: '$winningAmount' },
                    wonBets: {
                        $sum: { $cond: [{ $eq: ['$status', 'won'] }, 1, 0] }
                    }
                }
            },
            {
                $project: {
                    _id: 0,
                    totalBets: 1,
                    totalAmount: 1,
                    totalWinnings: 1,
                    wonBets: 1,
                    winRate: {
                        $multiply: [
                            { $divide: ['$wonBets', '$totalBets'] },
                            100
                        ]
                    },
                    profitLoss: {
                        $subtract: ['$totalWinnings', '$totalAmount']
                    }
                }
            }
        ]);
    }
};

// Middleware
betSchema.pre('save', function(next) {
    if (this.isNew) {
        this.potentialWinning = this.calculatePotentialWinning();
    }
    next();
});

// Create BetCancellation model for tracking cancelled bets
const betCancellationSchema = new mongoose.Schema({
    betId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Bet',
        required: true
    },
    reason: {
        type: String,
        required: true
    },
    refundAmount: {
        type: Number,
        required: true
    }
}, { timestamps: true });

export const BetCancellation = mongoose.model('BetCancellation', betCancellationSchema);
const Bet = mongoose.model('Bet', betSchema);
export default Bet; 