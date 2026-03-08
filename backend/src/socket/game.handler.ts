import { Server, Socket } from 'socket.io';
import prisma from '../lib/prisma';

interface RoundInfo { id: string; name: string; questions: any[]; }

interface GameRoom {
  sessionId: string;
  quizId: string;
  hostSocketId: string;
  rounds: RoundInfo[];
  currentRoundIndex: number;
  currentQuestionIndexInRound: number;  // -1 before first question of a round
  totalQuestions: number;
  globalQuestionIndex: number;
  phase: 'question' | 'question-end' | 'round-end';
  questionStartTime?: number;
  timerHandle?: ReturnType<typeof setTimeout>;
}

const rooms = new Map<string, GameRoom>();

// ── Load rounds from a session (handles quizzes with or without rounds) ───────
function extractRounds(session: any): RoundInfo[] {
  const quiz = session.quiz;
  if (quiz.rounds?.length) {
    return [...quiz.rounds]
      .sort((a: any, b: any) => a.orderIndex - b.orderIndex)
      .map((r: any) => ({
        id: r.id,
        name: r.name,
        questions: [...r.questions].sort((a: any, b: any) => a.orderIndex - b.orderIndex),
      }));
  }
  // Fallback: all questions in one default round
  const allQ = [...(quiz.questions ?? [])].sort((a: any, b: any) => a.orderIndex - b.orderIndex);
  return [{ id: 'default', name: 'Round 1', questions: allQ }];
}

export const registerGameHandlers = (io: Server): void => {
  io.on('connection', (socket: Socket) => {

    // ─── HOST: Join ───────────────────────────────────────────────────────────
    socket.on('host:join', async ({ pin }: { pin: string }) => {
      const session = await prisma.gameSession.findUnique({
        where: { pin },
        include: {
          quiz: {
            include: {
              rounds: { orderBy: { orderIndex: 'asc' }, include: { questions: { include: { options: true }, orderBy: { orderIndex: 'asc' } } } },
              questions: { include: { options: true }, orderBy: { orderIndex: 'asc' } },
            },
          },
        },
      });
      if (!session) return socket.emit('error', { message: 'Session not found' });
      socket.join(pin);
      const rounds = extractRounds(session);
      const totalQuestions = rounds.reduce((sum, r) => sum + r.questions.length, 0);
      rooms.set(pin, {
        sessionId: session.id,
        quizId: session.quizId,
        hostSocketId: socket.id,
        rounds,
        currentRoundIndex: 0,
        currentQuestionIndexInRound: -1,
        totalQuestions,
        globalQuestionIndex: -1,
        phase: 'question',
      });
      socket.emit('host:joined', {
        session,
        totalQuestions,
        rounds: rounds.map((r) => ({ name: r.name, questionCount: r.questions.length })),
      });
    });

    // ─── PLAYER: Join lobby ───────────────────────────────────────────────────
    socket.on('player:join', async ({ pin, nickname }: { pin: string; nickname: string }) => {
      const session = await prisma.gameSession.findUnique({ where: { pin } });
      if (!session) return socket.emit('error', { message: 'Game not found. Check the PIN.' });
      if (session.status !== 'WAITING') return socket.emit('error', { message: 'Game already started' });
      try {
        const player = await prisma.player.create({ data: { nickname, sessionId: session.id } });
        socket.join(pin);
        socket.data.pin = pin;
        socket.data.playerId = player.id;
        socket.data.nickname = nickname;
        const players = await prisma.player.findMany({ where: { sessionId: session.id } });
        io.to(pin).emit('lobby:update', { players: players.map((p) => ({ id: p.id, nickname: p.nickname })) });
        socket.emit('player:joined', { playerId: player.id, nickname });
      } catch {
        socket.emit('error', { message: 'Nickname already taken in this game' });
      }
    });

    // ─── HOST: Start game ─────────────────────────────────────────────────────
    socket.on('host:start', async ({ pin }: { pin: string }) => {
      const room = rooms.get(pin);
      if (!room || room.hostSocketId !== socket.id) return;
      await prisma.gameSession.update({
        where: { id: room.sessionId },
        data: { status: 'IN_PROGRESS', startedAt: new Date(), currentQuestionIndex: -1 },
      });
      io.to(pin).emit('game:started');
      emitRoundStart(io, pin, room);
      sendNextQuestion(io, pin, room);
    });

    // ─── HOST: Next (question or round) ───────────────────────────────────────
    socket.on('host:next', async ({ pin }: { pin: string }) => {
      const room = rooms.get(pin);
      if (!room || room.hostSocketId !== socket.id) return;

      if (room.phase === 'round-end') {
        // Advance to next round
        room.currentRoundIndex++;
        room.currentQuestionIndexInRound = -1;
        if (room.currentRoundIndex >= room.rounds.length) {
          await endGame(io, pin, room);
        } else {
          emitRoundStart(io, pin, room);
          sendNextQuestion(io, pin, room);
        }
      } else {
        // Within round: advance to next question
        const round = room.rounds[room.currentRoundIndex];
        if (room.currentQuestionIndexInRound + 1 >= round.questions.length) {
          // Last question of this round
          if (room.currentRoundIndex + 1 >= room.rounds.length) {
            await endGame(io, pin, room);
          } else {
            await emitRoundEnd(io, pin, room);
          }
        } else {
          sendNextQuestion(io, pin, room);
        }
      }
    });

    // ─── PLAYER: Submit answer ────────────────────────────────────────────────
    socket.on('player:answer', async ({ optionId }: { optionId: string | null }) => {
      const pin: string = socket.data.pin;
      const playerId: string = socket.data.playerId;
      if (!pin || !playerId) return;
      const room = rooms.get(pin);
      if (!room || room.phase !== 'question') return;

      const round = room.rounds[room.currentRoundIndex];
      const question = round?.questions[room.currentQuestionIndexInRound];
      if (!question) return;

      const existingAnswer = await prisma.playerAnswer.findFirst({
        where: { playerId, questionId: question.id, sessionId: room.sessionId },
      });
      if (existingAnswer) return;

      const timeTaken = room.questionStartTime
        ? (Date.now() - room.questionStartTime) / 1000
        : question.timeLimit;

      let isCorrect = false;
      let pointsAwarded = 0;
      if (optionId) {
        const option = question.options.find((o: any) => o.id === optionId);
        isCorrect = option?.isCorrect || false;
        if (isCorrect) {
          const timeBonus = Math.max(0, 1 - timeTaken / question.timeLimit);
          pointsAwarded = Math.round(question.points * (0.5 + 0.5 * timeBonus));
        }
      }

      await prisma.playerAnswer.create({
        data: { playerId, questionId: question.id, sessionId: room.sessionId, selectedOptionId: optionId, isCorrect, pointsAwarded, timeTaken },
      });
      if (isCorrect) {
        await prisma.player.update({ where: { id: playerId }, data: { score: { increment: pointsAwarded } } });
      }

      socket.emit('answer:received', { isCorrect, pointsAwarded });

      const answeredCount = await prisma.playerAnswer.count({ where: { sessionId: room.sessionId, questionId: question.id } });
      const totalPlayers = await prisma.player.count({ where: { sessionId: room.sessionId } });
      io.to(room.hostSocketId).emit('host:answer_count', { answeredCount, totalPlayers });

      if (answeredCount >= totalPlayers) {
        const handle = room.timerHandle;
        if (handle) clearTimeout(handle);
        room.timerHandle = undefined;
        setTimeout(() => showQuestionEnd(io, pin, room), 500);
      }
    });

    socket.on('disconnect', async () => {
      const pin: string = socket.data.pin;
      if (pin) io.to(pin).emit('player:left', { nickname: socket.data.nickname });
    });
  });
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function emitRoundStart(io: Server, pin: string, room: GameRoom): void {
  const round = room.rounds[room.currentRoundIndex];
  io.to(pin).emit('round:start', {
    roundIndex: room.currentRoundIndex,
    roundName: round.name,
    totalRounds: room.rounds.length,
    questionsInRound: round.questions.length,
    totalQuestions: room.totalQuestions,
  });
}

async function emitRoundEnd(io: Server, pin: string, room: GameRoom): Promise<void> {
  room.phase = 'round-end';
  const leaderboard = await prisma.player.findMany({
    where: { sessionId: room.sessionId },
    orderBy: { score: 'desc' },
    take: 10,
  });
  io.to(pin).emit('round:end', {
    roundIndex: room.currentRoundIndex,
    roundName: room.rounds[room.currentRoundIndex].name,
    isLastRound: room.currentRoundIndex + 1 >= room.rounds.length,
    leaderboard: leaderboard.map((p, i) => ({ rank: i + 1, nickname: p.nickname, score: p.score })),
  });
}

async function sendNextQuestion(io: Server, pin: string, room: GameRoom): Promise<void> {
  room.currentQuestionIndexInRound++;
  room.globalQuestionIndex++;
  const round = room.rounds[room.currentRoundIndex];
  const question = round?.questions[room.currentQuestionIndexInRound];
  if (!question) { await endGame(io, pin, room); return; }

  room.phase = 'question';
  room.questionStartTime = Date.now();

  await prisma.gameSession.update({
    where: { id: room.sessionId },
    data: { currentQuestionIndex: room.globalQuestionIndex },
  });

  // Send options WITHOUT isCorrect
  const safeOptions = question.options.map((o: any) => ({ id: o.id, text: o.text, color: o.color }));
  io.to(pin).emit('question:start', {
    questionIndex: room.globalQuestionIndex,
    total: room.totalQuestions,
    roundIndex: room.currentRoundIndex,
    roundName: round.name,
    questionIndexInRound: room.currentQuestionIndexInRound,
    totalInRound: round.questions.length,
    text: question.text,
    imageUrl: question.imageUrl,
    timeLimit: question.timeLimit,
    points: question.points,
    options: safeOptions,
  });

  const handle = setTimeout(async () => {
    await showQuestionEnd(io, pin, room);
  }, question.timeLimit * 1000 + 1000);
  room.timerHandle = handle;
}

async function showQuestionEnd(io: Server, pin: string, room: GameRoom): Promise<void> {
  if (room.phase !== 'question') return;
  room.phase = 'question-end';
  if (room.timerHandle) { clearTimeout(room.timerHandle); room.timerHandle = undefined; }

  const round = room.rounds[room.currentRoundIndex];
  const question = round.questions[room.currentQuestionIndexInRound];
  const correctOptions = question.options.filter((o: any) => o.isCorrect);

  const leaderboard = await prisma.player.findMany({
    where: { sessionId: room.sessionId }, orderBy: { score: 'desc' }, take: 10,
  });
  const questionStats = await prisma.playerAnswer.groupBy({
    by: ['selectedOptionId'],
    where: { sessionId: room.sessionId, questionId: question.id },
    _count: { selectedOptionId: true },
  });

  const isLastInRound = room.currentQuestionIndexInRound + 1 >= round.questions.length;
  const isLastRound = room.currentRoundIndex + 1 >= room.rounds.length;

  io.to(pin).emit('question:end', {
    correctOptionIds: correctOptions.map((o: any) => o.id),
    leaderboard: leaderboard.map((p, i) => ({ rank: i + 1, nickname: p.nickname, score: p.score })),
    questionStats,
    isLastInRound,
    isLastRound,
    roundIndex: room.currentRoundIndex,
    roundName: round.name,
  });
}

async function endGame(io: Server, pin: string, room: GameRoom): Promise<void> {
  await prisma.gameSession.update({ where: { id: room.sessionId }, data: { status: 'FINISHED', endedAt: new Date() } });
  const finalLeaderboard = await prisma.player.findMany({ where: { sessionId: room.sessionId }, orderBy: { score: 'desc' } });
  await Promise.all(finalLeaderboard.map((p, i) => prisma.player.update({ where: { id: p.id }, data: { rank: i + 1 } })));
  io.to(pin).emit('game:ended', {
    leaderboard: finalLeaderboard.map((p, i) => ({ rank: i + 1, nickname: p.nickname, score: p.score })),
  });
  rooms.delete(pin);
}
