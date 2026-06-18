import { useEffect } from 'react';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendEmailVerification,
  signInWithRedirect,
  getRedirectResult,
  signOut,
  GoogleAuthProvider,
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { auth, db, googleProvider } from '../lib/firebase';
import useAuthStore from '../store/authStore';

// ─── Firestore helpers ─────────────────────────────────────────────────────

async function fetchUserDoc(uid) {
  try {
    const snap = await getDoc(doc(db, 'users', uid));
    if (!snap.exists()) return { role: null, phone: null };
    const d = snap.data();
    return { role: d.role ?? null, phone: d.phone ?? null };
  } catch {
    return { role: null, phone: null };
  }
}

async function upsertUserDoc(user, extra = {}) {
  const ref  = doc(db, 'users', user.uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    await setDoc(ref, {
      email:     user.email,
      role:      null,
      phone:     extra.phone ?? null,
      createdAt: new Date().toISOString(),
    });
    return { role: null, phone: extra.phone ?? null };
  }
  const d = snap.data();
  return { role: d.role ?? null, phone: d.phone ?? null };
}

// Save / update phone number for a user
export async function savePhone(uid, phone) {
  await updateDoc(doc(db, 'users', uid), { phone });
  useAuthStore.getState().setPhone(phone);
}

// ─── Auth state listener ───────────────────────────────────────────────────

export function useAuthListener() {
  const { setUser, setRole, setPhone, setLoading } = useAuthStore();

  useEffect(() => {
    // Handle Google redirect result on page load
    getRedirectResult(auth)
      .then(async (result) => {
        if (!result) return;
        const credential = GoogleAuthProvider.credentialFromResult(result);
        useAuthStore.getState().setOauthToken(credential?.accessToken ?? null);
        const { role, phone } = await upsertUserDoc(result.user);
        useAuthStore.getState().setRole(role);
        useAuthStore.getState().setPhone(phone);
      })
      .catch((err) => {
        if (!err.code?.includes('popup') && !err.code?.includes('cancelled')) {
          console.error('Redirect sign-in error:', err.code, err.message);
        }
      });

    const unsub = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUser(user);
        const { role, phone } = await fetchUserDoc(user.uid);
        setRole(role);
        setPhone(phone);
      } else {
        setUser(null);
        setRole(null);
        setPhone(null);
        useAuthStore.getState().setOauthToken(null);
      }
      setLoading(false);
    });
    return unsub;
  }, [setUser, setRole, setPhone, setLoading]);
}

// ─── Auth actions ──────────────────────────────────────────────────────────

// Email login — blocks unverified accounts
export async function loginWithEmail(email, password) {
  const cred = await signInWithEmailAndPassword(auth, email, password);
  if (!cred.user.emailVerified) {
    await signOut(auth);
    throw Object.assign(new Error('email-not-verified'), { code: 'auth/email-not-verified' });
  }
  const { role, phone } = await fetchUserDoc(cred.user.uid);
  useAuthStore.getState().setRole(role);
  useAuthStore.getState().setPhone(phone);
  return cred.user;
}

// Register — creates account, sends verification, stores phone, signs out
export async function registerWithEmail(email, password, phone) {
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  await sendEmailVerification(cred.user, {
    url: window.location.origin + '/auth/login',
    handleCodeInApp: false,
  });
  await setDoc(doc(db, 'users', cred.user.uid), {
    email:     cred.user.email,
    role:      null,
    phone:     phone || null,
    createdAt: new Date().toISOString(),
  });
  await signOut(auth);
}

// Google — redirect flow; result handled in useAuthListener
export async function loginWithGoogle() {
  googleProvider.addScope('https://www.googleapis.com/auth/spreadsheets');
  await signInWithRedirect(auth, googleProvider);
}

export async function logout() {
  await signOut(auth);
  useAuthStore.getState().clear();
}
