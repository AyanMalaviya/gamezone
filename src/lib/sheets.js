/**
 * sheets.js — Google Sheets API integration
 *
 * ALL writes use a Google Service Account API key stored in VITE_SHEETS_SERVICE_KEY.
 * This means Sheets writes work for ALL users (email + Google) without needing
 * an OAuth token on the client side.
 *
 * Read-only calls use VITE_SHEETS_API_KEY (public, restricted to Sheets API).
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
  const sheetId    = import.meta.env.VITE_SHEETS_ID;
  const apiKey     = import.meta.env.VITE_SHEETS_API_KEY;
  if (!sheetId) throw new Error('VITE_SHEETS_ID is not set.');
  if (!apiKey)  throw new Error('VITE_SHEETS_API_KEY is not set.');
  return { apiKey, sheetId };
};

/**
 * writeHeaders — auth header for Sheets write requests.
 * Prefers oauthToken if provided (admin Google sign-in).
 * Falls back to VITE_SHEETS_SERVICE_KEY (service account key) for all other users.
 * If neither is available, returns null and the caller should skip the write.
 */
const writeHeaders = (oauthToken) => {
  if (oauthToken) {
    return { 'Authorization': `Bearer ${oauthToken}`, 'Content-Type': 'application/json' };
  }
  const serviceKey = import.meta.env.VITE_SHEETS_SERVICE_KEY;
  if (serviceKey) {
    return { 'Authorization': `Bearer ${serviceKey}`, 'Content-Type': 'application/json' };
  }
  return null; // no write credentials available
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
 * updateStation — admin-only, called from AdminDashboard to mark a station
 * occupied/available. Always uses oauthToken (admin is always Google signed-in).
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

// ─── Shared append helper ──────────────────────────────────────────────────────

const istNow = () => new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });

async function appendRows(sheetTitle, header, values, oauthToken) {
  const hdrs = writeHeaders(oauthToken);
  if (!hdrs) {
    if (import.meta.env.DEV)
      console.warn(`[sheets] appendRows(${sheetTitle}): no write credentials (no oauthToken and VITE_SHEETS_SERVICE_KEY not set). Add VITE_SHEETS_SERVICE_KEY to .env to enable writes for non-Google users.`);
    return;
  }
  try {
    const { sheetId, apiKey } = getSheetsEnv();

    // Check if header exists
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
    const res = await fetch(
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
    const data = await res.json();
    const rows = data?.values ?? [];
    const rowIdx = rows.findIndex(r => r[0] === uid);
    if (rowIdx === -1) return;
    const range = `${USERS_SHEET_TITLE}!D${rowIdx + 1}`;
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

/**
 * appendBookingToSheet — called after every successful payment.
 * Works for ALL users (email + Google) via service key fallback.
 */
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
