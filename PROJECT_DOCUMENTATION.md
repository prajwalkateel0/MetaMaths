# MetaMaths — Complete Technical Documentation

> **MSc Dissertation Project** | University of Leicester | Supervisor: J Drake (jd472)  
> **Module:** CO7201 Individual Project  
> **Developer:** Prajwal (prajwalsk53@gmail.com)

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [System Architecture](#2-system-architecture)
3. [Tech Stack & Decisions](#3-tech-stack--decisions)
4. [Project Structure](#4-project-structure)
5. [Database Design](#5-database-design)
6. [Authentication & Security](#6-authentication--security)
7. [Frontend Architecture](#7-frontend-architecture)
8. [Backend Architecture](#8-backend-architecture)
9. [Key Features — Deep Dive](#9-key-features--deep-dive)
10. [External API Integrations](#10-external-api-integrations)
11. [Real-Time System (Socket.IO)](#11-real-time-system-socketio)
12. [AI Integration (Gemini)](#12-ai-integration-gemini)
13. [Email System](#13-email-system)
14. [API Reference Summary](#14-api-reference-summary)
15. [How to Run the Project](#15-how-to-run-the-project)
16. [Environment Variables](#16-environment-variables)
17. [How I Would Answer "How Did You Build This?"](#17-how-i-would-answer-how-did-you-build-this)

---

## 1. Project Overview

### What Is MetaMaths?

MetaMaths is a full-stack web application that lets secondary school teachers deliver mathematics lessons using real esports data. Instead of dry textbook problems, students answer maths questions generated from real-world data — League of Legends champion stats, Dota 2 hero win rates, CS2 match results, and more.

### Problem It Solves

Secondary school maths teachers struggle to engage students with abstract numerical concepts. Existing datasets are dry, and giving students raw access to spreadsheets is uncontrolled and risky. There was no purpose-built classroom tool that could:
- Let a teacher curate esports data safely
- Build visualisations and quizzes from it
- Run live classroom sessions for 30+ students simultaneously

### Key Differentiators

| Feature | What It Does |
|---|---|
| **Controlled data access** | Students see charts and questions — never raw spreadsheet rows |
| **Auto question generation** | Rule-based engine creates valid maths questions from any dataset |
| **Live sessions** | 30+ students answer in real-time with a live leaderboard |
| **AI enhancement** | Gemini 2.5 Flash rephrases questions (but never computes answers) |
| **Multi-role system** | Admin, Teacher, Student with different dashboards and access |
| **Automated emails** | 7 triggered email types (registration, session start, results, etc.) |

### Research Questions (Dissertation)

1. Can rule-based auto-generation produce mathematically valid questions from esports data?
2. How does a controlled interface model affect student engagement?
3. What patterns enable a Node/React stack to serve 30+ concurrent classroom users?

---

## 2. System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     USER'S BROWSER                           │
│   React SPA (port 5173)    │    Socket.IO WebSocket          │
└──────────────┬──────────────┼───────────────────────────────┘
               │ HTTPS REST   │ WSS
               │              │
          ┌────▼──────────────▼────────────────────────────┐
          │           Vite Dev Server (port 5173)           │
          │   Proxy: /api/* → localhost:3001                │
          │   Proxy: /socket.io/* → localhost:3001 (ws)     │
          └────────────────────┬───────────────────────────┘
                               │
          ┌────────────────────▼───────────────────────────┐
          │          Node.js / Express API (port 3001)      │
          │                                                  │
          │  Middleware stack:                               │
          │  Helmet → CORS → JSON → Cookie → Rate Limit     │
          │  → Auth JWT → RBAC → Zod Validate → Handler     │
          │                                                  │
          │  Modules: auth, datasets, charts, quizzes,      │
          │           classrooms, sessions, analytics,      │
          │           admin, notifications, llm (Gemini)    │
          │                                                  │
          │  Socket.IO  /sessions namespace                  │
          └──────┬──────────┬──────────┬────────────────────┘
                 │          │          │
          ┌──────▼──┐ ┌─────▼──┐ ┌────▼──────────────────┐
          │Postgres │ │ Redis  │ │   External APIs        │
          │ (data)  │ │(pubsub)│ │  OpenDota / PandaScore │
          │  :5432  │ │  :6379 │ │  Riot / Google Drive   │
          └─────────┘ └────────┘ │  Gemini / Gmail SMTP   │
                                  └───────────────────────┘
```

### Two-Server Model

The project runs as two separate processes during development:

- **Frontend** (`C:\MetaMaths`) — Vite dev server on port 5173
- **Backend** (`C:\MetaMaths\server`) — Express + Socket.IO on port 3001

Vite is configured to proxy all `/api/*` and `/socket.io/*` requests to port 3001, so the browser only ever talks to one origin (port 5173) — no CORS issues in development.

---

## 3. Tech Stack & Decisions

### Frontend

| Technology | Version | Why Chosen |
|---|---|---|
| **React** | 18.2 | Component model, massive ecosystem, hooks-based state |
| **Vite** | 5.1 | Lightning-fast HMR, esbuild bundler, excellent DX |
| **Tailwind CSS** | v4 | Utility-first, dark theme by default, custom `@layer` components |
| **TanStack Query** | 5 | Server state caching, auto-refetch, loading/error states built-in |
| **Zustand** | 5 | Minimal global state (auth, UI) without Redux complexity |
| **React Router** | v6 | Nested routes, `<Outlet>` pattern for role-based layouts |
| **React Hook Form + Zod** | latest | Type-safe forms, Zod schemas validated on both client and server |
| **Recharts** | 3 | Declarative React charting, supports 6 chart types we needed |
| **Socket.IO client** | 4 | WebSocket for live sessions with automatic reconnection |
| **Axios** | 1 | Interceptors for token injection + 401 refresh flow |
| **Lucide React** | latest | 160+ consistent icons, tree-shakeable |
| **PapaParse** | 5 | Browser-side CSV parsing for file upload preview |

### Backend

| Technology | Version | Why Chosen |
|---|---|---|
| **Node.js + Express** | 4.18 | Non-blocking I/O, perfect for real-time; team familiarity |
| **Prisma ORM** | 5.7 | Type-safe queries, migration system, excellent DX |
| **PostgreSQL** | 15 | Relational integrity for users/quizzes + JSONB for dataset rows |
| **Socket.IO** | 4.6 | WebSocket with Redis adapter for scaling; built-in rooms |
| **Redis** | 7 | Socket.IO pub/sub adapter; could add caching later |
| **Nodemailer** | 6.9 | Transactional email via Gmail SMTP App Password |
| **bcrypt** | 5.1 | Adaptive password hashing (cost 12) |
| **jsonwebtoken** | 9 | Stateless access tokens (15 min) + DB-backed refresh tokens (7 days) |
| **Multer** | 1.4 | Multipart CSV upload handling, memory storage |
| **Helmet** | 7 | OWASP security headers in one line |
| **express-rate-limit** | 7 | Brute-force protection on auth routes |
| **Zod** | 3 | Input validation — same schemas as frontend |

### AI

| Technology | Why |
|---|---|
| **Google Gemini 2.5 Flash** | Fast, cheap, capable; used ONLY for rephrasing (not computing answers) |

### External APIs

| API | Data | Auth |
|---|---|---|
| **OpenDota** | Dota 2 hero stats, pro players, pro matches, match history | Free — no key needed |
| **PandaScore** | LoL/CS2/Valorant/Dota teams, players, tournaments, matches | Bearer token |
| **Riot Games** | LoL champion stats (Data Dragon CDN), summoner lookup | API key header |
| **Google Drive** | Import any Google Sheet as a dataset | OAuth 2.0 |

---

## 4. Project Structure

```
C:\MetaMaths\                          ← Frontend root
├── src/
│   ├── main.jsx                       ← Entry point, QueryClientProvider
│   ├── App.jsx                        ← React Router setup, all routes
│   ├── index.css                      ← Tailwind v4 + custom CSS components
│   ├── pages/
│   │   ├── Landing.jsx                ← Public home page
│   │   ├── NotFound.jsx               ← 404 page
│   │   ├── Profile.jsx                ← User profile settings
│   │   ├── auth/                      ← Login, Register, ForgotPassword, VerifyEmail
│   │   ├── teacher/                   ← 13 teacher pages
│   │   │   ├── Dashboard.jsx
│   │   │   ├── Datasets.jsx / DatasetNew.jsx / DatasetDetail.jsx
│   │   │   ├── Charts.jsx / ChartBuilder.jsx
│   │   │   ├── Quizzes.jsx / QuizBuilder.jsx
│   │   │   ├── Classrooms.jsx / ClassroomDetail.jsx
│   │   │   ├── Session.jsx / SessionResults.jsx
│   │   │   └── Analytics.jsx
│   │   ├── student/                   ← 8 student pages
│   │   │   ├── Dashboard.jsx
│   │   │   ├── Classrooms.jsx / ClassroomDetail.jsx
│   │   │   ├── Session.jsx / SessionReview.jsx
│   │   │   ├── Results.jsx
│   │   │   └── Practice.jsx
│   │   └── admin/                     ← 5 admin pages
│   │       ├── Dashboard.jsx
│   │       ├── Users.jsx
│   │       ├── DataSources.jsx
│   │       └── Audit.jsx
│   ├── components/
│   │   ├── layout/
│   │   │   ├── AppLayout.jsx          ← Main app shell (sidebar + topbar)
│   │   │   ├── Sidebar.jsx            ← Collapsible role-based nav
│   │   │   ├── Topbar.jsx             ← Search + notifications + avatar
│   │   │   └── ProtectedRoute.jsx     ← Role guard + layout wrapper
│   │   └── ui/
│   │       ├── Toast.jsx              ← Toast notification system
│   │       ├── Modal.jsx              ← Generic modal dialog
│   │       ├── Spinner.jsx            ← Loading states
│   │       ├── EmptyState.jsx         ← Empty list placeholder
│   │       ├── ConfirmDialog.jsx      ← Delete confirmation modal
│   │       └── NotificationCenter.jsx ← Bell icon + notification dropdown
│   ├── features/
│   │   ├── charts/
│   │   │   └── ChartRenderer.jsx      ← Recharts wrapper (all 6 types)
│   │   ├── quizzes/
│   │   │   ├── QuestionEditor.jsx     ← Per-question type editor
│   │   │   └── AIEnhancePanel.jsx     ← Gemini rephrasing UI
│   │   ├── sessions/
│   │   │   ├── LiveSessionStage.jsx   ← Student question UI (all types)
│   │   │   ├── Leaderboard.jsx        ← Ranked leaderboard
│   │   │   └── AnswerDistribution.jsx ← Live answer breakdown chart
│   │   └── gamification/
│   │       ├── XPBar.jsx              ← Level progress bar
│   │       └── BadgeCelebration.jsx   ← Badge unlock toast
│   ├── store/
│   │   ├── authStore.js               ← Zustand: user, token, login/logout
│   │   └── uiStore.js                 ← Zustand: toasts, sidebar state
│   └── lib/
│       ├── api.js                     ← Axios instance + token refresh interceptor
│       └── socket.js                  ← Socket.IO connection manager
├── index.html                         ← Vite entry HTML
├── vite.config.js                     ← Vite + Tailwind plugin + proxy
├── tailwind.config.js                 ← Custom colors, animations
├── postcss.config.js                  ← PostCSS (no-op with Tailwind v4 Vite plugin)
├── package.json                       ← Frontend deps
└── docker-compose.yml                 ← PostgreSQL + Redis containers

C:\MetaMaths\server\                   ← Backend root
├── src/
│   ├── index.js                       ← Express app setup, route mounting
│   ├── config/
│   │   └── index.js                   ← All env vars in one place
│   ├── middleware/
│   │   ├── auth.js                    ← JWT verification, req.user injection
│   │   ├── rbac.js                    ← requireAdmin/Teacher/Student factories
│   │   ├── errorHandler.js            ← AppError class + global error handler
│   │   └── validate.js                ← Zod request body validator
│   ├── modules/
│   │   ├── auth/                      ← Register, login, refresh, logout, me
│   │   ├── users/                     ← Profile read/update, password change
│   │   ├── datasets/                  ← CSV upload, API imports, rows, aggregate
│   │   ├── charts/                    ← CRUD + preview endpoint + sharing
│   │   ├── quizzes/                   ← CRUD + generate + publish + practice
│   │   │   └── llm.routes.js          ← Gemini enhance/hint/explain/context
│   │   ├── classrooms/                ← CRUD + join + members + sessions
│   │   ├── sessions/                  ← State, results, export, distribution, answer
│   │   ├── analytics/                 ← Student/teacher/classroom/admin stats
│   │   ├── admin/                     ← User management, audit log, data sources
│   │   └── notifications/             ← List, mark read, mark all read
│   ├── realtime/
│   │   └── socket.js                  ← Socket.IO event handlers
│   ├── generators/
│   │   └── questionGenerator.js       ← Rule-based Q generation engine
│   ├── integrations/
│   │   ├── email.js                   ← Nodemailer + 7 HTML email templates
│   │   └── google-drive.js            ← OAuth + listSheets + importSheet
│   └── db/
│       ├── seed.js                    ← Demo accounts + Dota 2 dataset + classroom
│       └── prisma/
│           └── schema.prisma          ← All 14 models + enums
├── prisma/
│   └── schema.prisma                  ← Prisma expects schema here (copy)
├── .env                               ← All secrets (never committed)
├── .env.example                       ← Template for others
└── package.json                       ← Backend deps
```

---

## 5. Database Design

### Why PostgreSQL with JSONB?

The app needs relational integrity (users→classrooms→sessions) but also flexible schema for datasets (every CSV has different columns). PostgreSQL solves both:
- Relational tables for structured data (users, quizzes, answers)
- `JSONB` columns for flexible data (dataset rows, chart configs, question options)

### All 14 Models

```
User
├── id (UUID, PK)
├── email (unique)
├── passwordHash
├── role (admin | teacher | student)
├── displayName, avatarUrl
├── emailVerified, isActive
└── createdAt, updatedAt

RefreshToken
├── id, userId (FK → User)
├── tokenHash (bcrypt of random UUID)
├── expiresAt, revokedAt
└── userAgent, ip (for audit)

Classroom
├── id, teacherId (FK → User)
├── name, description, keyStage
├── joinCode (unique, 6-char alphanumeric)
├── approvalRequired, isArchived
└── createdAt

ClassroomMember               ← Join table
├── PK: (classroomId, studentId)
├── status (pending | active | removed)
└── joinedAt

ClassroomChart                ← Join table
├── PK: (classroomId, chartId)
└── sharedAt

Dataset
├── id, ownerId (FK → User)
├── title, description
├── sourceType (csv_upload | api_riot | api_opendota | api_pandascore | google_drive)
├── sourceMetadata (JSON: API params, fileId, etc.)
├── schema (JSON: [{name, type}])
├── rowCount, tags
└── isPublic, refreshedAt, createdAt

DatasetRow
├── id (BigInt, autoincrement)
├── datasetId (FK → Dataset, indexed)
├── row (JSON: the actual data object)
└── rowIndex

Chart
├── id, datasetId (FK), ownerId (FK)
├── title, chartType (bar/line/pie/scatter/area/radar)
├── config (JSON: axes, aggregation, colors, labels)
├── annotations (JSON, optional)
└── isPublic, createdAt

Quiz
├── id, ownerId (FK), classroomId (FK)
├── title, topic, difficulty
├── settings (JSON: timers, shuffle, show_answers)
├── status (draft | published | archived)
└── createdAt

Question
├── id, quizId (FK)
├── questionType (mcq | true_false | numeric | short_answer | fill_blank)
├── prompt (string)
├── options (JSON, for MCQ/T-F)
├── correctAnswer (JSON)
├── tolerance (float, for numeric ±)
├── points, timeLimitSec
├── generated (bool), generatorMeta (JSON: {topic, field})
└── orderIndex

Session
├── id, classroomId (FK), quizId (FK), teacherId (FK)
├── status (waiting | active | paused | ended)
├── mode (live | async)
├── startedAt, endedAt
├── currentQuestionIndex (incremented by teacher:control 'next')
└── state (JSON: per-question state)

Answer
├── id
├── sessionId, questionId, studentId (FKs)
├── UNIQUE: (sessionId, questionId, studentId)  ← prevents duplicates
├── response (JSON: {value: ...})
├── isCorrect (bool)
├── pointsAwarded (int)
└── submittedAt

AuditLog
├── id (BigInt, autoincrement)
├── userId (FK, optional), action, entityType, entityId
├── metadata (JSON), ip
└── createdAt

Notification
├── id, userId (FK)
├── type, payload (JSON)
├── readAt (null = unread)
└── createdAt
```

### Key Design Decisions

| Decision | Reason |
|---|---|
| UUID primary keys everywhere | No sequential ID guessing, works across distributed systems |
| JSONB for dataset rows | Each CSV has different columns — no migration needed per dataset |
| Composite PK on ClassroomMember/Answer | Prevents joining twice or answering twice |
| Soft deletes (isArchived, revokedAt) | Preserves history, easier to restore |
| JSONB for chart config | Chart builder stores entire config; reproducible from JSON alone |
| RefreshToken in DB (not just cookie) | Enables token revocation (logout, password change, suspicious activity) |

---

## 6. Authentication & Security

### Authentication Flow

```
REGISTRATION:
  Browser → POST /auth/register {email, password, displayName, role}
  Server:  1. Check email not already used
           2. bcrypt.hash(password, cost=12)
           3. Create user in DB
           4. Send verification email (async, non-blocking)
           5. Send welcome email (async)
           6. Return { userId }

LOGIN:
  Browser → POST /auth/login {email, password}
  Server:  1. Find user by email
           2. bcrypt.compare(password, hash)
           3. Sign JWT (payload: sub, email, role, displayName; expires: 15min)
           4. Generate random UUID refresh token → bcrypt hash → store in DB
           5. Set refresh token as HttpOnly Secure SameSite=Strict cookie
           6. Return { accessToken, user }

AUTHENTICATED REQUEST:
  Browser → GET /api/v1/datasets (Authorization: Bearer <accessToken>)
  Server:  1. authMiddleware: jwt.verify(token, JWT_SECRET) → req.user
           2. requireTeacher: check req.user.role in ['teacher', 'admin']
           3. Business logic executes

TOKEN REFRESH (auto-triggered by Axios interceptor):
  Browser: Receives 401 → pauses all pending requests
  Browser → POST /auth/refresh (sends cookie automatically)
  Server:  1. Extract refreshToken from cookie
           2. Find matching hashed token in DB (not revoked, not expired)
           3. Revoke old token
           4. Issue new access token + new refresh token
           5. Set new cookie
  Browser: Retries all paused requests with new token

LOGOUT:
  Browser → POST /auth/logout
  Server:  1. Find and revoke refresh token in DB
           2. Clear cookie
```

### Security Measures

| Measure | Implementation |
|---|---|
| Password hashing | bcrypt cost 12 (≥ OWASP recommendation) |
| JWT access tokens | 15-minute expiry, HS256 signed |
| Refresh tokens | Random UUID, bcrypt hashed in DB, 7-day expiry |
| HttpOnly cookies | Refresh token inaccessible to JavaScript |
| RBAC | `requireAdmin`, `requireTeacher`, `requireStudent` middleware |
| Student data isolation | `/datasets/:id/rows` blocked for students; only chart-derived data accessible |
| Rate limiting | 200 req/min global; 20 req/15min on auth routes |
| Security headers | Helmet (X-Frame-Options, X-Content-Type, HSTS, etc.) |
| Input validation | Zod on all request bodies |
| SQL injection prevention | Prisma ORM parameterised queries |
| CORS | Whitelist frontend origin only, credentials: true |
| Audit log | Every admin action logged with userId, action, entityId, IP |

---

## 7. Frontend Architecture

### Entry Point Flow

```
index.html → main.jsx → QueryClientProvider → App.jsx → BrowserRouter → Routes
```

`main.jsx` wraps the entire app in TanStack Query's `QueryClientProvider` so any component can fetch data with `useQuery`.

`App.jsx` defines all routes. Protected routes use `<ProtectedRoute role="teacher">` which:
1. Checks `accessToken` exists (else redirect to `/login`)
2. Checks `user.role` matches required role (else redirect appropriately)
3. Wraps children in `<AppLayout>` (Sidebar + Topbar + main content)

### State Management

**Two stores, two responsibilities:**

```javascript
// authStore.js — Zustand with localStorage persistence
{
  user: { id, email, role, displayName },
  accessToken: "eyJ...",
  login(email, password) → calls POST /auth/login, stores token
  logout()              → calls POST /auth/logout, clears storage
  fetchMe()             → calls GET /auth/me on app startup
  isTeacher()           → role === 'teacher' || 'admin'
}

// uiStore.js — Zustand (no persistence)
{
  toasts: [],          // auto-dismiss after 4 seconds
  sidebarOpen: true,
  toast.success("Message") → adds toast → auto-removes
  toggleSidebar()
}
```

**TanStack Query** handles all server data:
- `useQuery(['datasets'])` → GET /datasets, cached 30s
- `useMutation` → POST/PATCH/DELETE, invalidates related queries on success
- No manual loading states or error handling boilerplate

### Routing Structure

```
/ ──────────────────────────── Landing (public)
/login, /register ──────────── Auth pages (no layout)
/verify-email ──────────────── Email verification

/t (ProtectedRoute: teacher)
  /dashboard ─────────────── Teacher overview + quick actions
  /datasets ──────────────── Dataset list with source badges
  /datasets/new ──────────── Import wizard (CSV/API/Drive)
  /datasets/:id ──────────── Schema + data preview + pagination
  /charts ────────────────── Chart gallery
  /charts/builder ────────── Two-panel chart builder
  /charts/builder/:id ────── Edit existing chart
  /quizzes ───────────────── Quiz list with status badges
  /quizzes/builder ───────── Quiz builder with AI enhance
  /quizzes/builder/:id ───── Edit existing quiz
  /classrooms ────────────── Classroom cards with join codes
  /classrooms/:id ────────── Members + sessions + start modal
  /sessions/:id ──────────── Live session control panel
  /sessions/:id/results ──── Post-session breakdown
  /analytics ─────────────── Charts + student performance table

/s (ProtectedRoute: student)
  /dashboard ─────────────── XP, score history, assigned quizzes
  /classrooms ────────────── Join + list enrolled classes
  /classrooms/:id ────────── Active session banner + charts
  /sessions/:id ──────────── Live quiz interface
  /sessions/:id/review ───── Post-session answer review
  /results ───────────────── Score history + topic breakdown
  /practice ──────────────── Self-paced quiz generation

/admin (ProtectedRoute: admin)
  /dashboard ─────────────── KPIs + system health
  /users ─────────────────── User management table
  /data-sources ──────────── API key configuration
  /audit ─────────────────── Audit log viewer

/profile ── (any role) ── Profile settings
```

### API Communication

`src/lib/api.js` — Axios instance configured once, used everywhere:

```javascript
// Every request automatically gets the token:
api.interceptors.request.use(config => {
  const token = localStorage.getItem('accessToken')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// On 401, refresh and retry (transparent to components):
api.interceptors.response.use(null, async error => {
  if (error.response?.status === 401 && !error.config._retry) {
    // Pause all requests, refresh token, retry all
  }
})
```

### WebSocket

`src/lib/socket.js` — singleton Socket.IO client:
- Connects to `/sessions` namespace on demand (when entering a live session)
- Disconnects on cleanup (useEffect return)
- JWT token passed in `auth` field of handshake

---

## 8. Backend Architecture

### Middleware Stack Order

```javascript
// index.js — order matters!
app.use(helmet())              // 1. Security headers first
app.use(cors({...}))           // 2. CORS
app.use(express.json({limit:'2mb'})) // 3. Parse JSON body
app.use(cookieParser())        // 4. Parse cookies (for refresh token)
app.use(globalRateLimit)       // 5. Global 200 req/min limit
// routes...
app.use(authLimiter, authRoutes) // 6. Stricter 20/15min on auth
app.use(404handler)            // 7. Catch-all 404
app.use(errorHandler)          // 8. Must be LAST
```

### Module Pattern

Every feature follows the same pattern:

```
routes.js ──calls──→ service/business logic ──calls──→ Prisma (database)
```

Example for auth:
- `auth.routes.js` — HTTP request/response only (extract body, set cookie)
- `auth.service.js` — business logic (bcrypt, jwt.sign, email send)
- Prisma client — direct DB calls (no separate repo layer for simplicity)

### Error Handling

`AppError` class used throughout:
```javascript
throw new AppError('Email already registered', 409, 'EMAIL_EXISTS')
```

The global `errorHandler` middleware catches everything:
- ZodError → 400 with field-level errors array
- AppError → uses its status and message
- Unknown errors → 500 in dev (with stack), generic message in prod

`asyncHandler` wraps every route to forward Promise rejections to errorHandler:
```javascript
router.get('/datasets', asyncHandler(async (req, res) => {
  // any throw here is caught automatically
}))
```

---

## 9. Key Features — Deep Dive

### 9.1 Dataset Import

**CSV Upload:**
1. Multer stores file in memory (max 10MB)
2. PapaParse parses the buffer with `dynamicTyping: true`
3. Schema auto-detection: samples first 100 rows per column → number / date / string
4. Chunked insert: rows split into groups of 1000 → `prisma.datasetRow.createMany()` per chunk
5. Entire CSV can have up to 100,000 rows

**API Import (OpenDota example):**
```
Teacher selects: Source=OpenDota, QueryType=heroStats, Limit=50
Frontend → POST /datasets/import/api { source:'api_opendota', params:{queryType:'heroStats', limit:50} }
Backend → fetchOpenDota({queryType:'heroStats', limit:50})
       → fetch('https://api.opendota.com/api/heroStats')
       → maps response to {id, name, win_rate, move_speed, ...}
       → creates Dataset record + DatasetRow records
Backend → responds with new dataset object
Frontend → navigates to /datasets/:id
```

### 9.2 Chart Builder

The chart builder is a two-panel React page:
- **Left panel** — dataset selector, chart type grid, field mapping dropdowns, aggregation, style tab (colours, labels, legend toggle)
- **Right panel** — live preview using `ChartRenderer` which wraps Recharts

When the teacher changes any config value:
1. TanStack Query re-fetches `POST /charts/preview` with the new config
2. Server runs the aggregation against real dataset rows
3. Returns computed `[{x, y, series...}]` data points
4. `ChartRenderer` re-renders the appropriate Recharts component

Config is stored as JSON, so charts are fully reproducible from their stored config.

**Chart types supported:** bar, line, pie, scatter, area, radar

### 9.3 Auto Question Generator

The rule-based engine (`questionGenerator.js`) never uses AI for answers:

```
Inputs:  datasetId, topic, difficulty, count
         ↓
Step 1:  Load up to 500 rows from PostgreSQL
         ↓
Step 2:  Detect numeric columns (for calculations) and string columns (for names)
         ↓
Step 3:  Select template cyclically from topic's template array
         ↓
Step 4:  Template's compute() function runs on real data → correct answer
         ↓
Step 5:  Build question object (with distractors for MCQ/easy)
         ↓
Output:  Question[] with verified correct_answer + metadata
```

**7 topics with templates:**

| Topic | Example Question Generated |
|---|---|
| averages | "What is the mean win_rate across all heroes?" |
| percentages | "What % of heroes have win_rate above the mean?" |
| ratios | "What is the ratio of mean hp to mean armor? (to 2 d.p.)" |
| comparison | "What is the range of move_speed values?" |
| probability | "What is P(randomly selected hero has win_rate > median)?" |
| trends | "Is win_rate increasing, decreasing, or stable?" |
| range_iqr | "Calculate the IQR of gold_per_min." |

**Difficulty system:**
- Easy → MCQ with ±30% wrong options, 1 point, 45 seconds
- Medium → Numeric input, 2 points, 30 seconds
- Hard → Numeric input (tighter tolerance), 3 points, 20 seconds

### 9.4 Live Session System

The live session uses Socket.IO for real-time communication:

```
Teacher creates session (waiting) → students join waiting room
         ↓
Teacher clicks "Begin"
  → Socket: teacher:control { action:'begin' }
  → Server: updates DB to active, broadcasts first question
  → Email: all classroom students notified (non-blocking)
  → Broadcast: question:start { question, timeLimit }
         ↓
Students answer (race to answer first)
  → Socket: answer:submit { questionId, response }
  → Server: validates answer, awards points, checks badge conditions
  → Socket: answer:ack { isCorrect, pointsAwarded, newBadges }
  → Server updates leaderboard → broadcasts leaderboard:update to room
  → Teacher sees live answer distribution (frontend polls /distribution every 2s)
         ↓
Teacher clicks "Next"
  → Broadcasts: question:end { correctAnswer, stats }
  → Broadcasts: question:start (next question)
         ↓
After last question or teacher clicks "End"
  → Status → ended
  → Broadcasts: session:ended to all in room
  → Email: each participating student gets personalised results email
```

**Answer idempotency:** The Answer table has a unique constraint on (sessionId, questionId, studentId) — students can't answer twice and race conditions are impossible.

### 9.5 Gamification

**Badge system (7 badges):**

| Badge | Emoji | Trigger |
|---|---|---|
| First Step | 🎯 | First ever answer submitted |
| Perfect Score | 🏆 | 100% on a session |
| On Fire | 🔥 | 3 consecutive correct answers |
| Unstoppable | ⚡ | 5 consecutive correct answers |
| Regular | 📚 | Attended 5 sessions |
| Podium | 🥉 | Finished top 3 in a session |
| Champion | 🥇 | Finished 1st in a session |

When a student answers, the server checks streak + totals and returns `newBadges[]` in the answer:ack event. The client shows `BadgeCelebration` — an animated toast that slides up from the bottom-centre for 4 seconds.

**XP Level system:**

| Level | Name | XP Required |
|---|---|---|
| 1 | Rookie | 0 |
| 2 | Apprentice | 50 |
| 3 | Scholar | 150 |
| 4 | Expert | 350 |
| 5 | Master | 700 |
| 6 | Legend | 1200 |

### 9.6 Session Results & Review

**Teacher view** (`/t/sessions/:id/results`):
- KPI cards: students, avg score, questions, 1st place
- Bar chart: per-question success rates (green/yellow/red based on %)
- Collapsible question list with detailed stats
- Full leaderboard
- CSV export button → `GET /sessions/:id/export/csv` → downloads spreadsheet

**Student view** (`/s/sessions/:id/review`):
- Large score display (colour-coded)
- Per-question breakdown: their answer vs correct answer, class % distribution bars for MCQ
- Option distribution shows how the whole class answered
- "Practice Weak Topics" button links to Practice page

---

## 10. External API Integrations

### OpenDota (Dota 2)

- **Free** — no API key needed (optional key for higher rate limits)
- Base URL: `https://api.opendota.com/api/`
- 4 query types: `heroStats`, `proPlayers`, `proMatches`, `player` (needs playerId)
- heroStats returns all ~120 heroes with win rates, stats, roles
- proMatches returns recent professional match results

### PandaScore (Multi-game)

- **Paid/Free tier** — Bearer token in Authorization header
- Base URL: `https://api.pandascore.co/{game}/`
- Games: `lol`, `cs2`, `valorant`, `dota2`, `rl` (Rocket League), `kog`
- 4 data types: `teams`, `players`, `tournaments`, `matches`
- Returns well-structured JSON with names, stats, dates

### Riot Games (League of Legends)

- **Developer key** — `X-Riot-Token` header
- Champion data uses **Data Dragon CDN** — no rate limits, always free:
  - `https://ddragon.leagueoflegends.com/cdn/{version}/data/en_US/champion.json`
  - Fetches latest version automatically
  - Returns 166 champions with HP, armor, attack damage, move speed, etc.
- Summoner lookup uses actual Riot API (rate-limited)

### Google Drive / Sheets

OAuth 2.0 flow:
1. Backend generates consent screen URL with scopes: `spreadsheets.readonly`, `drive.metadata.readonly`
2. User opens popup → grants access → Google redirects to callback
3. Callback exchanges code for tokens → sends to opener via `postMessage`
4. Frontend posts tokens to `/gdrive/sheets` → lists user's spreadsheets
5. Teacher selects spreadsheet + optional sheet name → `/import/gdrive`
6. Backend reads values, auto-detects column types, stores as DatasetRow records

---

## 11. Real-Time System (Socket.IO)

### Why Socket.IO Over Plain WebSockets?

Socket.IO provides:
- Automatic reconnection with exponential backoff
- Fallback to HTTP long-polling if WebSockets fail
- Built-in room management (session:<id>)
- Redis adapter for horizontal scaling
- Named events (much cleaner than raw WebSocket messages)

### Namespace & Auth

All session traffic uses the `/sessions` namespace. The JWT token is passed in the socket handshake:

```javascript
// Client
io('/sessions', { auth: { token: accessToken } })

// Server — middleware verifies before connection is accepted
sessionsNS.use((socket, next) => {
  socket.user = jwt.verify(socket.handshake.auth.token, JWT_SECRET)
  next()
})
```

### Room Naming

Each active session gets a room: `session:<uuid>`. All broadcasts target this room so only participants in that session receive events.

### Teacher Controls → Server Events

```
teacher:control {action: 'begin'}
  → DB: status='active', startedAt=now
  → Emit: question:start (to room)
  → Email: all students (non-blocking)

teacher:control {action: 'next'}
  → Emit: question:end (correct answer + stats)
  → DB: currentQuestionIndex++
  → Emit: question:start (next question)
  → If last question: session:ended

teacher:control {action: 'end'}
  → DB: status='ended', endedAt=now
  → Emit: session:ended
  → Email: all students with results (non-blocking)
```

### Redis Adapter

The `@socket.io/redis-adapter` is registered so multiple Node.js instances can share socket events. All instances subscribe to the same Redis pub/sub channel — if a student is on instance A and the teacher on instance B, the broadcast still reaches the student.

---

## 12. AI Integration (Gemini)

### Design Philosophy: Hybrid Rule + LLM

> "The rule engine computes the answer. Gemini only rephrases the question."

This is the core dissertation research insight. Pure LLM question generation is unsafe for mathematics education because:
- LLMs hallucinate numbers
- Results are non-deterministic
- Cannot be verified without ground truth

MetaMaths uses a hybrid approach:
1. Rule-based generator computes a **mathematically verified** correct answer from real data
2. Teacher reviews the auto-generated question
3. **Optionally**, Gemini rephrases the question text in 3 styles (formal, conversational, scenario)
4. Teacher picks their favourite wording
5. The correct answer is **never changed by AI**

### Gemini Endpoints

```
POST /api/v1/quizzes/llm/enhance
  → Generates 3 alternative phrasings of the same question
  → Returns: { versions: [{style, prompt}], teacherNote }

POST /api/v1/quizzes/llm/hint
  → Generates a pedagogical hint (no answer reveal)
  → Returns: { hint: "Think about..." }

POST /api/v1/quizzes/llm/explain
  → Explains why the correct answer is correct
  → Returns: { explanation: "..." }

POST /api/v1/quizzes/llm/generate-context
  → Wraps a stat in an esports narrative
  → Returns: { context: "In a recent match against..." }
```

### Model: gemini-2.5-flash

Chosen for:
- Speed (sub-2s responses)
- Cost efficiency (free tier covers dissertation testing)
- Sufficient capability for text rephrasing

---

## 13. Email System

### SMTP Configuration

Uses Gmail with an App Password (not the main account password):
- Host: `smtp.gmail.com`, Port: `587` (STARTTLS)
- All emails sent non-blocking (`Promise.catch(() => {})`)
- Server won't crash if email fails

### 7 Automated Emails

| # | Email | Trigger | Recipients |
|---|---|---|---|
| 1 | Email Verification | User registers | New user |
| 2 | Welcome | After registration | New user |
| 3 | Password Reset | Forgot password | User |
| 4 | Student Joined | Student joins classroom | Teacher |
| 5 | Quiz Assigned | Teacher starts async session | All active students |
| 6 | Live Session Starting | Teacher clicks Begin | All active students |
| 7 | Session Results | Teacher ends session | Each participating student |

### HTML Email Design

All emails use a shared `wrap()` function that produces:
- Dark themed HTML (slate header with blue/purple gradient)
- Responsive up to 560px max-width
- Branded with MetaMaths logo + university footer
- Score-based emoji encouragement on results email (🏆/🎉/👍/📚)
- Direct action buttons (Join Now, Review Answers, etc.)

---

## 14. API Reference Summary

### Base URL: `/api/v1`

All authenticated routes require: `Authorization: Bearer <accessToken>`

| Route | Auth | Role | Description |
|---|---|---|---|
| POST `/auth/register` | No | - | Create account |
| POST `/auth/login` | No | - | Get token |
| POST `/auth/refresh` | Cookie | - | Refresh token |
| POST `/auth/logout` | Cookie | - | Revoke token |
| GET `/auth/me` | Bearer | Any | Current user |
| GET `/datasets` | Bearer | Any | List own datasets |
| POST `/datasets/upload` | Bearer | Teacher | Upload CSV |
| POST `/datasets/import/api` | Bearer | Teacher | Import from API |
| GET `/datasets/gdrive/auth-url` | Bearer | Teacher | Start Google OAuth |
| POST `/datasets/gdrive/sheets` | Bearer | Teacher | List user's sheets |
| POST `/datasets/import/gdrive` | Bearer | Teacher | Import sheet |
| GET `/datasets/:id/rows` | Bearer | Teacher | Paginated rows |
| GET `/datasets/:id/aggregate` | Bearer | Teacher | Aggregated data |
| POST `/charts` | Bearer | Teacher | Create chart |
| POST `/charts/preview` | Bearer | Teacher | Preview chart data |
| POST `/quizzes` | Bearer | Teacher | Create quiz |
| POST `/quizzes/:id/generate` | Bearer | Teacher | Auto-generate Qs |
| POST `/quizzes/:id/publish` | Bearer | Teacher | Publish quiz |
| POST `/quizzes/llm/enhance` | Bearer | Teacher | AI rephrase |
| POST `/quizzes/llm/hint` | Bearer | Teacher | AI hint |
| POST `/classrooms` | Bearer | Teacher | Create classroom |
| POST `/classrooms/join` | Bearer | Any | Join by code |
| POST `/classrooms/:id/sessions` | Bearer | Teacher | Start session |
| GET `/sessions/:id` | Bearer | Any | Session state |
| POST `/sessions/:id/answer` | Bearer | Student | Submit answer |
| POST `/sessions/:id/control` | Bearer | Teacher | begin/next/pause/end |
| GET `/sessions/:id/results` | Bearer | Any | Full breakdown |
| GET `/sessions/:id/export/csv` | Bearer | Teacher | Download CSV |
| GET `/analytics/student/me` | Bearer | Student | Own stats |
| GET `/analytics/teacher/summary` | Bearer | Teacher | Dashboard stats |
| GET `/analytics/classroom/:id` | Bearer | Teacher | Classroom analytics |
| GET `/admin/users` | Bearer | Admin | All users |
| PATCH `/admin/users/:id` | Bearer | Admin | Suspend/role change |
| GET `/admin/audit` | Bearer | Admin | Audit log |
| GET `/notifications` | Bearer | Any | List notifications |

---

## 15. How to Run the Project

### Prerequisites

- Node.js 20+
- Docker Desktop (for PostgreSQL and Redis)

### Step 1 — Start Database and Redis

```cmd
cd C:\MetaMaths
docker compose up -d
```

This starts:
- PostgreSQL 15 on port 5432 (database: metamaths, user: postgres, password: password)
- Redis 7 on port 6379

### Step 2 — Set Up Backend

```cmd
cd C:\MetaMaths\server
npx prisma migrate dev --name init
node src/db/seed.js
npm run dev
```

The seed creates:
- 3 demo users (admin, teacher, student)
- 1 demo Dota 2 hero dataset (10 heroes)
- 1 demo classroom ("Year 10 Maths - Set 1", code: DEMO01)
- Student enrolled in the classroom

### Step 3 — Start Frontend (new terminal)

```cmd
cd C:\MetaMaths
npm run dev
```

### Step 4 — Open Browser

Go to **http://localhost:5173**

### Demo Accounts (password: `demo1234`)

| Role | Email |
|---|---|
| Admin | admin@demo.com |
| Teacher | teacher@demo.com |
| Student | student@demo.com |

---

## 16. Environment Variables

All stored in `C:\MetaMaths\server\.env` (never committed to git):

```env
# Database
DATABASE_URL="postgresql://postgres:password@localhost:5432/metamaths"

# Redis
REDIS_URL="redis://localhost:6379"

# JWT Secrets (change in production)
JWT_SECRET="metamaths-jwt-secret-change-in-prod"
JWT_REFRESH_SECRET="metamaths-refresh-secret-change-in-prod"

# Server
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:5173

# Email (Gmail App Password)
EMAIL_FROM="MetaMaths <your-email@gmail.com>"
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=xxxx xxxx xxxx xxxx   # 16-char app password, no spaces

# Esports APIs
RIOT_API_KEY=RGAPI-xxxx-xxxx-xxxx
OPENDOTA_API_KEY=               # Optional, free without
PANDASCORE_API_KEY=72s8Br0z... 

# AI
GEMINI_API_KEY=AIzaSyBxxxx
GEMINI_MODEL=gemini-2.5-flash

# Google Drive OAuth
GOOGLE_CLIENT_ID=859210xxxxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxxx
GOOGLE_REDIRECT_URI=http://localhost:3001/api/v1/datasets/import/gdrive/callback
```

---

## 17. How I Would Answer "How Did You Build This?"

*This section is written as a spoken explanation for a viva or interview.*

---

**"Can you walk me through how the application is structured?"**

> The application follows a two-server architecture. The frontend is a React SPA built with Vite that runs on port 5173. The backend is a Node.js/Express REST API with Socket.IO that runs on port 3001. During development, Vite proxies all `/api/` and WebSocket requests from 5173 to 3001, so the browser only ever sees one origin.
>
> The backend is organised into feature modules — auth, datasets, charts, quizzes, classrooms, sessions, analytics, admin, and notifications. Each module has its own routes file. The database is PostgreSQL accessed through Prisma ORM.
>
> PostgreSQL is a deliberate choice over MongoDB because the app has strongly relational data — users belong to classrooms, sessions belong to classrooms, answers belong to sessions and questions. But for the dataset rows themselves (which have different columns per CSV), I used JSONB columns so I don't need a database migration every time a teacher uploads a new dataset format.

---

**"How does authentication work?"**

> I implemented a dual-token system. When a user logs in, the server issues two things: a short-lived JWT access token (15 minutes) returned in the response body, and a long-lived refresh token (7 days) stored as an HttpOnly cookie.
>
> The access token is stored in localStorage and injected into every API request by an Axios interceptor. When it expires and a 401 comes back, the interceptor automatically calls the refresh endpoint (the browser sends the cookie automatically), gets a new access token, and retries the original request — completely transparent to the UI.
>
> The refresh token itself is never stored in plain text — it's a random UUID that gets bcrypt-hashed before going into the database. On logout or password change, the hash is revoked so old tokens can't be reused.

---

**"How does the live session work?"**

> The live session uses Socket.IO, which is a WebSocket library with fallback to HTTP long-polling. When a teacher starts a session, all the classroom students receive an email notification with a direct join link.
>
> Once in the session, students and teacher are all connected to the same Socket.IO room — named `session:<uuid>`. When the teacher clicks "Begin", the server broadcasts the first question to everyone simultaneously. Students submit answers via WebSocket, the server validates them against the stored correct answer, awards points, and immediately broadcasts an updated leaderboard.
>
> The teacher also sees a live answer distribution chart that shows exactly how many students chose each option — this polls the database every 2 seconds. When the teacher clicks "End", the server emails every participating student their personal score and rank.
>
> One important detail: the unique constraint on (sessionId, questionId, studentId) in the Answer table means a student can't answer the same question twice even if they try, and race conditions are impossible.

---

**"Tell me about the AI question generation — how does it avoid hallucination?"**

> This is the key research contribution. Pure LLM question generation is unsafe for maths education because language models hallucinate numbers and their answers are non-deterministic and unverifiable.
>
> MetaMaths uses a hybrid approach: a deterministic rule-based engine computes the mathematically correct answer from the actual dataset, and Gemini is only used to rephrase the question text. So the engine might produce "What is the mean win_rate across all heroes?" with the computed answer 48.7%. Gemini then generates three alternative phrasings — a formal academic version, a conversational teenager-friendly version, and one wrapped in an esports narrative. The teacher picks their favourite, but the answer never changes.
>
> This approach is referenced in the dissertation by Kurdi et al. (2020), who identified hallucination as the main failure mode of LLM-based question generation in educational contexts.

---

**"What were the main technical challenges?"**

> Three challenges stand out:
>
> **1. Token refresh race conditions.** When multiple API requests fire simultaneously and the access token expires, all of them get a 401. If each independently tried to refresh, you'd get multiple refresh requests, confusing the server. The solution was to queue all pending requests when a refresh starts, do the refresh once, then replay all queued requests with the new token.
>
> **2. Tailwind CSS v4 migration.** The project uses Tailwind v4 which moved the PostCSS plugin to a Vite plugin and changed how custom CSS components are defined. You can no longer `@apply` your own custom classes inside `@layer components` — you have to write the full utility string each time. This took some debugging to figure out.
>
> **3. Real-time scaling.** Socket.IO by default uses in-memory state, which breaks with multiple server instances. The Redis adapter means all instances subscribe to the same pub/sub channel — if the teacher is on server A and a student on server B, the answer still reaches the teacher's leaderboard.

---

*End of technical documentation.*

---

> **Document generated:** May 2026  
> **Project:** MetaMaths MSc Dissertation  
> **University of Leicester** | CO7201 Individual Project
