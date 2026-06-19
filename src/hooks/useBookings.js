import { useEffect, useState } from 'react';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';

/**
 * useBookings — real-time listener for the current user's bookings.
 * Returns { bookings, loading, error }.
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
      },
      (err) => {
        console.error('[useBookings]', err);
        setError(err.message);
        setLoading(false);
      },
    );

    return unsub;
  }, [uid]);

  return { bookings, loading, error };
}
