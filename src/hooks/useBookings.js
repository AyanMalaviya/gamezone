import { useEffect, useState, useCallback } from 'react';
import {
  collection, query, where, orderBy, onSnapshot,
  doc, updateDoc, deleteDoc, getDoc,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { gasRemoveBookedSlot } from '../lib/gasClient';

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

  /**
   * Delete a booking from Firestore AND remove its slot from the
   * station's Booked Slots column in Google Sheets.
   *
   * Flow:
   *  1. Read the booking doc to get stationId + slot before deleting.
   *  2. Delete the Firestore doc (user profile updates via real-time listener).
   *  3. Call gasRemoveBookedSlot so the Sheets station row is also updated.
   */
  const deleteBooking = useCallback(async (id) => {
    // 1. Snapshot the booking before deletion so we have stationId + slot
    const snap = await getDoc(doc(db, 'bookings', id));
    const data = snap.exists() ? snap.data() : null;

    // 2. Delete from Firestore
    await deleteDoc(doc(db, 'bookings', id));

    // 3. Sync slot removal to Sheets (fire-and-forget; no-cors so no await needed)
    if (data?.stationId && data?.slot) {
      gasRemoveBookedSlot({ stationId: data.stationId, slot: data.slot });
    } else {
      console.warn('[deleteBooking] Missing stationId or slot on booking', id, data);
    }
  }, []);

  return { bookings, loading, error, updateBooking, deleteBooking };
}
