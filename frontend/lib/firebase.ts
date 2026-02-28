import { getApps, initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { env } from './env';

const firebaseConfig = {
  apiKey: env.firebase.apiKey,
  authDomain: env.firebase.authDomain,
  projectId: env.firebase.projectId,
  appId: env.firebase.appId,
};

// Prevent duplicate initialization in Next.js hot-reload cycles
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

export const auth = getAuth(app);
export default app;
