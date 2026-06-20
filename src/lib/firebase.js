import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId:             import.meta.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db   = getFirestore(app);

/**
 * googleProvider — for regular member sign-in.
 * NO Sheets scope — members only need basic profile + email.
 * This avoids the scary "See, edit, delete Google Sheets" consent screen.
 */
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

/**
 * adminGoogleProvider — for admin sign-in only.
 * Requests the Sheets write scope so the admin can update station
 * status, booked slots, etc. directly from the dashboard.
 */
export const adminGoogleProvider = new GoogleAuthProvider();
adminGoogleProvider.addScope('https://www.googleapis.com/auth/spreadsheets');
adminGoogleProvider.setCustomParameters({ prompt: 'select_account' });
