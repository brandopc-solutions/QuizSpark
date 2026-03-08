import { Request, Response } from 'express';
import prisma from '../lib/prisma';
import { AuthRequest } from '../middleware/auth.middleware';

// ── helpers ───────────────────────────────────────────────────────────────────

type RoundInput = { name?: string; questions: QuestionInput[] };
type QuestionInput = {
  text: string; imageUrl?: string; timeLimit?: number; points?: number;
  options: { text: string; isCorrect: boolean; color?: string }[];
};

const toRoundsData = (rounds?: RoundInput[], questions?: QuestionInput[]): RoundInput[] => {
  if (rounds?.length) return rounds;
  return [{ name: 'Round 1', questions: questions ?? [] }];
};

const INCLUDE_FULL = {
  rounds: {
    orderBy: { orderIndex: 'asc' as const },
    include: { questions: { include: { options: true }, orderBy: { orderIndex: 'asc' as const } } },
  },
  questions: { include: { options: true }, orderBy: { orderIndex: 'asc' as const } },
};

async function buildRounds(tx: any, quizId: string, roundsData: RoundInput[]): Promise<void> {
  let globalIdx = 0;
  for (let ri = 0; ri < roundsData.length; ri++) {
    const r = roundsData[ri];
    const round = await tx.round.create({
      data: { name: r.name || `Round ${ri + 1}`, orderIndex: ri, quizId },
    });
    for (const q of r.questions ?? []) {
      await tx.question.create({
        data: {
          text: q.text, imageUrl: q.imageUrl,
          timeLimit: q.timeLimit || 20, points: q.points || 1000,
          orderIndex: globalIdx++, quizId, roundId: round.id,
          options: {
            create: (q.options ?? []).map((o: any) => ({
              text: o.text, isCorrect: o.isCorrect, color: o.color || '#e21b3c',
            })),
          },
        },
      });
    }
  }
}

// ── Controllers ───────────────────────────────────────────────────────────────

export const createQuiz = async (req: AuthRequest, res: Response): Promise<void> => {
  const { title, description, coverImage, isPublic, rounds, questions } = req.body;
  if (!title) { res.status(400).json({ message: 'Title is required' }); return; }
  const roundsData = toRoundsData(rounds, questions);
  try {
    const quiz = await prisma.$transaction(async (tx) => {
      const newQuiz = await tx.quiz.create({
        data: { title, description, coverImage, isPublic: isPublic ?? true, hostId: req.userId! },
      });
      await buildRounds(tx, newQuiz.id, roundsData);
      return tx.quiz.findUnique({ where: { id: newQuiz.id }, include: INCLUDE_FULL });
    });
    res.status(201).json(quiz);
  } catch (err) { res.status(500).json({ message: 'Server error', error: err }); }
};

export const getQuizzes = async (_req: Request, res: Response): Promise<void> => {
  try {
    const quizzes = await prisma.quiz.findMany({
      where: { isPublic: true },
      include: { host: { select: { username: true } }, _count: { select: { questions: true, rounds: true } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json(quizzes);
  } catch (err) { res.status(500).json({ message: 'Server error', error: err }); }
};

export const getMyQuizzes = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const quizzes = await prisma.quiz.findMany({
      where: { hostId: req.userId },
      include: { _count: { select: { questions: true, sessions: true, rounds: true } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json(quizzes);
  } catch (err) { res.status(500).json({ message: 'Server error', error: err }); }
};

export const getQuiz = async (req: Request, res: Response): Promise<void> => {
  try {
    const quiz = await prisma.quiz.findUnique({
      where: { id: req.params.id },
      include: { host: { select: { username: true } }, ...INCLUDE_FULL },
    });
    if (!quiz) { res.status(404).json({ message: 'Quiz not found' }); return; }
    res.json(quiz);
  } catch (err) { res.status(500).json({ message: 'Server error', error: err }); }
};

export const updateQuiz = async (req: AuthRequest, res: Response): Promise<void> => {
  const { title, description, coverImage, isPublic, rounds, questions } = req.body;
  const roundsData = toRoundsData(rounds, questions);
  try {
    const quiz = await prisma.quiz.findUnique({ where: { id: req.params.id } });
    if (!quiz || quiz.hostId !== req.userId) { res.status(403).json({ message: 'Not authorized' }); return; }
    const updated = await prisma.$transaction(async (tx) => {
      await tx.round.deleteMany({ where: { quizId: req.params.id } });
      await tx.question.deleteMany({ where: { quizId: req.params.id } });
      await tx.quiz.update({ where: { id: req.params.id }, data: { title, description, coverImage, isPublic } });
      await buildRounds(tx, req.params.id, roundsData);
      return tx.quiz.findUnique({ where: { id: req.params.id }, include: INCLUDE_FULL });
    });
    res.json(updated);
  } catch (err) { res.status(500).json({ message: 'Server error', error: err }); }
};

export const deleteQuiz = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const quiz = await prisma.quiz.findUnique({ where: { id: req.params.id } });
    if (!quiz || quiz.hostId !== req.userId) { res.status(403).json({ message: 'Not authorized' }); return; }
    await prisma.quiz.delete({ where: { id: req.params.id } });
    res.json({ message: 'Quiz deleted' });
  } catch (err) { res.status(500).json({ message: 'Server error', error: err }); }
};
