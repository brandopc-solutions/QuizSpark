import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { QuizService } from '../../core/services/quiz.service';
import { SessionService } from '../../core/services/session.service';
import { Quiz } from '../../core/models/quiz.model';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="page-container">
      <div class="header-row">
        <h1>My Dashboard</h1>
        <a class="btn-primary" routerLink="/quiz/new">+ New Quiz</a>
      </div>

      @if (loading) { <div class="spinner"></div> }
      @else {
        <section>
          <h2 class="section-title">My Quizzes ({{ quizzes.length }})</h2>
          @if (quizzes.length === 0) {
            <div class="empty-state card">
              <p>You haven't created any quizzes yet.</p>
              <a class="btn-primary mt-2" routerLink="/quiz/new">Create your first quiz</a>
            </div>
          }
          <div class="quiz-grid">
            @for (quiz of quizzes; track quiz.id) {
              <div class="quiz-card card">
                <div class="quiz-header">
                  <h3>{{ quiz.title }}</h3>
                  <span class="badge" [class.public]="quiz.isPublic">{{ quiz.isPublic ? 'Public' : 'Private' }}</span>
                </div>
                @if (quiz.description) { <p class="desc">{{ quiz.description }}</p> }
                <div class="meta">
                  <span>❓ {{ quiz._count?.questions }} questions</span>
                  <span>🎮 {{ quiz._count?.sessions }} sessions</span>
                </div>
                <div class="actions">
                  <button class="btn-primary play-btn" (click)="hostQuiz(quiz.id)" [disabled]="hostingId === quiz.id">
                    {{ hostingId === quiz.id ? 'Starting…' : '▶ Host' }}
                  </button>
                  <a class="btn-secondary" [routerLink]="['/quiz', quiz.id, 'edit']">Edit</a>
                  <a class="btn-secondary" [routerLink]="['/analytics/quiz', quiz.id]">Stats</a>
                  <button class="btn-danger" (click)="deleteQuiz(quiz.id)">Delete</button>
                </div>
              </div>
            }
          </div>
        </section>
      }
    </div>
  `,
  styles: [`
    .header-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 32px; }
    .header-row a { padding: 12px 24px; border-radius: 10px; }
    .section-title { font-size: 1.3rem; margin-bottom: 20px; color: var(--color-muted); }
    .quiz-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 20px; }
    .quiz-card { display: flex; flex-direction: column; gap: 12px; }
    .quiz-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 8px; h3 { font-size: 1.1rem; } }
    .badge { font-size: 0.7rem; padding: 3px 10px; border-radius: 20px; background: rgba(255,255,255,0.1); white-space: nowrap; &.public { background: rgba(38, 137, 12, 0.3); color: #5ddb3f; } }
    .desc { color: var(--color-muted); font-size: 0.875rem; line-height: 1.4; }
    .meta { display: flex; gap: 16px; font-size: 0.875rem; color: var(--color-muted); }
    .actions { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 4px; button, a { padding: 8px 14px; font-size: 0.8rem; border-radius: 8px; } }
    .play-btn { flex: 1; }
    .empty-state { text-align: center; padding: 40px; a { display: inline-block; border-radius: 10px; } }
  `],
})
export class DashboardComponent implements OnInit {
  private quizSvc = inject(QuizService);
  private sessionSvc = inject(SessionService);
  private router = inject(Router);

  quizzes: Quiz[] = [];
  loading = true;
  hostingId = '';

  ngOnInit(): void {
    this.quizSvc.getMyQuizzes().subscribe({
      next: (q) => { this.quizzes = q; this.loading = false; },
      error: () => { this.loading = false; },
    });
  }

  hostQuiz(quizId: string): void {
    this.hostingId = quizId;
    this.sessionSvc.createSession(quizId).subscribe({
      next: (session) => this.router.navigate(['/host', session.pin]),
      error: () => { this.hostingId = ''; },
    });
  }

  deleteQuiz(id: string): void {
    if (!confirm('Delete this quiz? All associated data will be lost.')) return;
    this.quizSvc.deleteQuiz(id).subscribe({
      next: () => { this.quizzes = this.quizzes.filter((q) => q.id !== id); },
    });
  }
}
