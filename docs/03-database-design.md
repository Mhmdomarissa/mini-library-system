# Database Design

- User schema
- Book schema
- BorrowRecord schema
- Index strategy
- Relationship explanation

# **User Collection**

Stores system users and role definitions.

```
User {
  _id: ObjectId
  firebaseUid: string (unique)
  name: string
  email: string (unique)
  role: "admin" | "librarian" | "member"
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}
```

| Field | Reason |
| --- | --- |
| firebaseUid | Links to Firebase Auth identity |
| role | Enables RBAC |
| isActive | Soft deactivation support |
| timestamps | Auditability |

### **Indexes**

- email → unique
- firebaseUid → unique
- role → indexed (for filtering admins/librarians)

# **Book Collection**

Stores library books.

### **Schema Design**

```
Book {
  _id: ObjectId
  title: string
  author: string
  isbn: string (unique)
  genre: string
  description: string
  publishedYear: number
  totalCopies: number
  availableCopies: number
  status: "available" | "out_of_stock" | "archived"
  createdBy: ObjectId (ref User)
  updatedBy: ObjectId (ref User)
  isDeleted: boolean
  deletedAt: Date | null
  createdAt: Date
  updatedAt: Date
  embedding: number[]
}
```

| **Field** | **Reason** |
| --- | --- |
| totalCopies | Inventory tracking |
| availableCopies | Real-time availability |
| status | Fast filtering |
| createdBy | Audit logging |
| isbn | Unique identifier |
| embedding | Vector representation for semantic search |

### **Index Strategy**

- title → text index
- author → text index
- isbn → unique index
- genre → indexed
- status → indexed

### **Why Text Index?**

To support:

- Search by title
- Search by author
- Natural language queries later

### **Embedding Field**

- `embedding: number[]`
- Stores the OpenAI-generated vector representation of the book's `title`, `author`, and `description` combined.
- Generated using **OpenAI `text-embedding-3-small`** model (1536-dimensional vector).
- Used exclusively for semantic search via cosine similarity in the service layer.
- **Not indexed** — similarity is computed in-memory across all stored embeddings.
- **Not returned** in standard book responses (`GET /books`, `GET /books/:id`). Excluded via field projection.
- Generated on book creation and regenerated on update if `title`, `author`, or `description` changes.

# **BorrowRecord Collection**

Tracks borrowing history (CRITICAL DESIGN DECISION)

Instead of adding borrowed: true in Book, we normalize borrowing activity.

This enables:

- History tracking
- Late return detection
- Analytics
- User behavior modeling
- AI recommendation foundation

```
BorrowRecord {
  _id: ObjectId
  userId: ObjectId (ref User)
  bookId: ObjectId (ref Book)
  borrowedAt: Date
  dueDate: Date
  returnedAt: Date | null
  status: "borrowed" | "returned" | "overdue"
  createdAt: Date
  updatedAt: Date
}
```

| **Field** | **Reason** |
| --- | --- |
| dueDate | Overdue detection |
| returnedAt | Return tracking |
| status | Quick filtering |
| userId | Relation |
| bookId | Relation |

### **Index Strategy**

- userId
- bookId
- status
- Compound index: (userId, status)

# **Data Relationships**

User 1 → N BorrowRecords

Book 1 → N BorrowRecords

Books do NOT directly store borrower info.

# **Scalability Considerations**

- Borrow history can grow large → indexed properly
- Pagination will be required for listing
- Future sharding possible on BorrowRecord
- Search queries optimized via text indexes

### **Soft Deletion Strategy**

```
isDeleted: boolean
deletedAt: Date
```

# **Future Analytics Possibilities**

- Most borrowed books
- Most active users
- Late return rate
- Genre popularity
