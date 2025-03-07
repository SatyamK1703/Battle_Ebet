import Match from '../models/Match.model.js';
import Bet from '../models/Bet.model.js';

const matchController = {
    async getAllMatches(req, res) {
        try {
            const matches = await Match.find()
                .populate('teams.team', 'name logo')
                .sort({ scheduledTime: -1 });

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
    },

    async getLiveMatches(req, res) {
        try {
            const matches = await Match.find({
                status: 'live'
            })
            .populate('teams.team', 'name logo')
            .sort({ scheduledTime: -1 });

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
    },

    async getMatchById(req, res) {
        try {
            const match = await Match.findById(req.params.id)
                .populate('teams.team', 'name logo')
                .populate('tournament', 'name');

            if (!match) {
                return res.status(404).json({
                    success: false,
                    message: 'Match not found'
                });
            }

            res.json({
                success: true,
                data: match
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    },

    async getMatchOdds(req, res) {
        try {
            const match = await Match.findById(req.params.id)
                .select('odds teams.team');

            if (!match) {
                return res.status(404).json({
                    success: false,
                    message: 'Match not found'
                });
            }

            res.json({
                success: true,
                data: match.odds
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }
};

export default matchController; 