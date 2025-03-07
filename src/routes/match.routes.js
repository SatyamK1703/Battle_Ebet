import express from 'express';
import { auth } from '../middlewares/auth.middleware.js';
import matchController from '../controllers/match.controller.js';

const router = express.Router();

router.get('/', matchController.getAllMatches);
router.get('/live', matchController.getLiveMatches);
router.get('/upcoming', matchController.getUpcomingMatches);
router.get('/:id', matchController.getMatchById);
router.get('/:id/odds', matchController.getMatchOdds);
router.get('/:id/statistics', matchController.getMatchStatistics);
router.get('/:id/stream', matchController.getMatchStream);

export default router; 