import { Admin } from '../models/Admin.model.js';
import asyncHandler from '../utils/asyncHandler.js'
import TournamentDetails from '../models/TournamentDetails.model.js';
import MatchDetails from '../models/MatchDetails.model.js';
import TeamDetail from '../models/TeamDetails.model.js';
import PlayerDetails from '../models/PlayerDetails.model.js';
import User from '../models/User.model.js';
import Wallet from '../models/WalletTransction.model.js';
import redisService from '../config/redis.config.js';
import mongoose from 'mongoose';

export const getMatchStats = asyncHandler(async (req, res) => {
    try {
        const { matchId } = req.params;
        
        // Use the cached version
        const matchStats = await Admin.getWithCache(matchId);
        
        if (!matchStats) {
            return res.status(404).json({ message: 'Match stats not found' });
        }
        
        res.json(matchStats);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

export const getDailyStats = asyncHandler(async (req, res) => {
    try {
        const date = req.query.date || new Date().toISOString().split('T')[0];
        
        // Use the cached version
        const dailyStats = await Admin.getDailyStatsWithCache(date);
        
        if (!dailyStats) {
            return res.status(404).json({ message: 'Daily stats not found' });
        }
        
        res.json(dailyStats);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

export const getTeamStats = asyncHandler(async (req, res) => {
    try {
        const { teamId } = req.params;
        
        // Use the cached version
        const teamStats = await Admin.getTeamStatsWithCache(teamId);
        
        if (!teamStats) {
            return res.status(404).json({ message: 'Team stats not found' });
        }
        
        res.json(teamStats);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

export const getTournamentStats = asyncHandler(async (req, res) => {
    try {
        const { tournamentId } = req.params;
        
        // Use the cached version
        const tournamentStats = await Admin.getTournamentStatsWithCache(tournamentId);
        
        if (!tournamentStats) {
            return res.status(404).json({ message: 'Tournament stats not found' });
        }   

        res.json(tournamentStats);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

export const getUserStats = asyncHandler(async (req, res) => {
    try {
        const { userId } = req.params;  
        
        // Use the cached version
        const userStats = await Admin.getUserStatsWithCache(userId);
        
        if (!userStats) {
            return res.status(404).json({ message: 'User stats not found' });
        }   

        res.json(userStats);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});  

export const createTournament = async (req, res) => {
    try {
        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            const { 
                name, 
                startDate, 
                endDate, 
                prizePool, 
                participatingTeams,
                description,
                status
            } = req.body;

            // Validate and get participating teams
            const teams = await TeamDetail.find({
                _id: { $in: participatingTeams }
            }).session(session);

            // Process tournament banner
            let banner = null;
            const bannerLocalPath = req.files?.banner?.[0]?.path;
            
            if (bannerLocalPath) {
                banner = await uploadOnCloudinary(bannerLocalPath);
                if (!banner) {
                    throw new Error("Error while uploading banner");
                }
            }

            // Create tournament
            const tournament = new TournamentDetails({
                name,
                startDate,
                endDate,
                prizePool,
                description,
                banner: banner?.url || "",
                status: status || 'upcoming',
                teams: teams.map(team => ({
                    teamId: team._id,
                    teamName: team.teamName,
                    teamLogo: team.teamLogo,
                    players: team.players,
                    status: 'registered'
                }))
            });

            await tournament.save({ session });

            // Update teams
            await Promise.all(teams.map(async (team) => {
                team.tournaments = team.tournaments || [];
                team.tournaments.push({
                    tournamentId: tournament._id,
                    tournamentName: name,
                    status: 'upcoming',
                    totalKills: 0,
                    totalPoints: 0,
                    position: 0,
                    prizeWon: 0,
                    matches: []
                });
                return team.save({ session });
            }));

            // Update players
            await Promise.all(teams.flatMap(team => 
                team.players.map(playerId => 
                    PlayerDetails.findByIdAndUpdate(
                        playerId,
                        {
                            $push: {
                                tournaments: {
                                    tournamentId: tournament._id,
                                    tournamentName: name,
                                    teamId: team._id,
                                    status: 'upcoming',
                                    kills: 0,
                                    matchesPlayed: 0,
                                    mvpCount: 0
                                }
                            }
                        },
                        { session }
                    )
                )
            ));

            await session.commitTransaction();
            await redisService.clearByPattern('cache:*/tournaments*');

            return res.status(201).json({
                success: true,
                message: "Tournament created successfully",
                data: tournament
            });

        } catch (error) {
            await session.abortTransaction();
            throw error;
        } finally {
            session.endSession();
        }

    } catch (error) {
        return res.status(400).json({
            success: false,
            message: error.message
        });
    }
};



const adminController = {
    // Tournament Management
    async getAllTournaments(req, res) {
        try {
            const { status, page = 1, limit = 10 } = req.query;
            const query = status ? { status } : {};
            
            const tournaments = await TournamentDetails.find(query)
                .populate('participantsTeamName', 'teamName teamLogo')
                .sort({ startDate: -1 })
                .skip((page - 1) * limit)
                .limit(parseInt(limit));

            const total = await TournamentDetails.countDocuments(query);

            res.json({
                success: true,
                data: tournaments,
                pagination: {
                    total,
                    page: parseInt(page),
                    pages: Math.ceil(total / limit)
                }
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    },

    async updateTournament(req, res) {
        try {
            const tournament = await TournamentDetails.findByIdAndUpdate(
                req.params.id,
                { ...req.body, status: req.body.status },
                { new: true }
            );

            if (!tournament) {
                return res.status(404).json({
                    success: false,
                    message: 'Tournament not found'
                });
            }

            await redisService.clearByPattern('cache:*/tournaments*');
            res.json({
                success: true,
                data: tournament
            });
        } catch (error) {
            res.status(400).json({
                success: false,
                message: error.message
            });
        }
    },


    async createMatch(req, res) {
        try {
            const { tournamentId, teams, startTime, mapName, matchNumber } = req.body;

            // Validate tournament exists
            const tournament = await TournamentDetails.findById(tournamentId);
            if (!tournament) {
                return res.status(404).json({
                    success: false,
                    message: 'Tournament not found'
                });
            }

            const match = new MatchDetails({
                tournamentId,
                teams,
                startTime,
                mapName,
                matchNumber,
                status: 'scheduled'
            });

            await match.save();
            await redisService.clearByPattern('cache:*/matches*');
            
            res.status(201).json({
                success: true,
                data: match
            });
        } catch (error) {
            res.status(400).json({
                success: false,
                message: error.message
            });
        }
    },
    async createTeam(req, res) {
        try {
            const { teamName, players } = req.body;

            // Check for duplicate team name
            const existingTeam = await TeamDetail.findOne({ teamName });
            if (existingTeam) {
                return res.status(400).json({
                    success: false,
                    message: 'Team name already exists'
                });
            }

            
            let teamLogo = null
    const teamLogoLocalPath = req.files?.avatar?.[0]?.path
    
    if (teamLogoLocalPath) {
        try {
            teamLogo = await uploadOnCloudinary(teamLogoLocalPath)
            if (!teamLogo) {
                throw new ApiError(400, "Error while uploading avatar")
            }
        } catch (error) {
            throw new ApiError(400, "Error while uploading avatar: " + error.message)
        }
    }

            const team = new TeamDetail({
                teamName,
                players,
                teamLogo: teamLogo?.url || "",
                overallPoint: 0,
                teamKill: 0
            });

            await team.save();
            await redisService.clearByPattern('cache:*/teams*');
            
            res.status(201).json({
                success: true,
                data: team
            });
        } catch (error) {
            res.status(400).json({
                success: false,
                message: error.message
            });
        }
    },

    async getAllTeams(req, res) {
        try {
            const teams = await TeamDetail.find()
                .sort({ overallPoint: -1 });

            res.json({
                success: true,
                data: teams
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    },
    
    async createPlayer(req, res) {
        try {
            const { country, playerName, teamId } = req.body;
            const existingPlayer = await PlayerDetails.findOne({ playerName });
            if (existingPlayer) {
                return res.status(400).json({
                    success: false,
                    message: 'Player name already exists'
                });
            }
            let avatar = null
            const avatarLocalPath = req.files?.avatar?.[0]?.path
            
            if (avatarLocalPath) {
                try {
                    avatar = await uploadOnCloudinary(avatarLocalPath)
                    if (!avatar) {
                        throw new ApiError(400, "Error while uploading avatar")
                    }
                } catch (error) {
                    throw new ApiError(400, "Error while uploading avatar: " + error.message)
                }
            }
            const player = new PlayerDetails({
                country,
                playerName,
                teamId,
                avatar : avatar?.url || "",
            });
            await player.save();

            await redisService.clearByPattern('cache:*/players*');
            res.status(201).json({
                success: true,
                data: player
            });
        } catch (error) {
            res.status(400).json({
                success: false,
                message: error.message
            });
        }
    },

    async getOverviewStats(req, res) {
        try {
            const [
                totalTournaments,
                activeTournaments,
                totalTeams,
                totalPlayers,
                totalUsers,
                recentTransactions
            ] = await Promise.all([
                TournamentDetails.countDocuments(),
                TournamentDetails.countDocuments({ status: 'ongoing' }),
                TeamDetail.countDocuments(),
                PlayerDetails.countDocuments(),
                User.countDocuments(),
                Wallet.find()
                    .sort({ 'transactions.timestamp': -1 })
                    .limit(5)
                    .populate('userId', 'username')
            ]);

            // Calculate total prize pool
            const tournaments = await TournamentDetails.find({ status: 'ongoing' });
            const totalPrizePool = tournaments.reduce((sum, t) => sum + (t.prizePool || 0), 0);

            res.json({
                success: true,
                data: {
                    totalTournaments,
                    activeTournaments,
                    totalTeams,
                    totalPlayers,
                    totalUsers,
                    totalPrizePool,
                    recentTransactions
                }
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    },

    async getAllUsers(req, res) {
        try {
            const users = await User.find()
                .select('-password -refreshToken')
                .sort({ createdAt: -1 });

            res.json({
                success: true,
                data: users
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    },

    async updateUserStatus(req, res) {
        try {
            const { status } = req.body;
            const user = await User.findByIdAndUpdate(
                req.params.id,
                { status },
                { new: true }
            ).select('-password -refreshToken');

            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: 'User not found'
                });
            }

            await redisService.clearByPattern('cache:*/users*');
            res.json({
                success: true,
                data: user
            });
        } catch (error) {
            res.status(400).json({
                success: false,
                message: error.message
            });
        }
    },
    async updateMatchStatus(req, res) {
        try {
            const { matchId, status } = req.body;
            const match = await MatchDetails.findByIdAndUpdate(
                matchId,
                { status },
                { new: true }
            );

            if (!match) {
                return res.status(404).json({
                    success: false,
                    message: 'Match not found'
                });
            }

            await redisService.clearByPattern('cache:*/matches*');

            res.json({
                success: true,
                data: match
            });
        } catch (error) {
            res.status(400).json({  
                success: false,
                message: error.message
            });
        }
    },
    async creditWallet(req, res) {
        try {
            const { amount } = req.body;
            const wallet = await Wallet.findOneAndUpdate(
                { userId: req.params.userId },
                { 
                    $inc: { balance: amount },
                    $push: {
                        transactions: {
                            amount,
                            transactionType: 'credit',
                            status: 'completed'
                        }
                    }
                },
                { new: true }
            );

            if (!wallet) {
                return res.status(404).json({
                    success: false,
                    message: 'Wallet not found'
                });
            }

            await redisService.clearByPattern('cache:*/wallets*');
            res.json({
                success: true,
                data: wallet
            });
        } catch (error) {
            res.status(400).json({
                success: false,
                message: error.message
            });
        }
    },
    async updateMatchAndAddEliminations(req, res) {
        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            const { matchId, playerStats, eliminations } = req.body;
            const today = new Date().toISOString().split('T')[0];
            
            // Group players by team
            const teamStats = {};
            
            // Update stats for each player
            const updatedPlayers = await Promise.all(
                playerStats.map(async (stats) => {
                    const player = await PlayerDetails.findById(stats.playerId).session(session);
                    const match = await MatchDetails.findById(matchId).session(session);
                    const matchIndex = player.matches.findIndex(m => m.matchId.toString() === matchId);

                    // Process eliminations and track special kill types
                    let oneVthreeCount = 0;
                    let oneVfourCount = 0;
                    let throwableKillCount = 0;
                    let vehicleKillCount = 0;

                    // Add eliminations and update match stats
                    player.matches[matchIndex].eliminations.push(...eliminations.map(elimination => {
                        // Track special kill types
                        if (elimination.isOneVThree) oneVthreeCount++;
                        if (elimination.isOneVFour) oneVfourCount++;
                        if (elimination.weaponUsed === 'throwable') throwableKillCount++;
                        if (elimination.weaponUsed === 'vehicle') vehicleKillCount++;

                        return {
                            eliminatedPlayerId: elimination.eliminatedPlayerId,
                            eliminatedPlayerName: elimination.eliminatedPlayerName,
                            eliminationTime: elimination.eliminationTime || new Date(),
                            weaponUsed: elimination.weaponUsed,
                            isOneVThree: elimination.isOneVThree || false,
                            isOneVFour: elimination.isOneVFour || false
                        };
                    }));

                    // Update match specific stats
                    player.matches[matchIndex].kills = player.matches[matchIndex].eliminations.length;
                    player.matches[matchIndex].oneVthree = (player.matches[matchIndex].oneVthree || 0) + oneVthreeCount;
                    player.matches[matchIndex].oneVfour = (player.matches[matchIndex].oneVfour || 0) + oneVfourCount;
                    player.matches[matchIndex].throwableKills = (player.matches[matchIndex].throwableKills || 0) + throwableKillCount;
                    player.matches[matchIndex].vehicleKills = (player.matches[matchIndex].vehicleKills || 0) + vehicleKillCount;

                    // Update player's daily stats
                    const playerDailyIndex = player.dailyStat.findIndex(d => d.date === today);
                    if (playerDailyIndex !== -1) {
                        player.dailyStat[playerDailyIndex].kills += eliminations.length;
                        player.dailyStat[playerDailyIndex].matches += 1;
                        player.dailyStat[playerDailyIndex].oneVthree = (player.dailyStat[playerDailyIndex].oneVthree || 0) + oneVthreeCount;
                        player.dailyStat[playerDailyIndex].oneVfour = (player.dailyStat[playerDailyIndex].oneVfour || 0) + oneVfourCount;
                        player.dailyStat[playerDailyIndex].throwableKills = (player.dailyStat[playerDailyIndex].throwableKills || 0) + throwableKillCount;
                        player.dailyStat[playerDailyIndex].vehicleKills = (player.dailyStat[playerDailyIndex].vehicleKills || 0) + vehicleKillCount;
                    } else {
                        player.dailyStat.push({
                            date: today,
                            kills: eliminations.length,
                            matches: 1,
                            oneVthree: oneVthreeCount,
                            oneVfour: oneVfourCount,
                            throwableKills: throwableKillCount,
                            vehicleKills: vehicleKillCount
                        });
                    }

                    // Group stats by team for team updates
                    if (!teamStats[stats.teamId]) {
                        teamStats[stats.teamId] = [];
                    }
                    teamStats[stats.teamId].push(stats);

                    return player;
                })
            );

            // Determine MVP based on kills
            const mvpPlayer = updatedPlayers.reduce((prev, curr) => (prev.kills > curr.kills ? prev : curr), updatedPlayers[0]);
            match.mvp = mvpPlayer.playerId; // Assuming match has an MVP field

            // Update team stats
            const updatedTeams = await Promise.all(
                Object.entries(teamStats).map(([teamId, stats]) => 
                    updateTeamStats(teamId, matchId, stats)
                )
            );

            await session.commitTransaction();

            res.status(200).json({
                success: true,
                message: "Match stats and eliminations updated successfully",
                data: {
                    players: updatedPlayers,
                    teams: updatedTeams,
                    mvp: mvpPlayer // Include MVP in the response
                }
            });

        } catch (error) {
            await session.abortTransaction();
            return res.status(500).json({
                success: false,
                message: "Error updating eliminations and stats",
                error: error.message
            });
        } finally {
            session.endSession();
        }
    },
    async deleteTournament(req, res) {
        try {
            const { tournamentId } = req.params;
            const tournament = await TournamentDetails.findByIdAndDelete(tournamentId);
            if (!tournament) {
                return res.status(404).json({       
                    success: false,             
                    message: 'Tournament not found'
                });
            }

            await redisService.clearByPattern('cache:*/tournaments*');
            res.json({  
                success: true,
                message: 'Tournament deleted successfully'
            });
        } catch (error) {
            res.status(400).json({  
                success: false, 
                message: error.message
            });
        }
    },
    async deleteMatch(req, res) {
        try {
            const { matchId } = req.params;
            const match = await MatchDetails.findByIdAndDelete(matchId);
            if (!match) {
                return res.status(404).json({
                    success: false,
                    message: 'Match not found'
                });
            }

            await redisService.clearByPattern('cache:*/matches*');  
            res.json({
                success: true,
                message: 'Match deleted successfully'
            });
        } catch (error) {
            res.status(400).json({  
                success: false,
                message: error.message
            });
        }
    },
    async deleteTeam(req, res) {
        try {
            const { teamId } = req.params;
            const team = await TeamDetail.findByIdAndDelete(teamId);
            if (!team) {
                return res.status(404).json({
                    success: false,
                    message: 'Team not found'
                });
            }

            await redisService.clearByPattern('cache:*/teams*');    
            res.json({
                success: true,
                message: 'Team deleted successfully'
            });
        } catch (error) {
            res.status(400).json({  
                success: false,
                message: error.message
            });
        }
    },  
    async deletePlayer(req, res) {
        try {
            const { playerId } = req.params;
            const player = await PlayerDetails.findByIdAndDelete(playerId);
            if (!player) {
                return res.status(404).json({   
                    success: false,
                    message: 'Player not found'
                });
            }

            await redisService.clearByPattern('cache:*/players*');  
            res.json({
                success: true,
                message: 'Player deleted successfully'
            });
        } catch (error) {
            res.status(400).json({    
                success: false,
                message: error.message
            });
        }
    } 
    
    
    
    
};

async function updateTeamRanking(tournamentId) {
    try {
        // Get all teams in the tournament
        const teams = await TeamDetail.find({
            'tournamentStats.tournamentId': tournamentId
        });

        // Sort teams by points and kills for the tournament
        const sortedTeams = teams.sort((a, b) => {
            const statA = a.tournamentStats.find(
                stat => stat.tournamentId.toString() === tournamentId
            );
            const statB = b.tournamentStats.find(
                stat => stat.tournamentId.toString() === tournamentId
            );

            if (statA.totalPoints === statB.totalPoints) {
                return statB.totalKills - statA.totalKills;
            }
            return statB.totalPoints - statA.totalPoints;
        });

        // Update team ranks
        for (let i = 0; i < sortedTeams.length; i++) {
            const team = sortedTeams[i];
            team.teamRank = i + 1;
            await team.save();
        }
    } catch (error) {
        console.error('Error updating team rankings:', error);
        throw error;
    }
}

function calculatePoints(position) {
    // Implement your point calculation logic here
    const pointsTable = {
        1: 10,
        2: 6,
        3: 5,
        4: 4,
        5: 3,
        6: 2,
        7: 1,
        8: 1,
    };
    return pointsTable[position] || 0;
}

async function updateTeamStats(teamId, matchId, playerStats) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const team = await TeamDetail.findById(teamId).session(session);
        if (!team) {
            throw new Error('Team not found');
        }

        const match = await MatchDetails.findById(matchId).session(session);
        if (!match) {
            throw new Error('Match not found');
        }

        // Calculate team performance in the match
        const teamMatchStats = {
            matchId,
            totalKills: playerStats.reduce((sum, stat) => sum + stat.kills, 0),
            totalDamage: playerStats.reduce((sum, stat) => sum + stat.damage, 0),
            position: match.teamPositions.find(tp => tp.teamId.toString() === teamId)?.position || 0,
            playerPerformances: playerStats.map(stat => ({
                playerId: stat.playerId,
                kills: stat.kills,
                damage: stat.damage
            }))
        };

        // Update team's match history
        const matchIndex = team.matches.findIndex(m => m.matchId.toString() === matchId);
        if (matchIndex === -1) {
            team.matches.push(teamMatchStats);
        } else {
            team.matches[matchIndex] = teamMatchStats;
        }

        // Update team's overall stats
        team.totalKills = team.matches.reduce((sum, m) => sum + m.totalKills, 0);
        team.totalPoints = team.matches.reduce((sum, m) => sum + calculatePoints(m.position), 0);

        await team.save({ session });
        await session.commitTransaction();
        return team;
    } catch (error) {
        await session.abortTransaction();
        throw error;
    } finally {
        session.endSession();
    }
}

export default adminController;  





