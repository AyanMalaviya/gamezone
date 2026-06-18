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

// ─── Named function exports (used by AuthPage, AuthModal, CompleteProfileModal) ───

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

export async function loginWithGoogle() {
  const cred = await signInWithPopup(auth, googleProvider);
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

// Alias used by CompleteProfileModal
export async function savePhone(uid, phone) {
  return savePhoneNumber(uid, phone);
}

// ─── Hook: used by App.jsx to listen to auth state + populate Zustand store ───

export function useAuthListener() {
  const setUser    = useAuthStore(s => s.setUser);
  const setRole    = useAuthStore(s => s.setRole);
  const setPhone   = useAuthStore(s => s.setPhone);
  const setLoading = useAuthStore(s => s.setLoading);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        const prof = await getUserProfile(firebaseUser.uid);
        // prof shape: { email, name, phone, role, ... }
        setRole(prof?.role  ?? null);
        setPhone(prof?.phone ?? null);
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

// ─── Hook: local state version (used inside components that don't use Zustand) ───

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
