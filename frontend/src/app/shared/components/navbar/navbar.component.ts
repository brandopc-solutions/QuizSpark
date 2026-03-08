import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <nav class="navbar">
      <a class="brand" routerLink="/">⚡ QuizSpark</a>
      <div class="nav-links">
        @if (auth.isLoggedIn) {
          <a routerLink="/dashboard">Dashboard</a>
          <span class="username">{{ auth.currentUser()?.username }}</span>
          <button class="btn-secondary logout-btn" (click)="auth.logout()">Logout</button>
        } @else {
          <a routerLink="/auth/login">Login</a>
          <a class="btn-primary nav-cta" routerLink="/auth/register">Sign Up</a>
        }
      </div>
    </nav>
  `,
  styles: [`
    .navbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 16px 32px;
      background: var(--color-surface);
      box-shadow: 0 2px 10px rgba(0,0,0,0.3);
      position: sticky;
      top: 0;
      z-index: 100;
    }
    .brand {
      font-size: 1.4rem;
      font-weight: 900;
      color: var(--color-text);
      letter-spacing: -0.5px;
    }
    .nav-links {
      display: flex;
      align-items: center;
      gap: 20px;
    }
    .nav-links a {
      color: var(--color-muted);
      font-weight: 600;
      transition: color 0.2s;
      &:hover { color: var(--color-text); }
    }
    .nav-cta {
      color: white !important;
      padding: 8px 20px;
      border-radius: 8px;
      background: var(--color-purple);
    }
    .username { color: var(--color-text); font-weight: 700; }
    .logout-btn { padding: 8px 16px; font-size: 0.875rem; }
  `],
})
export class NavbarComponent {
  auth = inject(AuthService);
}
