import { useEffect, useState, useCallback } from 'react';
import {
  collection, query, where, orderBy, onSnapshot,
  doc, updateDoc, deleteDoc,
} from 'firebase/firestore';
import { db } from '../lib/firebase';

/**
 * useBookings — real-time listener for a single user's bookings.
 * Requires composite index: bookings | uid ASC | bookedAt DESC
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
      (snap) => { setBookings(snap.docs.map(d => ({ id: d.id, ...d.data() }))); setLoading(false); setError(null); },
      (err)  => { console.error('[useBookings]', err.message); setError(err.message); setLoading(false); },
    );
    return unsub;
  }, [uid]);

  return { bookings, loading, error };
}

/**
 * useAllBookings — admin-only real-time listener for ALL bookings.
 * Includes update + delete helpers for CRUD.
 */
export function useAllBookings() {
  const [bookings, setBookings] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(null);

  useEffect(() => {
    const q = query(collection(db, 'bookings'), orderBy('bookedAt', 'desc'));
    const unsub = onSnapshot(q,
      (snap) => { setBookings(snap.docs.map(d => ({ id: d.id, ...d.data() }))); setLoading(false); setError(null); },
      (err)  => { console.error('[useAllBookings]', err.message); setError(err.message); setLoading(false); },
    );
    return unsub;
  }, []);

  /** Update any fields of a booking document */
  const updateBooking = useCallback(async (id, fields) => {
    await updateDoc(doc(db, 'bookings', id), fields);
  }, []);

  /** Permanently delete a booking document */
  const deleteBooking = useCallback(async (id) => {
    await deleteDoc(doc(db, 'bookings', id));
  }, []);

  return { bookings, loading, error, updateBooking, deleteBooking };
}
