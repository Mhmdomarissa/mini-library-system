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

## **POST /borrow**

Borrow a book.

- **Auth:** member only

**Request:**

```json
{
  "bookId": "ObjectId string",
  "dueDate": "2026-03-15T00:00:00.000Z"
}
```

**Response `201`:**

```json
{
  "success": true,
  "data": { "borrowRecord": { } }
}
```

**Error cases:**
- `404` — book not found
- `409` — no available copies
- `409` — member already has this book borrowed

---

## **POST /return**

Return a borrowed book.

- **Auth:** member only

**Request:**

```json
{
  "borrowRecordId": "ObjectId string"
}
```

**Response `200`:**

```json
{
  "success": true,
  "data": { "borrowRecord": { } }
}
```

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
