/**
 * Typed, validated environment variables.
 * Throws at import time if a required variable is missing — no silent undefined.
 */
function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(
      `Missing required environment variable: ${key}\n` +
        `Copy .env.example → .env.local and fill in all values.`,
    );
  }
  return value;
}

export const env = {
  apiUrl: requireEnv('NEXT_PUBLIC_API_URL'),
  firebase: {
    apiKey: requireEnv('NEXT_PUBLIC_FIREBASE_API_KEY'),
    authDomain: requireEnv('NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN'),
    projectId: requireEnv('NEXT_PUBLIC_FIREBASE_PROJECT_ID'),
    appId: requireEnv('NEXT_PUBLIC_FIREBASE_APP_ID'),
  },
} as const;
