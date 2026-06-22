/**
 * gasClient.js — Thin client for the Google Apps Script Web App.
 *
 * Handles ONLY:
 *   1. Bookings sheet  — append new booking row
 *   2. Station sheet   — update booked slots / station status
 *
 * Users sheet sync has been REMOVED. Users are stored exclusively in
 * Firestore (/users/{uid}) and read directly from there.
 *
 * Set VITE_GAS_ENDPOINT in .env to your deployed /exec URL.
 *
 * WHY GET instead of POST:
 *   GAS Web Apps redirect every POST, which fetch() follows in no-cors mode
 *   dropping the body. GET with query-string params are not redirected.
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

/** Append a new booking row to the Bookings sheet. */
export function gasAddBooking({ txnId, uid, stationName, slot, hours, amount, upiId, bank, status }) {
  return gasGet({ action: 'addBooking', txnId, uid, stationName, slot, hours, amount, upiId, bank, status });
}

/** Add a booked slot to the station's Booked Slots column. */
export function gasAddBookedSlot({ stationId, stationName, slot }) {
  return gasGet({ action: 'addBookedSlot', stationId, stationName, slot });
}

/**
 * Remove a single slot from the station's Booked Slots column.
 * Called when a booking is deleted from the admin dashboard.
 */
export function gasRemoveBookedSlot({ stationId, slot }) {
  return gasGet({ action: 'removeBookedSlot', stationId, slot });
}

/**
 * Update only the mutable columns of a station row.
 * GAS finds the row by matching stationId in column A.
 */
export function gasUpdateStation(stationId, data) {
  return gasGet({
    action:      'updateStation',
    stationId,
    status:      data.status,
    activeSlot:  data.activeSlot ?? '',
    bookedSlots: data.bookedSlots,
    currentGame: data.currentGame,
  });
}
