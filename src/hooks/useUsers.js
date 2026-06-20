/**
 * useUsers — admin-only Firestore helpers
 *
 * listAllUsers()          — full collection scan (sorted client-side to avoid
 *                           composite-index / Firestore-rules issues with orderBy)
 * updateUserProfile()     — write any fields to a user doc
 * setUserRole()           — promote/demote admin
 * getCustomSchema()       — read config/userSchema customFields array
 * saveCustomSchema()      — write config/userSchema customFields array
 */
import {
  collection, getDocs, doc, updateDoc, getDoc, setDoc, query,
} from 'firebase/firestore';
import { db } from '../lib/firebase';

const SCHEMA_DOC = doc(db, 'config', 'userSchema');

// ── User list ────────────────────────────────────────────────────────────────────
export async function listAllUsers() {
  // No orderBy — avoids composite-index requirement and "insufficient permissions"
  // errors that Firestore throws when the security rule doesn’t grant index access.
  // Sort by email client-side instead.
  const snap = await getDocs(query(collection(db, 'users')));
  const users = snap.docs.map(d => ({ uid: d.id, ...d.data() }));
  return users.sort((a, b) => (a.email ?? '').localeCompare(b.email ?? ''));
}

// ── Update arbitrary fields on a user doc ───────────────────────────────────────
export async function updateUserProfile(uid, fields) {
  await updateDoc(doc(db, 'users', uid), fields);
}

// ── Promote / demote ─────────────────────────────────────────────────────────────────
export async function setUserRole(uid, role) {
  await updateDoc(doc(db, 'users', uid), { role });
}

// ── Dynamic schema (config/userSchema) ───────────────────────────────────────────
export async function getCustomSchema() {
  const snap = await getDoc(SCHEMA_DOC);
  return snap.exists() ? (snap.data().fields ?? []) : [];
}

export async function saveCustomSchema(fields) {
  await setDoc(SCHEMA_DOC, { fields }, { merge: true });
}
