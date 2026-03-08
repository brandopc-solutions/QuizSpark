import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class AnalyticsService {
  private base = `${environment.apiUrl}/analytics`;

  constructor(private http: HttpClient) {}

  getQuizAnalytics(quizId: string) {
    return this.http.get<any>(`${this.base}/quiz/${quizId}`);
  }

  getSessionAnalytics(sessionId: string) {
    return this.http.get<any>(`${this.base}/session/${sessionId}`);
  }
}
