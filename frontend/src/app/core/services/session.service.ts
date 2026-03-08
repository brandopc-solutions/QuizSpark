import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { GameSession } from '../models/session.model';

@Injectable({ providedIn: 'root' })
export class SessionService {
  private base = `${environment.apiUrl}/sessions`;

  constructor(private http: HttpClient) {}

  createSession(quizId: string) {
    return this.http.post<GameSession>(this.base, { quizId });
  }

  getMySessions() {
    return this.http.get<GameSession[]>(this.base);
  }

  getSession(id: string) {
    return this.http.get<GameSession>(`${this.base}/${id}`);
  }
}
