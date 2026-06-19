const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore }        = require('firebase-admin/firestore');
const sa = require('../serviceAccountKey.json');

initializeApp({ credential: cert(sa) });
const db = getFirestore();

async function seed() {
  // ── bookings ─────────────────────────────────────────────────────
  await db.collection('bookings').doc('_schema').set({
    bookingId:   'BK-001',
    uid:         'firebase_user_uid',
    userName:    'Arjun Sharma',
    phone:       '9876543210',
    stationId:   '1',
    stationName: 'PS5 Station 01',
    stationType: 'ps5',
    slot:        '10:00-11:00',
    game:        'FC 25',
    amount:      100,
    paymentRef:  'UPI-TXN-XXXXXX',
    status:      'confirmed',
    createdAt:   new Date(),
  });
  console.log('\u2705 bookings collection created');

  // ── payments ─────────────────────────────────────────────────────
  await db.collection('payments').doc('_schema').set({
    paymentId:  'PAY-001',
    bookingId:  'BK-001',
    uid:        'firebase_user_uid',
    amount:     100,
    upiRef:     'UPI-TXN-XXXXXX',
    upiId:      'gamezone@upi',
    method:     'upi',
    status:     'success',
    createdAt:  new Date(),
  });
  console.log('\u2705 payments collection created');

  console.log('\n\uD83C\uDFAE All Firestore collections seeded!');
  process.exit(0);
}

seed().catch(err => {
  console.error('\u274C Seed failed:', err.message);
  process.exit(1);
});
