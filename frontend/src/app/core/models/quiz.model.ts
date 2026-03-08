export interface AnswerOption {
  id: string;
  text: string;
  isCorrect?: boolean;
  color: string;
}

export interface Question {
  id: string;
  text: string;
  imageUrl?: string;
  timeLimit: number;
  points: number;
  orderIndex: number;
  options: AnswerOption[];
}

export interface Round {
  id: string;
  name: string;
  orderIndex: number;
  questions: Question[];
}

export interface Quiz {
  id: string;
  title: string;
  description?: string;
  coverImage?: string;
  isPublic: boolean;
  createdAt: string;
  hostId: string;
  host?: { username: string };
  rounds: Round[];
  questions: Question[];  // flat list
  _count?: { questions: number; sessions?: number; rounds?: number };
}

