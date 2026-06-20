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
import { gasAddUser } from '../lib/gasClient';
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

// ─── Email register ──────────────────────────────────────────────────────────
export async function registerWithEmail(email, password, phoneOrName) {
  const cred    = await createUserWithEmailAndPassword(auth, email, password);
  const isPhone = /^[+\d]/.test(phoneOrName);
  const profile = {
    email,
    name:  isPhone ? '' : phoneOrName,
    phone: isPhone ? phoneOrName : '',
  };

  await createUserProfile(cred.user.uid, profile);

  // Sync new user to Sheets via GAS (fire-and-forget, no token needed)
  gasAddUser({
    uid:   cred.user.uid,
    email: profile.email,
    name:  profile.name,
    phone: profile.phone,
    role:  'member',
  });

  await sendEmailVerification(cred.user);
  await signOut(auth);
  return cred;
}

// ─── Google login (members) ─────────────────────────────────────────────────────
export async function loginWithGoogle() {
  const result   = await signInWithPopup(auth, googleProvider);
  const existing = await getUserProfile(result.user.uid);

  if (!existing) {
    const profile = {
      email: result.user.email,
      name:  result.user.displayName || '',
      phone: '',
    };
    await createUserProfile(result.user.uid, profile);

    // Sync new Google user to Sheets (fire-and-forget)
    gasAddUser({
      uid:   result.user.uid,
      email: profile.email,
      name:  profile.name,
      phone: '',
      role:  'member',
    });
  }
  return result;
}

// ─── Google login (admin only) ──────────────────────────────────────────────────
export async function loginWithGoogleAdmin() {
  const result = await signInWithPopup(auth, adminGoogleProvider);

  // Store OAuth token in Zustand — still used by AdminDashboard session restore
  const credential  = GoogleAuthProvider.credentialFromResult(result);
  const accessToken = credential?.accessToken ?? null;
  if (accessToken) useAuthStore.getState().setOauthToken(accessToken);

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

// ─── App-level auth listener (App.jsx) ──────────────────────────────────────────
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
