/**
 * useSlotScheduler
 *
 * Runs every 60 seconds (in addition to useStationData's 30s refetch).
 * For each station it:
 *   1. Parses all booked slots in IST.
 *   2. Determines whether one is currently active (startMin <= nowIST < endMin).
 *   3. If a slot just became active → writes status=occupied, activeSlot=E, currentGame=preferredGame.
 *   4. If the active slot just ended → strips it from bookedSlots, clears col E,
 *      sets status=available if no more bookings remain today.
 *
 * Writes to Google Sheets ONLY when something actually changed.
 * Requires oauthToken to write; without it, enrichStation() in useStationData
 * still correctly computes activeSlot / activeGame for the local UI.
 *
 * rowIndex passed to updateStation() is the station's 0-based index in the
 * sorted (by id) stations array — matching how the sheet is ordered.
 */
import { useEffect, useRef, useCallback } from 'react';
import { getActiveSlot, getNextSlot, stripExpiredSlots, nowMinutes } from '../lib/slotUtils';
import { updateStation } from '../lib/sheets';

/**
 * @param {object[]} stations      — raw stations from Google Sheets (already sorted by id)
 * @param {function} refetch       — React Query refetch callback
 * @param {string|null} oauthToken — Google OAuth token; null = no Sheets writes (public page)
 */
export default function useSlotScheduler(stations, refetch, oauthToken = null) {
  const stationsRef = useRef(stations);
  useEffect(() => { stationsRef.current = stations; }, [stations]);

  const oauthRef = useRef(oauthToken);
  useEffect(() => { oauthRef.current = oauthToken; }, [oauthToken]);

  const tick = useCallback(async () => {
    const now     = nowMinutes();
    const current = stationsRef.current;
    if (!current?.length) return;

    // Sort by numeric station id to match Google Sheets row order.
    // The sorted index is used as the rowIndex for updateStation().
    const sorted = [...current].sort((a, b) => Number(a.id) - Number(b.id));
    let anyChange = false;

    for (let rowIndex = 0; rowIndex < sorted.length; rowIndex++) {
      const s = sorted[rowIndex];

      const slots = Array.isArray(s.bookedSlots)
        ? s.bookedSlots.filter(Boolean)
        : String(s.bookedSlots ?? '').split(',').map(x => x.trim()).filter(Boolean);

      if (!slots.length) {
        // No bookings at all — if somehow marked occupied, free it
        if (s.status === 'occupied' && oauthRef.current) {
          try {
            await updateStation(rowIndex, {
              id:            s.id,
              stationName:   s.stationName   ?? '',
              stationType:   s.stationType   ?? 'ps5',
              status:        'available',
              activeSlot:    '',
              bookedSlots:   [],
              currentGame:   '',
              preferredGame: s.preferredGame ?? '',
            }, oauthRef.current);
            anyChange = true;
          } catch (err) {
            console.warn('[SlotScheduler] clear failed for station', s.id, err.message);
          }
        }
        continue;
      }

      const active  = getActiveSlot(slots, now);
      // Strip only fully-expired slots (endMin <= now); keep current and future ones
      const cleaned = stripExpiredSlots(slots, now);
      const slotsDiffer = cleaned.length !== slots.length;

      let newStatus      = s.status;
      let newCurrentGame = s.currentGame ?? '';
      // activeSlot for col E — "HH:MM-HH:MM" string or ''
      let newActiveSlot  = active ? `${active.start24}-${active.end24}` : '';

      if (active) {
        // Slot is live right now
        if (s.status !== 'occupied') newStatus = 'occupied';
        if (!s.currentGame && s.preferredGame) newCurrentGame = s.preferredGame;
      } else {
        // No active slot
        const hasUpcoming = cleaned.length > 0;
        if (!hasUpcoming) {
          // No more bookings today — free the station
          newStatus      = 'available';
          newCurrentGame = '';
        } else if (slotsDiffer && s.status === 'occupied') {
          // A slot just expired; check if next one starts now
          const next = getNextSlot(cleaned, now - 1);
          if (next && next.startMin <= now) {
            newStatus     = 'occupied';
            newActiveSlot = `${next.start24}-${next.end24}`;
          } else {
            // Gap between slots — station is temporarily free
            newStatus      = 'available';
            newCurrentGame = '';
          }
        }
      }

      const statusChanged     = newStatus !== s.status;
      const gameChanged       = newCurrentGame !== (s.currentGame ?? '');
      // Compare col E: serialize existing activeSlot for comparison
      const existingActiveStr = s.activeSlot
        ? (typeof s.activeSlot === 'string'
          ? s.activeSlot
          : `${s.activeSlot.start24}-${s.activeSlot.end24}`)
        : '';
      const activeSlotChanged = newActiveSlot !== existingActiveStr;

      if (slotsDiffer || statusChanged || gameChanged || activeSlotChanged) {
        anyChange = true;
        if (oauthRef.current) {
          try {
            await updateStation(rowIndex, {
              id:            s.id,
              stationName:   s.stationName   ?? '',
              stationType:   s.stationType   ?? 'ps5',
              status:        newStatus,
              activeSlot:    newActiveSlot,
              bookedSlots:   cleaned,
              currentGame:   newCurrentGame,
              preferredGame: s.preferredGame ?? '',
            }, oauthRef.current);
          } catch (err) {
            console.warn('[SlotScheduler] write failed for station', s.id, err.message);
          }
        }
      }
    }

    if (anyChange) refetch();
  }, [refetch]);

  useEffect(() => {
    tick(); // run immediately on mount
    const id = setInterval(tick, 60_000); // then every 60s
    return () => clearInterval(id);
  }, [tick]);
}
