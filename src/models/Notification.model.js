import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    title: {
        type: String,
        required: true,
        trim: true
    },
    message: {
        type: String,
        required: true,
        trim: true
    },
    type: {
        type: String,
        enum: [
            'bet_placed',
            'bet_won',
            'bet_lost',
            'bet_cancelled',
            'deposit_success',
            'deposit_failed',
            'withdrawal_success',
            'withdrawal_failed',
            'account_update',
            'security_alert',
            'promotion',
            'match_reminder',
            'match_started',
            'match_ended',
            'system'
        ],
        required: true,
        index: true
    },
    priority: {
        type: String,
        enum: ['low', 'medium', 'high', 'critical'],
        default: 'low'
    },
    isRead: {
        type: Boolean,
        default: false,
        index: true
    },
    data: {
        betId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Bet'
        },
        matchId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'MatchDetail'
        },
        amount: Number,
        transactionId: String,
        additionalInfo: mongoose.Schema.Types.Mixed
    },
    expiresAt: {
        type: Date,
        default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        index: true
    },
    actionUrl: {
        type: String,
        trim: true
    },
    deliveryStatus: {
        email: {
            sent: { type: Boolean, default: false },
            sentAt: Date
        },
        push: {
            sent: { type: Boolean, default: false },
            sentAt: Date
        },
        sms: {
            sent: { type: Boolean, default: false },
            sentAt: Date
        }
    }
}, {
    timestamps: true
});

// Indexes
notificationSchema.index({ createdAt: -1 });
notificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, type: 1, createdAt: -1 });

// Methods
notificationSchema.methods = {
    markAsRead: async function() {
        this.isRead = true;
        await this.save();
        return this;
    },

    markAsDelivered: async function(channel) {
        if (this.deliveryStatus[channel]) {
            this.deliveryStatus[channel] = {
                sent: true,
                sentAt: new Date()
            };
            await this.save();
        }
        return this;
    }
};

// Statics
notificationSchema.statics = {
    // Get unread notifications count for user
    async getUnreadCount(userId) {
        return this.countDocuments({
            userId,
            isRead: false,
            expiresAt: { $gt: new Date() }
        });
    },

    // Create bet notification
    async createBetNotification(bet, type) {
        const notifications = {
            bet_placed: {
                title: 'Bet Placed Successfully',
                message: `Your bet of ${bet.amount} has been placed successfully.`
            },
            bet_won: {
                title: 'Congratulations! You Won',
                message: `You won ${bet.winningAmount} from your bet!`,
                priority: 'high'
            },
            bet_lost: {
                title: 'Bet Result',
                message: 'Unfortunately, your bet did not win this time.'
            },
            bet_cancelled: {
                title: 'Bet Cancelled',
                message: 'Your bet has been cancelled and refunded.'
            }
        };

        const notificationData = notifications[type];
        if (!notificationData) throw new Error('Invalid notification type');

        return await this.create({
            userId: bet.userId,
            type,
            title: notificationData.title,
            message: notificationData.message,
            priority: notificationData.priority || 'medium',
            data: {
                betId: bet._id,
                matchId: bet.matchId,
                amount: bet.amount
            },
            actionUrl: `/bets/${bet._id}`
        });
    },

    // Bulk create match notifications
    async createMatchNotifications(matchId, type, userIds) {
        const notifications = userIds.map(userId => ({
            userId,
            type,
            title: 'Match Starting Soon',
            message: 'Your match is starting in 15 minutes!',
            data: { matchId },
            actionUrl: `/matches/${matchId}`
        }));

        return await this.insertMany(notifications);
    },

    // Delete expired notifications
    async deleteExpired() {
        return await this.deleteMany({
            expiresAt: { $lt: new Date() }
        });
    }
};

// Middleware
notificationSchema.pre('save', function(next) {
    // Set expiry based on type
    const expiryDays = {
        bet_placed: 30,
        bet_won: 90,
        bet_lost: 30,
        security_alert: 180,
        promotion: 7
    };

    if (this.isNew && expiryDays[this.type]) {
        this.expiresAt = new Date(Date.now() + expiryDays[this.type] * 24 * 60 * 60 * 1000);
    }

    next();
});

const Notification = mongoose.model('Notification', notificationSchema);
export default Notification; 