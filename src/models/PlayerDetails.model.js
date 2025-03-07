import mongoose from "mongoose";

const eliminationSchema = new mongoose.Schema({
    matchId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'MatchDetails',
        required: true
    },
    tournamentId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'TournamentDetails'
    },
    elimination: [{
        eliminatedPlayerId: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            ref: 'PlayerDetails'
        },
        eliminatedPlayerName: {
            type: String,
            required: true
        },
        eliminatedTeamId: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            ref: 'TeamDetails'
        },
        eliminatedTeamName: {
            type: String,
            required: true
        },
        weaponUsed: {
            type: String,
            required: true
        },
        eliminationTime: {
            type: Date,
            default: Date.now
        },
        oneVfour: {
            type: Number,
            default: 0
        },
        oneVthree: {
            type: Number,
            default: 0
        },
        throwableKills: {
            type: Number,
            default: 0
        },
        vehicalsKills: {
            type: Number,
            default: 0
        },
    }],
}, { _id: false, timestamps: true });

const tournamentStatsSchema = new mongoose.Schema({
    tournamentId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'TournamentDetails'
    },
    tournamentName: {
        type: String,
        required: true
    },
    kills: {
        type: Number,
        default: 0
    },
    matchesPlayed: {
        type: Number,
        default: 0
    },
    wins: {
        type: Number,
        default: 0
    },
    mvpCount: {
        type: Number,
        default: 0
    },
    damageDealt: {
        type: Number,
        default: 0
    },
    oneVfour: {
        type: Number,
        default: 0
    },
    oneVthree: {
        type: Number,
        default: 0
    },
    throwableKills: {
        type: Number,
        default: 0
    },  
    vehicalsKills: {
        type: Number,
        default: 0
    },
    eliminations: [eliminationSchema],
}, { _id: false });

const dailyStatSchema = new mongoose.Schema({
    date: {
        type: String,
        required: true
    },
    kills: {
        type: Number,
        default: 0
    },
    matchesPLay: {
        type: Number,
        default: 0
    },
    oneVfour: {
        type: Number,
        default: 0
    },
    oneVthree: {
        type: Number,
        default: 0
    },
    throwableKills: {
        type: Number,
        default: 0
    },
    vehicalsKills: {
        type: Number,
        default: 0
    },
    eliminations: [eliminationSchema]
}, { _id: false });

const matchStatSchema = new mongoose.Schema({
    matchId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'MatchDetails',
        required: true
    },
    tournamentId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'TournamentDetails'
    },
    date: {
        type: Date,
        default: Date.now
    },
    kills: {
        type: Number,
        default: 0
    },
    headshots: {
        type: Number,
        default: 0
    },
    oneVfour: {
        type: Number,
        default: 0
    },
    oneVthree: {
        type: Number,
        default: 0,
    },
    throwableKills: {
        type: Number,
        default: 0, 
    },
    vehicalsKills: {
        type: Number,
        default: 0,
    },
    eliminations: [eliminationSchema]
}, { _id: false, timestamps: true });


const playerDetailsSchema = new mongoose.Schema({
    playerName: {
        type: String,
        required: true,
        unique: true
    },
    country: {
        type: String,
        required: true
    },
    teamId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'TeamDetail',
        required: true
    },
    avatar: {
        type: String,
        default: ""
    },
    totalKills: {
        type: Number,
        default: 0
    },
    totalPlayedMatches: {
        type: Number,
        default: 0
    },
    tournaments: [tournamentStatsSchema],
    dailyStat: [dailyStatSchema],
    matches: [matchStatSchema],

}, { 
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Index for faster queries
playerDetailsSchema.index({ playerName: 1 });
playerDetailsSchema.index({ teamId: 1 });
playerDetailsSchema.index({ 'dailyStat.date': 1 });
playerDetailsSchema.index({ 'tournaments.tournamentId': 1 });

// Virtual for calculating total kills across all tournaments
playerDetailsSchema.virtual('totalKills').get(function() {
    return this.tournaments.reduce((sum, t) => sum + (t.kills || 0), 0);
});

// Virtual for calculating total matches played
playerDetailsSchema.virtual('totalMatchesPlayed').get(function() {
    return this.tournaments.reduce((sum, t) => sum + (t.matchesPlayed || 0), 0);
});

// Virtual for calculating win rate
playerDetailsSchema.virtual('winRate').get(function() {
    const totalMatches = this.totalMatchesPlayed;
    const totalWins = this.tournaments.reduce((sum, t) => sum + (t.wins || 0), 0);
    return totalMatches ? (totalWins / totalMatches * 100).toFixed(2) : 0;
});

// Add new index for matches
playerDetailsSchema.index({ 'matches.matchId': 1 });
playerDetailsSchema.index({ 'matches.date': 1 });

// Add new virtual for average stats
playerDetailsSchema.virtual('averageMatchStats').get(function() {
    if (!this.matches.length) return null;
    
    const totalMatches = this.matches.length;
    return {
        avgKills: (this.matches.reduce((sum, m) => sum + m.kills, 0) / totalMatches).toFixed(2),
        avgDamage: (this.matches.reduce((sum, m) => sum + m.damageDealt, 0) / totalMatches).toFixed(2),
        avgHeadshots: (this.matches.reduce((sum, m) => sum + m.headshots, 0) / totalMatches).toFixed(2),
        avgAccuracy: (this.matches.reduce((sum, m) => sum + m.accuracy, 0) / totalMatches).toFixed(2),
        avgPlacement: (this.matches.reduce((sum, m) => sum + m.placement, 0) / totalMatches).toFixed(1)
    };
});

// Add helper method to add eliminations
playerDetailsSchema.methods.addElimination = async function(matchId, elimination) {
    const match = this.matches.find(m => m.matchId.toString() === matchId.toString());
    if (match) {
        match.eliminations.push(elimination);
        match.kills = match.eliminations.length;
        await this.save();
        return true;
    }
    return false;
};

// Add helper method to get eliminations by match
playerDetailsSchema.methods.getEliminationsByMatch = function(matchId) {
    const match = this.matches.find(m => m.matchId.toString() === matchId.toString());
    return match ? match.eliminations : [];
};

// Add virtual for total eliminations
playerDetailsSchema.virtual('totalEliminations').get(function() {
    return this.matches.reduce((total, match) => total + match.eliminations.length, 0);
});

const PlayerDetails = mongoose.model('PlayerDetails', playerDetailsSchema);

export default PlayerDetails;