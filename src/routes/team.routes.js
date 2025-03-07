import express from 'express';
import teamController from '../controllers/team.controller.js';

const router = express.Router();

router.get('/', teamController.getAllTeams);
router.get('/:id', teamController.getTeamById);
router.get('/:id/matches', teamController.getTeamMatches);
router.get('/:id/statistics', teamController.getTeamStatistics);
router.get('/:id/players', teamController.getTeamPlayers);

export default router; 