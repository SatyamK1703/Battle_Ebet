import mongoose from "mongoose";

const playerPerformanceSchema = new mongoose.Schema({
    playerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "PlayerDetails",
        required: true
    },
    playerName: {
        type: String,
        required: true
    },
    kills: {
        type: Number,
        default: 0
    },
    damage: {
        type: Number,
        default: 0
    },
    survival: {
        type: Number,
        default: 0
    },
    killDetails: [{
        matchId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "MatchDetails",
            required: true
        },
        eliminatedPlayerId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "PlayerDetails",
            required: true
        },
        eliminatedPlayerName: {
            type: String,
            required: true
        },
        eliminatedTeamId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "TeamDetails",
            required: true
        },
        eliminatedTeamName: {
            type: String,
            required: true
        },
        timestamp: {
            type: Date,
            default: Date.now
        },
    }],
 });

const matchStatsSchema = new mongoose.Schema({
    matchId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "MatchDetails"
    },
    kills: {
        type: Number,
        default: 0
    },
    position: {
        type: Number,
        default: 0
    },
    points: {
        type: Number,
        default: 0
    },
    teamStatus: {
        isAlive: {
            type: Boolean,
            default: true
        },
        alivePlayersCount: {
            type: Number,
            default: 4  // Default squad size
        },
        eliminatedAt: {
            timestamp: Date,
            position: Number,
            eliminatedBy: {
                teamId: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: "TeamDetails"
                },
                teamName: String,
                playerId: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: "PlayerDetails"
                },
                playerName: String
            }
        },
    },
    vehicleKills: {
        type: Number,
        default: 0
    },
    throwablesKills: {
        type: Number,
        default: 0
    },
    playerPerformances: [playerPerformanceSchema],
    matchSummary: {
        totalDamageDealt: {
            type: Number,
            default: 0
        },
        totalDamageTaken: {
            type: Number,
            default: 0
        },
        totalHealsUsed: {
            type: Number,
            default: 0
        },
        totalRevives: {
            type: Number,
            default: 0
        },
    }
});

const tournamentStatsSchema = new mongoose.Schema({
    tournamentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "TournamentDetails",
        required: true
    },
    tournamentName: {
        type: String,
        required: true
    },
    status: {
        type: String,
        enum: ['registered', 'active', 'qualified', 'disqualified', 'eliminated'],
        default: 'registered'
    },
    position: {
        type: Number,
        default: 0
    },
    totalKills: {
        type: Number,
        default: 0
    },
    totalPoints: {
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
    top3: {
        type: Number,
        default: 0
    },
    qualificationDate: {
        type: Date
    },
    disqualificationDate: {
        type: Date
    },
    prizeWon: {
        type: Number,
        default: 0
    },
    matchStats: [matchStatsSchema]
});

const TeamDetailSchema = new mongoose.Schema({
    teamName: {
        type: String,
        required: true,
    },
    teamLogo: {
        type: String,
        default: "",
    },
    players: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "PlayerDetails",
    }],
    teamKill: {
        type: Number,
        default: 0
    },
    teamRank: {
        type: Number,
        default: 0,
    },
    overallPoint: {
        type: Number,
        default: 0,
    },
    // Tournament statistics with status tracking
    tournaments: [tournamentStatsSchema],
    // Daily team statistics
    dailyTeamStat: [{
        date: {
            type: String,
            default: () => new Date().toISOString().split("T")[0]
        },
        kills: {
            type: Number,
            default: 0,
        },
        matchesPlay: {
            type: Number,
            default: 0,
        },
        points: {
            type: Number,
            default: 0,
        },
        teamRank: {
            type: Number,
            default: 0,
        },
        dailyPoint: {
            type: Number,
            default: 0,
        },
        matchDetails: [{
            matchId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "MatchDetails"
            },
            kills: Number,
            position: Number,
            points: Number,
            playerKills: [{
                playerId: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: "PlayerDetails"
                },
                playerName: String,
                teamId: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: "TeamDetails"
                },
                kills: Number,
                eliminatedPlayers: [{
                    eliminatedPlayerId: {
                        type: mongoose.Schema.Types.ObjectId,
                        ref: "PlayerDetails"
                    },
                    eliminatedPlayerName: String,
                    eliminatedTeamId: {
                        type: mongoose.Schema.Types.ObjectId,
                        ref: "TeamDetails"
                    },
                    eliminatedTeamName: String,
                }]
            }],
            timestamp: Date
        }]
    }]
}, {
    timestamps: true
});

// Add indexes for better query performance
TeamDetailSchema.index({ 'tournaments.tournamentId': 1 });
TeamDetailSchema.index({ 'dailyTeamStat.date': 1 });
TeamDetailSchema.index({ teamName: 1 });
TeamDetailSchema.index({ 'tournaments.status': 1 });

// Virtual for active tournaments
TeamDetailSchema.virtual('activeTournaments').get(function() {
    return this.tournaments.filter(t => 
        ['active', 'qualified'].includes(t.status)
    );
});

// Virtual for tournament statistics
TeamDetailSchema.virtual('tournamentStats').get(function() {
    return {
        totalTournaments: this.tournaments.length,
        wins: this.tournaments.reduce((sum, t) => sum + t.wins, 0),
        totalKills: this.tournaments.reduce((sum, t) => sum + t.totalKills, 0),
        totalPoints: this.tournaments.reduce((sum, t) => sum + t.totalPoints, 0),
        qualifiedCount: this.tournaments.filter(t => t.status === 'qualified').length,
        disqualifiedCount: this.tournaments.filter(t => t.status === 'disqualified').length,
        totalPrizeWon: this.tournaments.reduce((sum, t) => sum + t.prizeWon, 0)
    };
});

// Method to update tournament status
TeamDetailSchema.methods.updateTournamentStatus = async function(tournamentId, status, reason = '') {
    const tournament = this.tournaments.find(t => 
        t.tournamentId.toString() === tournamentId.toString()
    );
    
    if (tournament) {
        tournament.status = status;
        if (status === 'disqualified') {
            tournament.disqualificationDate = new Date();
            tournament.disqualificationReason = reason;
        }
        if (status === 'qualified') {
            tournament.qualificationDate = new Date();
        }
        await this.save();
        return true;
    }
    return false;
};

// Add method to update player performance
TeamDetailSchema.methods.updatePlayerPerformance = async function(
    tournamentId, 
    matchId, 
    playerPerformance
) {
    const tournament = this.tournaments.find(
        t => t.tournamentId.toString() === tournamentId.toString()
    );
    
    if (tournament) {
        const match = tournament.matchStats.find(
            m => m.matchId.toString() === matchId.toString()
        );
        
        if (match) {
            const playerIndex = match.playerPerformances.findIndex(
                p => p.playerId.toString() === playerPerformance.playerId.toString()
            );
            
            if (playerIndex !== -1) {
                // Update existing performance
                match.playerPerformances[playerIndex] = {
                    ...match.playerPerformances[playerIndex],
                    ...playerPerformance,
                    killDetails: [
                        ...match.playerPerformances[playerIndex].killDetails,
                        ...(playerPerformance.killDetails || [])
                    ]
                };
            } else {
                // Add new performance
                match.playerPerformances.push(playerPerformance);
            }
            
            // Update match total kills
            match.kills = match.playerPerformances.reduce(
                (sum, p) => sum + p.kills, 
                0
            );
            
            await this.save();
            return true;
        }
    }
    return false;
};

// Add method to get player kill details
TeamDetailSchema.methods.getPlayerKillDetails = function(
    tournamentId, 
    matchId, 
    playerId
) {
    const tournament = this.tournaments.find(
        t => t.tournamentId.toString() === tournamentId.toString()
    );
    
    if (tournament) {
        const match = tournament.matchStats.find(
            m => m.matchId.toString() === matchId.toString()
        );
        
        if (match) {
            const player = match.playerPerformances.find(
                p => p.playerId.toString() === playerId.toString()
            );
            
            return player?.killDetails || [];
        }
    }
    return [];
};

// Add method to update team status in match
TeamDetailSchema.methods.updateTeamMatchStatus = async function(
    tournamentId,
    matchId,
    statusUpdate
) {
    const tournament = this.tournaments.find(
        t => t.tournamentId.toString() === tournamentId.toString()
    );
    
    if (tournament) {
        const match = tournament.matchStats.find(
            m => m.matchId.toString() === matchId.toString()
        );
        
        if (match) {
            match.teamStatus = {
                ...match.teamStatus,
                ...statusUpdate
            };
            
            // If team is eliminated, record the timestamp and position
            if (statusUpdate.isAlive === false && !match.teamStatus.eliminatedAt) {
                match.teamStatus.eliminatedAt = {
                    timestamp: new Date(),
                    position: match.position,
                    eliminatedBy: statusUpdate.eliminatedBy
                };
            }
            
            await this.save();
            return true;
        }
    }
    return false;
};

// Add method to update team position
TeamDetailSchema.methods.updateTeamPosition = async function(
    tournamentId,
    matchId,
    position
) {
    const tournament = this.tournaments.find(
        t => t.tournamentId.toString() === tournamentId.toString()
    );
    
    if (tournament) {
        const match = tournament.matchStats.find(
            m => m.matchId.toString() === matchId.toString()
        );
        
        if (match && match.teamStatus.isAlive) {
            match.teamStatus.currentPosition = {
                ...position,
                lastUpdated: new Date()
            };
            
            await this.save();
            return true;
        }
    }
    return false;
};

// Add method to get team match status
TeamDetailSchema.methods.getTeamMatchStatus = function(tournamentId, matchId) {
    const tournament = this.tournaments.find(
        t => t.tournamentId.toString() === tournamentId.toString()
    );
    
    if (tournament) {
        const match = tournament.matchStats.find(
            m => m.matchId.toString() === matchId.toString()
        );
        
        if (match) {
            return {
                isAlive: match.teamStatus.isAlive,
                alivePlayersCount: match.teamStatus.alivePlayersCount,
                position: match.position,
                kills: match.kills,
                points: match.points,
                currentPosition: match.teamStatus.currentPosition,
                eliminationDetails: match.teamStatus.eliminatedAt
            };
        }
    }
    return null;
};

const TeamDetail = mongoose.model("TeamDetail", TeamDetailSchema);

export default TeamDetail;