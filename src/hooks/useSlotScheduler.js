/**
 * useSlotScheduler
 *
 * Runs every 30 seconds (synchronised with useStationData's refetch).
 * For each station it:
 *   1. Parses all booked slots.
 *   2. Determines whether one is currently active (start <= now < end).
 *   3. If a slot just became active → sets status=occupied & currentGame=preferredGame (if set).
 *   4. If the previously-active slot just ended → removes it from bookedSlots,
 *      and promotes the next slot if one starts now.
 *
 * We write to Google Sheets ONLY when something actually changed.
 * All slot strings stored in Sheets are treated as 24-hour by default;
 * AM/PM input from the admin form is converted to 24h before storage.
 */
import { useEffect, useRef, useCallback } from 'react';
import { getActiveSlot, getNextSlot, stripExpiredSlots, nowMinutes } from '../lib/slotUtils';
import { updateStation } from '../lib/sheets';

/**
 * @param {object[]} stations       — raw stations from Google Sheets
 * @param {function} refetch        — React Query refetch
 * @param {string|null} oauthToken  — only available in admin; null on public page (no writes)
 */
export default function useSlotScheduler(stations, refetch, oauthToken = null) {
  // Keep a stable ref to the latest stations so the interval callback
  // always reads fresh data without being re-created.
  const stationsRef = useRef(stations);
  useEffect(() => { stationsRef.current = stations; }, [stations]);

  const oauthRef = useRef(oauthToken);
  useEffect(() => { oauthRef.current = oauthToken; }, [oauthToken]);

  const tick = useCallback(async () => {
    const now = nowMinutes();
    const current = stationsRef.current;
    if (!current?.length) return;

    let anyChange = false;

    for (let i = 0; i < current.length; i++) {
      const s = current[i];
      const slots = Array.isArray(s.bookedSlots)
        ? s.bookedSlots.filter(Boolean)
        : String(s.bookedSlots ?? '').split(',').map(x => x.trim()).filter(Boolean);

      if (!slots.length) continue;

      const active  = getActiveSlot(slots, now);
      const cleaned = stripExpiredSlots(slots, now);
      const slotsDiffer = cleaned.length !== slots.length;

      // Determine new status & game
      let newStatus      = s.status;
      let newCurrentGame = s.currentGame;

      if (active) {
        // A slot is live right now → mark occupied
        if (s.status !== 'occupied') {
          newStatus = 'occupied';
        }
        // Show preferredGame as currentGame if currentGame is empty/null
        if (!s.currentGame && s.preferredGame) {
          newCurrentGame = s.preferredGame;
        }
      } else {
        // No active slot → check if we should free the station
        const hasUpcoming = cleaned.some(Boolean);
        if (!hasUpcoming && s.status === 'occupied') {
          // No more bookings today — set back to available and clear game
          newStatus      = 'available';
          newCurrentGame = '';
        } else if (slotsDiffer && s.status === 'occupied') {
          // Slot just expired; promote next if it starts exactly now
          const next = getNextSlot(cleaned, now - 1);
          if (next && next.startMin <= now) {
            newStatus = 'occupied';
            // Keep currentGame as-is (user may have updated it)
          } else if (!next) {
            newStatus      = 'available';
            newCurrentGame = '';
          }
        }
      }

      const statusChanged = newStatus !== s.status;
      const gameChanged   = newCurrentGame !== s.currentGame;

      if (slotsDiffer || statusChanged || gameChanged) {
        anyChange = true;
        // Write back if we have an OAuth token (admin context)
        // On the public page, we just rely on the refetch to pull the latest state.
        if (oauthRef.current) {
          try {
            await updateStation(i, {
              id:            s.id,
              status:        newStatus,
              currentGame:   newCurrentGame,
              bookedSlots:   cleaned,
              preferredGame: s.preferredGame ?? '',
              stationType:   s.stationType  ?? '',
            }, oauthRef.current);
          } catch (err) {
            console.warn('[SlotScheduler] write failed for station', s.id, err.message);
          }
        }
      }
    }

    if (anyChange) {
      // Trigger a refetch so the UI (and other tabs) see the updated state
      refetch();
    }
  }, [refetch]);

  useEffect(() => {
    // Run once immediately on mount
    tick();
    // Then every 30 seconds
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, [tick]);
}
