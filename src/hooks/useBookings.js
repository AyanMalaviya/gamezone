import { useEffect, useState } from 'react';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';

/**
 * useBookings — real-time listener for a single user's bookings.
 * Pass uid to filter by user. Returns { bookings, loading, error }.
 *
 * Requires a Firestore composite index:
 *   Collection: bookings  |  uid: ASC  |  bookedAt: DESC
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
        setError(err.message);
        setLoading(false);
      },
    );

    return unsub;
  }, [uid]);

  return { bookings, loading, error };
}

/**
 * useAllBookings — admin-only real-time listener for ALL bookings across all users.
 * Ordered by bookedAt desc so newest appear first.
 *
 * Requires a single-field index on bookedAt (DESC) in Firestore.
 * Firebase usually creates this automatically.
 */
export function useAllBookings() {
  const [bookings, setBookings] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(null);

  useEffect(() => {
    const q = query(
      collection(db, 'bookings'),
      orderBy('bookedAt', 'desc'),
    );

    const unsub = onSnapshot(q,
      (snap) => {
        setBookings(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error('[useAllBookings] Firestore error:', err.message);
        setError(err.message);
        setLoading(false);
      },
    );

    return unsub;
  }, []);

  return { bookings, loading, error };
}
