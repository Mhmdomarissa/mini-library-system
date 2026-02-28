# Functional Requirements

## 1. Authentication

- Users register with **email + password** via Firebase Authentication (`POST /api/auth/signup`)
- Users sign in with **email + password** via Firebase Authentication (`POST /api/auth/signin`)
- The Firebase ID token is passed as `Authorization: Bearer <token>` on every protected request
- On first authenticated request the backend auto-upserts the user into MongoDB
- Users have roles: `admin`, `librarian`, `member` (default: `member`)
- Authenticated users can fetch their own profile (`GET /api/auth/me`)

## 2. Book Management

- **Admin / Librarian**: create, edit, soft-delete books
- **Any authenticated user**: list and search books (partial/regex text search by title, author, genre, description), view a single book
- Books have: title, author, ISBN, genre, description, publishedYear, totalCopies, availableCopies, status (`available | out_of_stock | archived`)
- Soft-delete: `isDeleted` flag; a deleted book's ISBN can be reused by a new book

## 3. Borrowing System

- Any authenticated user can borrow an available book
- Any authenticated user can return a book they borrowed; admin/librarian can return on behalf of any user
- Members view their own borrow history (`GET /api/borrow/history`)
- Admin/Librarian can view all borrow records with filters (`GET /api/admin/borrow`)

## 4. Borrowing Rules

- A member can have at most `MAX_ACTIVE_BORROWS` active borrowed books at the same time
- The value is configurable via environment variable
- Attempting to exceed the limit returns HTTP 400
- Due date is set to `LOAN_PERIOD_DAYS` days from borrow date (configurable)

## 5. Fine Calculation

- If a book is returned after its `dueDate`, a fine is calculated
- Fine formula: `fine = daysOverdue × FINE_PER_DAY`
- Fine is computed dynamically at return time and when fetching borrow history
- Fines are **not** persisted in the database

## 6. Semantic Search

- The system supports semantic book search using AI embeddings (`POST /api/books/semantic-search`)
- Users can search using natural language queries
- Results are ranked by vector cosine similarity
- Embeddings are generated via OpenAI `text-embedding-3-small` and stored per-book

## 7. Admin User Management

- **Admin only**:
  - List all users with optional role and status filters (`GET /api/admin/users`)
  - Update a user's role (`PATCH /api/admin/users/:id/role`)
  - Activate or deactivate a user account (`PATCH /api/admin/users/:id/status`)
- Deactivated users receive `403 Forbidden` on every protected route

## 8. Librarian Chatbot ✅

- Any authenticated user can send a natural-language question to the chatbot (`POST /api/chat`)
- The chatbot uses a **RAG (Retrieval-Augmented Generation)** approach:
  1. Embeds the user's message with OpenAI `text-embedding-3-small`
  2. Retrieves the **top 5 most similar books** from the catalogue (cosine similarity)
  3. Fetches the user's **last 5 borrow records** for personalised context
  4. Sends a system prompt + enriched context to **OpenAI `gpt-4o-mini`**
  5. Returns `{ reply, sources }` — sources are the books used as context
- Rate-limited to 10 requests per IP per 15 minutes (AI calls are expensive)

## AI Features

- Natural language semantic search ✅ (OpenAI embeddings + cosine similarity)
- Librarian chatbot ✅ (RAG — embeddings + borrow history + GPT-4o-mini)
- Smart book recommendations ⏳ (planned — future milestone)
- AI-generated book summaries ⏳ (planned — future milestone)

---

# Non-Functional Requirements

- Secure authentication (Firebase ID token validation on every protected route)
- Role-based access control (`admin | librarian | member`)
- Input validation via Zod schemas
- Scalable architecture (controller → service → repository layers)
- Pagination for all list endpoints
- Indexed search fields
- Proper error handling with consistent JSON error envelope
- Structured logging (Winston)
- Per-route rate limiting (express-rate-limit)
- CORS restricted to allowed origins in production
