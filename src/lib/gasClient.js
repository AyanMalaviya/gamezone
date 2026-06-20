/**
 * gasClient.js — Thin client for the Google Apps Script Web App.
 *
 * All Sheets WRITES go through this. No OAuth token needed.
 * The GAS Web App runs as the sheet owner and has permanent access.
 *
 * Set VITE_GAS_ENDPOINT in .env to your deployed /exec URL.
 * e.g. VITE_GAS_ENDPOINT=https://script.google.com/macros/s/AKfy.../exec
 *
 * WHY GET instead of POST:
 *   GAS Web Apps redirect every POST to a new URL, which fetch() follows
 *   in no-cors mode — the redirect drops the body, so the server never
 *   receives the payload. GET requests with query-string params are NOT
 *   redirected and work reliably across origins without CORS preflight.
 *
 * WHY stationId instead of rowIndex:
 *   rowIndex is 0-based from the JS array. The sheet has 2 header rows,
 *   so rowIndex 0 → sheet row 3, rowIndex 6 → sheet row 9, etc.
 *   Passing an offset is fragile — any header-row change breaks it.
 *   Instead we send `stationId` (column A value) and let the GAS script
 *   find the correct row with a column-A lookup. This is offset-proof.
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

/** Add a booked slot to the station’s Booked Slots column. */
export function gasAddBookedSlot({ stationId, stationName, slot }) {
  return gasGet({ action: 'addBookedSlot', stationId, stationName, slot });
}

/** Append a new user row to the Users sheet. */
export function gasAddUser({ uid, name, email, phone, role }) {
  return gasGet({ action: 'addUser', uid, name, email, phone, role });
}

/** Alias used by useUserProfile.js */
export const appendUserToSheet = ({ uid, name, email, phone, role }, _oauthToken) =>
  gasAddUser({ uid, name, email, phone, role });

/** Update the phone number for an existing user row in the Users sheet. */
export function updateUserPhoneInSheet(uid, phone, _oauthToken) {
  return gasGet({ action: 'updateUserPhone', uid, phone });
}

/**
 * Update only the mutable columns (D, E, F, G) of a station row.
 * GAS finds the row by matching stationId in column A — no offset math needed.
 *
 * Locked columns A (ID), B (Name), C (Type), H (Preferred Game) are NOT sent
 * so the GAS script must NOT overwrite them.
 *
 * @param {string|number} stationId   — value in column A (e.g. "7")
 * @param {object}        data
 * @param {string}        data.status        — "available" | "occupied"
 * @param {string}        data.activeSlot    — "HH:MM-HH:MM" or ""
 * @param {string[]}      data.bookedSlots   — array of slot strings
 * @param {string}        data.currentGame   — game name or ""
 */
export function gasUpdateStation(stationId, data) {
  return gasGet({
    action:      'updateStation',
    stationId,                          // GAS looks up the row by this
    status:      data.status,
    activeSlot:  data.activeSlot ?? '',
    bookedSlots: data.bookedSlots,      // array → comma-joined by gasGet
    currentGame: data.currentGame,
    // stationName, stationType, preferredGame intentionally omitted — locked
  });
}
