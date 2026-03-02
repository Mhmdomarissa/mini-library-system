# Lexora — AI-Powered Library Management System

A full-stack library management system built , demonstrating production-grade backend architecture, AI-powered semantic search, a RAG librarian chatbot, and a modern React frontend.

---

## Live Demo

| Service  | URL |
|----------|-----|
| Frontend | https://lexora.vercel.app *(Vercel)* |
| Backend  | https://lexora-api.up.railway.app *(Railway)* |

---

## Tech Stack

### Backend
| Layer | Technology | Why |
|---|---|---|
| Runtime | Node.js 20 + TypeScript | Type safety throughout; excellent ecosystem |
| Framework | Express 5 | Minimal, composable, industry standard |
| Database | MongoDB 7 + Mongoose | Flexible schema; transactions via replica set |
| Auth | Firebase Admin SDK | Offloads auth complexity; JWT verification in 1 line |
| AI | OpenAI `text-embedding-3-small` | High-quality embeddings at low cost |
| Logging | Winston | Structured JSON logs, configurable levels |
| Validation | Zod | Runtime schema validation matching TypeScript types |
| Security | Helmet, express-rate-limit, CORS | Defense-in-depth; sane production defaults |

### Frontend
| Layer | Technology | Why |
|---|---|---|
| Framework | Next.js 16 (App Router) | RSC, file-based routing, Vercel-native |
| UI | shadcn/ui + Tailwind CSS v4 | Accessible, unstyled primitives + utility classes |
| State | TanStack Query v5 | Server state caching, optimistic updates, stale-while-revalidate |
| Forms | React Hook Form + Zod | Performant uncontrolled forms with type-safe validation |
| Auth | Firebase Client SDK | Pairs with backend Firebase Admin for seamless auth flow |
| Animation | Framer Motion | Micro-interactions; page transitions |

---

## Architecture

### Backend — Strict Three-Layer Separation

```
HTTP Request
    │
    ▼
Route              — registers middleware chain (authenticate → requireRole → validate)
    │
    ▼
Controller         — HTTP only. Reads req, calls service, sends res.
    │                 Zero business logic. Zero DB access.
    ▼
Service            — Business rules only. Throws AppError.
    │                 Zero knowledge of Express (no req/res).
    ▼
Repository         — Database access only. Always applies { isDeleted: false }.
```

**Why this matters:** Services are fully unit-testable without spinning up Express. Controllers are trivially thin — impossible to accidentally mix HTTP concerns with business logic. Repositories can be swapped (e.g. MongoDB → PostgreSQL) without touching services.

### Frontend — Feature-Based Slice Architecture

```
features/
  books/
    services.ts     ← raw API calls (fetch wrappers)
    hooks/          ← TanStack Query hooks wrapping services
    index.ts        ← public barrel export
  borrow/ auth/ admin/ chat/  (same pattern)

components/
  layout/   shared/   ui/     rareui/
```

No business logic lives in page components. Pages compose feature hooks and shared UI primitives.

---

## Features

### Member
- Browse and keyword-search the full catalogue with availability status
- **Semantic (AI) search** — describe what you want in natural language
- Borrow a book (enforces per-member active-borrow limit)
- Return a book (automatic overdue detection + fine calculation)
- View full borrow history with status filter (active / returned / overdue)
- **AI Librarian chatbot** — RAG assistant with access to catalogue + personal borrow history

### Admin / Librarian
- Full CRUD on books (create, edit, delete, restore)
- View and manage all active borrows across members
- Manage user roles (promote member → librarian → admin)
- Debounced real-time search across books and users

---

## Design Decisions

### 1. Atomic Borrow Transactions (ACID)
A borrow involves three writes that must be atomic:
1. Check `availableCopies > 0`  
2. Decrement `availableCopies` on the Book  
3. Create a `BorrowRecord`

Without a transaction, two concurrent requests can both read `availableCopies = 1`, both pass the guard, and both succeed — leaving the count at `-1`. MongoDB multi-document transactions (requiring a replica set) solve this. The borrow limit check is also placed **inside** the transaction to avoid TOCTOU (time-of-check/time-of-use) bugs.

### 2. Semantic Search via Cosine Similarity
When a book is created or updated, an embedding vector (1536 dimensions, OpenAI `text-embedding-3-small`) is stored alongside the document. At query time, the search query is embedded, then compared against all stored vectors using cosine similarity, sorted by score. No vector database required at this scale — the computation is O(n) and fast enough for tens of thousands of books.

### 3. RAG Librarian Chatbot
The chat endpoint retrieves the user's active borrows + the top-k semantically relevant books (via the same embedding pipeline), injects them as context, and calls the OpenAI Chat Completions API. The model therefore answers with real catalogue data rather than hallucinating.

### 4. Partial Unique Index on ISBN
`Book` uses a partial index: `{ isbn: 1 }, { unique: true, partialFilterExpression: { isDeleted: false } }`. This allows multiple "deleted" records with the same ISBN (so a book can be deleted and re-added) while still enforcing uniqueness for active books.

### 5. Firebase Auth (not custom JWT)
Firebase handles token issuance, refresh, email/password sign-in, and revocation. The backend verifies tokens using the Firebase Admin SDK in a single middleware line. This eliminates a significant attack surface (token forgery, weak secrets, improper expiry handling) that a home-grown JWT implementation would introduce.

---

## API Summary

Full documentation: [`postman/`](postman/) — import the collection + environment into Postman.

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/api/books` | Public | Paginated book list, keyword search |
| `GET` | `/api/books/search` | Auth | Semantic (AI) search |
| `GET` | `/api/books/:id` | Auth | Single book |
| `POST` | `/api/books` | Admin | Create book |
| `PATCH` | `/api/books/:id` | Admin | Update book |
| `DELETE` | `/api/books/:id` | Admin | Soft delete |
| `POST` | `/api/borrow` | Auth | Borrow a book |
| `PATCH` | `/api/borrow/:id/return` | Auth | Return a book |
| `GET` | `/api/borrow/history` | Auth | Member borrow history |
| `GET` | `/api/admin/borrows` | Admin | All borrows |
| `GET` | `/api/admin/users` | Admin | All users |
| `PATCH` | `/api/admin/users/:id/role` | Admin | Update user role |
| `POST` | `/api/chat` | Auth | AI librarian chat |
| `POST` | `/api/auth/register` | Public | Register user |

---

## Running Locally

### Prerequisites
- Node.js 20+
- MongoDB 7 running as a replica set (`--replSet rs0`) **or** Docker + Docker Compose

### Option A — Docker Compose (recommended)

```bash
# 1. Clone
git clone https://github.com/your-username/lexora.git
cd lexora/backend

# 2. Copy env and fill values
cp .env.example .env

# 3. Start (API + MongoDB replica set)
docker-compose up --build
```

The API will be available at `http://localhost:4000`.

### Option B — Manual

```bash
# Terminal 1 — start MongoDB as replica set
mongod --replSet rs0 --port 27017
# In mongosh: rs.initiate()

# Terminal 2 — backend
cd backend
cp .env.example .env   # fill in your values
npm install
npm run dev            # ts-node with nodemon

# Terminal 3 — frontend
cd frontend
cp .env.example .env.local   # fill in your values
npm install
npm run dev            # http://localhost:3000
```

---

## Environment Variables

### Backend (`backend/.env`)

| Variable | Required | Description |
|---|---|---|
| `PORT` | No | HTTP port (default: 4000) |
| `NODE_ENV` | Yes | `development` or `production` |
| `MONGODB_URI` | Yes | MongoDB connection string (must be replica set) |
| `FIREBASE_PROJECT_ID` | Yes | Firebase project ID |
| `FIREBASE_CLIENT_EMAIL` | Yes | Firebase service account email |
| `FIREBASE_PRIVATE_KEY` | Yes | Firebase service account private key |
| `OPENAI_API_KEY` | Yes | OpenAI API key for embeddings + chat |
| `ALLOWED_ORIGINS` | Prod | Comma-separated CORS origins |
| `BORROW_DURATION_DAYS` | No | Loan period in days (default: 14) |
| `MAX_ACTIVE_BORROWS` | No | Max concurrent borrows per member (default: 5) |
| `FINE_PER_DAY` | No | Daily overdue fine in USD (default: 1.00) |
| `LOG_LEVEL` | No | Winston log level (default: info) |

### Frontend (`frontend/.env.local`)

| Variable | Required | Description |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | Yes | Backend API base URL |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Yes | Firebase web API key |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Yes | Firebase auth domain |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Yes | Firebase project ID |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | Yes | Firebase web app ID |

---

## Deployment

### Backend → Railway

1. Connect Railway to this repository
2. Set the root directory to `backend/`
3. Railway auto-detects Node.js and runs `npm run build && npm start`
4. Add all environment variables via Railway dashboard
5. Set `NODE_ENV=production` and `ALLOWED_ORIGINS=https://your-frontend.vercel.app`
6. Use **MongoDB Atlas** for the database (set `MONGODB_URI` to the Atlas connection string)

### Frontend → Vercel

1. Connect Vercel to this repository
2. Set the root directory to `frontend/`
3. Add all `NEXT_PUBLIC_*` environment variables in the Vercel dashboard
4. Deploy

---

## Project Structure

```
.
├── backend/          Node.js / Express API
│   ├── src/
│   │   ├── controllers/
│   │   ├── services/
│   │   ├── repositories/
│   │   ├── models/
│   │   ├── routes/
│   │   ├── middleware/
│   │   ├── utils/
│   │   └── config/
│   ├── Dockerfile
│   ├── docker-compose.yml
│   └── README.md      ← detailed backend docs
├── frontend/          Next.js App Router
│   ├── app/           pages + layouts
│   ├── components/    layout · shared · ui · rareui
│   ├── features/      books · borrow · auth · admin · chat
│   ├── lib/           api client · firebase · env
│   └── types/
├── docs/              requirements · DB design · API contract
└── postman/           Postman collection + environments
```

---

## Repository

- **Backend detailed docs:** [backend/README.md](backend/README.md)
- **API Contract:** [docs/06-api-contract.md](docs/06-api-contract.md)
- **DB Design:** [docs/03-database-design.md](docs/03-database-design.md)
