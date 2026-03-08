import { Component, OnInit, inject, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { QuizService } from '../../core/services/quiz.service';
import * as XLSX from 'xlsx';

interface OptionForm { text: string; isCorrect: boolean; color: string; }
interface QuestionForm { text: string; imageUrl: string; timeLimit: number; points: number; options: OptionForm[]; }
interface RoundForm { name: string; collapsed: boolean; questions: QuestionForm[]; }

const OPTION_COLORS = ['#e21b3c', '#1368ce', '#d89e00', '#26890c'];

function blankQuestion(): QuestionForm {
  return { text: '', imageUrl: '', timeLimit: 20, points: 1000, options: OPTION_COLORS.map(color => ({ text: '', isCorrect: false, color })) };
}

@Component({
  selector: 'app-quiz-editor',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="page-container">
      <h1>{{ isEdit ? 'Edit Quiz' : 'Create New Quiz' }}</h1>
      @if (error) { <div class="alert-error">{{ error }}</div> }
      @if (importMsg) { <div class="alert-success">{{ importMsg }}</div> }

      <section class="card mt-3">
        <h2>Quiz Details</h2>
        <div class="field mt-2">
          <label>Title *</label>
          <input [(ngModel)]="title" placeholder="Give your quiz a catchy name" />
        </div>
        <div class="field mt-2">
          <label>Description</label>
          <textarea [(ngModel)]="description" placeholder="What is this quiz about?" rows="2"></textarea>
        </div>
        <div class="field mt-2">
          <label>
            <input type="checkbox" [(ngModel)]="isPublic" style="width:auto;margin-right:8px" />
            Make this quiz public
          </label>
        </div>
      </section>

      <section class="mt-4">
        <div class="questions-header">
          <h2>Rounds &amp; Questions ({{ totalQuestions() }} question{{ totalQuestions() !== 1 ? 's' : '' }} in {{ rounds.length }} round{{ rounds.length !== 1 ? 's' : '' }})</h2>
          <div class="header-actions">
            <button class="btn-secondary" (click)="downloadTemplate()" title="Download CSV template">⬇ Template</button>
            <button class="btn-secondary" (click)="fileInput.click()">📂 Import CSV / Excel</button>
            <input #fileInput type="file" accept=".csv,.xlsx,.xls" style="display:none" (change)="onFileSelected($event)" />
            <button class="btn-primary" (click)="addRound()">+ Add Round</button>
          </div>
        </div>

        @if (rounds.length === 0) {
          <div class="empty-questions card mt-2">
            <p>No rounds yet. Click <strong>+ Add Round</strong> to start, or import from CSV / Excel.</p>
            <p class="hint">CSV columns: <code>round, question, option_a, option_b, option_c, option_d, correct (A/B/C/D), time_limit, points</code></p>
          </div>
        }

        @for (round of rounds; track round; let ri = $index) {
          <div class="round-section mt-3">
            <div class="round-header">
              <button class="collapse-btn" (click)="round.collapsed = !round.collapsed">
                {{ round.collapsed ? '▶' : '▼' }}
              </button>
              <input class="round-name-input" [(ngModel)]="round.name" placeholder="Round name" />
              <span class="round-count">{{ round.questions.length }} Q</span>
              <button class="btn-primary btn-sm" (click)="addQuestion(ri)">+ Question</button>
              @if (rounds.length > 1) {
                <button class="btn-danger btn-sm" (click)="removeRound(ri)">✕ Round</button>
              }
            </div>

            @if (!round.collapsed) {
              @if (round.questions.length === 0) {
                <div class="empty-round card mt-1">
                  <p>No questions in this round yet. Click <strong>+ Question</strong> to add one.</p>
                </div>
              }

              @for (q of round.questions; track q; let qi = $index) {
                <div class="q-card card mt-2">
                  <div class="q-header">
                    <span class="q-num">{{ globalIndex(ri, qi) }}</span>
                    <input class="q-text" [(ngModel)]="q.text" placeholder="Type your question here…" />
                    <button class="btn-danger remove-btn" (click)="removeQuestion(ri, qi)">✕</button>
                  </div>
                  <div class="q-meta">
                    <label>Time: <input type="number" [(ngModel)]="q.timeLimit" min="5" max="120" style="width:70px" /> sec</label>
                    <label>Points: <input type="number" [(ngModel)]="q.points" min="100" max="2000" step="100" style="width:80px" /></label>
                  </div>
                  <div class="options-grid">
                    @for (opt of q.options; track opt; let j = $index) {
                      <div class="option-item" [style.border-color]="opt.color">
                        <input [(ngModel)]="opt.text" placeholder="Answer {{ j + 1 }}" />
                        <label class="correct-check" title="Mark as correct">
                          <input type="checkbox" [(ngModel)]="opt.isCorrect" />
                          ✓
                        </label>
                      </div>
                    }
                  </div>
                </div>
              }
            }
          </div>
        }
      </section>

      <div class="save-bar mt-4">
        <button class="btn-secondary" (click)="goBack()">Cancel</button>
        <button class="btn-primary" (click)="save()" [disabled]="saving">
          {{ saving ? 'Saving…' : (isEdit ? 'Save Changes' : 'Create Quiz') }}
        </button>
      </div>
    </div>
  `,
  styles: [`
    h1 { margin-bottom: 8px; }
    h2 { font-size: 1.2rem; }
    .field { label { display: block; font-weight: 600; margin-bottom: 6px; font-size: 0.875rem; } }
    .questions-header { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px; }
    .header-actions { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; button { padding: 10px 16px; } }

    /* Round section */
    .round-section { border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; overflow: hidden; }
    .round-header { display: flex; align-items: center; gap: 10px; background: rgba(168,85,247,0.08); padding: 12px 16px; flex-wrap: wrap; }
    .collapse-btn { background: none; border: none; color: var(--color-text); cursor: pointer; font-size: 0.8rem; padding: 4px 8px; border-radius: 4px; &:hover { background: rgba(255,255,255,0.1); } }
    .round-name-input { flex: 1; min-width: 140px; font-size: 1rem; font-weight: 700; background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.12); border-radius: 8px; padding: 8px 12px; color: inherit; }
    .round-count { color: var(--color-muted); font-size: 0.85rem; white-space: nowrap; }
    .btn-sm { padding: 8px 14px !important; font-size: 0.8rem; }

    .empty-round { padding: 16px; text-align: center; color: var(--color-muted); font-size: 0.9rem; border-radius: 0; margin: 0; border: none; }

    /* Question card */
    .q-card { padding: 20px; border-radius: 0; border-left: none; border-right: none; margin: 0; &:last-child { border-bottom: none; } }
    .q-header { display: flex; align-items: center; gap: 12px; margin-bottom: 12px; }
    .q-num { background: var(--color-purple); color: white; min-width: 32px; height: 32px; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 0.8rem; font-weight: 700; flex-shrink: 0; padding: 0 4px; }
    .q-text { flex: 1; font-size: 1rem; }
    .remove-btn { padding: 6px 12px; font-size: 0.75rem; flex-shrink: 0; }
    .q-meta { display: flex; gap: 24px; margin-bottom: 16px; font-size: 0.875rem; color: var(--color-muted); label { display: flex; align-items: center; gap: 8px; input { width: auto; padding: 6px 8px; } } }
    .options-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
    .option-item { display: flex; align-items: center; gap: 8px; border: 2px solid; border-radius: 8px; padding: 4px 4px 4px 12px; input[type=text] { flex: 1; background: transparent; border: none; padding: 8px 0; &:focus { border: none; } } }
    .correct-check { display: flex; align-items: center; padding: 8px; cursor: pointer; input { display: none; } color: rgba(255,255,255,0.4); font-size: 1.1rem; font-weight: 700; }
    .correct-check:has(input:checked) { color: #5ddb3f; }

    .save-bar { display: flex; justify-content: flex-end; gap: 12px; button { padding: 14px 28px; } }
    .alert-error { background: rgba(226,27,60,0.15); border: 1px solid var(--color-red); color: #ff6b8a; padding: 12px; border-radius: 8px; margin-bottom: 16px; font-size: 0.875rem; }
    .alert-success { background: rgba(38,137,12,0.15); border: 1px solid #26890c; color: #5ddb3f; padding: 12px; border-radius: 8px; margin-bottom: 16px; font-size: 0.875rem; }
    .empty-questions { padding: 24px; text-align: center; color: var(--color-muted); p { margin: 6px 0; } }
    .hint { font-size: 0.8rem; code { background: rgba(255,255,255,0.08); padding: 2px 6px; border-radius: 4px; font-size: 0.75rem; } }
  `],
})
export class QuizEditorComponent implements OnInit {
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;
  private quizSvc = inject(QuizService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  isEdit = false;
  quizId = '';
  title = '';
  description = '';
  isPublic = true;
  rounds: RoundForm[] = [{ name: 'Round 1', collapsed: false, questions: [] }];
  saving = false;
  error = '';
  importMsg = '';

  ngOnInit(): void {
    this.quizId = this.route.snapshot.params['id'];
    this.isEdit = !!this.quizId;
    if (this.isEdit) {
      this.quizSvc.getQuiz(this.quizId).subscribe((q) => {
        this.title = q.title;
        this.description = q.description || '';
        this.isPublic = q.isPublic;
        if (q.rounds && q.rounds.length > 0) {
          this.rounds = q.rounds.map(r => ({
            name: r.name,
            collapsed: false,
            questions: r.questions.map(question => ({
              text: question.text,
              imageUrl: question.imageUrl || '',
              timeLimit: question.timeLimit,
              points: question.points,
              options: question.options.map(o => ({ text: o.text, isCorrect: o.isCorrect ?? false, color: o.color })),
            })),
          }));
        } else if (q.questions && q.questions.length > 0) {
          // backward compat: flat questions → single round
          this.rounds = [{
            name: 'Round 1',
            collapsed: false,
            questions: q.questions.map(question => ({
              text: question.text,
              imageUrl: question.imageUrl || '',
              timeLimit: question.timeLimit,
              points: question.points,
              options: question.options.map(o => ({ text: o.text, isCorrect: o.isCorrect ?? false, color: o.color })),
            })),
          }];
        }
      });
    }
  }

  totalQuestions(): number {
    return this.rounds.reduce((sum, r) => sum + r.questions.length, 0);
  }

  globalIndex(ri: number, qi: number): string {
    let base = 0;
    for (let i = 0; i < ri; i++) base += this.rounds[i].questions.length;
    return `Q${base + qi + 1}`;
  }

  addRound(): void {
    this.rounds.push({ name: `Round ${this.rounds.length + 1}`, collapsed: false, questions: [] });
  }

  removeRound(ri: number): void {
    if (this.rounds.length <= 1) return;
    this.rounds.splice(ri, 1);
  }

  addQuestion(ri: number): void {
    this.rounds[ri].questions.push(blankQuestion());
    this.rounds[ri].collapsed = false;
  }

  removeQuestion(ri: number, qi: number): void {
    this.rounds[ri].questions.splice(qi, 1);
  }

  // ── Import ────────────────────────────────────────────────────────────────

  onFileSelected(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    (event.target as HTMLInputElement).value = '';
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target!.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows: any[] = XLSX.utils.sheet_to_json(ws, { defval: '' });
        const imported = this.parseRows(rows);
        if (imported.size === 0) {
          this.error = 'No valid questions found. Check that your file matches the template format.';
          return;
        }
        let total = 0;
        imported.forEach((questions, roundName) => {
          const existing = this.rounds.find(r => r.name.toLowerCase() === roundName.toLowerCase());
          if (existing) {
            existing.questions.push(...questions);
          } else {
            this.rounds.push({ name: roundName, collapsed: false, questions });
          }
          total += questions.length;
        });
        this.importMsg = `✅ Imported ${total} question${total !== 1 ? 's' : ''} successfully.`;
        setTimeout(() => this.importMsg = '', 5000);
        this.error = '';
      } catch (err) {
        this.error = 'Failed to parse file. Make sure it matches the template format.';
      }
    };
    reader.readAsArrayBuffer(file);
  }

  private parseRows(rows: any[]): Map<string, QuestionForm[]> {
    const result = new Map<string, QuestionForm[]>();
    for (const row of rows) {
      const r: Record<string, string> = {};
      for (const key of Object.keys(row)) {
        r[key.toLowerCase().replace(/\s+/g, '_')] = String(row[key]).trim();
      }
      const text = r['question'] || r['question_text'] || r['text'] || '';
      if (!text) continue;

      const roundName = r['round'] || r['round_name'] || r['round_title'] || 'Round 1';

      const optTexts = [
        r['option_a'] || r['a'] || '',
        r['option_b'] || r['b'] || '',
        r['option_c'] || r['c'] || '',
        r['option_d'] || r['d'] || '',
      ];

      const correctRaw = (r['correct'] || r['correct_answer'] || r['answer'] || 'A').toUpperCase();
      const correctLetters = new Set(correctRaw.split(/[,;]/));

      const options: OptionForm[] = optTexts.map((optText, idx) => ({
        text: optText,
        isCorrect: correctLetters.has(String.fromCharCode(65 + idx)) || correctLetters.has(String(idx + 1)),
        color: OPTION_COLORS[idx],
      }));

      const timeLimit = parseInt(r['time_limit'] || r['time'] || '20', 10) || 20;
      const points    = parseInt(r['points'] || r['point'] || '1000', 10) || 1000;

      const q: QuestionForm = { text, imageUrl: '', timeLimit, points, options };
      if (!result.has(roundName)) result.set(roundName, []);
      result.get(roundName)!.push(q);
    }
    return result;
  }

  downloadTemplate(): void {
    const templateRows = [
      { round: 'Round 1', question: 'What is the capital of France?', option_a: 'London', option_b: 'Paris', option_c: 'Berlin', option_d: 'Madrid', correct: 'B', time_limit: 20, points: 1000 },
      { round: 'Round 1', question: 'Which planet is closest to the Sun?', option_a: 'Venus', option_b: 'Earth', option_c: 'Mercury', option_d: 'Mars', correct: 'C', time_limit: 15, points: 1000 },
      { round: 'Round 2', question: 'What is 7 × 8?', option_a: '54', option_b: '56', option_c: '64', option_d: '48', correct: 'B', time_limit: 20, points: 1000 },
    ];
    const ws = XLSX.utils.json_to_sheet(templateRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Questions');
    XLSX.writeFile(wb, 'quizspark-template.xlsx');
  }

  // ── Save ─────────────────────────────────────────────────────────────────

  save(): void {
    if (!this.title.trim()) { this.error = 'Please enter a quiz title'; return; }
    if (this.totalQuestions() === 0) { this.error = 'Add at least one question'; return; }
    for (const round of this.rounds) {
      for (const q of round.questions) {
        if (!q.text.trim()) { this.error = 'All questions need text'; return; }
        if (!q.options.some(o => o.isCorrect)) { this.error = 'Mark at least one correct answer per question'; return; }
      }
    }
    this.error = '';
    this.saving = true;
    const payload: any = {
      title: this.title,
      description: this.description,
      isPublic: this.isPublic,
      rounds: this.rounds.map((r, idx) => ({
        name: r.name,
        orderIndex: idx,
        questions: r.questions,
      })),
    };
    const req = this.isEdit ? this.quizSvc.updateQuiz(this.quizId, payload) : this.quizSvc.createQuiz(payload);
    req.subscribe({
      next: () => this.router.navigate(['/dashboard']),
      error: (e) => { this.error = e.error?.message || 'Failed to save'; this.saving = false; },
    });
  }

  goBack(): void { this.router.navigate(['/dashboard']); }
}
