import express from 'express';
import { auth } from '../middlewares/auth.middleware.js';
import tournamentController from '../controllers/tournament.controller.js';

const router = express.Router();

router.get('/', tournamentController.getAllTournaments);
router.get('/upcoming', tournamentController.getUpcomingTournaments);
router.get('/live', tournamentController.getLiveTournaments);
router.get('/completed', tournamentController.getCompletedTournaments);
router.get('/:id', tournamentController.getTournamentById);
router.get('/:id/matches', tournamentController.getTournamentMatches);
router.get('/:id/leaderboard', tournamentController.getTournamentLeaderboard);

export default router; 