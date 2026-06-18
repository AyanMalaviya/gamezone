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
    ...data,
    hasPhone: !!data.phone,
    createdAt: new Date(),
    role: "user",
  });
}

// Call this when user submits phone number
export async function savePhoneNumber(uid, phone) {
  const ref = doc(db, "users", uid);
  await updateDoc(ref, {
    phone,
    hasPhone: true,
  });
}
