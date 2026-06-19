/**
 * useStationData
 *
 * Fetches stations from Google Sheets every 30 seconds and
 * enriches each station with a computed `activeSlot` and
 * `activeGame` based on the current wall-clock time.
 *
 * Consumers get:
 *   stations[]  — raw + enriched station objects
 *   isLoading, isError, refetch
 */
import { useQuery } from '@tanstack/react-query';
import { getStations } from '../lib/sheets';
import { getActiveSlot, nowMinutes } from '../lib/slotUtils';

const enrichStation = (s) => {
  const slots = Array.isArray(s.bookedSlots)
    ? s.bookedSlots.filter(Boolean)
    : String(s.bookedSlots ?? '').split(',').map(x => x.trim()).filter(Boolean);

  const now    = nowMinutes();
  const active = getActiveSlot(slots, now);

  return {
    ...s,
    // The currently-active time slot object (or null)
    activeSlot: active,
    // What game is running right now:
    //   - currentGame from sheet (manually set / auto-promoted from preferredGame)
    //   - falls back to preferredGame if currentGame is blank and slot is active
    //   - null if no active slot
    activeGame: active
      ? (s.currentGame || s.preferredGame || null)
      : null,
  };
};

const useStationData = () => {
  const query = useQuery({
    queryFn: getStations,
    queryKey: ['stations'],
    refetchInterval: 30_000,
    select: (data) => (data ?? []).map(enrichStation),
  });

  return {
    isError:   query.isError,
    isLoading: query.isLoading,
    refetch:   query.refetch,
    stations:  query.data ?? [],
  };
};

export default useStationData;
