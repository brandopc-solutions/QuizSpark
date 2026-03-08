import { Injectable, OnDestroy } from '@angular/core';
import { Subject } from 'rxjs';
import { io, Socket } from 'socket.io-client';
import { environment } from '../../../environments/environment';

export interface QuestionPayload {
  questionIndex: number;
  total: number;
  roundIndex: number;
  roundName: string;
  questionIndexInRound: number;
  totalInRound: number;
  text: string;
  imageUrl?: string;
  timeLimit: number;
  points: number;
  options: { id: string; text: string; color: string }[];
}

export interface QuestionEndPayload {
  correctOptionIds: string[];
  leaderboard: { rank: number; nickname: string; score: number }[];
  questionStats: { selectedOptionId: string; _count: { selectedOptionId: number } }[];
  isLastInRound: boolean;
  isLastRound: boolean;
  roundIndex: number;
  roundName: string;
}

export interface RoundStartPayload {
  roundIndex: number;
  roundName: string;
  totalRounds: number;
  questionsInRound: number;
  totalQuestions: number;
}

export interface RoundEndPayload {
  roundIndex: number;
  roundName: string;
  isLastRound: boolean;
  leaderboard: { rank: number; nickname: string; score: number }[];
}

@Injectable({ providedIn: 'root' })
export class GameSocketService implements OnDestroy {
  private socket!: Socket;

  // Observables for game events
  error$ = new Subject<{ message: string }>();
  hostJoined$ = new Subject<any>();
  playerJoined$ = new Subject<{ playerId: string; nickname: string }>();
  lobbyUpdate$ = new Subject<{ players: { id: string; nickname: string }[] }>();
  gameStarted$ = new Subject<void>();
  roundStart$ = new Subject<RoundStartPayload>();
  roundEnd$ = new Subject<RoundEndPayload>();
  questionStart$ = new Subject<QuestionPayload>();
  questionEnd$ = new Subject<QuestionEndPayload>();
  answerReceived$ = new Subject<{ isCorrect: boolean; pointsAwarded: number }>();
  hostAnswerCount$ = new Subject<{ answeredCount: number; totalPlayers: number }>();
  gameEnded$ = new Subject<{ leaderboard: { rank: number; nickname: string; score: number }[] }>();
  playerLeft$ = new Subject<{ nickname: string }>();

  connect(): void {
    if (this.socket?.connected) return;
    this.socket = io(environment.socketUrl, { transports: ['websocket'] });
    this.registerListeners();
  }

  disconnect(): void {
    this.socket?.disconnect();
  }

  // Host events
  hostJoin(pin: string): void { this.socket.emit('host:join', { pin }); }
  startGame(pin: string): void { this.socket.emit('host:start', { pin }); }
  nextQuestion(pin: string): void { this.socket.emit('host:next', { pin }); }

  // Player events
  playerJoin(pin: string, nickname: string): void { this.socket.emit('player:join', { pin, nickname }); }
  submitAnswer(optionId: string | null): void { this.socket.emit('player:answer', { optionId }); }

  private registerListeners(): void {
    this.socket.on('error', (d: any) => this.error$.next(d));
    this.socket.on('host:joined', (d: any) => this.hostJoined$.next(d));
    this.socket.on('player:joined', (d: any) => this.playerJoined$.next(d));
    this.socket.on('lobby:update', (d: any) => this.lobbyUpdate$.next(d));
    this.socket.on('game:started', () => this.gameStarted$.next());
    this.socket.on('round:start', (d: RoundStartPayload) => this.roundStart$.next(d));
    this.socket.on('round:end', (d: RoundEndPayload) => this.roundEnd$.next(d));
    this.socket.on('question:start', (d: QuestionPayload) => this.questionStart$.next(d));
    this.socket.on('question:end', (d: QuestionEndPayload) => this.questionEnd$.next(d));
    this.socket.on('answer:received', (d: any) => this.answerReceived$.next(d));
    this.socket.on('host:answer_count', (d: any) => this.hostAnswerCount$.next(d));
    this.socket.on('game:ended', (d: any) => this.gameEnded$.next(d));
    this.socket.on('player:left', (d: any) => this.playerLeft$.next(d));
  }

  ngOnDestroy(): void { this.disconnect(); }
}
