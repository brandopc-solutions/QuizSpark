/**
 * Run this script AFTER:
 *   1. schema.prisma has been updated to provider = "postgresql"
 *   2. npx prisma generate (regenerates client for PostgreSQL)
 *   3. npx prisma db push (creates tables in PostgreSQL)
 *   4. DATABASE_URL in .env points to your PostgreSQL instance
 *
 *   cd backend
 *   npx ts-node scripts/import-postgres.ts
 */

import { PrismaClient } from '@prisma/client';
import { readFileSync } from 'fs';
import { join } from 'path';

const prisma = new PrismaClient();

// Convert ISO date strings back to Date objects for Prisma
function toDates<T extends Record<string, any>>(rows: T[]): T[] {
  return rows.map((row) => {
    const out: Record<string, any> = {};
    for (const [k, v] of Object.entries(row)) {
      // ISO 8601 strings from JSON.stringify of Date values
      out[k] = typeof v === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(v) ? new Date(v) : v;
    }
    return out as T;
  });
}

async function main() {
  const dataPath = join(__dirname, '../../migration-data.json');
  const raw = JSON.parse(readFileSync(dataPath, 'utf-8'));

  console.log('📥 Importing data into PostgreSQL…');

  // Insert in FK dependency order (cast to any to avoid Prisma strict input typing)
  const db = prisma as any;
  await db.user.createMany({ data: toDates(raw.users), skipDuplicates: true });
  console.log(`   ✅ Users:          ${raw.users.length}`);

  await db.quiz.createMany({ data: toDates(raw.quizzes), skipDuplicates: true });
  console.log(`   ✅ Quizzes:        ${raw.quizzes.length}`);

  await db.round.createMany({ data: toDates(raw.rounds), skipDuplicates: true });
  console.log(`   ✅ Rounds:         ${raw.rounds.length}`);

  await db.question.createMany({ data: toDates(raw.questions), skipDuplicates: true });
  console.log(`   ✅ Questions:      ${raw.questions.length}`);

  await db.answerOption.createMany({ data: toDates(raw.answerOptions), skipDuplicates: true });
  console.log(`   ✅ Answer options: ${raw.answerOptions.length}`);

  await db.gameSession.createMany({ data: toDates(raw.gameSessions), skipDuplicates: true });
  console.log(`   ✅ Game sessions:  ${raw.gameSessions.length}`);

  await db.player.createMany({ data: toDates(raw.players), skipDuplicates: true });
  console.log(`   ✅ Players:        ${raw.players.length}`);

  await db.playerAnswer.createMany({ data: toDates(raw.playerAnswers), skipDuplicates: true });
  console.log(`   ✅ Player answers: ${raw.playerAnswers.length}`);

  console.log('\n🎉 Migration complete!');
}

main()
  .catch((e) => { console.error('❌ Import failed:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
