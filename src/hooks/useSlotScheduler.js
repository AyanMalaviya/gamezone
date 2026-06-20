/**
 * useSlotScheduler
 *
 * Runs every 60 seconds (in addition to useStationData’s 30s refetch).
 * For each station it:
 *   1. Parses all booked slots in IST.
 *   2. Determines whether one is currently active (startMin <= nowIST < endMin).
 *   3. If a slot just became active → writes status=occupied, activeSlot=E, currentGame=preferredGame.
 *   4. If the active slot just ended → strips it from bookedSlots, clears col E,
 *      sets status=available if no more bookings remain today.
 *
 * Writes always go through gasClient (GAS Web App) — NO OAuth token needed.
 * oauthToken param is kept only for backwards-compatibility; it is ignored.
 */
import { useEffect, useRef, useCallback } from 'react';
import { getActiveSlot, getNextSlot, stripExpiredSlots, nowMinutes } from '../lib/slotUtils';
import { gasUpdateStation } from '../lib/gasClient';

/**
 * @param {object[]} stations      — raw stations from Google Sheets (sorted by id)
 * @param {function} refetch       — React Query refetch callback
 * @param {string|null} oauthToken — ignored; kept for API compatibility
 */
export default function useSlotScheduler(stations, refetch, oauthToken = null) { // eslint-disable-line no-unused-vars
  const stationsRef = useRef(stations);
  useEffect(() => { stationsRef.current = stations; }, [stations]);

  const tick = useCallback(async () => {
    const now     = nowMinutes();
    const current = stationsRef.current;
    if (!current?.length) return;

    const sorted = [...current].sort((a, b) => Number(a.id) - Number(b.id));
    let anyChange = false;

    for (let rowIndex = 0; rowIndex < sorted.length; rowIndex++) {
      const s = sorted[rowIndex];

      const slots = Array.isArray(s.bookedSlots)
        ? s.bookedSlots.filter(Boolean)
        : String(s.bookedSlots ?? '').split(',').map(x => x.trim()).filter(Boolean);

      if (!slots.length) {
        // No bookings — if somehow still marked occupied, free it
        if (s.status === 'occupied') {
          try {
            await gasUpdateStation(rowIndex, {
              id:            s.id,
              stationName:   s.stationName   ?? '',
              stationType:   s.stationType   ?? 'ps5',
              status:        'available',
              activeSlot:    '',
              bookedSlots:   [],
              currentGame:   '',
              preferredGame: s.preferredGame ?? '',
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
          // Always write — gasUpdateStation uses GAS Web App (no token needed)
          await gasUpdateStation(rowIndex, {
            id:            s.id,
            stationName:   s.stationName   ?? '',
            stationType:   s.stationType   ?? 'ps5',
            status:        newStatus,
            activeSlot:    newActiveSlot,
            bookedSlots:   cleaned,
            currentGame:   newCurrentGame,
            preferredGame: s.preferredGame ?? '',
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
    return () => clearInterval(id);
  }, [tick]);
}
