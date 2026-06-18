import { useEffect } from 'react';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
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

// Listens to Firebase auth state changes and syncs to Zustand store.
// NOTE: onAuthStateChanged does NOT give us the OAuth token on refresh,
// so oauthToken is only available for the current session after signIn.
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
        useAuthStore.getState().setOauthToken(null);
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
  await setDoc(doc(db, 'users', cred.user.uid), {
    email: cred.user.email,
    role: null,
    createdAt: new Date().toISOString(),
  });
  return cred.user;
}

export async function loginWithGoogle() {
  const result = await signInWithPopup(auth, googleProvider);

  // Extract OAuth access token and persist in store
  const credential  = GoogleAuthProvider.credentialFromResult(result);
  const oauthToken  = credential?.accessToken ?? null;
  useAuthStore.getState().setOauthToken(oauthToken);

  // Upsert Firestore user doc
  const ref  = doc(db, 'users', result.user.uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    await setDoc(ref, {
      email:     result.user.email,
      role:      null,
      createdAt: new Date().toISOString(),
    });
  }
  const role = snap.exists() ? (snap.data().role ?? null) : null;
  useAuthStore.getState().setRole(role);

  return result.user;
}

export async function logout() {
  await signOut(auth);
  useAuthStore.getState().clear();
}
