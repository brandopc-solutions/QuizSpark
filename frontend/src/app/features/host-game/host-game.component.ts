import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { GameSocketService, QuestionPayload, QuestionEndPayload, RoundStartPayload, RoundEndPayload } from '../../core/services/game-socket.service';
import { LeaderboardComponent } from '../../shared/components/leaderboard/leaderboard.component';
import { LeaderboardEntry } from '../../core/models/session.model';

type HostPhase = 'lobby' | 'round-start' | 'question' | 'question-end' | 'round-end' | 'game-over';

@Component({
  selector: 'app-host-game',
  standalone: true,
  imports: [CommonModule, LeaderboardComponent],
  template: `
    <div class="host-game">

      <!-- LOBBY -->
      @if (phase === 'lobby') {
        <div class="phase-container lobby">
          <div class="pin-display">
            <p class="join-label">Join at <strong>quizspark.app</strong></p>
            <div class="pin">{{ pin }}</div>
            <p class="waiting">{{ players.length }} player(s) waiting…</p>
          </div>
          <div class="player-chips">
            @for (p of players; track p.id) {
              <span class="chip">{{ p.nickname }}</span>
            }
          </div>
          <div class="lobby-actions">
            <button class="btn-secondary" (click)="openPlayerView()">🔗 Open Player View</button>
            <button class="btn-primary start-btn" (click)="startGame()">
              ▶ Start Game ({{ players.length }} player{{ players.length !== 1 ? 's' : '' }})
            </button>
          </div>
        </div>
      }

      <!-- ROUND START SPLASH -->
      @if (phase === 'round-start' && roundStart) {
        <div class="phase-container round-start">
          <p class="round-counter">{{ roundStart.roundIndex + 1 }} of {{ roundStart.totalRounds }}</p>
          <h1 class="round-name">{{ roundStart.roundName }}</h1>
          <p class="round-sub">{{ roundStart.questionsInRound }} question{{ roundStart.questionsInRound !== 1 ? 's' : '' }}</p>
        </div>
      }

      <!-- QUESTION ACTIVE -->
      @if (phase === 'question' && currentQuestion) {
        <div class="phase-container question-phase">
          <div class="round-badge">{{ currentQuestion.roundName }} · Q{{ currentQuestion.questionIndexInRound + 1 }}/{{ currentQuestion.totalInRound }}</div>
          <div class="q-info">
            <span class="q-index">Q{{ currentQuestion.questionIndex + 1 }} / {{ currentQuestion.total }}</span>
            <div class="timer-bar">
              <div class="timer-fill" [style.width.%]="timerPercent" [class.danger]="timeLeft <= 5"></div>
            </div>
            <span class="timer-num">{{ timeLeft }}s</span>
          </div>
          <h2 class="q-text">{{ currentQuestion.text }}</h2>
          @if (currentQuestion.imageUrl) {
            <img [src]="currentQuestion.imageUrl" class="q-image" alt="question image" />
          }
          <div class="answer-count">
            <span>{{ answeredCount }} / {{ totalPlayers }} answered</span>
          </div>
          <div class="options-preview">
            @for (opt of currentQuestion.options; track opt.id) {
              <div class="opt-block" [style.background]="opt.color">{{ opt.text }}</div>
            }
          </div>
        </div>
      }

      <!-- QUESTION END / LEADERBOARD -->
      @if (phase === 'question-end' && questionEnd) {
        <div class="phase-container result-phase">
          <h2>Results</h2>
          <div class="correct-highlight mt-2">
            ✅ Correct:
            @for (id of questionEnd.correctOptionIds; track id) {
              <span class="correct-opt">{{ getOptionText(id) }}</span>
            }
          </div>
          <div class="mt-3">
            <app-leaderboard [entries]="questionEnd.leaderboard" />
          </div>
          <button class="btn-primary mt-4 next-btn" (click)="next()">
            @if (questionEnd.isLastInRound && !questionEnd.isLastRound) { End Round · Show Standings }
            @else if (questionEnd.isLastRound) { Show Final Results }
            @else { Next Question → }
          </button>
        </div>
      }

      <!-- ROUND END STANDINGS -->
      @if (phase === 'round-end' && roundEnd) {
        <div class="phase-container round-end">
          <h2>{{ roundEnd.roundName }} – Standings</h2>
          <div class="mt-3">
            <app-leaderboard [entries]="roundEnd.leaderboard" />
          </div>
          @if (!roundEnd.isLastRound) {
            <button class="btn-primary mt-4 next-btn" (click)="next()">Start Next Round →</button>
          } @else {
            <button class="btn-primary mt-4 next-btn" (click)="next()">Show Final Results</button>
          }
        </div>
      }

      <!-- GAME OVER -->
      @if (phase === 'game-over') {
        <div class="phase-container game-over">
          <h1>🎉 Game Over!</h1>
          <app-leaderboard [entries]="finalLeaderboard" />
          <button class="btn-secondary mt-4" (click)="goHome()">Back to Dashboard</button>
        </div>
      }

      @if (errorMsg) { <div class="toast">{{ errorMsg }}</div> }
    </div>
  `,
  styles: [`
    .host-game { min-height: calc(100vh - 72px); display: flex; align-items: center; justify-content: center; padding: 20px; }
    .phase-container { width: 100%; max-width: 860px; }

    /* Lobby */
    .lobby { text-align: center; }
    .pin-display { background: white; color: #1a1a2e; border-radius: 20px; padding: 32px 48px; display: inline-block; margin-bottom: 32px; }
    .join-label { font-size: 1rem; margin-bottom: 8px; }
    .pin { font-size: 5rem; font-weight: 900; letter-spacing: 8px; line-height: 1; }
    .waiting { margin-top: 12px; color: #555; }
    .player-chips { display: flex; flex-wrap: wrap; gap: 10px; justify-content: center; margin-bottom: 32px; }
    .chip { background: var(--color-card); padding: 8px 18px; border-radius: 20px; font-weight: 700; font-size: 0.9rem; }
    .lobby-actions { display: flex; flex-direction: column; align-items: center; gap: 12px; }
    .start-btn { padding: 18px 48px; font-size: 1.2rem; }

    /* Round start splash */
    .round-start { text-align: center; padding: 60px 20px; }
    .round-counter { color: var(--color-muted); font-size: 1rem; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 12px; }
    .round-name { font-size: clamp(2rem, 6vw, 4rem); font-weight: 900; color: var(--color-purple); margin-bottom: 12px; }
    .round-sub { color: var(--color-muted); font-size: 1.1rem; }

    /* Question */
    .round-badge { display: inline-block; background: rgba(168,85,247,0.2); color: var(--color-purple); border-radius: 20px; padding: 4px 14px; font-size: 0.8rem; font-weight: 700; margin-bottom: 12px; }
    .q-info { display: flex; align-items: center; gap: 16px; margin-bottom: 20px; }
    .q-index { font-weight: 700; color: var(--color-muted); white-space: nowrap; }
    .timer-bar { flex: 1; height: 12px; background: rgba(255,255,255,0.1); border-radius: 6px; overflow: hidden; }
    .timer-fill { height: 100%; background: var(--color-green); border-radius: 6px; transition: width 1s linear, background 0.3s; &.danger { background: var(--color-red); } }
    .timer-num { font-weight: 900; font-size: 1.3rem; white-space: nowrap; }
    .q-text { font-size: clamp(1.2rem, 3vw, 2rem); text-align: center; margin-bottom: 16px; }
    .q-image { max-width: 100%; max-height: 240px; border-radius: 12px; display: block; margin: 0 auto 16px; }
    .answer-count { text-align: center; color: var(--color-muted); margin-bottom: 20px; font-size: 1.1rem; }
    .options-preview { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .opt-block { padding: 20px; border-radius: 12px; text-align: center; font-size: 1.1rem; font-weight: 700; color: white; }

    /* Results / Round end */
    .result-phase { }
    .round-end { }
    .correct-highlight { font-size: 1rem; display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
    .correct-opt { background: rgba(38,137,12,0.3); color: #5ddb3f; padding: 6px 16px; border-radius: 20px; font-weight: 700; }
    .next-btn { display: block; margin: 0 auto; padding: 14px 40px; font-size: 1.1rem; }

    /* Game over */
    .game-over { text-align: center; h1 { font-size: 3rem; margin-bottom: 32px; } }
    .game-over button { padding: 14px 32px; }

    /* Toast */
    .toast { position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%); background: var(--color-red); color: white; padding: 12px 24px; border-radius: 8px; font-weight: 600; }
  `],
})
export class HostGameComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  socket = inject(GameSocketService);

  pin = '';
  phase: HostPhase = 'lobby';
  players: { id: string; nickname: string }[] = [];
  currentQuestion: QuestionPayload | null = null;
  questionEnd: QuestionEndPayload | null = null;
  roundStart: RoundStartPayload | null = null;
  roundEnd: RoundEndPayload | null = null;
  finalLeaderboard: LeaderboardEntry[] = [];
  answeredCount = 0;
  totalPlayers = 0;
  timeLeft = 0;
  timerPercent = 100;
  errorMsg = '';
  private timerInterval?: ReturnType<typeof setInterval>;
  private subs: Subscription[] = [];

  ngOnInit(): void {
    this.pin = this.route.snapshot.params['pin'];
    this.socket.connect();

    this.subs.push(
      this.socket.error$.subscribe((e) => { this.errorMsg = e.message; setTimeout(() => this.errorMsg = '', 4000); }),
      this.socket.lobbyUpdate$.subscribe((d) => { this.players = d.players; }),
      this.socket.hostJoined$.subscribe((d) => { this.totalPlayers = d.session?.players?.length || 0; }),
      this.socket.gameStarted$.subscribe(() => { /* first round:start follows immediately */ }),
      this.socket.roundStart$.subscribe((d) => { this.roundStart = d; this.phase = 'round-start'; }),
      this.socket.roundEnd$.subscribe((d) => { this.roundEnd = d; this.phase = 'round-end'; clearInterval(this.timerInterval); }),
      this.socket.questionStart$.subscribe((q) => this.onQuestionStart(q)),
      this.socket.questionEnd$.subscribe((d) => this.onQuestionEnd(d)),
      this.socket.hostAnswerCount$.subscribe((d) => {
        this.answeredCount = d.answeredCount;
        this.totalPlayers = d.totalPlayers;
      }),
      this.socket.gameEnded$.subscribe((d) => {
        this.finalLeaderboard = d.leaderboard;
        this.phase = 'game-over';
        clearInterval(this.timerInterval);
      }),
    );

    this.socket.hostJoin(this.pin);
  }

  startGame(): void { this.socket.startGame(this.pin); }
  openPlayerView(): void { window.open(`/play?pin=${this.pin}`, '_blank'); }
  next(): void { this.socket.nextQuestion(this.pin); }
  goHome(): void { this.router.navigate(['/dashboard']); }

  getOptionText(optionId: string): string {
    return this.currentQuestion?.options.find((o) => o.id === optionId)?.text || '';
  }

  private onQuestionStart(q: QuestionPayload): void {
    this.phase = 'question';
    this.currentQuestion = q;
    this.answeredCount = 0;
    this.questionEnd = null;
    this.startTimer(q.timeLimit);
  }

  private onQuestionEnd(d: QuestionEndPayload): void {
    clearInterval(this.timerInterval);
    this.questionEnd = d;
    this.phase = 'question-end';
  }

  private startTimer(seconds: number): void {
    clearInterval(this.timerInterval);
    this.timeLeft = seconds;
    this.timerPercent = 100;
    this.timerInterval = setInterval(() => {
      this.timeLeft--;
      this.timerPercent = (this.timeLeft / seconds) * 100;
      if (this.timeLeft <= 0) clearInterval(this.timerInterval);
    }, 1000);
  }

  ngOnDestroy(): void {
    this.subs.forEach((s) => s.unsubscribe());
    clearInterval(this.timerInterval);
    this.socket.disconnect();
  }
}
