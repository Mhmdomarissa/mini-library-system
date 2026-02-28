/**
 * Typed, validated environment variables.
 *
 * IMPORTANT: Next.js only inlines process.env.NEXT_PUBLIC_* at build time
 * when accessed via literal dot notation (process.env.NEXT_PUBLIC_FOO).
 * Bracket notation with a dynamic key (process.env[key]) is NOT replaced
 * and always evaluates to undefined in the browser bundle.
 *
 * Each property is still a getter so validation is deferred to first access —
 * preventing static prerender crashes on pages that don't use these vars.
 *
 * On Vercel: set all NEXT_PUBLIC_* keys in Settings → Environment Variables
 * before deploying. Next.js inlines them into the bundle at build time.
 */
function assertDefined(key: string, value: string | undefined): string {
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
    return assertDefined('NEXT_PUBLIC_API_URL', process.env.NEXT_PUBLIC_API_URL);
  },
  firebase: {
    get apiKey() {
      return assertDefined('NEXT_PUBLIC_FIREBASE_API_KEY', process.env.NEXT_PUBLIC_FIREBASE_API_KEY);
    },
    get authDomain() {
      return assertDefined('NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN', process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN);
    },
    get projectId() {
      return assertDefined('NEXT_PUBLIC_FIREBASE_PROJECT_ID', process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID);
    },
    get appId() {
      return assertDefined('NEXT_PUBLIC_FIREBASE_APP_ID', process.env.NEXT_PUBLIC_FIREBASE_APP_ID);
    },
  },
};
