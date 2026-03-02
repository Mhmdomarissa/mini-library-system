# Lexora — Backend

A production-grade RESTful API for a library management system built with **Node.js**, **TypeScript**, **Express**, **MongoDB** (Mongoose), **Firebase Auth**, and **OpenAI** embeddings.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Project Structure](#project-structure)
3. [Borrow System Design](#borrow-system-design)
4. [Fine Calculation](#fine-calculation)
5. [Semantic Search](#semantic-search)
6. [Docker & Infrastructure](#docker--infrastructure)
7. [Graceful Shutdown](#graceful-shutdown)
8. [Error Handling Philosophy](#error-handling-philosophy)
9. [Security](#security)
10. [Running Locally](#running-locally)
11. [Environment Variables](#environment-variables)
12. [API Reference](#api-reference)

---

## Architecture Overview

The backend follows a strict **three-layer architecture**:

```
HTTP Request
    │
    ▼
Controller          — HTTP only. Reads req, calls service, sends res.
    │                 Zero business logic. Zero DB access.
    ▼
Service             — Business rules only. Enforces invariants.
    │                 Zero knowledge of Express (no req/res).
    ▼
Repository          — Database access only. No business logic.
                      Returns plain data. isDeleted: false always applied here.
```

### Why this separation matters

**Controllers** are kept deliberately thin. They translate HTTP concepts (body, params, query, headers) into plain TypeScript values and forward them to the service. They never make DB calls directly because that would bypass business rule enforcement and make testing harder.

**Services** own all business logic: ISBN uniqueness, copy count guards, borrow limits, embedding generation, fine calculation. They throw typed `AppError` instances rather than HTTP codes — the service has no idea it's running inside Express. This makes the logic unit-testable in isolation and reusable across different transports.

**Repositories** provide a clean, named interface over Mongoose. They always apply `isDeleted: false` silently, so callers can never accidentally read deleted documents. They return Mongoose documents or plain lean objects, never raw query results. Swapping MongoDB for a different database would only require rewriting the repository layer.

---

## Project Structure

```
src/
├── app.ts                  Express app setup (middleware, routes, error handler)
├── server.ts               Entry point — DB connect, listen, graceful shutdown
├── config/
│   ├── database.ts         Mongoose connection
│   └── firebase.ts         Lazy-initialised Firebase Admin SDK
├── controllers/
│   ├── book.controller.ts
│   └── borrow.controller.ts
├── middleware/
│   ├── authenticate.ts     Firebase token verification → req.user
│   ├── rateLimiter.ts      Per-IP rate limiting via express-rate-limit
│   ├── requireRole.ts      Role-based access guard (admin / librarian / member)
│   ├── requestLogger.ts    Per-request structured logging (Winston)
│   └── validate.ts         Zod schema validation for body / query
├── models/
│   ├── Book.ts             Mongoose schema + IBook interface
│   ├── BorrowRecord.ts     Mongoose schema + IBorrowRecord interface
│   └── User.ts             Mongoose schema + IUser interface
├── repositories/
│   ├── book.repository.ts
│   └── borrow.repository.ts
├── routes/
│   ├── admin.routes.ts     Admin-only borrow management
│   ├── book.routes.ts      CRUD + semantic search
│   └── borrow.routes.ts    Member borrow / return / history
├── services/
│   ├── book.service.ts     Book business rules + semantic search
│   ├── borrow.service.ts   Borrow / return transactions
│   └── embedding.service.ts  OpenAI embedding generation
└── utils/
    ├── AppError.ts         Typed operational error with HTTP status
    ├── asyncHandler.ts     Wraps async controllers — no try/catch boilerplate
    ├── cosineSimilarity.ts Pure cosine similarity for semantic ranking
    ├── fine.ts             Fine calculation (pure function, no DB)
    ├── logger.ts           Winston structured logger
    ├── pagination.ts       Cursor-style pagination helpers
    ├── response.ts         Uniform success / error response envelope
    └── validationSchemas.ts  All Zod schemas in one place
```

---

## Borrow System Design

### Why Mongoose transactions?

A borrow operation needs to do three things atomically:

1. Check that the book has available copies
2. Decrement `availableCopies` on the Book document
3. Create a BorrowRecord document

Without a transaction, a race condition is possible: two concurrent requests both read `availableCopies = 1`, both pass the guard, and both write — leaving the count at -1 and two active borrow records for a book with only one copy.

A MongoDB multi-document transaction wraps all three writes in a single ACID unit. If any step fails, the entire operation rolls back.

### Why a replica set is required

MongoDB only supports multi-document transactions on replica sets (and sharded clusters). A standalone `mongod` instance does not support transactions. This is why both the local development setup and the Docker Compose configuration run MongoDB as a single-node replica set (`rs0`).

The Docker `mongo-init` container calls `rs.initiate()` exactly once after the Mongo container is healthy, then exits with code 0 — this is what unblocks the API container's `depends_on: service_completed_successfully` condition.

### Why the `MAX_ACTIVE_BORROWS` limit lives inside the transaction

The active-borrow cap (default: 5) is checked **inside the transaction**, not before it. Checking before the transaction is a classic TOCTOU (time-of-check / time-of-use) bug: the count might change between the check and the write. By querying `activeBorrows` inside the same session, MongoDB ensures the count is read consistently with the writes that follow.

```
transaction start
  → count active borrows for user (within session)
  → if count >= MAX_ACTIVE_BORROWS → abort → 409
  → decrement book.availableCopies
  → create BorrowRecord
transaction commit
```

---

## Fine Calculation

### Why computed dynamically, never persisted

Fines are calculated on-the-fly from `dueDate` and the current timestamp every time a borrow record is read. They are never stored in the database.

**Reasons:**

- **No stale data.** A persisted fine would need a background job to update it daily. Any gap in that job produces incorrect data silently.
- **Auditability.** The source of truth is `dueDate` (immutable) and `FINE_PER_DAY` (env var). The fine amount is always re-derivable from those two values.
- **Simplicity.** No migration required if the daily rate changes — old records remain accurate under the new rate from the day the env var is updated (which is the intended policy).

### Why `Math.ceil`

A member who returns a book one hour late is charged for a full day. `Math.ceil` reflects this: any fraction of a day counts as a complete day. This matches standard library practice and avoids gaming (returning 23 hours late to avoid a charge).

### Formula

```
daysOverdue = ceil((now - dueDate) / ms_per_day)
fine        = max(0, daysOverdue) * FINE_PER_DAY
```

The `max(0, ...)` guard ensures books returned early or on time always show a fine of exactly `0.00`.

---

## Semantic Search

### Approach: service-layer cosine similarity

Books are ranked by the cosine similarity between a query embedding and each book's stored embedding vector. The entire pipeline runs in the service layer — no MongoDB vector index, no aggregation pipeline.

```
POST /api/books/semantic-search  { "query": "...", "limit": 5 }

1. Validate limit (1–20, default 5)                      — service
2. generateEmbedding(query)  →  number[1536]             — OpenAI API
3. findAllWithEmbedding()    →  Book[]                   — repository (.select('+embedding'))
4. filter books without embedding                        — service
5. cosineSimilarity(queryVec, bookVec) for each book     — service
6. sort by score desc, slice to limit                    — service
7. strip embedding from results                          — service (NEVER exposed)
```

### Why no MongoDB vector index

The collection size is small (library catalogue, not a web index). Full in-memory similarity over thousands of documents takes single-digit milliseconds. Introducing Atlas Vector Search or a `$vectorSearch` aggregation stage would add significant operational complexity (Atlas-only, no local equivalent) for no measurable benefit at this scale.

If the catalogue grows to tens of thousands of books, an approximate nearest-neighbour index (HNSW) would be worth adding at the repository layer without changing anything above it.

### Why `select: false` on the embedding field

The embedding vector is 1536 floats — roughly **12 KB per document**. Including it in every book query would:

- Increase response payload size by orders of magnitude
- Risk accidentally exposing raw vectors to API consumers
- Slow down every non-semantic query

`select: false` means Mongoose omits the field from every query unless the caller explicitly adds `.select('+embedding')`. Only `findAllWithEmbedding()` does this, and the service strips the field before any result leaves the service layer.

### Why lazy OpenAI client initialisation

The OpenAI client is created on the **first call** to `generateEmbedding()`, not at module load time. This mirrors the same lazy-init pattern used for Firebase Admin SDK.

**Reason:** the server must start successfully even when `OPENAI_API_KEY` is not set — for local development without AI features, for CI environments, and for the Docker health check window before secrets are injected. If the key is missing and a caller tries to generate an embedding, the service throws a `503 Service Unavailable` with a safe message. The key itself is never logged.

### Why embedding is generated before the DB write

On book create, the embedding is generated **before** calling `bookRepository.create()`. If OpenAI is unavailable, the call throws 503 immediately and no book document is written. This avoids a half-valid state where a book exists but has no embedding and would be silently excluded from all semantic search results.

On book update, the embedding is only regenerated when `title`, `author`, or `description` are in the update payload. Updating `genre` or `totalCopies` never calls OpenAI.

---

## Docker & Infrastructure

### Why multi-stage build

The builder stage uses the full `node:22-alpine` image with all `devDependencies` installed — TypeScript, ts-node, ESLint, type stubs. The production stage starts fresh from the same base and only installs `dependencies` (`npm ci --omit=dev`), then copies the compiled `dist/` from the builder.

**Result:** the final image contains no TypeScript compiler, no source files, no test tooling. Image size is typically 60–70% smaller than a naive single-stage build.

### Why a replica set in Docker Compose

As described in the [Borrow System Design](#borrow-system-design) section, Mongoose transactions require a MongoDB replica set. The Docker setup replicates production conditions exactly — running a standalone Mongo in Docker and a replica-set Mongo in production would mean a class of bugs (transaction failures) is invisible locally.

### Why a separate `mongo-init` container

The replica set must be initialised with `rs.initiate()` exactly once, **after** Mongo is ready to accept connections, and **before** the API tries to connect. Putting this in the `mongo` container's entrypoint script would require a custom image. A separate one-shot container using the official `mongo:7` image keeps the setup self-contained and observable (its logs show the init result, its exit code is 0 on success).

Docker Compose's `service_completed_successfully` condition on `mongo-init` guarantees the API only starts once init is confirmed.

---

## Graceful Shutdown

The server listens for both `SIGTERM` (sent by Docker on `docker stop` or Kubernetes during pod eviction) and `SIGINT` (Ctrl-C in development).

**Shutdown sequence:**

```
SIGTERM / SIGINT received
    │
    ▼
server.close()          — Stop accepting new TCP connections.
                          In-flight requests continue to completion.
    │
    ▼ (callback fires when last request drains)
mongoose.connection.close(false)
                        — Drain the Mongo connection pool.
                          false = wait for in-progress ops (including open transactions)
                          rather than force-closing sockets.
    │
    ▼
process.exit(0)         — Clean exit. Container manager records success.
```

A 10-second hard-kill timeout (`setTimeout(...).unref()`) ensures a truly stuck request doesn't block a rolling deploy indefinitely. The `.unref()` means this timer does not keep the event loop alive on its own.

---

## Error Handling Philosophy

All errors flow through a single `AppError` class with an HTTP `statusCode` and a `message`. Controllers throw `AppError` (directly or via the service), and a single Express error handler at the bottom of `app.ts` converts it to a response envelope.

| Scenario | Status | Reason |
|---|---|---|
| Request body / query fails Zod validation | `400` | Client sent malformed input — fix your request |
| Missing or invalid Firebase token | `401` | Unauthenticated |
| Valid token, insufficient role | `403` | Authenticated but not authorised |
| Resource not found | `404` | Safe tombstone — no information leak about existence |
| Business rule violation (ISBN conflict, over-limit) | `409` | Conflict with current state |
| OpenAI / external service unavailable | `503` | Transient upstream error — retry later |
| Unhandled internal error | `500` | Something unexpected — message is generic, details are logged server-side |

**Raw provider errors are never forwarded to the client.** OpenAI error messages, MongoDB error messages, and Firebase error messages are swallowed and replaced with safe operational descriptions. This prevents information leakage and keeps the public API stable regardless of provider SDK changes.

---

## Security

- **Firebase Admin SDK** — tokens verified server-side on every request; the SDK public-key cache refreshes automatically.
- **Helmet** — sets security-relevant HTTP headers (HSTS, X-Frame-Options, CSP, etc.).
- **CORS** — origin whitelist configurable via env var.
- **Rate limiting** — per-IP via `express-rate-limit`; configurable window and max.
- **Soft deletes** — records are never physically removed; `isDeleted: false` is a Mongoose-level default on every query via the repository.
- **Embedding not exposed** — `select: false` on the embedding field plus explicit strip in the service layer ensures vectors never reach the API response.
- **No credential logging** — `OPENAI_API_KEY` and Firebase private key are never written to any log sink.

---

## Running Locally

### Prerequisites

- Node.js 22+
- A MongoDB instance running as a replica set on port 27017

  ```bash
  # One-liner for a local single-node replica set (mongod must already be installed)
  mongod --replSet rs0 --dbpath /tmp/mongodb-rs0 --port 27017 &
  sleep 2
  mongosh --eval "rs.initiate()"
  ```

### Install and start

```bash
cd backend
cp .env.example .env   # fill in your values
npm install
npm run dev
```

### With Docker

```bash
cd backend
docker compose up --build
```

- API: http://localhost:4000
- Mongo: mongodb://localhost:27017

---

## Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `PORT` | No | `3000` | HTTP port the API listens on |
| `NODE_ENV` | No | `development` | Runtime environment |
| `MONGODB_URI` | Yes | — | Full Mongoose connection string (must include `?replicaSet=rs0`) |
| `FIREBASE_PROJECT_ID` | Yes | — | Firebase project ID |
| `FIREBASE_CLIENT_EMAIL` | Yes | — | Firebase service account email |
| `FIREBASE_PRIVATE_KEY` | Yes | — | Firebase service account private key (PEM, newlines as `\n`) |
| `LOG_LEVEL` | No | `info` | Winston log level (`debug`, `info`, `warn`, `error`) |
| `BORROW_DURATION_DAYS` | No | `14` | Days before a borrowed book is overdue |
| `MAX_ACTIVE_BORROWS` | No | `5` | Maximum concurrent borrows per member |
| `FINE_PER_DAY` | No | `1` | Fine amount per overdue day (currency-neutral) |
| `OPENAI_API_KEY` | No | — | If unset, embedding endpoints return 503; server still starts |
| `ALLOWED_ORIGINS` | No* | — | Comma-separated list of permitted CORS origins. **Must be set in production.** Unset = allow all (dev only) |

---

## API Reference

### Auth

All endpoints require a Firebase ID token in the `Authorization: Bearer <token>` header.

### Books

| Method | Path | Role | Description |
|---|---|---|---|
| `GET` | `/api/books` | any | Paginated list with optional `search`, `genre`, `status` filters |
| `GET` | `/api/books/:id` | any | Single book by ID |
| `POST` | `/api/books` | admin, librarian | Create book (generates embedding) |
| `PATCH` | `/api/books/:id` | admin, librarian | Partial update (regenerates embedding if text fields change) |
| `DELETE` | `/api/books/:id` | admin | Soft delete |
| `POST` | `/api/books/semantic-search` | any | Semantic search by natural language query |

### Borrow

| Method | Path | Role | Description |
|---|---|---|---|
| `POST` | `/api/borrow/:bookId` | member | Borrow a book |
| `POST` | `/api/borrow/return/:borrowId` | member | Return a book |
| `GET` | `/api/borrow/history` | member | Own borrow history with fine calculation |
| `GET` | `/api/admin/borrow` | admin, librarian | All borrow records with filters |
| `POST` | `/api/admin/borrow/return/:borrowId` | admin, librarian | Force-return on behalf of member |

### Semantic Search Body

```json
{
  "query": "wizard magic fantasy",
  "limit": 5
}
```

- `query` — required, non-empty string
- `limit` — optional integer 1–20, default 5 (400 if > 20)
