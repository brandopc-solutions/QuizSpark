import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { AuthResponse, User } from '../models/user.model';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly TOKEN_KEY = 'quizspark_token';
  currentUser = signal<User | null>(null);

  constructor(private http: HttpClient, private router: Router) {
    this.loadUser();
  }

  get token(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  get isLoggedIn(): boolean {
    return !!this.token;
  }

  /** Step 1 of register: create account, triggers OTP email */
  register(email: string, username: string) {
    return this.http
      .post<{ message: string; email: string }>(`${environment.apiUrl}/auth/register`, { email, username });
  }

  /** Step 1 of login: request OTP email */
  requestOtp(email: string) {
    return this.http
      .post<{ message: string; email: string }>(`${environment.apiUrl}/auth/request-otp`, { email });
  }

  /** Step 2 (shared): verify OTP and receive JWT */
  verifyOtp(email: string, otp: string) {
    return this.http
      .post<AuthResponse>(`${environment.apiUrl}/auth/verify-otp`, { email, otp })
      .pipe(tap((res) => this.handleAuth(res)));
  }

  logout(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    this.currentUser.set(null);
    this.router.navigate(['/']);
  }

  private handleAuth(res: AuthResponse): void {
    localStorage.setItem(this.TOKEN_KEY, res.token);
    this.currentUser.set(res.user);
  }

  private loadUser(): void {
    const token = this.token;
    if (!token) return;
    this.http.get<User>(`${environment.apiUrl}/auth/me`).subscribe({
      next: (user) => this.currentUser.set(user),
      error: () => this.logout(),
    });
  }
}
