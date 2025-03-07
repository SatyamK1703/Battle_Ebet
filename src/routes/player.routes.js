import express from 'express';
import playerController from '../controllers/player.controller.js';

const router = express.Router();

router.get('/', playerController.getAllPlayers);
router.get('/:id', playerController.getPlayerById);
router.get('/:id/statistics', playerController.getPlayerStatistics);
router.get('/:id/matches', playerController.getPlayerMatches);

export default router; 