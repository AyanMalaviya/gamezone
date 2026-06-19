import { useEffect, useState } from 'react';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';

/**
 * useBookings — real-time listener for the current user's bookings.
 * Returns { bookings, loading, error }.
 *
 * Requires a Firestore composite index on the `bookings` collection:
 *   Fields: uid (ASC), bookedAt (DESC)
 *
 * If you see an error about a missing index, click the link in the
 * browser console — Firebase will open the index creation page directly.
 * Or create it manually in Firebase Console → Firestore → Indexes:
 *   Collection: bookings
 *   uid:      Ascending
 *   bookedAt: Descending
 */
export default function useBookings(uid) {
  const [bookings, setBookings] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(null);

  useEffect(() => {
    if (!uid) { setBookings([]); setLoading(false); return; }

    const q = query(
      collection(db, 'bookings'),
      where('uid', '==', uid),
      orderBy('bookedAt', 'desc'),
    );

    const unsub = onSnapshot(q,
      (snap) => {
        setBookings(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error('[useBookings] Firestore error:', err.message);
        // If this is a missing index error, the console will contain a direct
        // link to create the index in Firebase Console.
        setError(err.message);
        setLoading(false);
      },
    );

    return unsub;
  }, [uid]);

  return { bookings, loading, error };
}
