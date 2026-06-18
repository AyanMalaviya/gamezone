import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { db } from "../lib/firebase";

export async function getUserProfile(uid) {
  const ref = doc(db, "users", uid);
  const snap = await getDoc(ref);
  return snap.exists() ? snap.data() : null;
}

export async function createUserProfile(uid, data) {
  const ref = doc(db, "users", uid);
  await setDoc(ref, {
    name: data.name || "",
    email: data.email || "",
    phone: data.phone || "",
    hasPhone: !!(data.phone && data.phone.trim()),
    role: "member",           // All new users are members by default
    createdAt: new Date(),
  });
}

// Call this when user submits phone number via PhoneModal
export async function savePhoneNumber(uid, phone) {
  const ref = doc(db, "users", uid);
  await updateDoc(ref, {
    phone,
    hasPhone: true,
  });
}

// Used to check if user is admin
export async function isAdmin(uid) {
  const profile = await getUserProfile(uid);
  return profile?.role === "admin";
}
