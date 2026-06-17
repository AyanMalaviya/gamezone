import { initializeApp, getApps } from 'firebase/app';
import { GoogleAuthProvider, getAuth, signInWithPopup, signOut } from 'firebase/auth';

const parseFirebaseConfig = (value) => {
  if (!value) {
    throw new Error('VITE_FIREBASE_CONFIG is not set.');
  }

  try {
    return JSON.parse(value);
  } catch {
    throw new Error('VITE_FIREBASE_CONFIG must be valid JSON.');
  }
};

const firebaseConfig = parseFirebaseConfig(import.meta.env.VITE_FIREBASE_CONFIG);
const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

export { auth, googleProvider as GoogleAuthProvider, signInWithPopup, signOut };