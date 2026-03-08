# QuizSpark

A real-time quiz game app built with **Angular**, **Node.js + Express**, **Socket.io**, and **PostgreSQL**.

---

## Project Structure

```
.
├── backend/      Node.js + Express + Socket.io + Prisma
└── frontend/     Angular 17 (standalone components)
```

---

## Features

- 🖊️ **Quiz Builder** — Create quizzes with multiple-choice questions, customizable time limits and point values
- 🔑 **Game PIN** — Host creates a session and shares a 6-digit PIN with players
- ⚡ **Real-time Gameplay** — Live countdowns, simultaneous answers, instant scoring via Socket.io
- 🏆 **Live Leaderboard** — Rankings update after every question
- 📊 **Analytics** — Per-question accuracy, average response time, and session history
- 🔒 **Auth** — JWT-based login/register

---

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL (running locally or via Docker)
- Angular CLI (`npm install -g @angular/cli`)

---

### 1. Backend Setup

```bash
cd backend
npm install

# Copy and edit the .env file
# Set your DATABASE_URL in .env

# Run database migrations (creates all tables)
npx prisma migrate dev --name init

# Start dev server
npm run dev
```

The backend runs at **http://localhost:3000**

---

### 2. Frontend Setup

```bash
cd frontend
npm install
ng serve
```

The Angular app runs at **http://localhost:4200**

---

## Environment Variables (backend/.env)

| Variable | Default | Description |
|---|---|---|
| `DATABASE_URL` | `postgresql://postgres:password@localhost:5432/quizspark` | PostgreSQL connection string |
| `JWT_SECRET` | `your-super-secret-jwt-key` | Secret for signing JWTs |
| `PORT` | `3000` | Backend port |
| `FRONTEND_URL` | `http://localhost:4200` | Allowed CORS origin |

---

## API Overview

| Method | Route | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/register` | ❌ | Register new user |
| POST | `/api/auth/login` | ❌ | Login |
| GET | `/api/auth/me` | ✅ | Get current user |
| GET | `/api/quizzes` | ❌ | List public quizzes |
| GET | `/api/quizzes/my` | ✅ | My quizzes |
| POST | `/api/quizzes` | ✅ | Create quiz |
| PUT | `/api/quizzes/:id` | ✅ | Update quiz |
| DELETE | `/api/quizzes/:id` | ✅ | Delete quiz |
| POST | `/api/sessions` | ✅ | Create game session |
| GET | `/api/analytics/quiz/:id` | ✅ | Quiz analytics |

## Socket.io Events

### Client → Server
| Event | Payload | Description |
|---|---|---|
| `host:join` | `{ pin }` | Host joins the session room |
| `host:start` | `{ pin }` | Start the game |
| `host:next` | `{ pin }` | Advance to next question |
| `player:join` | `{ pin, nickname }` | Player joins lobby |
| `player:answer` | `{ optionId }` | Player submits answer |

### Server → Client
| Event | Payload | Description |
|---|---|---|
| `lobby:update` | `{ players }` | Updated player list |
| `game:started` | — | Game has started |
| `question:start` | Question data | New question began |
| `question:end` | Results + leaderboard | Question time expired |
| `answer:received` | `{ isCorrect, pointsAwarded }` | Answer acknowledgment |
| `game:ended` | `{ leaderboard }` | Game is over |
