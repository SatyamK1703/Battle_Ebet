import mongoose from "mongoose";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const adminSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true
    },
    password: {
        type: String,
        required: true,
        select: false
    },
    role: {
        type: String,
        enum: ['super-admin', 'admin'],
        default: 'admin'
    },
    status: {
        type: String,
        enum: ['active', 'inactive'],
        default: 'active'
    },
    refreshToken: {
        type: String,
        select: false
    },
    lastLogin: {
        type: Date
    },
    matchId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "MatchDetails",
        required: true,
    },
    tournamentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "TournamentDetails",
        required: true,
    },
    bettingStats: {
        totalBets: {
            type: Number,
            default: 0,
        },
        totalBetAmount: {
            type: Number,
            default: 0,
        },
        totalPayout: {
            type: Number,
            default: 0,
        },
        totalProfit: {
            type: Number,
            default: 0,
        },
        activeBets: {
            type: Number,
            default: 0,
        },
        settledBets: {
            type: Number,
            default: 0,
        },
        cancelledBets: {
            type: Number,
            default: 0,
        }
    },
    teamWiseBetting: [{
        teamId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "TeamDetail",
        },
        totalBets: {
            type: Number,
            default: 0,
        },
        totalAmount: {
            type: Number,
            default: 0,
        },
        potentialPayout: {
            type: Number,
            default: 0,
        }
    }],
    matchStatus: {
        type: String,
        enum: ["upcoming", "live", "completed", "cancelled"],
        default: "upcoming"
    },
    odds: [{
        teamId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "TeamDetail",
        },
        currentOdds: {
            type: Number,
            required: true,
        },
        oddsHistory: [{
            value: Number,
            timestamp: {
                type: Date,
                default: Date.now
            }
        }]
    }],
    riskManagement: {
        maxBetAmount: {
            type: Number,
            default: 10000
        },
        maxPotentialLoss: {
            type: Number,
            default: 100000
        },
        suspendBettingThreshold: {
            type: Number,
            default: 150000
        },
        isBettingSuspended: {
            type: Boolean,
            default: false
        }
    },
    winningDetails: {
        winningTeamId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "TeamDetail"
        },
        totalWinners: {
            type: Number,
            default: 0
        },
        totalLosers: {
            type: Number,
            default: 0
        },
        settlementStatus: {
            type: String,
            enum: ["pending", "processing", "completed", "failed"],
            default: "pending"
        },
        settlementTimestamp: Date
    },
    notifications: [{
        type: {
            type: String,
            enum: ["risk_alert", "odds_change", "settlement_complete", "betting_suspended"],
        },
        message: String,
        timestamp: {
            type: Date,
            default: Date.now
        },
        isRead: {
            type: Boolean,
            default: false
        }
    }],
    dailyStats: [{
        date: {
            type: String,
            default: () => new Date().toISOString().split("T")[0]
        },
        profit: {
            type: Number,
            default: 0
        },
        loss: {
            type: Number,
            default: 0
        },
        totalPayout: {
            type: Number,
            default: 0
        },
        totalBetAmount: {
            type: Number,
            default: 0
        },
        betsCount: {
            type: Number,
            default: 0
        },
        uniqueBettors: {
            type: Number,
            default: 0
        },
        matchesSettled: {
            type: Number,
            default: 0
        },
        highestPayout: {
            amount: {
                type: Number,
                default: 0
            },
            userId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "User"
            },
            matchId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "MatchDetails"
            }
        },
    }],
}, { 
    timestamps: true,
    toJSON: { virtuals: true } 
});

// Indexes for better query performance
adminSchema.index({ matchId: 1 });
adminSchema.index({ tournamentId: 1 });
adminSchema.index({ matchStatus: 1 });
adminSchema.index({ 'teamWiseBetting.teamId': 1 });
adminSchema.index({ 'winningDetails.settlementStatus': 1 });
adminSchema.index({ 'dailyStats.date': 1 });

// Virtual for calculating risk exposure
adminSchema.virtual('currentRiskExposure').get(function() {
    return Math.max(...this.teamWiseBetting.map(team => team.potentialPayout)) - this.bettingStats.totalBetAmount;
});

// Virtual for calculating daily net profit/loss
adminSchema.virtual('dailyNetProfit').get(function() {
    if (this.dailyStats.length > 0) {
        const today = new Date().toISOString().split("T")[0];
        const todayStats = this.dailyStats.find(stat => stat.date === today);
        return todayStats ? todayStats.profit - todayStats.loss : 0;
    }
    return 0;
});

// Hash password before saving
adminSchema.pre('save', async function(next) {
    if (!this.isModified('password')) return next();
    this.password = await bcrypt.hash(this.password, 10);
    next();
});

// Compare password method
adminSchema.methods.comparePassword = async function(password) {
    return await bcrypt.compare(password, this.password);
};

// Generate access token
adminSchema.methods.generateAccessToken = function() {
    return jwt.sign(
        {
            _id: this._id,
            username: this.username,
            role: this.role
        },
        process.env.JWT_SECRET,
        { expiresIn: '1d' }
    );
};

// Generate refresh token
adminSchema.methods.generateRefreshToken = function() {
    return jwt.sign(
        {
            _id: this._id
        },
        process.env.REFRESH_TOKEN_SECRET,
        {
            expiresIn: process.env.REFRESH_TOKEN_EXPIRY || '7d'
        }
    );
};

const Admin = mongoose.model('Admin', adminSchema);
export default Admin;