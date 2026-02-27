# API Contract

- POST /books
- GET /books
- POST /borrow
- POST /return
- GET /recommendations

- Request body
- Response body
- Error format

---

# **Standard Response Envelope**

All endpoints return the same shape:

```json
{
  "success": true | false,
  "data": { ... } | null,
  "message": "string (on error)",
  "errors": [ { "field": "string", "message": "string" } ] | null
}
```

---

# **Error Format**

```json
{
  "success": false,
  "message": "Human-readable message",
  "errors": [
    { "field": "isbn", "message": "ISBN already exists" }
  ]
}
```

HTTP status codes:

| Code | Meaning |
| --- | --- |
| 400 | Validation error |
| 401 | Not authenticated |
| 403 | Forbidden (wrong role) |
| 404 | Resource not found |
| 409 | Conflict (e.g. duplicate ISBN) |
| 500 | Internal server error |

---

# **Book API Contract**

## **POST /books**

Create a new book.

- **Auth:** admin, librarian

**Request:**

```json
{
  "title": "string",
  "author": "string",
  "isbn": "string",
  "genre": "string",
  "description": "string",
  "publishedYear": 2020,
  "totalCopies": 10
}
```

**Response `201`:**

```json
{
  "success": true,
  "data": { "book": { } }
}
```

---

## **GET /books**

List books with pagination, search, and filtering.

- **Auth:** any authenticated user

**Query parameters:**

| Param | Type | Description |
| --- | --- | --- |
| page | number | Page number (default: 1) |
| limit | number | Items per page (default: 10, max: 100) |
| search | string | Full-text search on title / author / description |
| genre | string | Filter by genre |
| status | string | Filter by status: `available`, `out_of_stock`, `archived` |

**Response `200`:**

```json
{
  "success": true,
  "data": {
    "books": [],
    "pagination": {
      "page": 1,
      "limit": 10,
      "totalPages": 4,
      "totalItems": 40,
      "hasNextPage": true,
      "hasPrevPage": false
    }
  }
}
```

---

## **GET /books/:id**

Get a single book by ID.

- **Auth:** any authenticated user

**Response `200`:**

```json
{
  "success": true,
  "data": { "book": { } }
}
```

---

## **PATCH /books/:id**

Update book fields (partial update).

- **Auth:** admin, librarian

**Request:** any subset of POST /books fields

**Response `200`:**

```json
{
  "success": true,
  "data": { "book": { } }
}
```

---

## **DELETE /books/:id**

Soft-delete a book (sets `isDeleted: true`). Does not remove from DB.

- **Auth:** admin only

**Response `200`:**

```json
{
  "success": true,
  "data": null
}
```

---

# **Borrow API Contract**

## **POST /api/borrow/:bookId**

Borrow a book.

- **Auth:** member only

**Path params:**

| Param | Type | Description |
| --- | --- | --- |
| bookId | string | MongoDB ObjectId of the book to borrow |

**Response `201`:**

```json
{
  "success": true,
  "data": {
    "borrowId": "...",
    "dueDate": "2026-03-15T00:00:00.000Z",
    "message": "Book borrowed successfully. Due back by 2026-03-15."
  }
}
```

**Error cases:**
- `404` — book not found
- `400` — no available copies
- `409` — member already has this book borrowed
- `400` — Borrow limit exceeded

**Example `400` — Borrow limit exceeded:**

```json
{
  "success": false,
  "message": "Borrow limit exceeded (max 5 active borrows)"
}
```

---

## **POST /api/borrow/return/:borrowId**

Return a borrowed book.

- **Auth:** member, admin, librarian

**Path params:**

| Param | Type | Description |
| --- | --- | --- |
| borrowId | string | MongoDB ObjectId of the borrow record |

**Response `200`:**

```json
{
  "success": true,
  "message": "Book returned successfully",
  "data": {
    "returnedAt": "2026-02-28T10:00:00Z",
    "daysOverdue": 3,
    "fine": 3
  }
}
```

---

## **POST /api/books/semantic-search**

Semantic book search using embeddings.

- **Auth:** required
- **Role:** any authenticated user

**Request:**

```json
{
  "query": "emotional historical love story",
  "limit": 5
}
```

**Response `200`:**

```json
{
  "success": true,
  "data": [
    {
      "bookId": "...",
      "title": "...",
      "author": "...",
      "similarityScore": 0.87
    }
  ]
}
```

**Errors:**
- `400` — invalid request
- `401` — unauthorized

---

# **Recommendations API Contract**

## **GET /recommendations**

Get AI-powered book recommendations for the authenticated user.

- **Auth:** member only

**Response `200`:**

```json
{
  "success": true,
  "data": {
    "books": [],
    "reason": "Based on your borrow history"
  }
}
```
