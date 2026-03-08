import { Router } from 'express';
import { createSession, getSessions, getSession } from '../controllers/session.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.post('/', authenticate, createSession);
router.get('/', authenticate, getSessions);
router.get('/:id', authenticate, getSession);

export default router;
