import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LeaderboardEntry } from '../../../core/models/session.model';

@Component({
  selector: 'app-leaderboard',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="leaderboard">
      <h3>🏆 Leaderboard</h3>
      @for (entry of entries; track entry.rank) {
        <div class="entry" [class.top3]="entry.rank <= 3">
          <span class="rank">{{ rankIcon(entry.rank) }}</span>
          <span class="name">{{ entry.nickname }}</span>
          <span class="score">{{ entry.score | number }}</span>
        </div>
      } @empty {
        <p class="empty">No players yet</p>
      }
    </div>
  `,
  styles: [`
    .leaderboard { display: flex; flex-direction: column; gap: 8px; }
    h3 { font-size: 1.2rem; margin-bottom: 12px; text-align: center; }
    .entry {
      display: flex;
      align-items: center;
      gap: 16px;
      background: rgba(255,255,255,0.06);
      padding: 12px 16px;
      border-radius: 10px;
      &.top3 { background: rgba(111, 45, 189, 0.25); }
    }
    .rank { font-size: 1.3rem; width: 36px; text-align: center; }
    .name { flex: 1; font-weight: 600; }
    .score { font-weight: 700; color: var(--color-yellow); font-size: 1.1rem; }
    .empty { text-align: center; color: var(--color-muted); }
  `],
})
export class LeaderboardComponent {
  @Input() entries: LeaderboardEntry[] = [];

  rankIcon(rank: number): string {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return `#${rank}`;
  }
}
