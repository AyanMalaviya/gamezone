/**
 * sheets.js — Google Sheets API integration
 *
 * Write auth priority:
 *   1. oauthToken  (Google-signed-in admin or member)
 *   2. VITE_SHEETS_SERVICE_KEY  (service account — works for all users)
 *
 * Slot lifecycle (managed jointly by this file + Apps Script):
 *   - On booking:       slot added to Booked Slots (F), status stays "available"
 *   - At slot start:    Apps Script moves slot to Active Slot (E), sets occupied
 *   - At slot end:      Apps Script clears Active Slot, resets to available
 *
 * "Stations" tab column layout (A–H):
 *   A  Station ID   B  Station Name   C  Type   D  Status
 *   E  Active Slot  F  Booked Slots   G  Current Game   H  Preferred Game
 *
 * "Users" tab column layout (A–F):
 *   A  UID   B  Name   C  Email   D  Phone   E  Role   F  Joined At
 *
 * "Bookings" tab column layout (A–J):
 *   A  TXN ID   B  UID   C  Station   D  Slot   E  Hours
 *   F  Amount (₹)   G  UPI ID   H  Bank   I  Status   J  Booked At
 */

const SHEETS_BASE_URL      = 'https://sheets.googleapis.com/v4/spreadsheets';
const STATION_COLUMNS      = 'A:H';
const USERS_SHEET_TITLE    = 'Users';
const BOOKINGS_SHEET_TITLE = 'Bookings';

let sheetTitlePromise;

const getSheetsEnv = () => {
  const sheetId = import.meta.env.VITE_SHEETS_ID;
  const apiKey  = import.meta.env.VITE_SHEETS_API_KEY;
  if (!sheetId) throw new Error('VITE_SHEETS_ID is not set.');
  if (!apiKey)  throw new Error('VITE_SHEETS_API_KEY is not set.');
  return { apiKey, sheetId };
};

/**
 * writeHeaders — auth headers for Sheets write requests.
 * Prefers oauthToken (Google sign-in). Falls back to VITE_SHEETS_SERVICE_KEY.
 * Returns null if neither is available — callers should skip the write.
 */
const writeHeaders = (oauthToken) => {
  const token = oauthToken || import.meta.env.VITE_SHEETS_SERVICE_KEY || null;
  if (!token) return null;
  return { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };
};

const getSheetTitle = async () => {
  if (!sheetTitlePromise) {
    sheetTitlePromise = (async () => {
      const { apiKey, sheetId } = getSheetsEnv();
      const res = await fetch(
        `${SHEETS_BASE_URL}/${sheetId}?key=${apiKey}&fields=sheets(properties(title))`
      );
      if (!res.ok) throw new Error('Failed to load Google Sheets metadata.');
      const data  = await res.json();
      const title = data?.sheets?.[0]?.properties?.title;
      if (!title) throw new Error('Spreadsheet has no tabs.');
      return title;
    })();
  }
  return sheetTitlePromise;
};

const parseBookedSlots = (value) =>
  value ? String(value).split(',').map(s => s.trim()).filter(Boolean) : [];

const normaliseStatus = (raw) => {
  const s = String(raw ?? '').trim().toLowerCase();
  return s === 'occupied' ? 'occupied' : 'available';
};

const mapStationRow = (row = []) => ({
  id:            String(row[0] ?? '').trim(),
  stationName:   String(row[1] ?? '').trim(),
  stationType:   String(row[2] ?? '').trim().toLowerCase() || 'ps5',
  status:        normaliseStatus(row[3]),
  activeSlot:    (() => {
    const raw = String(row[4] ?? '').trim();
    if (!raw) return null;
    const m = raw.match(/^(\d{1,2}:\d{2})-(\d{1,2}:\d{2})$/);
    return m ? { start24: m[1], end24: m[2] } : null;
  })(),
  bookedSlots:   parseBookedSlots(row[5]),
  currentGame:   String(row[6] ?? '').trim(),
  preferredGame: String(row[7] ?? '').trim(),
  activeGame:    String(row[6] ?? '').trim(),
});

const serializeBookedSlots = (value) =>
  Array.isArray(value) ? value.join(', ') : (value ?? '');

const serializeActiveSlot = (slot) => {
  if (!slot) return '';
  if (typeof slot === 'string') return slot;
  if (slot.start24 && slot.end24) return `${slot.start24}-${slot.end24}`;
  return '';
};

export const getStations = async () => {
  const { apiKey, sheetId } = getSheetsEnv();
  const sheetTitle = await getSheetTitle();
  const res = await fetch(
    `${SHEETS_BASE_URL}/${sheetId}/values/${encodeURIComponent(sheetTitle)}!${STATION_COLUMNS}?key=${apiKey}`
  );
  if (!res.ok) throw new Error('Failed to load stations from Google Sheets.');
  const data = await res.json();
  const rows = data?.values ?? [];

  const validRows = rows
    .slice(1)
    .filter(row => row && row[0] && !isNaN(Number(String(row[0]).trim())));

  const seen   = new Set();
  const unique = [];
  for (const row of validRows) {
    const id = String(row[0]).trim();
    if (!seen.has(id)) { seen.add(id); unique.push(row); }
  }
  return unique.map(mapStationRow);
};

/**
 * updateStation — admin-only explicit save from AdminDashboard.
 */
export const updateStation = async (rowIndex, data, oauthToken) => {
  const hdrs = writeHeaders(oauthToken);
  if (!hdrs) throw new Error('No write credentials. Admin must be signed in with Google.');

  const { sheetId } = getSheetsEnv();
  const sheetTitle  = await getSheetTitle();
  const sheetRow    = Number(rowIndex) + 2;

  if (!Number.isInteger(sheetRow) || sheetRow < 2)
    throw new Error('rowIndex must be a valid zero-based data row index.');

  const range  = `${sheetTitle}!A${sheetRow}:H${sheetRow}`;
  const values = [[
    data?.id            ?? '',
    data?.stationName   ?? '',
    data?.stationType   ?? 'ps5',
    data?.status        ?? 'available',
    serializeActiveSlot(data?.activeSlot),
    serializeBookedSlots(data?.bookedSlots),
    data?.currentGame   ?? '',
    data?.preferredGame ?? '',
  ]];

  const res = await fetch(
    `${SHEETS_BASE_URL}/${sheetId}/values/${encodeURIComponent(range)}?valueInputOption=RAW`,
    { method: 'PUT', headers: hdrs, body: JSON.stringify({ majorDimension: 'ROWS', range, values }) }
  );

  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    const message = errBody?.error?.message ?? `HTTP ${res.status}`;
    const status  = errBody?.error?.status  ?? '';
    if (res.status === 403) {
      if (status === 'PERMISSION_DENIED' || message.includes('disabled'))
        throw new Error(`Google Sheets API not enabled. Enable it in Google Cloud Console. (${message})`);
      throw new Error(`Insufficient permissions (403). Sign out and sign in again. (${message})`);
    }
    if (res.status === 401)
      throw new Error(`OAuth token expired (401). Please sign out and sign in again. (${message})`);
    throw new Error(`Google Sheets write failed: ${message}`);
  }
  return res.json();
};

/**
 * updateStationOnBooking — called after a successful payment.
 *
 * ONLY appends the new slot to Booked Slots (F) and preserves current status.
 * Does NOT set status=occupied or touch Active Slot (E).
 * The Apps Script (gamezone_cleanup.gs) is responsible for:
 *   - Moving the slot from Booked Slots to Active Slot when start time arrives
 *   - Setting status=occupied at that point
 *   - Clearing Active Slot and resetting to available when end time passes
 *
 * meta shape: { stationIndex, stationId, stationName, stationType,
 *               slot, currentStatus, activeSlot, bookedSlots,
 *               currentGame, preferredGame }
 */
export const updateStationOnBooking = async (meta, oauthToken) => {
  const hdrs = writeHeaders(oauthToken);
  if (!hdrs) {
    if (import.meta.env.DEV)
      console.warn('[sheets] updateStationOnBooking: no write credentials. Set VITE_SHEETS_SERVICE_KEY in .env.');
    return;
  }

  const { stationIndex } = meta;
  if (stationIndex == null) {
    if (import.meta.env.DEV) console.warn('[sheets] updateStationOnBooking: stationIndex missing in meta.');
    return;
  }

  try {
    const { sheetId } = getSheetsEnv();
    const sheetTitle  = await getSheetTitle();
    const sheetRow    = Number(stationIndex) + 2;

    // Merge new slot into existing booked slots — no duplicates
    const existingSlots = Array.isArray(meta.bookedSlots) ? meta.bookedSlots : [];
    const updatedSlots  = meta.slot
      ? [...new Set([...existingSlots, meta.slot])]
      : existingSlots;

    const range  = `${sheetTitle}!A${sheetRow}:H${sheetRow}`;
    const values = [[
      meta.stationId      ?? '',
      meta.stationName    ?? '',
      meta.stationType    ?? 'ps5',
      meta.currentStatus  ?? 'available',        // preserve current status — DO NOT set occupied
      serializeActiveSlot(meta.activeSlot ?? null), // preserve current active slot unchanged
      serializeBookedSlots(updatedSlots),           // only this changes — new slot appended
      meta.currentGame    ?? '',
      meta.preferredGame  ?? '',
    ]];

    const res = await fetch(
      `${SHEETS_BASE_URL}/${sheetId}/values/${encodeURIComponent(range)}?valueInputOption=RAW`,
      { method: 'PUT', headers: hdrs, body: JSON.stringify({ majorDimension: 'ROWS', range, values }) }
    );

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      console.warn('[sheets] updateStationOnBooking failed:', err?.error?.message ?? res.status);
    } else {
      if (import.meta.env.DEV)
        console.info('[sheets] Booked slot added to station row:', meta.stationName, '| slot:', meta.slot);
    }
  } catch (e) {
    console.warn('[sheets] updateStationOnBooking error:', e.message);
  }
};

// ─── Shared append helper ──────────────────────────────────────────────────────

const istNow = () => new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });

async function appendRows(sheetTitle, header, values, oauthToken) {
  const hdrs = writeHeaders(oauthToken);
  if (!hdrs) {
    if (import.meta.env.DEV)
      console.warn(`[sheets] appendRows(${sheetTitle}): no write credentials. Set VITE_SHEETS_SERVICE_KEY in .env.`);
    return;
  }
  try {
    const { sheetId, apiKey } = getSheetsEnv();
    const checkRes  = await fetch(
      `${SHEETS_BASE_URL}/${sheetId}/values/${encodeURIComponent(sheetTitle)}!A1?key=${apiKey}`
    );
    const checkData = checkRes.ok ? await checkRes.json() : {};
    const firstCell = checkData?.values?.[0]?.[0] ?? '';

    if (firstCell !== header[0]) {
      await fetch(
        `${SHEETS_BASE_URL}/${sheetId}/values/${encodeURIComponent(sheetTitle)}!A1:${String.fromCharCode(64 + header.length)}1?valueInputOption=RAW`,
        { method: 'PUT', headers: hdrs, body: JSON.stringify({ majorDimension: 'ROWS', range: `${sheetTitle}!A1`, values: [header] }) }
      );
    }

    const range = `${sheetTitle}!A:${String.fromCharCode(64 + header.length)}`;
    const res   = await fetch(
      `${SHEETS_BASE_URL}/${sheetId}/values/${encodeURIComponent(range)}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`,
      { method: 'POST', headers: hdrs, body: JSON.stringify({ majorDimension: 'ROWS', range, values }) }
    );
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      console.warn(`[sheets] appendRows(${sheetTitle}) failed:`, err?.error?.message ?? res.status);
    }
  } catch (e) {
    console.warn(`[sheets] appendRows(${sheetTitle}) error:`, e.message);
  }
}

// ─── Users Sheet ──────────────────────────────────────────────────────────────

const USERS_HEADER = ['UID', 'Name', 'Email', 'Phone', 'Role', 'Joined At'];

export const appendUserToSheet = async ({ uid, name, email, phone = '', role = 'member' }, oauthToken) => {
  await appendRows(USERS_SHEET_TITLE, USERS_HEADER, [[uid, name, email, phone, role, istNow()]], oauthToken);
  if (import.meta.env.DEV) console.info('[sheets] User appended:', uid);
};

export const updateUserPhoneInSheet = async (uid, phone, oauthToken) => {
  const hdrs = writeHeaders(oauthToken);
  if (!hdrs) return;
  try {
    const { sheetId, apiKey } = getSheetsEnv();
    const res  = await fetch(`${SHEETS_BASE_URL}/${sheetId}/values/${encodeURIComponent(USERS_SHEET_TITLE)}!A:A?key=${apiKey}`);
    if (!res.ok) return;
    const data   = await res.json();
    const rowIdx = (data?.values ?? []).findIndex(r => r[0] === uid);
    if (rowIdx === -1) return;
    const range  = `${USERS_SHEET_TITLE}!D${rowIdx + 1}`;
    await fetch(
      `${SHEETS_BASE_URL}/${sheetId}/values/${encodeURIComponent(range)}?valueInputOption=RAW`,
      { method: 'PUT', headers: hdrs, body: JSON.stringify({ majorDimension: 'ROWS', range, values: [[phone]] }) }
    );
    if (import.meta.env.DEV) console.info('[sheets] Phone updated for:', uid);
  } catch (e) {
    console.warn('[sheets] updateUserPhoneInSheet error:', e.message);
  }
};

// ─── Bookings Sheet ───────────────────────────────────────────────────────────

const BOOKINGS_HEADER = ['TXN ID', 'UID', 'Station', 'Slot', 'Hours', 'Amount (₹)', 'UPI ID', 'Bank', 'Status', 'Booked At'];

export const appendBookingToSheet = async ({
  txnId, uid, stationName, slot, hours, amount, upiId, bank, status,
}, oauthToken) => {
  await appendRows(
    BOOKINGS_SHEET_TITLE,
    BOOKINGS_HEADER,
    [[txnId, uid, stationName, slot, hours, amount, upiId, bank, status, istNow()]],
    oauthToken
  );
  if (import.meta.env.DEV) console.info('[sheets] Booking appended:', txnId);
};
