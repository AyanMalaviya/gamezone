/**
 * useStationData — Firestore-native station data hook.
 *
 * Replaces the old Google Sheets polling approach entirely.
 *
 * Two real-time listeners run in parallel:
 *   1. /stations        — static metadata (name, type, preferredGame)
 *   2. /bookings        — today’s confirmed bookings (filtered client-side by date)
 *
 * Station status, bookedSlots and activeSlot are all DERIVED at render time
 * from the bookings data + current IST clock. Nothing is written back to
 * Firestore for status — it is always computed on the fly.
 *
 * enrichStation(station, bookingsForStation, nowMin):
 *   bookedSlots → slots from today’s confirmed Firestore bookings
 *   activeSlot  → slot whose window contains nowMin
 *   activeGame  → game on the active booking, or preferredGame fallback
 *   status      → 'occupied' if activeSlot exists, else 'available'
 */
import { useEffect, useState, useCallback } from 'react';
import {
  collection, onSnapshot, query, orderBy,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { getActiveSlot, nowMinutes } from '../lib/slotUtils';

// ── helpers ──────────────────────────────────────────────────────────────
function todayISTDateString() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }); // 'YYYY-MM-DD'
}

function bookingDateString(ts) {
  if (!ts) return null;
  try {
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
  } catch { return null; }
}

function enrichStation(station, todaySlots, nowMin) {
  const active = getActiveSlot(todaySlots, nowMin);
  return {
    ...station,
    bookedSlots: todaySlots,
    activeSlot:  active ?? null,
    activeGame:  active
      ? (station.currentGame || station.preferredGame || null)
      : null,
    status: active ? 'occupied' : 'available',
  };
}

// ── hook ──────────────────────────────────────────────────────────────────
const useStationData = () => {
  const [rawStations, setRawStations] = useState([]);
  const [allBookings, setAllBookings] = useState([]);
  const [isLoading,   setIsLoading]   = useState(true);
  const [isError,     setIsError]     = useState(false);

  // Listener 1 — /stations (static metadata)
  useEffect(() => {
    const unsub = onSnapshot(
      query(collection(db, 'stations')),
      (snap) => {
        const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setRawStations(data);
        setIsLoading(false);
      },
      (err) => {
        console.error('[useStationData] stations listener error:', err.message);
        setIsError(true);
        setIsLoading(false);
      },
    );
    return unsub;
  }, []);

  // Listener 2 — /bookings (all confirmed, filter to today client-side)
  useEffect(() => {
    const unsub = onSnapshot(
      query(collection(db, 'bookings'), orderBy('bookedAt', 'desc')),
      (snap) => {
        const today = todayISTDateString();
        const todayConfirmed = snap.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .filter(b =>
            b.status === 'confirmed' &&
            bookingDateString(b.bookedAt) === today &&
            b.stationId && b.slot
          );
        setAllBookings(todayConfirmed);
      },
      (err) => {
        console.error('[useStationData] bookings listener error:', err.message);
      },
    );
    return unsub;
  }, []);

  // Derive enriched stations on every render tick
  const now = nowMinutes();
  const today = todayISTDateString();

  // Group today’s booking slots by stationId
  const slotsByStation = {};
  allBookings.forEach(b => {
    slotsByStation[b.stationId] ??= [];
    slotsByStation[b.stationId].push(b.slot);
  });

  const stations = rawStations
    .map(s => enrichStation(s, slotsByStation[s.id] ?? [], now))
    .sort((a, b) => Number(a.id) - Number(b.id));

  // Manual refetch is a no-op for Firestore (onSnapshot is always live)
  // but kept for API compatibility with components that call refetch().
  const refetch = useCallback(() => {}, []);

  return { stations, isLoading, isError, refetch };
};

export default useStationData;
