import { getApps, initializeApp, type FirebaseApp } from 'firebase/app';
import { getAuth, onAuthStateChanged, type Auth } from 'firebase/auth';
import { env } from './env';

// Lazily initialised so that importing this module never executes env validation
// at module-load time (which would crash Next.js static page prerendering).
let _auth: Auth | undefined;

// Promise that resolves once Firebase Auth has determined the initial auth state.
// This prevents API calls from racing ahead before a token is available.
let _authReadyResolve: () => void;
export const authReady = new Promise<void>((resolve) => {
  _authReadyResolve = resolve;
});
let _authReadyFired = false;

export function getFirebaseAuth(): Auth {
  if (_auth) return _auth;

  const app: FirebaseApp =
    getApps()[0] ??
    initializeApp({
      apiKey: env.firebase.apiKey,
      authDomain: env.firebase.authDomain,
      projectId: env.firebase.projectId,
      appId: env.firebase.appId,
    });

  _auth = getAuth(app);

  // Resolve authReady on the very first onAuthStateChanged emission so that
  // getToken() in api.ts can wait for the SDK to hydrate the signed-in user.
  if (!_authReadyFired) {
    const unsub = onAuthStateChanged(_auth, () => {
      _authReadyFired = true;
      _authReadyResolve();
      unsub();
    });
  }

  return _auth;
}
