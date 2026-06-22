/**
 * seed-stations.js
 * Run once from project root to populate /stations in Firestore.
 *
 * Prerequisites:
 *   1. Download your Firebase service account key:
 *      Firebase Console → Project Settings → Service Accounts → Generate new private key
 *      Save it as serviceAccountKey.json in the project root.
 *
 *   2. Install firebase-admin if not already present:
 *      npm install firebase-admin
 *
 * Run:
 *   node scripts/seed-stations.js
 */

import { readFileSync } from 'fs';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const serviceAccount = JSON.parse(
  readFileSync(new URL('../serviceAccountKey.json', import.meta.url), 'utf8')
);

initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

const stations = [
  { id: '1',  name: 'PS5 Station 01',   type: 'ps5',    preferredGame: '' },
  { id: '2',  name: 'PS5 Station 02',   type: 'ps5',    preferredGame: '' },
  { id: '3',  name: 'PS5 Station 03',   type: 'ps5',    preferredGame: '' },
  { id: '4',  name: 'PS5 Station 04',   type: 'ps5',    preferredGame: '' },
  { id: '5',  name: 'PS5 Station 05',   type: 'ps5',    preferredGame: '' },
  { id: '6',  name: 'PS5 Station 06',   type: 'ps5',    preferredGame: '' },
  { id: '7',  name: 'PS5 Station 07',   type: 'ps5',    preferredGame: '' },
  { id: '8',  name: 'Racing Simulator', type: 'racing', preferredGame: '' },
  { id: '9',  name: 'PS5 Station 08',   type: 'ps5',    preferredGame: '' },
  { id: '10', name: 'PS5 Station 09',   type: 'ps5',    preferredGame: '' },
  { id: '11', name: 'PS5 Station 10',   type: 'ps5',    preferredGame: '' },
  { id: '12', name: 'PS5 Station 11',   type: 'ps5',    preferredGame: '' },
  { id: '13', name: 'PS5 Station 12',   type: 'ps5',    preferredGame: '' },
  { id: '14', name: 'PS5 Station 13',   type: 'ps5',    preferredGame: '' },
];

const batch = db.batch();
stations.forEach(({ id, name, type, preferredGame }) => {
  const ref = db.collection('stations').doc(id);
  batch.set(ref, { name, type, preferredGame }, { merge: true });
});

await batch.commit();
console.log(`✅ Seeded ${stations.length} stations to Firestore /stations`);
process.exit(0);
