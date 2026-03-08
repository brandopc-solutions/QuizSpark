import { Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  template: `
    <div class="home">
      <section class="hero">
        <h1>Learning is fun again!</h1>
        <p class="subtitle">Host live quizzes and compete with friends in real time.</p>
        <div class="hero-actions">
          @if (auth.isLoggedIn) {
            <a class="btn-primary" routerLink="/dashboard">My Dashboard</a>
          } @else {
            <a class="btn-primary" routerLink="/auth/register">Get Started Free</a>
            <a class="btn-secondary" routerLink="/auth/login">Login</a>
          }
        </div>
      </section>

      <section class="join-section card">
        <h2>Join a game</h2>
        <p>Enter the PIN your host shared with you</p>
        <div class="pin-input-row">
          <input type="text" placeholder="Enter game PIN (e.g. 123456)"
            [(ngModel)]="pin" maxlength="6" (keyup.enter)="joinGame()" />
          <button class="btn-primary" (click)="joinGame()" [disabled]="!pin">Join!</button>
        </div>
      </section>

      <section class="features">
        <div class="feature card">
          <span class="icon">⚡</span>
          <h3>Real-time Gameplay</h3>
          <p>Everyone answers simultaneously with live countdowns and instant scoring.</p>
        </div>
        <div class="feature card">
          <span class="icon">📊</span>
          <h3>Deep Analytics</h3>
          <p>See how each player performed per question, accuracy, and average time.</p>
        </div>
        <div class="feature card">
          <span class="icon">🏆</span>
          <h3>Live Leaderboard</h3>
          <p>Rankings update after every question to keep the competition alive.</p>
        </div>
      </section>
    </div>
  `,
  styles: [`
    .home { padding: 0 20px 60px; max-width: 1100px; margin: 0 auto; }
    .hero {
      text-align: center;
      padding: 80px 20px 60px;
      h1 { font-size: clamp(2rem, 5vw, 3.5rem); font-weight: 900; margin-bottom: 16px; }
      .subtitle { font-size: 1.2rem; color: var(--color-muted); margin-bottom: 32px; }
    }
    .hero-actions { display: flex; gap: 16px; justify-content: center; flex-wrap: wrap; }
    .hero-actions a { padding: 16px 36px; font-size: 1.1rem; border-radius: 12px; display: inline-block; }
    .join-section {
      max-width: 560px; margin: 0 auto 60px; text-align: center;
      h2 { font-size: 1.6rem; margin-bottom: 8px; }
      p { color: var(--color-muted); margin-bottom: 20px; }
    }
    .pin-input-row { display: flex; gap: 12px; }
    .pin-input-row input { font-size: 1.4rem; text-align: center; letter-spacing: 4px; }
    .pin-input-row button { white-space: nowrap; padding: 14px 24px; }
    .features { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 24px; }
    .feature { text-align: center; .icon { font-size: 2rem; display: block; margin-bottom: 12px; } h3 { margin-bottom: 8px; } p { color: var(--color-muted); line-height: 1.5; } }
  `],
})
export class HomeComponent {
  auth = inject(AuthService);
  router = inject(Router);
  pin = '';

  joinGame(): void {
    if (!this.pin.trim()) return;
    this.router.navigate(['/play'], { queryParams: { pin: this.pin.trim() } });
  }
}
