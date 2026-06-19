/**
 * useUsers — admin-only Firestore helpers
 *
 * listAllUsers()          — paginated collection scan (admin only)
 * updateUserProfile()     — write any fields to a user doc
 * setUserRole()           — promote/demote admin
 * getCustomSchema()       — read config/userSchema customFields array
 * saveCustomSchema()      — write config/userSchema customFields array
 */
import {
  collection, getDocs, doc, updateDoc, getDoc, setDoc, orderBy, query,
} from 'firebase/firestore';
import { db } from '../lib/firebase';

const SCHEMA_DOC = doc(db, 'config', 'userSchema');

// ── User list ────────────────────────────────────────────────────────────────
export async function listAllUsers() {
  const q    = query(collection(db, 'users'), orderBy('email'));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ uid: d.id, ...d.data() }));
}

// ── Update arbitrary fields on a user doc ────────────────────────────────────
export async function updateUserProfile(uid, fields) {
  await updateDoc(doc(db, 'users', uid), fields);
}

// ── Promote / demote ─────────────────────────────────────────────────────────
export async function setUserRole(uid, role) {
  await updateDoc(doc(db, 'users', uid), { role });
}

// ── Dynamic schema (config/userSchema) ───────────────────────────────────────
/**
 * customFields is stored as an array of:
 *   { id: string, label: string, type: 'text'|'number'|'select', options?: string[] }
 */
export async function getCustomSchema() {
  const snap = await getDoc(SCHEMA_DOC);
  return snap.exists() ? (snap.data().fields ?? []) : [];
}

export async function saveCustomSchema(fields) {
  await setDoc(SCHEMA_DOC, { fields }, { merge: true });
}
