import express from 'express';
import { validate } from '../middlewares/validate.middleware.js';
import { adminController } from '../controllers/admin.controller.js';
import { cacheMiddleware } from '../middlewares/cache.middleware.js';
import { adminAuth } from '../middleware/auth.middleware.js';
import { 
    createTournament,
    updateTournamentStatus,
    createMatch,
    updateMatchStatus,
    updateMVP,
    disqualifyTeam,
    updateMatchAndAddEliminations,
} from '../controllers/admin.controller.js';

const router = express.Router();


// Tournament Management Routes
router.post('/tournaments', adminAuth, validate, createTournament);
router.get('/tournaments', adminAuth, cacheMiddleware(1800), adminController.getAllTournaments);
router.get('/tournaments/:id', adminAuth, cacheMiddleware(1800), adminController.getTournamentById);
router.put('/tournaments/:id', adminAuth, validate, adminController.updateTournament);
router.delete('/tournaments/:id', adminAuth, adminController.deleteTournament);
router.post('/tournament/create', adminAuth, createTournament);
router.put('/tournament/:tournamentId/team/:teamId/disqualify', adminAuth, disqualifyTeam);

// Match Management Routes
router.post('/matches/create', adminAuth, validate, adminController.createMatch);
router.get('/matches', adminAuth, cacheMiddleware(1800), adminController.getAllMatches);
router.get('/matches/:id', adminAuth, cacheMiddleware(1800), adminController.getMatchById);
router.delete('/matches/:id', adminAuth, adminController.deleteMatch);
router.post('/match/create', adminAuth, createMatch);
router.put('/match/:matchId/status', adminAuth, updateMatchStatus);
router.put('/match/:matchId/eliminations', adminAuth, adminController.updateMatchAndAddEliminations);

// Team Management Routes
router.post('/teams', adminAuth, validate, adminController.createTeam);
router.get('/teams', adminAuth, cacheMiddleware(1800), adminController.getAllTeams);
router.get('/teams/:id', adminAuth, cacheMiddleware(1800), adminController.getTeamById);
router.delete('/teams/:id', adminAuth, adminController.deleteTeam);

// Player Management Routes
router.post('/players', adminAuth, validate, adminController.createPlayer);
router.get('/players', adminAuth, cacheMiddleware(1800), adminController.getAllPlayers);
router.get('/players/:id', adminAuth, cacheMiddleware(1800), adminController.getPlayerById);
router.delete('/players/:id', adminAuth, adminController.deletePlayer);

// Analytics Routes
router.get('/analytics/overview', adminAuth, cacheMiddleware(300), adminController.getOverviewStats);
router.get('/analytics/tournaments', adminAuth, cacheMiddleware(300), adminController.getTournamentStats);
router.get('/analytics/teams', adminAuth, cacheMiddleware(300), adminController.getTeamStats);
router.get('/analytics/players', adminAuth, cacheMiddleware(300), adminController.getPlayerStats);

// User Management Routes
router.get('/users', adminAuth, cacheMiddleware(1800), adminController.getAllUsers);
router.get('/users/:id', adminAuth, cacheMiddleware(1800), adminController.getUserById);
router.put('/users/:id/status', adminAuth, validate, adminController.updateUserStatus);
router.delete('/users/:id', adminAuth, adminController.deleteUser);

// Wallet Management Routes
router.get('/wallets', adminAuth, cacheMiddleware(300), adminController.getAllWallets);
router.get('/wallets/:userId', adminAuth, cacheMiddleware(300), adminController.getWalletByUserId);
router.post('/wallets/:userId/credit', adminAuth, validate, adminController.creditWallet);
router.post('/wallets/:userId/debit', adminAuth, validate, adminController.debitWallet);

// Settings Routes
router.get('/settings', adminAuth, cacheMiddleware(3600), adminController.getSettings);
router.put('/settings', adminAuth, validate, adminController.updateSettings);

// New admin routes

export default router;
