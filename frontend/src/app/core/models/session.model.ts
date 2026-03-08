export type SessionStatus = 'WAITING' | 'IN_PROGRESS' | 'FINISHED'; // stored as String in SQLite

export interface Player {
  id: string;
  nickname: string;
  score: number;
  rank?: number;
}

export interface GameSession {
  id: string;
  pin: string;
  status: SessionStatus;
  currentQuestionIndex: number;
  startedAt?: string;
  endedAt?: string;
  quizId: string;
  quiz?: any;
  players?: Player[];
  _count?: { players: number };
}

export interface LeaderboardEntry {
  rank: number;
  nickname: string;
  score: number;
}
