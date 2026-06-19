import { useState, useEffect } from 'react';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signOut,
  sendEmailVerification,
  GoogleAuthProvider,
} from 'firebase/auth';
import { auth, googleProvider } from '../lib/firebase';
import { createUserProfile, getUserProfile, savePhoneNumber } from './useUserProfile';
import useAuthStore from '../store/authStore';

// ─── Email login ──────────────────────────────────────────────────────────────
export async function loginWithEmail(email, password) {
  const cred = await signInWithEmailAndPassword(auth, email, password);
  if (!cred.user.emailVerified) {
    await signOut(auth);
    throw Object.assign(new Error('Email not verified. Please check your inbox.'), {
      code: 'auth/email-not-verified',
    });
  }
  return cred;
}

// ─── Email register ───────────────────────────────────────────────────────────
export async function registerWithEmail(email, password, phoneOrName) {
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  const isPhone = /^[+\d]/.test(phoneOrName);
  await createUserProfile(cred.user.uid, {
    email,
    name:  isPhone ? '' : phoneOrName,
    phone: isPhone ? phoneOrName : '',
  });
  await sendEmailVerification(cred.user);
  await signOut(auth); // force verify before login
  return cred;
}

// ─── Google login ─────────────────────────────────────────────────────────────
/**
 * loginWithGoogle
 *
 * Captures the OAuth2 access_token immediately from the popup result
 * (it is NOT available later via onAuthStateChanged) and stores it
 * in Zustand for Sheets write operations.
 */
export async function loginWithGoogle() {
  const result = await signInWithPopup(auth, googleProvider);

  // Correct way to extract OAuth credential & access token
  const credential  = GoogleAuthProvider.credentialFromResult(result);
  const accessToken = credential?.accessToken ?? null;

  if (accessToken) {
    useAuthStore.getState().setOauthToken(accessToken);
  }

  // Create Firestore profile on first sign-in
  const existing = await getUserProfile(result.user.uid);
  if (!existing) {
    await createUserProfile(result.user.uid, {
      email: result.user.email,
      name:  result.user.displayName || '',
      phone: '',
    });
  }

  return result;
}

// ─── Phone helper ─────────────────────────────────────────────────────────────
export async function savePhone(uid, phone) {
  return savePhoneNumber(uid, phone);
}

// ─── App-level auth listener (App.jsx) ───────────────────────────────────────
export function useAuthListener() {
  const setUser    = useAuthStore(s => s.setUser);
  const setRole    = useAuthStore(s => s.setRole);
  const setPhone   = useAuthStore(s => s.setPhone);
  const setLoading = useAuthStore(s => s.setLoading);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        try {
          const prof = await getUserProfile(firebaseUser.uid);
          setRole(prof?.role  ?? null);
          setPhone(prof?.phone ?? null);
        } catch (err) {
          console.warn('[useAuthListener] profile fetch failed:', err.message);
          setRole(null);
          setPhone(null);
        }
      } else {
        setUser(null);
        setRole(null);
        setPhone(null);
      }
      setLoading(false);
    });
    return unsub;
  }, [setUser, setRole, setPhone, setLoading]);
}

// ─── Component-local hook ─────────────────────────────────────────────────────
export function useAuth() {
  const [user, setUser]       = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        const prof = await getUserProfile(firebaseUser.uid);
        setProfile(prof);
      } else {
        setProfile(null);
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  const logout = () => signOut(auth);
  return { user, profile, loading, logout };
}
