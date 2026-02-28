import { getApps, initializeApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { env } from './env';

// Lazily initialised so that importing this module never executes env validation
// at module-load time (which would crash Next.js static page prerendering).
let _auth: Auth | undefined;

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
  return _auth;
}
