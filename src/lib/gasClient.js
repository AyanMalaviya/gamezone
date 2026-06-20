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
 */

const GAS_URL = import.meta.env.VITE_GAS_ENDPOINT;

/**
 * Send a write action to the GAS Web App via GET + query params.
 * Fire-and-forget: we don’t need the response body.
 */
async function gasGet(payload) {
  if (!GAS_URL) {
    if (import.meta.env.DEV)
      console.warn('[gasClient] VITE_GAS_ENDPOINT not set. Skipping Sheets write.');
    return;
  }
  try {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(payload)) {
      // Serialize arrays as comma-separated strings
      params.set(key, Array.isArray(value) ? value.join(',') : String(value ?? ''));
    }
    // no-cors is fine for GET — no preflight, no redirect body-drop
    await fetch(`${GAS_URL}?${params.toString()}`, { method: 'GET', mode: 'no-cors' });
  } catch (err) {
    console.warn('[gasClient] fetch error:', err.message);
  }
}

/**
 * Append a new booking row to the Bookings sheet.
 */
export function gasAddBooking({ txnId, uid, stationName, slot, hours, amount, upiId, bank, status }) {
  return gasGet({ action: 'addBooking', txnId, uid, stationName, slot, hours, amount, upiId, bank, status });
}

/**
 * Add a booked slot to the station’s Booked Slots column.
 */
export function gasAddBookedSlot({ stationIndex, stationName, slot }) {
  return gasGet({ action: 'addBookedSlot', stationIndex, stationName, slot });
}

/**
 * Append a new user row to the Users sheet.
 */
export function gasAddUser({ uid, name, email, phone, role }) {
  return gasGet({ action: 'addUser', uid, name, email, phone, role });
}

/** Alias used by useUserProfile.js */
export const appendUserToSheet = ({ uid, name, email, phone, role }, _oauthToken) =>
  gasAddUser({ uid, name, email, phone, role });

/**
 * Update the phone number for an existing user row in the Users sheet.
 */
export function updateUserPhoneInSheet(uid, phone, _oauthToken) {
  return gasGet({ action: 'updateUserPhone', uid, phone });
}

/**
 * Update a station row (Admin Dashboard Save, or SlotScheduler auto-update).
 * No OAuth token needed — GAS Web App runs as sheet owner.
 */
export function gasUpdateStation(rowIndex, data) {
  return gasGet({
    action:        'updateStation',
    rowIndex,
    id:            data.id,
    stationName:   data.stationName,
    stationType:   data.stationType,
    status:        data.status,
    activeSlot:    data.activeSlot ?? '',
    bookedSlots:   data.bookedSlots,   // array → comma-joined by gasGet
    currentGame:   data.currentGame,
    preferredGame: data.preferredGame,
  });
}
