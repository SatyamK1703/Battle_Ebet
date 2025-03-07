import Tournament from '../models/Tournament.model.js';
import Match from '../models/Match.model.js';

const tournamentController = {
    async getAllTournaments(req, res) {
        try {
            const tournaments = await Tournament.find()
                .sort({ startDate: -1 });

            res.json({
                success: true,
                data: tournaments
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    },

    async getUpcomingTournaments(req, res) {
        try {
            const tournaments = await Tournament.find({
                startDate: { $gt: new Date() }
            }).sort({ startDate: 1 });

            res.json({
                success: true,
                data: tournaments
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    },

    async getLiveTournaments(req, res) {
        try {
            const tournaments = await Tournament.find({
                status: 'ongoing'
            }).sort({ startDate: -1 });

            res.json({
                success: true,
                data: tournaments
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    },

    async getTournamentById(req, res) {
        try {
            const tournament = await Tournament.findById(req.params.id)
                .populate('teams', 'name logo');

            if (!tournament) {
                return res.status(404).json({
                    success: false,
                    message: 'Tournament not found'
                });
            }

            res.json({
                success: true,
                data: tournament
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    },

    async getTournamentMatches(req, res) {
        try {
            const matches = await Match.find({
                tournamentId: req.params.id
            })
            .populate('teams.team', 'name logo')
            .sort({ scheduledTime: 1 });

            res.json({
                success: true,
                data: matches
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }
};

export default tournamentController; 