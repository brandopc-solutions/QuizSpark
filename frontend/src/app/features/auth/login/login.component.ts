import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="auth-page">
      <div class="auth-card card">

        @if (step === 'email') {
          <h2>Welcome back 👋</h2>
          <p class="subtitle">Enter your email and we'll send you a login code</p>
          @if (error) { <div class="alert-error">{{ error }}</div> }
          <form (ngSubmit)="sendCode()">
            <div class="field">
              <label>Email</label>
              <input type="email" [(ngModel)]="email" name="email"
                     placeholder="you@email.com" required autofocus />
            </div>
            <button type="submit" class="btn-primary full-width" [disabled]="loading || !email">
              {{ loading ? 'Sending code…' : 'Send Code' }}
            </button>
          </form>
          <p class="switch-link">Don't have an account? <a routerLink="/auth/register">Sign Up</a></p>
        }

        @if (step === 'otp') {
          <h2>📧 Check your email</h2>
          <p class="subtitle">We sent a 6-digit code to <strong>{{ email }}</strong></p>
          @if (error) { <div class="alert-error">{{ error }}</div> }
          @if (resent) { <div class="alert-ok">A new code was sent!</div> }
          <form (ngSubmit)="verify()">
            <div class="field">
              <label>Enter code</label>
              <div class="otp-boxes">
                @for (i of [0,1,2,3,4,5]; track i) {
                  <input
                    class="otp-box"
                    type="text"
                    inputmode="numeric"
                    maxlength="1"
                    [value]="otpDigits[i]"
                    (input)="onInput($event, i)"
                    (keydown)="onKeydown($event, i)"
                    (paste)="onPaste($event)"
                    [id]="'otp-login-' + i"
                  />
                }
              </div>
            </div>
            <button type="submit" class="btn-primary full-width"
                    [disabled]="loading || otp.length < 6">
              {{ loading ? 'Verifying…' : 'Sign In' }}
            </button>
          </form>
          <div class="bottom-links">
            <button class="link-btn" (click)="resendCode()" [disabled]="resending">Resend code</button>
            <button class="link-btn" (click)="step = 'email'; error = ''; resent = false">← Back</button>
          </div>
        }

      </div>
    </div>
  `,
  styles: [`
    .auth-page { display:flex; align-items:center; justify-content:center; min-height:calc(100vh - 72px); padding:20px; }
    .auth-card { width:100%; max-width:440px; }
    h2 { font-size:1.8rem; margin-bottom:8px; }
    .subtitle { color:var(--color-muted); margin-bottom:24px; strong { color:var(--color-text); } }
    .field { margin-bottom:16px; label { display:block; font-weight:600; margin-bottom:6px; font-size:0.875rem; } }
    .otp-boxes { display:flex; gap:10px; }
    .otp-box {
      width:52px; height:60px; text-align:center; font-size:1.4rem; font-weight:700;
      border:2px solid var(--color-border); border-radius:12px;
      background:var(--color-surface); color:var(--color-text); outline:none;
      transition:border-color 0.2s;
      &:focus { border-color:var(--color-purple); box-shadow:0 0 0 3px rgba(111,45,189,0.25); }
    }
    .full-width { width:100%; margin-top:8px; }
    .switch-link { text-align:center; margin-top:20px; color:var(--color-muted); a { color:var(--color-purple); font-weight:700; } }
    .bottom-links { display:flex; justify-content:space-between; margin-top:16px; }
    .link-btn { background:none; border:none; color:var(--color-purple); font-size:0.875rem; cursor:pointer; padding:0; &:hover { text-decoration:underline; } &:disabled { opacity:0.5; cursor:default; } }
    .alert-error { background:rgba(226,27,60,0.15); border:1px solid var(--color-red); color:#ff6b8a; padding:12px; border-radius:8px; margin-bottom:16px; font-size:0.875rem; }
    .alert-ok { background:rgba(0,200,100,0.1); border:1px solid #00c864; color:#00c864; padding:12px; border-radius:8px; margin-bottom:16px; font-size:0.875rem; }
  `],
})
export class LoginComponent {
  auth = inject(AuthService);
  router = inject(Router);

  step: 'email' | 'otp' = 'email';
  email = '';
  otpDigits: string[] = Array(6).fill('');
  error = '';
  loading = false;
  resending = false;
  resent = false;

  get otp(): string { return this.otpDigits.join(''); }

  sendCode(): void {
    this.error = '';
    this.loading = true;
    this.auth.requestOtp(this.email).subscribe({
      next: () => { this.step = 'otp'; this.loading = false; },
      error: (e) => { this.error = e.error?.message || 'Failed to send code'; this.loading = false; },
    });
  }

  resendCode(): void {
    this.resending = true;
    this.resent = false;
    this.otpDigits = Array(6).fill('');
    this.auth.requestOtp(this.email).subscribe({
      next: () => { this.resent = true; this.resending = false; },
      error: () => { this.resending = false; },
    });
  }

  verify(): void {
    this.error = '';
    this.loading = true;
    this.auth.verifyOtp(this.email, this.otp).subscribe({
      next: () => this.router.navigate(['/dashboard']),
      error: (e) => { this.error = e.error?.message || 'Invalid or expired code'; this.loading = false; },
    });
  }

  onInput(event: Event, index: number): void {
    const input = event.target as HTMLInputElement;
    const val = input.value.replace(/\D/g, '').slice(-1);
    this.otpDigits[index] = val;
    input.value = val;
    if (val && index < 5) document.getElementById(`otp-login-${index + 1}`)?.focus();
  }

  onKeydown(event: KeyboardEvent, index: number): void {
    if (event.key === 'Backspace' && !this.otpDigits[index] && index > 0) {
      this.otpDigits[index - 1] = '';
      document.getElementById(`otp-login-${index - 1}`)?.focus();
    }
  }

  onPaste(event: ClipboardEvent): void {
    const text = event.clipboardData?.getData('text').replace(/\D/g, '').slice(0, 6) || '';
    text.split('').forEach((d, i) => { this.otpDigits[i] = d; });
    event.preventDefault();
    document.getElementById(`otp-login-${Math.min(text.length, 5)}`)?.focus();
  }
}
