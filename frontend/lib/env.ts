/**
 * Typed, validated environment variables.
 *
 * Each property is a getter so validation is deferred to the first access —
 * NOT at module load time. This prevents Next.js static prerendering from
 * crashing on pages that don't use these vars (e.g. /_not-found, 404).
 *
 * On Vercel: set all NEXT_PUBLIC_* keys in Settings → Environment Variables
 * before deploying. Next.js inlines them into the bundle at build time.
 */
function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(
      `Missing required environment variable: ${key}\n` +
        `On Vercel: add it in Project Settings → Environment Variables.\n` +
        `Locally: copy .env.example → .env.local and fill in all values.`,
    );
  }
  return value;
}

export const env = {
  get apiUrl() {
    return requireEnv('NEXT_PUBLIC_API_URL');
  },
  firebase: {
    get apiKey() {
      return requireEnv('NEXT_PUBLIC_FIREBASE_API_KEY');
    },
    get authDomain() {
      return requireEnv('NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN');
    },
    get projectId() {
      return requireEnv('NEXT_PUBLIC_FIREBASE_PROJECT_ID');
    },
    get appId() {
      return requireEnv('NEXT_PUBLIC_FIREBASE_APP_ID');
    },
  },
};
