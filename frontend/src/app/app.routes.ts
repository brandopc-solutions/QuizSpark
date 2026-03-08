import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./features/home/home.component').then((m) => m.HomeComponent),
  },
  {
    path: 'auth/login',
    loadComponent: () => import('./features/auth/login/login.component').then((m) => m.LoginComponent),
  },
  {
    path: 'auth/register',
    loadComponent: () => import('./features/auth/register/register.component').then((m) => m.RegisterComponent),
  },
  {
    path: 'dashboard',
    canActivate: [authGuard],
    loadComponent: () => import('./features/dashboard/dashboard.component').then((m) => m.DashboardComponent),
  },
  {
    path: 'quiz/new',
    canActivate: [authGuard],
    loadComponent: () => import('./features/quiz-editor/quiz-editor.component').then((m) => m.QuizEditorComponent),
  },
  {
    path: 'quiz/:id/edit',
    canActivate: [authGuard],
    loadComponent: () => import('./features/quiz-editor/quiz-editor.component').then((m) => m.QuizEditorComponent),
  },
  {
    path: 'host/:pin',
    canActivate: [authGuard],
    loadComponent: () => import('./features/host-game/host-game.component').then((m) => m.HostGameComponent),
  },
  {
    path: 'play',
    loadComponent: () => import('./features/play-game/play-game.component').then((m) => m.PlayGameComponent),
  },
  {
    path: 'analytics/quiz/:quizId',
    canActivate: [authGuard],
    loadComponent: () => import('./features/analytics/analytics.component').then((m) => m.AnalyticsComponent),
  },
  { path: '**', redirectTo: '' },
];
