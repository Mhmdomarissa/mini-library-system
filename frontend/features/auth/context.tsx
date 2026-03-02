'use client';

import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from 'react';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  updateProfile,
  signOut,
  User as FirebaseUser,
} from 'firebase/auth';
import Cookies from 'js-cookie';
import { getFirebaseAuth } from '@/lib/firebase';
import { api } from '@/lib/api';
import type { User, UserRole } from '@/types';

// ── Shape ──────────────────────────────────────────────────────────────────────

interface AuthUser {
  firebaseUser: FirebaseUser;
  profile: User;
}

interface AuthContextValue {
  authUser: AuthUser | null;
  role: UserRole | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  logOut: () => Promise<void>;
}

// ── Context ────────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextValue | null>(null);

// ── Provider ───────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [initError, setInitError] = useState<string | null>(null);

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    try {
      unsubscribe = onAuthStateChanged(getFirebaseAuth(), async (firebaseUser) => {
      if (firebaseUser) {
        try {
          // Fetch the backend user profile (includes role)
          const profile = await api.get<User>('/api/auth/me');

          setAuthUser({ firebaseUser, profile });

          // Lightweight routing-hint cookies consumed by Next.js edge middleware.
          // These are NOT used for authorization — every API request is verified
          // by the backend via the Firebase ID token in the Authorization header.
          const cookieOpts = {
            sameSite: 'lax' as const,
            path: '/',
            expires: 7, // days
            secure: process.env.NODE_ENV === 'production',
          };
          Cookies.set('__session', 'true', cookieOpts);
          Cookies.set('__role', profile.role, cookieOpts);
        } catch {
          // Token invalid / user deleted on backend — sign out cleanly
          await signOut(getFirebaseAuth());
          setAuthUser(null);
          Cookies.remove('__session');
          Cookies.remove('__role');
        }
      } else {
        setAuthUser(null);
        Cookies.remove('__session');
        Cookies.remove('__role');
      }
      setLoading(false);
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Firebase initialization failed';
      setInitError(msg);
      setLoading(false);
    }
    return () => unsubscribe?.();
  }, []);

  const signIn = async (email: string, password: string) => {
    await signInWithEmailAndPassword(getFirebaseAuth(), email, password);
    // onAuthStateChanged listener above handles the rest
  };

  const signUp = async (email: string, password: string, name: string) => {
    const cred = await createUserWithEmailAndPassword(getFirebaseAuth(), email, password);
    await updateProfile(cred.user, { displayName: name });
    // onAuthStateChanged listener handles the rest (backend auto-creates user via upsert)
  };

  const signInWithGoogleFn = async () => {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(getFirebaseAuth(), provider);
    // onAuthStateChanged listener handles the rest (backend auto-creates user via upsert)
  };

  const logOut = async () => {
    await signOut(getFirebaseAuth());
  };

  return (
    <AuthContext.Provider
      value={{
        authUser,
        role: authUser?.profile.role ?? null,
        loading,
        signIn,
        signUp,
        signInWithGoogle: signInWithGoogleFn,
        logOut,
      }}
    >
      {initError ? (
        <div className="flex min-h-screen items-center justify-center p-8 text-center">
          <div>
            <p className="text-lg font-semibold text-destructive">Configuration error</p>
            <p className="mt-2 text-sm text-muted-foreground">{initError}</p>
          </div>
        </div>
      ) : children}
    </AuthContext.Provider>
  );
}

// ── Hook ───────────────────────────────────────────────────────────────────────

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used inside <AuthProvider>');
  }
  return ctx;
}
