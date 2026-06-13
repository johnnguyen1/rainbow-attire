'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  type User as FirebaseUser,
} from 'firebase/auth';
import { auth } from '@/lib/firebase-client';
import { findCompanyIdByEmailDomain } from '@/lib/services/companies';
import { createUserDoc, getUserById, updateUserDoc } from '@/lib/services/users';
import type { User } from '@/lib/types';

interface AuthContextValue {
  /** Firestore profile of the signed-in user (null when signed out) */
  user: User | null;
  firebaseUser: FirebaseUser | null;
  /** True until the first auth state + profile resolution completes */
  loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (
    email: string,
    password: string,
    firstName: string,
    lastName: string
  ) => Promise<void>;
  logout: () => Promise<void>;
  resendVerificationEmail: () => Promise<void>;
  sendResetEmail: (email: string) => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

async function loadProfile(firebaseUser: FirebaseUser): Promise<User | null> {
  const profile = await getUserById(firebaseUser.uid);
  if (!profile) return null;

  const updates: Parameters<typeof updateUserDoc>[1] = {};

  if (profile.emailVerified !== firebaseUser.emailVerified) {
    updates.emailVerified = firebaseUser.emailVerified;
    profile.emailVerified = firebaseUser.emailVerified;
  }

  // Lazy company assignment for users who registered before their company existed
  if (!profile.company && firebaseUser.email) {
    const companyId = await findCompanyIdByEmailDomain(firebaseUser.email);
    if (companyId) {
      updates.company = companyId;
      profile.company = companyId;
    }
  }

  if (Object.keys(updates).length > 0) {
    await updateUserDoc(firebaseUser.uid, updates).catch(() => {
      // Non-fatal; profile sync will retry on next auth state change
    });
  }

  return profile;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      setFirebaseUser(fbUser);
      if (!fbUser) {
        setUser(null);
        setLoading(false);
        return;
      }
      try {
        setUser(await loadProfile(fbUser));
      } catch {
        setUser(null);
      } finally {
        setLoading(false);
      }
    });
    return unsubscribe;
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const credential = await signInWithEmailAndPassword(auth, email, password);
    const profile = await loadProfile(credential.user);
    if (!profile) {
      await signOut(auth);
      throw new Error('User account not properly set up. Please contact support.');
    }
    setUser(profile);
    return profile;
  }, []);

  const register = useCallback(
    async (email: string, password: string, firstName: string, lastName: string) => {
      const credential = await createUserWithEmailAndPassword(auth, email, password);
      const fbUser = credential.user;
      await updateProfile(fbUser, { displayName: `${firstName} ${lastName}` }).catch(() => {});
      await sendEmailVerification(fbUser);
      const companyId = await findCompanyIdByEmailDomain(email);
      await createUserDoc(fbUser.uid, {
        email,
        emailVerified: false,
        firstName,
        lastName,
        company: companyId ?? '',
        role: 'user',
      });
      setUser(await getUserById(fbUser.uid));
    },
    []
  );

  const logout = useCallback(async () => {
    await signOut(auth);
  }, []);

  const resendVerificationEmail = useCallback(async () => {
    if (!auth.currentUser) throw new Error('Not signed in');
    await sendEmailVerification(auth.currentUser);
  }, []);

  const sendResetEmail = useCallback(async (email: string) => {
    await sendPasswordResetEmail(auth, email);
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!auth.currentUser) return;
    await auth.currentUser.reload();
    setFirebaseUser(auth.currentUser);
    setUser(await loadProfile(auth.currentUser));
  }, []);

  const value = useMemo(
    () => ({
      user,
      firebaseUser,
      loading,
      login,
      register,
      logout,
      resendVerificationEmail,
      sendResetEmail,
      refreshProfile,
    }),
    [user, firebaseUser, loading, login, register, logout, resendVerificationEmail, sendResetEmail, refreshProfile]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
