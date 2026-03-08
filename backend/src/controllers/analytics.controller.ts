import { Response } from 'express';
import prisma from '../lib/prisma';
import { AuthRequest } from '../middleware/auth.middleware';

export const getQuizAnalytics = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const quiz = await prisma.quiz.findUnique({
      where: { id: req.params.quizId },
      include: {
        questions: {
          include: {
            options: true,
            playerAnswers: {
              include: { selectedOption: true },
            },
          },
          orderBy: { orderIndex: 'asc' },
        },
        sessions: {
          include: {
            players: { orderBy: { score: 'desc' } },
            _count: { select: { players: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!quiz || quiz.hostId !== req.userId) {
      res.status(404).json({ message: 'Quiz not found' });
      return;
    }

    const analytics = {
      quiz: { id: quiz.id, title: quiz.title },
      totalSessions: quiz.sessions.length,
      totalPlayers: quiz.sessions.reduce((sum, s) => sum + s._count.players, 0),
      questions: quiz.questions.map((q) => {
        const totalAnswers = q.playerAnswers.length;
        const correctAnswers = q.playerAnswers.filter((a) => a.isCorrect).length;
        const optionCounts = q.options.map((opt) => ({
          option: opt.text,
          color: opt.color,
          isCorrect: opt.isCorrect,
          count: q.playerAnswers.filter((a) => a.selectedOptionId === opt.id).length,
        }));
        return {
          question: q.text,
          totalAnswers,
          correctRate: totalAnswers ? Math.round((correctAnswers / totalAnswers) * 100) : 0,
          avgTimeTaken: totalAnswers
            ? Math.round(q.playerAnswers.reduce((s, a) => s + a.timeTaken, 0) / totalAnswers)
            : 0,
          optionCounts,
        };
      }),
      recentSessions: quiz.sessions.slice(0, 5).map((s) => ({
        id: s.id,
        pin: s.pin,
        status: s.status,
        playerCount: s._count.players,
        topPlayer: s.players[0]?.nickname || null,
        topScore: s.players[0]?.score || 0,
        startedAt: s.startedAt,
        endedAt: s.endedAt,
      })),
    };

    res.json(analytics);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err });
  }
};

export const getSessionAnalytics = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const session = await prisma.gameSession.findUnique({
      where: { id: req.params.sessionId },
      include: {
        quiz: { select: { title: true } },
        players: {
          orderBy: { score: 'desc' },
          include: {
            answers: {
              include: { question: { select: { text: true } }, selectedOption: { select: { text: true } } },
            },
          },
        },
      },
    });

    if (!session || session.hostId !== req.userId) {
      res.status(404).json({ message: 'Session not found' });
      return;
    }

    res.json({
      sessionId: session.id,
      pin: session.pin,
      quizTitle: session.quiz.title,
      status: session.status,
      startedAt: session.startedAt,
      endedAt: session.endedAt,
      players: session.players.map((p, idx) => ({
        rank: idx + 1,
        nickname: p.nickname,
        score: p.score,
        correctAnswers: p.answers.filter((a) => a.isCorrect).length,
        totalAnswers: p.answers.length,
        accuracy: p.answers.length
          ? Math.round((p.answers.filter((a) => a.isCorrect).length / p.answers.length) * 100)
          : 0,
      })),
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err });
  }
};
