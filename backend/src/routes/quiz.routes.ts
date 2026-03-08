import { Router } from 'express';
import {
  createQuiz,
  getQuizzes,
  getQuiz,
  updateQuiz,
  deleteQuiz,
  getMyQuizzes,
} from '../controllers/quiz.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.get('/', getQuizzes);
router.get('/my', authenticate, getMyQuizzes);
router.get('/:id', getQuiz);
router.post('/', authenticate, createQuiz);
router.put('/:id', authenticate, updateQuiz);
router.delete('/:id', authenticate, deleteQuiz);

export default router;
