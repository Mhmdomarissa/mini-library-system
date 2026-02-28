# Functional Requirements

## Authentication

- Users can sign in via Google SSO
- Users have roles (admin, librarian, member)

## Book Management

- Add book
- Edit book
- Delete book
- View books
- Search books

## Borrowing System

- Borrow book
- Return book
- Track borrow history
- Track overdue books

## 4. Borrowing Rules

- A member can have at most `MAX_ACTIVE_BORROWS` active borrowed books at the same time.
- The value is configurable via environment variable.
- Attempting to exceed the limit returns HTTP 400.

## 5. Fine Calculation

- If a book is returned after its `dueDate`, a fine is calculated.
- Fine formula: `fine = daysOverdue × FINE_PER_DAY`.
- Fine is computed dynamically at return time and when fetching borrow history.
- Fines are not persisted in the database.

## 6. Semantic Search

- The system supports semantic book search using AI embeddings.
- Users can search using natural language queries.
- Results are ranked by vector similarity, not just text match.

## AI Features

- Natural language semantic search ✅ (implemented — OpenAI embeddings + cosine similarity)
- Smart book recommendations ⏳ (planned — future milestone)
- AI-generated book summaries ⏳ (planned — future milestone)

# Non-Functional Requirements

- Secure authentication (JWT validation)
- Role-based access control
- Input validation
- Scalable architecture
- Pagination for list endpoints
- Indexed search fields
- Proper error handling
- Logging system
