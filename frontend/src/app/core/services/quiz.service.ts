import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Quiz } from '../models/quiz.model';

@Injectable({ providedIn: 'root' })
export class QuizService {
  private base = `${environment.apiUrl}/quizzes`;

  constructor(private http: HttpClient) {}

  getPublicQuizzes() {
    return this.http.get<Quiz[]>(this.base);
  }

  getMyQuizzes() {
    return this.http.get<Quiz[]>(`${this.base}/my`);
  }

  getQuiz(id: string) {
    return this.http.get<Quiz>(`${this.base}/${id}`);
  }

  createQuiz(data: Partial<Quiz>) {
    return this.http.post<Quiz>(this.base, data);
  }

  updateQuiz(id: string, data: Partial<Quiz>) {
    return this.http.put<Quiz>(`${this.base}/${id}`, data);
  }

  deleteQuiz(id: string) {
    return this.http.delete<{ message: string }>(`${this.base}/${id}`);
  }
}
