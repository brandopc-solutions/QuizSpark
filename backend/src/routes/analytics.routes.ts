import { Router } from 'express';
import { getQuizAnalytics, getSessionAnalytics } from '../controllers/analytics.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.get('/quiz/:quizId', authenticate, getQuizAnalytics);
router.get('/session/:sessionId', authenticate, getSessionAnalytics);

export default router;
