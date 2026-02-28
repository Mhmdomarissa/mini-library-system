import { auth } from './firebase';
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
  const user = auth.currentUser;
  if (!user) return null;
  // getIdToken(true) force-refreshes if expired
  return user.getIdToken();
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
    // 401 — token expired / invalid — let the AuthContext handle sign-out
    if (res.status === 401) {
      await auth.signOut().catch(() => {});
    }
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
