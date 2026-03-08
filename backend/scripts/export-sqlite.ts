/**
 * Run this script BEFORE switching the Prisma provider to PostgreSQL.
 * It dumps all SQLite data to migration-data.json at project root.
 *
 *   cd backend
 *   npx ts-node scripts/export-sqlite.ts
 */

import { PrismaClient } from '@prisma/client';
import { writeFileSync } from 'fs';
import { join } from 'path';

const prisma = new PrismaClient();

async function main() {
  console.log('📦 Exporting SQLite data…');

  const [
    users,
    otpCodes,
    quizzes,
    rounds,
    questions,
    answerOptions,
    gameSessions,
    players,
    playerAnswers,
  ] = await Promise.all([
    prisma.user.findMany(),
    prisma.otpCode.findMany(),
    prisma.quiz.findMany(),
    prisma.round.findMany(),
    prisma.question.findMany(),
    prisma.answerOption.findMany(),
    prisma.gameSession.findMany(),
    prisma.player.findMany(),
    prisma.playerAnswer.findMany(),
  ]);

  const data = {
    users,
    otpCodes,
    quizzes,
    rounds,
    questions,
    answerOptions,
    gameSessions,
    players,
    playerAnswers,
  };

  const outputPath = join(__dirname, '../../migration-data.json');
  writeFileSync(outputPath, JSON.stringify(data, null, 2));

  console.log('✅ Export complete → migration-data.json');
  console.log(`   Users:          ${users.length}`);
  console.log(`   Quizzes:        ${quizzes.length}`);
  console.log(`   Rounds:         ${rounds.length}`);
  console.log(`   Questions:      ${questions.length}`);
  console.log(`   Answer options: ${answerOptions.length}`);
  console.log(`   Game sessions:  ${gameSessions.length}`);
  console.log(`   Players:        ${players.length}`);
  console.log(`   Player answers: ${playerAnswers.length}`);
}

main()
  .catch((e) => { console.error('❌ Export failed:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
