import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { appendUserToSheet, updateUserPhoneInSheet } from '../lib/sheets';
import useAuthStore from '../store/authStore';

export async function getUserProfile(uid) {
  const ref  = doc(db, 'users', uid);
  const snap = await getDoc(ref);
  return snap.exists() ? snap.data() : null;
}

export async function createUserProfile(uid, data) {
  const ref = doc(db, 'users', uid);
  await setDoc(ref, {
    name:      data.name  || '',
    email:     data.email || '',
    phone:     data.phone || '',
    hasPhone:  !!(data.phone && data.phone.trim()),
    role:      'member',
    createdAt: new Date(),
  });

  // Mirror to Google Sheets Users tab — fire-and-forget
  const oauthToken = useAuthStore.getState().oauthToken;
  appendUserToSheet(
    { uid, name: data.name || '', email: data.email || '', phone: data.phone || '', role: 'member' },
    oauthToken
  );
}

// Call this when user submits phone number via PhoneModal
export async function savePhoneNumber(uid, phone) {
  const ref = doc(db, 'users', uid);
  await updateDoc(ref, { phone, hasPhone: true });

  // Mirror phone update to Google Sheets Users tab — fire-and-forget
  const oauthToken = useAuthStore.getState().oauthToken;
  updateUserPhoneInSheet(uid, phone, oauthToken);
}

// Used to check if user is admin
export async function isAdmin(uid) {
  const profile = await getUserProfile(uid);
  return profile?.role === 'admin';
}
