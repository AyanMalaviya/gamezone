/**
 * useSlotScheduler
 *
 * Runs every 60 seconds (and immediately on mount).
 * Also listens for the 'gz:slot-booked-active' CustomEvent fired by
 * paymentStore when a booking is made for a currently-active slot —
 * this triggers an extra immediate tick so the station flips to
 * occupied right away instead of waiting up to 60s.
 *
 * For each station it:
 *   1. Parses all booked slots in IST.
 *   2. Determines whether one is currently active (startMin <= nowIST < endMin).
 *   3. If a slot just became active → writes status=occupied, activeSlot, currentGame.
 *   4. If the active slot just ended → strips it, clears activeSlot,
 *      sets status=available if no more bookings remain today.
 *
 * Writes via gasClient using stationId (column A) — NOT rowIndex —
 * so GAS always finds the correct row regardless of header-row count.
 */
import { useEffect, useRef, useCallback } from 'react';
import { getActiveSlot, getNextSlot, stripExpiredSlots, nowMinutes } from '../lib/slotUtils';
import { gasUpdateStation } from '../lib/gasClient';

export default function useSlotScheduler(stations, refetch, _oauthToken = null) { // eslint-disable-line no-unused-vars
  const stationsRef = useRef(stations);
  useEffect(() => { stationsRef.current = stations; }, [stations]);

  const tick = useCallback(async () => {
    const now     = nowMinutes();
    const current = stationsRef.current;
    if (!current?.length) return;

    let anyChange = false;

    for (const s of current) {
      const slots = Array.isArray(s.bookedSlots)
        ? s.bookedSlots.filter(Boolean)
        : String(s.bookedSlots ?? '').split(',').map(x => x.trim()).filter(Boolean);

      if (!slots.length) {
        if (s.status === 'occupied') {
          try {
            await gasUpdateStation(s.id, {
              status:      'available',
              activeSlot:  '',
              bookedSlots: [],
              currentGame: '',
            });
            anyChange = true;
          } catch (err) {
            console.warn('[SlotScheduler] clear failed for station', s.id, err.message);
          }
        }
        continue;
      }

      const active      = getActiveSlot(slots, now);
      const cleaned     = stripExpiredSlots(slots, now);
      const slotsDiffer = cleaned.length !== slots.length;

      let newStatus      = s.status;
      let newCurrentGame = s.currentGame ?? '';
      let newActiveSlot  = active ? `${active.start24}-${active.end24}` : '';

      if (active) {
        if (s.status !== 'occupied') newStatus = 'occupied';
        if (!s.currentGame && s.preferredGame) newCurrentGame = s.preferredGame;
      } else {
        const hasUpcoming = cleaned.length > 0;
        if (!hasUpcoming) {
          newStatus      = 'available';
          newCurrentGame = '';
        } else if (slotsDiffer && s.status === 'occupied') {
          const next = getNextSlot(cleaned, now - 1);
          if (next && next.startMin <= now) {
            newStatus     = 'occupied';
            newActiveSlot = `${next.start24}-${next.end24}`;
          } else {
            newStatus      = 'available';
            newCurrentGame = '';
          }
        }
      }

      const statusChanged     = newStatus !== s.status;
      const gameChanged       = newCurrentGame !== (s.currentGame ?? '');
      const existingActiveStr = s.activeSlot
        ? (typeof s.activeSlot === 'string'
            ? s.activeSlot
            : `${s.activeSlot.start24}-${s.activeSlot.end24}`)
        : '';
      const activeSlotChanged = newActiveSlot !== existingActiveStr;

      if (slotsDiffer || statusChanged || gameChanged || activeSlotChanged) {
        anyChange = true;
        try {
          await gasUpdateStation(s.id, {
            status:      newStatus,
            activeSlot:  newActiveSlot,
            bookedSlots: cleaned,
            currentGame: newCurrentGame,
          });
        } catch (err) {
          console.warn('[SlotScheduler] write failed for station', s.id, err.message);
        }
      }
    }

    if (anyChange) refetch();
  }, [refetch]);

  useEffect(() => {
    tick();
    const id = setInterval(tick, 60_000);

    // Listen for immediate-tick events fired by paymentStore when a booking
    // is made for a slot that is active right now.
    const onSlotBooked = () => tick();
    window.addEventListener('gz:slot-booked-active', onSlotBooked);

    return () => {
      clearInterval(id);
      window.removeEventListener('gz:slot-booked-active', onSlotBooked);
    };
  }, [tick]);
}
