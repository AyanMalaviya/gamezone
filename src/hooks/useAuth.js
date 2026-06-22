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
import { auth, googleProvider, adminGoogleProvider } from '../lib/firebase';
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

// ─── Email register (always member) ──────────────────────────────────────────
export async function registerWithEmail(email, password, phoneOrName) {
  const cred    = await createUserWithEmailAndPassword(auth, email, password);
  const isPhone = /^[+\d]/.test(phoneOrName);
  const profile = {
    email,
    name:  isPhone ? '' : phoneOrName,
    phone: isPhone ? phoneOrName : '',
  };

  // Write to Firestore only — Users sheet removed
  await createUserProfile(cred.user.uid, profile, 'member');

  await sendEmailVerification(cred.user);
  await signOut(auth);
  return cred;
}

// ─── Google login (members) ───────────────────────────────────────────────────
export async function loginWithGoogle() {
  const result   = await signInWithPopup(auth, googleProvider);
  const existing = await getUserProfile(result.user.uid);

  if (!existing) {
    const profile = {
      email: result.user.email,
      name:  result.user.displayName || '',
      phone: '',
    };
    // Write to Firestore only — Users sheet removed
    await createUserProfile(result.user.uid, profile, 'member');
  }
  return result;
}

// ─── Google login (admin panel) ───────────────────────────────────────────────
export async function loginWithGoogleAdmin() {
  const result = await signInWithPopup(auth, adminGoogleProvider);

  const credential  = GoogleAuthProvider.credentialFromResult(result);
  const accessToken = credential?.accessToken ?? null;
  if (accessToken) useAuthStore.getState().setOauthToken(accessToken);

  const existing = await getUserProfile(result.user.uid);

  if (!existing) {
    const profile = {
      email: result.user.email,
      name:  result.user.displayName || '',
      phone: '',
    };
    // Write to Firestore only — Users sheet removed
    await createUserProfile(result.user.uid, profile, 'admin');
  } else if (existing.role !== 'admin') {
    const { updateUserProfile } = await import('./useUsers');
    await updateUserProfile(result.user.uid, { role: 'admin' });
  }

  return result;
}

// ─── Phone helper ─────────────────────────────────────────────────────────────
export async function savePhone(uid, phone) {
  return savePhoneNumber(uid, phone);
}

// ─── App-level auth listener ──────────────────────────────────────────────────
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
