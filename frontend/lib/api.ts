import { getFirebaseAuth, authReady } from './firebase';
import { env } from './env';

// ── Error class ────────────────────────────────────────────────────────────────

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly errors?: { field: string; message: string }[],
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// ── Token helper ───────────────────────────────────────────────────────────────

async function getToken(): Promise<string | null> {
  // Wait for Firebase Auth to determine the initial auth state so we never
  // send a request before currentUser has been hydrated from persistence.
  await authReady;

  const user = getFirebaseAuth().currentUser;
  if (!user) return null;
  // Pass false (default) — Firebase SDK uses the cached token and auto-renews
  // it transparently when it is within 5 minutes of expiry. Passing true would
  // force a network round-trip on every request, which is wasteful.
  return user.getIdToken(false);
}

// ── Core request ───────────────────────────────────────────────────────────────

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = await getToken();

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers ?? {}),
  };

  const res = await fetch(`${env.apiUrl}${path}`, { ...options, headers });

  // Parse body regardless of status for error messages
  const body = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new ApiError(
      body.message ?? `Request failed (${res.status})`,
      res.status,
      body.errors,
    );
  }

  // Our envelope: { success: true, data: T }
  return (body.data ?? body) as T;
}

// ── FormData request (no Content-Type — browser sets multipart boundary) ───

async function requestForm<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = await getToken();

  const headers: HeadersInit = {
    // Do NOT set Content-Type — the browser will auto-set it with the
    // correct multipart boundary when the body is a FormData instance.
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers ?? {}),
  };

  const res = await fetch(`${env.apiUrl}${path}`, { ...options, headers });
  const body = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new ApiError(
      body.message ?? `Request failed (${res.status})`,
      res.status,
      body.errors,
    );
  }

  return (body.data ?? body) as T;
}

// ── Public API client ──────────────────────────────────────────────────────────

export const api = {
  get: <T>(path: string) => request<T>(path),

  post: <T>(path: string, body: unknown) =>
    request<T>(path, {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  patch: <T>(path: string, body: unknown) =>
    request<T>(path, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),

  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),

  /**
   * POST with FormData (multipart/form-data).
   * Used for file uploads — Content-Type is set automatically by the browser
   * so we must NOT override it with 'application/json'.
   */
  postForm: <T>(path: string, formData: FormData) =>
    requestForm<T>(path, { method: 'POST', body: formData }),

  /**
   * PATCH with FormData (multipart/form-data).
   */
  patchForm: <T>(path: string, formData: FormData) =>
    requestForm<T>(path, { method: 'PATCH', body: formData }),
};
