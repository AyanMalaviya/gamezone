/**
 * gasClient.js — Thin client for the Google Apps Script Web App.
 *
 * All Sheets WRITES go through this. No OAuth token needed.
 * The GAS Web App runs as the sheet owner and has permanent access.
 *
 * Set VITE_GAS_ENDPOINT in .env to your deployed /exec URL.
 * e.g. VITE_GAS_ENDPOINT=https://script.google.com/macros/s/AKfy.../exec
 *
 * Note: GAS Web Apps don't support CORS preflight properly, so we use
 * no-cors mode. This means we can't read the response body — but the
 * write always succeeds server-side as long as the request is sent.
 * To confirm writes, check the sheet directly.
 */

const GAS_URL = import.meta.env.VITE_GAS_ENDPOINT;

async function gasPost(payload) {
  if (!GAS_URL) {
    if (import.meta.env.DEV)
      console.warn('[gasClient] VITE_GAS_ENDPOINT not set. Skipping Sheets write.');
    return;
  }
  try {
    await fetch(GAS_URL, {
      method:  'POST',
      mode:    'no-cors',
      headers: { 'Content-Type': 'text/plain' },
      body:    JSON.stringify(payload),
    });
  } catch (err) {
    console.warn('[gasClient] fetch error:', err.message);
  }
}

/**
 * Append a new booking row to the Bookings sheet.
 */
export function gasAddBooking({ txnId, uid, stationName, slot, hours, amount, upiId, bank, status }) {
  return gasPost({ action: 'addBooking', txnId, uid, stationName, slot, hours, amount, upiId, bank, status });
}

/**
 * Add a booked slot to the station's Booked Slots column.
 * Does NOT change status — Apps Script cleanup handles that at start time.
 */
export function gasAddBookedSlot({ stationIndex, stationName, slot }) {
  return gasPost({ action: 'addBookedSlot', stationIndex, stationName, slot });
}

/**
 * Append a new user row to the Users sheet.
 * Also exported as appendUserToSheet for backwards compatibility with useUserProfile.js.
 */
export function gasAddUser({ uid, name, email, phone, role }) {
  return gasPost({ action: 'addUser', uid, name, email, phone, role });
}

/** Alias used by useUserProfile.js */
export const appendUserToSheet = ({ uid, name, email, phone, role }, _oauthToken) =>
  gasAddUser({ uid, name, email, phone, role });

/**
 * Update the phone number for an existing user row in the Users sheet.
 * Alias used by useUserProfile.js.
 */
export function updateUserPhoneInSheet(uid, phone, _oauthToken) {
  return gasPost({ action: 'updateUserPhone', uid, phone });
}

/**
 * Admin explicit station save (from AdminDashboard Save button).
 */
export function gasUpdateStation(rowIndex, data) {
  return gasPost({
    action:        'updateStation',
    rowIndex,
    id:            data.id,
    stationName:   data.stationName,
    stationType:   data.stationType,
    status:        data.status,
    activeSlot:    data.activeSlot,
    bookedSlots:   data.bookedSlots,
    currentGame:   data.currentGame,
    preferredGame: data.preferredGame,
  });
}
