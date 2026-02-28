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
};
