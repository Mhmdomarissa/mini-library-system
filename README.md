# Lexora — AI-Powered Library Management System

A full-stack library management system with **AI semantic search**, a **RAG librarian chatbot**, role-based access control, and a polished React frontend — built as a recruiter technical assessment.

| | Link |
|---|---|
| **Live Frontend** | [mini-library-system.vercel.app](https://mini-library-system.vercel.app) |
| **Live Backend** | [mini-library-system-production.up.railway.app](https://mini-library-system-production.up.railway.app/health) |
| **Source Code** | [github.com/Mhmdomarissa/mini-library-system](https://github.com/Mhmdomarissa/mini-library-system) |

---

## Features

### For Members
- Browse the full book catalogue with real-time keyword search and genre filters
- **AI Semantic Search** — describe what you're looking for in natural language and get results ranked by meaning, not just keywords
- **AI Librarian Chatbot** — a RAG-powered assistant that knows your reading history and the full catalogue; ask for recommendations, check availability, or explore genres
- Borrow books with enforced per-member limits and automatic due dates
- Return books with instant overdue detection and fine calculation
- Full borrow history with status filters (active / returned / overdue)
- **Google Sign-In** — one-click authentication alongside traditional email/password

### For Admins & Librarians
- Full CRUD on the book catalogue (create, edit, soft-delete)
- View and manage all borrow records across all users
- Force-return books on behalf of members
- Manage user accounts: assign roles (member → librarian → admin), activate/deactivate
- Debounced real-time search across books and users

---

## AI Features — What & Why

### Semantic Search
When a book is created, an **embedding vector** (1 536 dimensions) is generated using OpenAI's `text-embedding-3-small` model and stored alongside the document. At query time, the user's search is embedded and compared against all stored vectors using **cosine similarity**. This means searching *"a coming-of-age story set during a war"* finds relevant books even if those exact words never appear in any title or description.

### RAG Librarian Chatbot
The chat endpoint uses **Retrieval-Augmented Generation (RAG)**:
1. The user's question is embedded
2. The top-5 semantically similar books are retrieved from the catalogue
3. The user's last 5 borrow records are fetched for personalisation
4. All of this context is injected into a prompt sent to **GPT-4o-mini**
5. The model responds with real catalogue data — no hallucinated book titles

---

## Tech Stack

### Backend
| Layer | Technology |
|---|---|
| Runtime | Node.js 22 + TypeScript |
| Framework | Express 5 |
| Database | MongoDB 7 + Mongoose (replica set for ACID transactions) |
| Auth | Firebase Admin SDK |
| AI | OpenAI (`text-embedding-3-small` + `gpt-4o-mini`) |
| Validation | Zod |
| Logging | Winston (structured JSON) |
| Security | Helmet, express-rate-limit, CORS |

### Frontend
| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| UI | shadcn/ui + Tailwind CSS v4 |
| Server State | TanStack Query v5 |
| Forms | React Hook Form + Zod |
| Auth | Firebase Client SDK (email/password + Google) |
| Animation | Framer Motion |

---

## Architecture

### Backend — Three-Layer Separation

```
Route        → middleware chain (authenticate → requireRole → validate)
  ↓
Controller   → HTTP only: reads req, calls service, sends res
  ↓
Service      → business rules only: throws AppError, no req/res knowledge
  ↓
Repository   → database access only: always applies { isDeleted: false }
```

Services are fully unit-testable without Express. Controllers are trivially thin. Repositories can be swapped without touching business logic.

### Frontend — Feature-Based Slices

```
features/
  books/    → services.ts (API calls) + hooks/ (TanStack Query) + index.ts
  borrow/   → same pattern
  auth/     → context.tsx (Firebase AuthProvider)
  admin/    → services + hooks for user & borrow management
  chat/     → services + hooks for AI chatbot
```

No business logic in page components — pages compose feature hooks and shared UI primitives.

---

## API Summary

All endpoints require `Authorization: Bearer <firebase_id_token>` unless noted.

| Method | Endpoint | Role | Description |
|--------|----------|------|-------------|
| `GET` | `/api/auth/me` | any | Current user profile |
| `GET` | `/api/books` | any | Paginated book list with search/genre/status filters |
| `GET` | `/api/books/:id` | any | Single book by ID |
| `POST` | `/api/books` | admin, librarian | Create book (generates AI embedding) |
| `PATCH` | `/api/books/:id` | admin, librarian | Update book |
| `DELETE` | `/api/books/:id` | admin | Soft delete |
| `POST` | `/api/books/semantic-search` | any | AI semantic search `{ query, limit }` |
| `POST` | `/api/borrow/:bookId` | member | Borrow a book |
| `POST` | `/api/borrow/return/:borrowId` | member, admin, librarian | Return a book |
| `GET` | `/api/borrow/history` | member, admin, librarian | Own borrow history |
| `GET` | `/api/admin/borrow` | admin, librarian | All borrow records with filters |
| `GET` | `/api/admin/users` | admin | List all users |
| `PATCH` | `/api/admin/users/:id/role` | admin | Update user role |
| `PATCH` | `/api/admin/users/:id/status` | admin | Activate / deactivate user |
| `POST` | `/api/chat` | any | AI librarian chat `{ message }` |
| `GET` | `/health` | public | Health check (DB, uptime, memory) |

Full Postman collection: [`postman/`](postman/)

---

## Running Locally

### Prerequisites
- **Node.js 22+**
- **MongoDB 7** running as a replica set — or **Docker + Docker Compose**

### Option A — Docker Compose (recommended)

```bash
git clone https://github.com/Mhmdomarissa/mini-library-system.git
cd mini-library-system/backend
cp .env.example .env        # fill in your values (see table below)
docker compose up --build    # starts API + MongoDB replica set
```

API → `http://localhost:4000`

### Option B — Manual

```bash
# Terminal 1 — MongoDB as replica set
mongod --replSet rs0 --dbpath /tmp/mongodb-rs0 --port 27017 &
sleep 2 && mongosh --eval "rs.initiate()"

# Terminal 2 — Backend
cd backend
cp .env.example .env    # fill in your values
npm install && npm run dev

# Terminal 3 — Frontend
cd frontend
cp .env.example .env.local    # fill in your values
npm install && npm run dev    # → http://localhost:3000
```

---

## Environment Variables

### Backend (`backend/.env`)

| Variable | Required | Description |
|---|---|---|
| `PORT` | No | HTTP port (default: `4000`) |
| `NODE_ENV` | Yes | `development` or `production` |
| `MONGODB_URI` | Yes | MongoDB connection string (must be a replica set) |
| `FIREBASE_PROJECT_ID` | Yes | Firebase project ID |
| `FIREBASE_CLIENT_EMAIL` | Yes | Firebase service account email |
| `FIREBASE_PRIVATE_KEY` | Yes | Firebase service account private key (PEM format) |
| `OPENAI_API_KEY` | Yes | OpenAI API key for embeddings + chat |
| `ALLOWED_ORIGINS` | Prod | Comma-separated CORS origins (must be set in production) |
| `BORROW_DURATION_DAYS` | No | Loan period in days (default: `14`) |
| `MAX_ACTIVE_BORROWS` | No | Max concurrent borrows per member (default: `5`) |
| `FINE_PER_DAY` | No | Daily overdue fine in USD (default: `1.00`) |
| `LOG_LEVEL` | No | Winston log level (default: `info`) |

### Frontend (`frontend/.env.local`)

| Variable | Required | Description |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | Yes | Backend API base URL |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Yes | Firebase web API key |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Yes | Firebase auth domain |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Yes | Firebase project ID |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | Yes | Firebase web app ID |

> **Note:** No secrets are committed to this repository. Copy the `.env.example` files and fill in your own credentials.

---

## Testing with Postman

1. Import `postman/mini-library-system.postman_collection.json` into Postman
2. Import `postman/mini-library-system.postman_environment.json` (local) or `postman/mini-library-system.postman_environment.production.json` (production)
3. Fill in the `firebase_api_key` and password placeholders in the environment
4. The collection includes a **pre-request script** that automatically authenticates with Firebase and sets the Bearer token
5. Run the collection or individual requests

---

## Design Decisions

| Decision | Why |
|---|---|
| **ACID transactions for borrows** | A borrow involves 3 writes (check → decrement → create record). Without a transaction, concurrent requests can both read `availableCopies = 1` and both succeed, leaving the count at -1. The borrow limit check is also inside the transaction to prevent TOCTOU bugs. |
| **Cosine similarity in-memory** | At library scale (thousands of books), full in-memory cosine similarity over stored embedding vectors takes single-digit milliseconds. No vector database needed — simpler ops, same result. |
| **RAG chatbot** | Injecting real catalogue + borrow data as context means the model answers with actual book titles and availability, not hallucinations. |
| **Partial unique index on ISBN** | `{ isbn: 1, unique: true, partialFilterExpression: { isDeleted: false } }` — allows re-adding a previously deleted book while still enforcing uniqueness for active books. |
| **Firebase Auth (not custom JWT)** | Offloads token issuance, refresh, and revocation. Backend verifies tokens via Admin SDK in one middleware line. Eliminates the attack surface of home-grown JWT handling. |
| **Fines computed dynamically** | Never stored in DB. Derived from `dueDate` + `FINE_PER_DAY` on every read. No stale data, no background job, policy changes apply instantly. |

---

## Security

- **No secrets in git** — `.env` files are gitignored; Postman environments use `<YOUR_...>` placeholders
- **Firebase Admin SDK** — every request is token-verified server-side
- **Helmet** — security headers (HSTS, CSP, X-Frame-Options, noSniff)
- **CORS** — origin whitelist via `ALLOWED_ORIGINS` env var
- **Rate limiting** — per-IP via `express-rate-limit`, with stricter limits on borrow and chat endpoints
- **Soft deletes** — records are never physically removed; `isDeleted: false` is enforced at the repository layer
- **Embedding vectors never exposed** — `select: false` on the field + explicit strip in the service layer
- **No credential logging** — API keys and Firebase private keys are never written to any log sink
- **Role hardcoded to `member`** — new users can never self-assign elevated roles; the backend ignores any role from the client

---

## Deployment

### Backend → Railway
1. Connect Railway to the repo, set root directory to `backend/`
2. Railway auto-detects Node.js → runs `npm run build && npm start`
3. Add all env vars in the Railway dashboard
4. Set `NODE_ENV=production` and `ALLOWED_ORIGINS=https://mini-library-system.vercel.app`
5. Use **MongoDB Atlas** for the database (Atlas handles replica set internally)

### Frontend → Vercel
1. Connect Vercel to the repo, set root directory to `frontend/`
2. Add all `NEXT_PUBLIC_*` env vars in Vercel dashboard
3. Deploy — Vercel detects Next.js automatically

---

## Project Structure

```
├── backend/              Node.js / Express API
│   ├── src/
│   │   ├── controllers/    HTTP handlers (thin)
│   │   ├── services/       Business logic
│   │   ├── repositories/   Database access
│   │   ├── models/         Mongoose schemas
│   │   ├── routes/         Express routers
│   │   ├── middleware/     Auth, rate limit, validation, logging
│   │   └── utils/         AppError, pagination, response helpers
│   ├── Dockerfile
│   └── docker-compose.yml
├── frontend/             Next.js App Router
│   ├── app/              Pages + layouts
│   ├── components/       layout / shared / ui / rareui
│   ├── features/         books / borrow / auth / admin / chat
│   ├── lib/              API client, Firebase, env
│   └── types/
├── docs/                 Requirements, DB design, security, API contract
└── postman/              Collection + environments (local + production)
```

---

## How AI Tools Were Used

This project was developed with the assistance of **GitHub Copilot** for code completion, refactoring suggestions, and documentation drafting. All generated code was reviewed, tested, and edited to ensure correctness and adherence to the project's architectural decisions. The AI features (semantic search, RAG chatbot) are powered by the OpenAI API at runtime.

---

## Further Documentation

- [Backend README](backend/README.md) — deep-dive into architecture, borrow transactions, fine calculation, semantic search
- [API Contract](docs/06-api-contract.md)
- [Database Design](docs/03-database-design.md)
- [Security Policy](docs/04-security.md)
