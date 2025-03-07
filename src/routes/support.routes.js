import express from 'express';
import { auth } from '../middlewares/auth.middleware.js';
import supportController from '../controllers/support.controller.js';

const router = express.Router();

router.use(auth);

router.post('/ticket', supportController.createTicket);
router.get('/tickets', supportController.getTickets);
router.get('/ticket/:id', supportController.getTicketById);
router.post('/ticket/:id/message', supportController.addMessage);
router.get('/faqs', supportController.getFAQs);

export default router; 