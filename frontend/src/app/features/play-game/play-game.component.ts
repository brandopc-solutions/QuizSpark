import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';
import { GameSocketService, QuestionPayload, QuestionEndPayload, RoundStartPayload, RoundEndPayload } from '../../core/services/game-socket.service';
import { LeaderboardComponent } from '../../shared/components/leaderboard/leaderboard.component';
import { LeaderboardEntry } from '../../core/models/session.model';

type PlayerPhase = 'join' | 'lobby' | 'round-start' | 'question' | 'answered' | 'question-end' | 'round-end' | 'game-over';

@Component({
  selector: 'app-play-game',
  standalone: true,
  imports: [CommonModule, FormsModule, LeaderboardComponent],
  template: `
    <div class="play-game">

      <!-- JOIN FORM -->
      @if (phase === 'join') {
        <div class="join-container card">
          <h1>🎮 Join Game</h1>
          @if (errorMsg) { <div class="alert-error">{{ errorMsg }}</div> }
          <div class="field mt-2">
            <label>Game PIN</label>
            <input [(ngModel)]="pin" placeholder="Enter 6-digit PIN" maxlength="6" type="text" />
          </div>
          <div class="field mt-2">
            <label>Nickname</label>
            <input [(ngModel)]="nickname" placeholder="Your nickname" maxlength="20" (keyup.enter)="joinGame()" />
          </div>
          <button class="btn-primary full-width mt-3" (click)="joinGame()" [disabled]="joining">
            {{ joining ? 'Joining…' : 'Join!' }}
          </button>
        </div>
      }

      <!-- LOBBY WAITING -->
      @if (phase === 'lobby') {
        <div class="lobby-container">
          <div class="nickname-badge">{{ nickname }}</div>
          <h2>Get Ready!</h2>
          <p>The host will start the game shortly…</p>
          <div class="pulse-ring"></div>
        </div>
      }

      <!-- ROUND START SPLASH -->
      @if (phase === 'round-start' && roundStart) {
        <div class="round-start-container">
          <p class="round-counter">Round {{ roundStart.roundIndex + 1 }} of {{ roundStart.totalRounds }}</p>
          <h1 class="round-name">{{ roundStart.roundName }}</h1>
          <p class="round-sub">{{ roundStart.questionsInRound }} question{{ roundStart.questionsInRound !== 1 ? 's' : '' }}</p>
          <div class="pulse-ring"></div>
          <p class="waiting-sm">Get ready…</p>
        </div>
      }

      <!-- QUESTION -->
      @if (phase === 'question' && currentQuestion) {
        <div class="question-container">
          @if (currentQuestion.roundName) {
            <div class="round-badge">{{ currentQuestion.roundName }} · Q{{ currentQuestion.questionIndexInRound + 1 }}/{{ currentQuestion.totalInRound }}</div>
          }
          <div class="q-header">
            <span>Q{{ currentQuestion.questionIndex + 1 }} / {{ currentQuestion.total }}</span>
            <div class="timer-circle" [class.danger]="timeLeft <= 5">{{ timeLeft }}</div>
          </div>
          <h2 class="q-text">{{ currentQuestion.text }}</h2>
          @if (currentQuestion.imageUrl) {
            <img [src]="currentQuestion.imageUrl" class="q-image" alt="" />
          }
          <div class="options-grid">
            @for (opt of currentQuestion.options; track opt.id) {
              <button class="option-btn" [style.background]="opt.color" (click)="submitAnswer(opt.id)">
                {{ opt.text }}
              </button>
            }
          </div>
          <div class="skip-row">
            <button class="btn-secondary skip-btn" (click)="submitAnswer(null)">Skip</button>
          </div>
        </div>
      }

      <!-- ANSWERED - WAITING -->
      @if (phase === 'answered') {
        <div class="wait-container">
          @if (lastResult?.isCorrect) {
            <div class="result-icon correct">✅</div>
            <h2>Correct!</h2>
            <p class="points">+{{ lastResult?.pointsAwarded }} points</p>
          } @else {
            <div class="result-icon wrong">❌</div>
            <h2>Incorrect</h2>
          }
          <p class="waiting-msg">Waiting for others…</p>
        </div>
      }

      <!-- QUESTION END -->
      @if (phase === 'question-end' && questionEnd) {
        <div class="result-container">
          <h2>Question Results</h2>
          <app-leaderboard [entries]="questionEnd.leaderboard" />
          @if (questionEnd.isLastInRound && !questionEnd.isLastRound) {
            <p class="waiting-msg mt-3">Round ending… standings coming up!</p>
          } @else {
            <p class="waiting-msg mt-3">Next question coming up…</p>
          }
        </div>
      }

      <!-- ROUND END STANDINGS -->
      @if (phase === 'round-end' && roundEnd) {
        <div class="round-end-container">
          <h2>{{ roundEnd.roundName }} – Standings</h2>
          <app-leaderboard [entries]="roundEnd.leaderboard" />
          @if (!roundEnd.isLastRound) {
            <div class="next-round-hint">
              <div class="pulse-ring small"></div>
              <p>Next round starting soon…</p>
            </div>
          } @else {
            <p class="waiting-msg mt-3">Waiting for final results…</p>
          }
        </div>
      }

      <!-- GAME OVER -->
      @if (phase === 'game-over') {
        <div class="game-over-container">
          <h1>Game Over!</h1>
          @if (myRank) {
            <div class="my-rank">
              <span class="rank-icon">{{ rankIcon(myRank) }}</span>
              <p>You finished #{{ myRank }}</p>
            </div>
          }
          <app-leaderboard [entries]="finalLeaderboard" />
          <button class="btn-primary mt-4" (click)="restart()">Play Again</button>
        </div>
      }

      @if (errorMsg && phase !== 'join') { <div class="toast">{{ errorMsg }}</div> }
    </div>
  `,
  styles: [`
    .play-game { min-height: calc(100vh - 72px); display: flex; align-items: center; justify-content: center; padding: 20px; }

    /* Join */
    .join-container { width: 100%; max-width: 420px; h1 { font-size: 1.8rem; margin-bottom: 4px; } }
    .field { label { display: block; font-weight: 600; margin-bottom: 6px; font-size: 0.875rem; } }
    .full-width { width: 100%; }
    .alert-error { background: rgba(226,27,60,0.15); border: 1px solid var(--color-red); color: #ff6b8a; padding: 12px; border-radius: 8px; margin-bottom: 8px; font-size: 0.875rem; }

    /* Lobby */
    .lobby-container { text-align: center; .nickname-badge { font-size: 2rem; font-weight: 900; margin-bottom: 16px; background: var(--color-purple); padding: 12px 32px; border-radius: 16px; display: inline-block; } h2 { font-size: 1.8rem; margin-bottom: 8px; } p { color: var(--color-muted); } }
    .pulse-ring { width: 80px; height: 80px; border: 4px solid var(--color-purple); border-radius: 50%; margin: 32px auto; animation: pulse 1.5s ease-in-out infinite; &.small { width: 40px; height: 40px; margin: 12px auto; } }
    @keyframes pulse { 0%, 100% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.2); opacity: 0.6; } }

    /* Round start */
    .round-start-container { text-align: center; width: 100%; max-width: 480px; .round-counter { color: var(--color-muted); font-size: 0.9rem; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 8px; } .round-name { font-size: clamp(1.6rem, 5vw, 3rem); font-weight: 900; color: var(--color-purple); margin-bottom: 8px; } .round-sub { color: var(--color-muted); } .waiting-sm { color: var(--color-muted); font-size: 0.9rem; } }

    /* Question */
    .question-container { width: 100%; max-width: 700px; }
    .round-badge { display: inline-block; background: rgba(168,85,247,0.2); color: var(--color-purple); border-radius: 20px; padding: 4px 14px; font-size: 0.8rem; font-weight: 700; margin-bottom: 10px; }
    .q-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; color: var(--color-muted); font-weight: 600; }
    .timer-circle { width: 52px; height: 52px; border-radius: 50%; background: var(--color-card); display: flex; align-items: center; justify-content: center; font-size: 1.3rem; font-weight: 900; transition: background 0.3s; &.danger { background: var(--color-red); animation: shake 0.4s infinite; } }
    @keyframes shake { 0%, 100% { transform: rotate(-5deg); } 50% { transform: rotate(5deg); } }
    .q-text { font-size: clamp(1.1rem, 3vw, 1.6rem); text-align: center; margin-bottom: 16px; }
    .q-image { max-width: 100%; max-height: 200px; border-radius: 12px; display: block; margin: 0 auto 16px; }
    .options-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .option-btn { padding: 28px 16px; border-radius: 12px; font-size: 1rem; color: white; font-weight: 700; border: none; cursor: pointer; transition: transform 0.1s, opacity 0.2s; &:hover { transform: scale(1.02); } &:active { transform: scale(0.97); } }
    .skip-row { text-align: center; margin-top: 16px; .skip-btn { padding: 10px 24px; font-size: 0.875rem; } }

    /* Answered */
    .wait-container { text-align: center; .result-icon { font-size: 5rem; display: block; margin-bottom: 16px; } h2 { font-size: 2rem; margin-bottom: 8px; } .points { font-size: 1.5rem; font-weight: 900; color: var(--color-yellow); } .waiting-msg { margin-top: 16px; color: var(--color-muted); } }

    /* End / round end */
    .result-container, .round-end-container { width: 100%; max-width: 560px; text-align: center; h2 { margin-bottom: 20px; } }
    .waiting-msg { color: var(--color-muted); }
    .next-round-hint { display: flex; flex-direction: column; align-items: center; margin-top: 16px; p { color: var(--color-muted); font-size: 0.9rem; } }

    /* Game over */
    .game-over-container { width: 100%; max-width: 560px; text-align: center; h1 { font-size: 2.5rem; margin-bottom: 24px; } }
    .my-rank { margin-bottom: 24px; .rank-icon { font-size: 4rem; display: block; } p { font-size: 1.5rem; font-weight: 700; } }
    .game-over-container button { padding: 14px 36px; }
  `],
})
export class PlayGameComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  socket = inject(GameSocketService);

  phase: PlayerPhase = 'join';
  pin = '';
  nickname = '';
  joining = false;
  errorMsg = '';
  currentQuestion: QuestionPayload | null = null;
  questionEnd: QuestionEndPayload | null = null;
  roundStart: RoundStartPayload | null = null;
  roundEnd: RoundEndPayload | null = null;
  finalLeaderboard: LeaderboardEntry[] = [];
  lastResult: { isCorrect: boolean; pointsAwarded: number } | null = null;
  myRank: number | null = null;
  timeLeft = 0;
  private timerInterval?: ReturnType<typeof setInterval>;
  private subs: Subscription[] = [];

  ngOnInit(): void {
    const queryPin = this.route.snapshot.queryParams['pin'];
    if (queryPin) this.pin = queryPin;
  }

  joinGame(): void {
    if (!this.pin.trim() || !this.nickname.trim()) {
      this.errorMsg = 'Please enter both PIN and nickname';
      return;
    }
    this.joining = true;
    this.errorMsg = '';
    this.socket.connect();
    this.registerListeners();
    this.socket.playerJoin(this.pin.trim(), this.nickname.trim());
  }

  submitAnswer(optionId: string | null): void {
    if (this.phase !== 'question') return;
    this.socket.submitAnswer(optionId);
    this.phase = 'answered';
    clearInterval(this.timerInterval);
  }

  restart(): void {
    this.phase = 'join';
    this.socket.disconnect();
    this.subs.forEach((s) => s.unsubscribe());
    this.subs = [];
  }

  rankIcon(rank: number): string {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return `#${rank}`;
  }

  private registerListeners(): void {
    this.subs.push(
      this.socket.error$.subscribe((e) => {
        this.errorMsg = e.message;
        this.joining = false;
        setTimeout(() => this.errorMsg = '', 4000);
      }),
      this.socket.playerJoined$.subscribe((d) => {
        this.nickname = d.nickname;
        this.joining = false;
        this.phase = 'lobby';
      }),
      this.socket.gameStarted$.subscribe(() => { /* round:start follows immediately */ }),
      this.socket.roundStart$.subscribe((d) => {
        this.roundStart = d;
        this.phase = 'round-start';
      }),
      this.socket.roundEnd$.subscribe((d) => {
        this.roundEnd = d;
        this.phase = 'round-end';
        clearInterval(this.timerInterval);
      }),
      this.socket.questionStart$.subscribe((q) => {
        this.currentQuestion = q;
        this.lastResult = null;
        this.phase = 'question';
        this.startTimer(q.timeLimit);
      }),
      this.socket.answerReceived$.subscribe((r) => {
        this.lastResult = r;
      }),
      this.socket.questionEnd$.subscribe((d) => {
        this.questionEnd = d;
        this.phase = 'question-end';
        clearInterval(this.timerInterval);
      }),
      this.socket.gameEnded$.subscribe((d) => {
        this.finalLeaderboard = d.leaderboard;
        const me = d.leaderboard.find((e) => e.nickname === this.nickname);
        this.myRank = me?.rank || null;
        this.phase = 'game-over';
        clearInterval(this.timerInterval);
      }),
    );
  }

  private startTimer(seconds: number): void {
    clearInterval(this.timerInterval);
    this.timeLeft = seconds;
    this.timerInterval = setInterval(() => {
      this.timeLeft--;
      if (this.timeLeft <= 0) {
        clearInterval(this.timerInterval);
        if (this.phase === 'question') this.submitAnswer(null);
      }
    }, 1000);
  }

  ngOnDestroy(): void {
    this.subs.forEach((s) => s.unsubscribe());
    clearInterval(this.timerInterval);
    this.socket.disconnect();
  }
}
