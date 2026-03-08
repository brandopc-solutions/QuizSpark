import { Response } from 'express';
import prisma from '../lib/prisma';
import { AuthRequest } from '../middleware/auth.middleware';
import { generatePin } from '../utils/pin.util';

export const createSession = async (req: AuthRequest, res: Response): Promise<void> => {
  const { quizId } = req.body;
  if (!quizId) {
    res.status(400).json({ message: 'quizId is required' });
    return;
  }
  try {
    const quiz = await prisma.quiz.findUnique({ where: { id: quizId } });
    if (!quiz) {
      res.status(404).json({ message: 'Quiz not found' });
      return;
    }
    if (quiz.hostId !== req.userId) {
      res.status(403).json({ message: 'Not authorized' });
      return;
    }
    let pin = generatePin();
    // Ensure unique pin
    while (await prisma.gameSession.findUnique({ where: { pin } })) {
      pin = generatePin();
    }
    const session = await prisma.gameSession.create({
      data: {
        pin,
        quizId,
        hostId: req.userId!,
      },
      include: { quiz: { include: { questions: { include: { options: true }, orderBy: { orderIndex: 'asc' } } } } },
    });
    res.status(201).json(session);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err });
  }
};

export const getSessions = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const sessions = await prisma.gameSession.findMany({
      where: { hostId: req.userId },
      include: {
        quiz: { select: { title: true } },
        _count: { select: { players: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(sessions);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err });
  }
};

export const getSession = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const session = await prisma.gameSession.findUnique({
      where: { id: req.params.id },
      include: {
        quiz: true,
        players: { orderBy: { score: 'desc' } },
      },
    });
    if (!session || session.hostId !== req.userId) {
      res.status(404).json({ message: 'Session not found' });
      return;
    }
    res.json(session);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err });
  }
};
