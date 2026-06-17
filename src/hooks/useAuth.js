import { useEffect } from 'react';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signOut,
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db, googleProvider } from '../lib/firebase';
import useAuthStore from '../store/authStore';

// Fetch role from Firestore users/{uid} document
async function fetchRole(uid) {
  try {
    const snap = await getDoc(doc(db, 'users', uid));
    return snap.exists() ? (snap.data().role ?? null) : null;
  } catch {
    return null;
  }
}

export function useAuthListener() {
  const { setUser, setRole, setLoading } = useAuthStore();

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUser(user);
        const role = await fetchRole(user.uid);
        setRole(role);
      } else {
        setUser(null);
        setRole(null);
      }
      setLoading(false);
    });
    return unsub;
  }, [setUser, setRole, setLoading]);
}

export async function loginWithEmail(email, password) {
  const cred = await signInWithEmailAndPassword(auth, email, password);
  const role = await fetchRole(cred.user.uid);
  useAuthStore.getState().setRole(role);
  return cred.user;
}

export async function registerWithEmail(email, password) {
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  // Create user doc with default role null
  await setDoc(doc(db, 'users', cred.user.uid), {
    email: cred.user.email,
    role: null,
    createdAt: new Date().toISOString(),
  });
  return cred.user;
}

export async function loginWithGoogle() {
  const cred = await signInWithPopup(auth, googleProvider);
  // Upsert user doc (don't overwrite role if it already exists)
  const ref  = doc(db, 'users', cred.user.uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    await setDoc(ref, { email: cred.user.email, role: null, createdAt: new Date().toISOString() });
  }
  const role = snap.exists() ? (snap.data().role ?? null) : null;
  useAuthStore.getState().setRole(role);
  return cred.user;
}

export async function logout() {
  await signOut(auth);
  useAuthStore.getState().clear();
}
