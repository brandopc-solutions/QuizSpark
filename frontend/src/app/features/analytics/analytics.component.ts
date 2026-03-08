import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AnalyticsService } from '../../core/services/analytics.service';

@Component({
  selector: 'app-analytics',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="page-container">
      <a class="back-link" routerLink="/dashboard">← Back to Dashboard</a>

      @if (loading) { <div class="spinner"></div> }
      @else if (data) {
        <div class="header mt-2">
          <h1>{{ data.quiz.title }}</h1>
          <div class="stats-row">
            <div class="stat-chip">🎮 {{ data.totalSessions }} sessions</div>
            <div class="stat-chip">👥 {{ data.totalPlayers }} players total</div>
          </div>
        </div>

        <h2 class="section-title mt-4">Question Analysis</h2>
        <div class="questions-list">
          @for (q of data.questions; track q; let i = $index) {
            <div class="q-analytics card mt-2">
              <div class="q-top">
                <span class="q-num">Q{{ i + 1 }}</span>
                <p class="q-text">{{ q.question }}</p>
              </div>
              <div class="q-metrics">
                <div class="metric">
                  <span class="label">Correct Rate</span>
                  <span class="value" [class.good]="q.correctRate >= 60" [class.bad]="q.correctRate < 40">
                    {{ q.correctRate }}%
                  </span>
                </div>
                <div class="metric">
                  <span class="label">Avg Time</span>
                  <span class="value">{{ q.avgTimeTaken }}s</span>
                </div>
                <div class="metric">
                  <span class="label">Total Answers</span>
                  <span class="value">{{ q.totalAnswers }}</span>
                </div>
              </div>
              <div class="correct-bar">
                <div class="bar-fill" [style.width.%]="q.correctRate"
                  [style.background]="q.correctRate >= 60 ? 'var(--color-green)' : q.correctRate >= 40 ? 'var(--color-yellow)' : 'var(--color-red)'">
                </div>
              </div>
              <div class="option-breakdown mt-2">
                @for (opt of q.optionCounts; track $index) {
                  <div class="opt-row">
                    <span class="opt-color-dot" [style.background]="opt.color"></span>
                    <span class="opt-text" [class.correct]="opt.isCorrect">{{ opt.option }} {{ opt.isCorrect ? '✓' : '' }}</span>
                    <span class="opt-count">{{ opt.count }}</span>
                  </div>
                }
              </div>
            </div>
          }
        </div>

        <h2 class="section-title mt-4">Recent Sessions</h2>
        <div class="sessions-table card mt-2">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>PIN</th>
                <th>Players</th>
                <th>Top Player</th>
                <th>Top Score</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              @for (s of data.recentSessions; track s.id) {
                <tr>
                  <td>{{ s.startedAt | date:'MMM d, y' }}</td>
                  <td class="pin">{{ s.pin }}</td>
                  <td>{{ s.playerCount }}</td>
                  <td>{{ s.topPlayer || '—' }}</td>
                  <td>{{ s.topScore | number }}</td>
                  <td><span class="status-badge" [class]="s.status.toLowerCase()">{{ s.status }}</span></td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }
    </div>
  `,
  styles: [`
    .back-link { color: var(--color-muted); font-weight: 600; &:hover { color: var(--color-text); } }
    .header { }
    h1 { font-size: 2rem; margin-bottom: 12px; }
    .stats-row { display: flex; gap: 16px; flex-wrap: wrap; }
    .stat-chip { background: var(--color-card); padding: 8px 20px; border-radius: 20px; font-weight: 600; font-size: 0.875rem; }
    .section-title { font-size: 1.3rem; color: var(--color-muted); }

    /* Question cards */
    .q-analytics { }
    .q-top { display: flex; gap: 12px; align-items: flex-start; margin-bottom: 16px; }
    .q-num { background: var(--color-purple); color: white; width: 32px; height: 32px; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 0.8rem; font-weight: 700; flex-shrink: 0; }
    .q-text { font-weight: 600; line-height: 1.4; }
    .q-metrics { display: flex; gap: 24px; margin-bottom: 12px; flex-wrap: wrap; }
    .metric { .label { display: block; font-size: 0.75rem; color: var(--color-muted); margin-bottom: 2px; } .value { font-size: 1.3rem; font-weight: 900; &.good { color: #5ddb3f; } &.bad { color: var(--color-red); } } }
    .correct-bar { height: 8px; background: rgba(255,255,255,0.08); border-radius: 4px; overflow: hidden; .bar-fill { height: 100%; border-radius: 4px; transition: width 0.6s ease; } }
    .option-breakdown { display: flex; flex-direction: column; gap: 6px; }
    .opt-row { display: flex; align-items: center; gap: 10px; }
    .opt-color-dot { width: 12px; height: 12px; border-radius: 50%; flex-shrink: 0; }
    .opt-text { flex: 1; font-size: 0.875rem; &.correct { color: #5ddb3f; font-weight: 700; } }
    .opt-count { font-weight: 700; color: var(--color-muted); font-size: 0.875rem; }

    /* Sessions table */
    .sessions-table { overflow-x: auto; }
    table { width: 100%; border-collapse: collapse; }
    th, td { padding: 12px 16px; text-align: left; border-bottom: 1px solid rgba(255,255,255,0.06); font-size: 0.875rem; }
    th { color: var(--color-muted); font-weight: 600; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.5px; }
    .pin { font-weight: 900; letter-spacing: 2px; }
    .status-badge { padding: 4px 12px; border-radius: 20px; font-size: 0.75rem; font-weight: 700; text-transform: uppercase; &.finished { background: rgba(38,137,12,0.25); color: #5ddb3f; } &.waiting { background: rgba(111,45,189,0.25); color: #b07eff; } &.in_progress { background: rgba(216,158,0,0.25); color: var(--color-yellow); } }
  `],
})
export class AnalyticsComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private analyticsSvc = inject(AnalyticsService);

  data: any = null;
  loading = true;

  ngOnInit(): void {
    const quizId = this.route.snapshot.params['quizId'];
    this.analyticsSvc.getQuizAnalytics(quizId).subscribe({
      next: (d) => { this.data = d; this.loading = false; },
      error: () => { this.loading = false; },
    });
  }
}
