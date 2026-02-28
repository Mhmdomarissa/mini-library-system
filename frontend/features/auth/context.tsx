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
  signOut,
  User as FirebaseUser,
} from 'firebase/auth';
import Cookies from 'js-cookie';
import { auth } from '@/lib/firebase';
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
  logOut: () => Promise<void>;
}

// ── Context ────────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextValue | null>(null);

// ── Provider ───────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          // Fetch the backend user profile (includes role)
          const profile = await api.get<User>('/api/auth/me');

          setAuthUser({ firebaseUser, profile });

          // Set lightweight cookies so Next.js edge middleware can read them
          Cookies.set('__session', 'true', { sameSite: 'lax' });
          Cookies.set('__role', profile.role, { sameSite: 'lax' });
        } catch {
          // Token invalid / user deleted on backend — sign out cleanly
          await signOut(auth);
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

    return unsubscribe;
  }, []);

  const signIn = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
    // onAuthStateChanged listener above handles the rest
  };

  const logOut = async () => {
    await signOut(auth);
  };

  return (
    <AuthContext.Provider
      value={{
        authUser,
        role: authUser?.profile.role ?? null,
        loading,
        signIn,
        logOut,
      }}
    >
      {children}
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
