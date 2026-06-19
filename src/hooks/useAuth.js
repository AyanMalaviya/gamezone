import { useState, useEffect } from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signOut,
  sendEmailVerification,
} from "firebase/auth";
import { auth, googleProvider } from "../lib/firebase";
import { createUserProfile, getUserProfile, savePhoneNumber } from "./useUserProfile";
import useAuthStore from "../store/authStore";

// ─── Email login ──────────────────────────────────────────────────────────────
export async function loginWithEmail(email, password) {
  const cred = await signInWithEmailAndPassword(auth, email, password);
  if (!cred.user.emailVerified) {
    await signOut(auth);
    throw Object.assign(new Error("Email not verified. Please check your inbox."), {
      code: "auth/email-not-verified",
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
    name: isPhone ? "" : phoneOrName,
    phone: isPhone ? phoneOrName : "",
  });
  await sendEmailVerification(cred.user);
  await signOut(auth); // force verify before login
  return cred;
}

// ─── Google login ─────────────────────────────────────────────────────────────
/**
 * loginWithGoogle
 *
 * Signs in via Google popup and:
 *  1. Creates a Firestore profile if first sign-in.
 *  2. Extracts the OAuth2 access_token from the credential and saves it
 *     to the Zustand store so AdminDashboard can use it for Sheets writes.
 *
 * The access_token is only available immediately after signInWithPopup —
 * it is NOT available later via onAuthStateChanged, which is why we must
 * capture it here.
 */
export async function loginWithGoogle() {
  const cred = await signInWithPopup(auth, googleProvider);

  // Extract Google OAuth2 access_token (has spreadsheets scope)
  const { OAuthCredential } = await import("firebase/auth");
  // credential is a GoogleAuthCredential — accessToken lives on the result
  const accessToken = cred._tokenResponse?.oauthAccessToken
    ?? cred.user?.stsTokenManager?.accessToken
    ?? null;

  // Persist token to Zustand store immediately
  if (accessToken) {
    useAuthStore.getState().setOauthToken(accessToken);
  }

  // Create Firestore profile if it doesn't exist yet
  const existing = await getUserProfile(cred.user.uid);
  if (!existing) {
    await createUserProfile(cred.user.uid, {
      email: cred.user.email,
      name: cred.user.displayName || "",
      phone: "",
    });
  }

  return cred;
}

// ─── Phone helper ─────────────────────────────────────────────────────────────
export async function savePhone(uid, phone) {
  return savePhoneNumber(uid, phone);
}

// ─── App-level auth listener (App.jsx) ───────────────────────────────────────
/**
 * useAuthListener
 *
 * Bootstraps Firebase auth state and populates the Zustand store.
 * Note: onAuthStateChanged does NOT provide the OAuth access_token —
 * that is captured once in loginWithGoogle() above.
 */
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
          // Firestore read failed (e.g. offline) — degrade gracefully
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
