/**
 * gasClient.js — Thin client for the Google Apps Script Web App.
 *
 * After the Firestore migration this file handles ONLY:
 *   • gasAddBooking  — append a receipt row to the Bookings sheet (audit log)
 *
 * Removed (no longer needed — Firestore is source of truth for stations):
 *   • gasAddBookedSlot    (station bookedSlots derived from /bookings)
 *   • gasRemoveBookedSlot (auto-derived on booking delete)
 *   • gasUpdateStation    (status/activeSlot computed at render time)
 *
 * Set VITE_GAS_ENDPOINT in .env to your deployed /exec URL.
 */

const GAS_URL = import.meta.env.VITE_GAS_ENDPOINT;

async function gasGet(payload) {
  if (!GAS_URL) {
    if (import.meta.env.DEV)
      console.warn('[gasClient] VITE_GAS_ENDPOINT not set. Skipping Sheets write.');
    return;
  }
  try {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(payload)) {
      params.set(key, Array.isArray(value) ? value.join(',') : String(value ?? ''));
    }
    await fetch(`${GAS_URL}?${params.toString()}`, { method: 'GET', mode: 'no-cors' });
  } catch (err) {
    console.warn('[gasClient] fetch error:', err.message);
  }
}

/** Append a new booking row to the Bookings sheet (audit log only). */
export function gasAddBooking({ txnId, uid, stationName, slot, hours, amount, upiId, bank, status }) {
  return gasGet({ action: 'addBooking', txnId, uid, stationName, slot, hours, amount, upiId, bank, status });
}
