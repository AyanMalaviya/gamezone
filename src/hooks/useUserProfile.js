import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { appendUserToSheet, updateUserPhoneInSheet } from '../lib/gasClient';

/**
 * Get a user's Firestore profile doc.
 */
export async function getUserProfile(uid) {
  const ref  = doc(db, 'users', uid);
  const snap = await getDoc(ref);
  return snap.exists() ? snap.data() : null;
}

/**
 * Create a new Firestore user doc.
 * role defaults to 'member' — pass 'admin' explicitly when needed.
 */
export async function createUserProfile(uid, data, role = 'member') {
  const ref = doc(db, 'users', uid);
  await setDoc(ref, {
    name:      data.name  || '',
    email:     data.email || '',
    phone:     data.phone || '',
    hasPhone:  !!(data.phone && data.phone.trim()),
    role,
    createdAt: new Date(),
  });

  // Mirror to Google Sheets Users tab — fire-and-forget
  appendUserToSheet({ uid, name: data.name || '', email: data.email || '', phone: data.phone || '', role });
}

/**
 * Save / update phone number for an existing user.
 */
export async function savePhoneNumber(uid, phone) {
  const ref = doc(db, 'users', uid);
  await updateDoc(ref, { phone, hasPhone: true });
  updateUserPhoneInSheet(uid, phone);
}

/**
 * Quick admin check.
 */
export async function isAdmin(uid) {
  const profile = await getUserProfile(uid);
  return profile?.role === 'admin';
}
