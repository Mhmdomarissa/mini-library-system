# Security

- Authentication flow
- JWT validation
- Role-based middleware logic
- Input validation strategy
- Rate limiting strategy

# **Authentication Provider**

We use **Firebase Authentication**.

Reason:

- Industry standard
- Secure JWT issuance
- Google SSO support
- No need to build custom auth
- OAuth2 compliant

# **Authentication Flow**

### **Step-by-Step Flow**

1. User signs in via frontend (Firebase)
2. Firebase issues ID Token (JWT)
3. Frontend sends token in: `Authorization: Bearer <token>`
4. Backend middleware verifies token via `firebase-admin`
5. Backend extracts:
   - firebaseUid
   - email
6. Backend finds or creates User in DB
7. User object attached to `req.user`
8. RBAC middleware checks permissions

# **Role-Based Access Control (RBAC)**

Roles:

- admin
- librarian
- member

| **Action** | **Admin** | **Librarian** | **Member** |
| --- | --- | --- | --- |
| Add Book | ✅ | ✅ | ❌ |
| Edit Book | ✅ | ✅ | ❌ |
| Delete Book | ✅ | ❌ | ❌ |
| Borrow Book | ❌ | ❌ | ✅ |
| View Books | ✅ | ✅ | ✅ |

# **Middleware Design**

### **Authentication Middleware**

Responsibilities:

- Extract token
- Verify token
- Attach user to request

### **Role Middleware**

Example:

```ts
requireRole(["admin", "librarian"])
```

Checks:

```ts
if (!allowedRoles.includes(req.user.role))
  throw 403
```

# **Input Validation Strategy**

All incoming data must be validated using:

- Zod schemas
- Central validation middleware

Why?

- Prevent injection
- Prevent malformed data
- Improve error clarity

# **Additional Security Measures**

- Helmet (HTTP security headers)
- CORS configuration
- Rate limiting
- Environment variable isolation
- Centralized error handling
- Logging system (Winston)

# **Logging Strategy**

- Log errors
- Log authentication failures
- Log critical actions (delete book)

# **Future Security Enhancements**

- Refresh token support
- MFA
- IP tracking
- Audit log collection
