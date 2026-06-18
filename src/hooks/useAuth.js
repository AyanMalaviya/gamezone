import { useEffect } from 'react';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendEmailVerification,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut,
  GoogleAuthProvider,
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db, googleProvider } from '../lib/firebase';
import useAuthStore from '../store/authStore';

async function fetchRole(uid) {
  try {
    const snap = await getDoc(doc(db, 'users', uid));
    return snap.exists() ? (snap.data().role ?? null) : null;
  } catch {
    return null;
  }
}

async function upsertUserDoc(user) {
  const ref = doc(db, 'users', user.uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    await setDoc(ref, {
      email: user.email,
      role: null,
      createdAt: new Date().toISOString(),
    });
    return null;
  }
  return snap.data().role ?? null;
}

// Auth state listener — runs once at app root
export function useAuthListener() {
  const { setUser, setRole, setLoading } = useAuthStore();

  useEffect(() => {
    // Handle Google redirect result on page load
    getRedirectResult(auth)
      .then(async (result) => {
        if (!result) return;
        const credential = GoogleAuthProvider.credentialFromResult(result);
        useAuthStore.getState().setOauthToken(credential?.accessToken ?? null);
        const role = await upsertUserDoc(result.user);
        useAuthStore.getState().setRole(role);
      })
      .catch((err) => {
        // popup_closed_by_user and cancelled are benign
        if (!err.code?.includes('popup') && !err.code?.includes('cancelled')) {
          console.error('Redirect sign-in error:', err.code, err.message);
        }
      });

    const unsub = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUser(user);
        const role = await fetchRole(user.uid);
        setRole(role);
      } else {
        setUser(null);
        setRole(null);
        useAuthStore.getState().setOauthToken(null);
      }
      setLoading(false);
    });
    return unsub;
  }, [setUser, setRole, setLoading]);
}

// Email/password login — blocks unverified emails
export async function loginWithEmail(email, password) {
  const cred = await signInWithEmailAndPassword(auth, email, password);
  if (!cred.user.emailVerified) {
    await signOut(auth);
    throw Object.assign(new Error('email-not-verified'), { code: 'auth/email-not-verified' });
  }
  const role = await fetchRole(cred.user.uid);
  useAuthStore.getState().setRole(role);
  return cred.user;
}

// Register — creates account, sends verification email, signs out immediately
export async function registerWithEmail(email, password) {
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  await sendEmailVerification(cred.user, {
    url: window.location.origin + '/auth/login',
    handleCodeInApp: false,
  });
  await setDoc(doc(db, 'users', cred.user.uid), {
    email: cred.user.email,
    role: null,
    createdAt: new Date().toISOString(),
  });
  // Sign out immediately — user must verify email before first login
  await signOut(auth);
}

// Google sign-in — uses redirect (works on mobile + all browsers)
export async function loginWithGoogle() {
  googleProvider.addScope('https://www.googleapis.com/auth/spreadsheets');
  await signInWithRedirect(auth, googleProvider);
  // Page will reload; result is handled in useAuthListener via getRedirectResult
}

export async function logout() {
  await signOut(auth);
  useAuthStore.getState().clear();
}
