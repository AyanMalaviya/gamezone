/**
 * sheets.js — Google Sheets API integration
 *
 * Sheet column layout (A–H) — "Stations" tab:
 *   A  Station ID
 *   B  Station Name        (e.g. "PS5 Station 01", "Racing Simulator")
 *   C  Type               ("ps5" | "racing")
 *   D  Status             ("available" | "occupied")
 *   E  Active Slot        ("HH:MM-HH:MM" or blank)
 *   F  Booked Slots       (comma-separated "HH:MM-HH:MM, HH:MM-HH:MM")
 *   G  Current Game       (blank if none)
 *   H  Preferred Game     (blank if none)
 *
 * "Users" tab column layout (A–F):
 *   A  UID
 *   B  Name
 *   C  Email
 *   D  Phone
 *   E  Role
 *   F  Joined At
 */

const SHEETS_BASE_URL = 'https://sheets.googleapis.com/v4/spreadsheets';
const STATION_COLUMNS = 'A:H';
const USERS_SHEET_TITLE = 'Users';

let sheetTitlePromise;

const getSheetsEnv = () => {
  const sheetId = import.meta.env.VITE_SHEETS_ID;
  const apiKey  = import.meta.env.VITE_SHEETS_API_KEY;
  if (!sheetId) throw new Error('VITE_SHEETS_ID is not set.');
  if (!apiKey)  throw new Error('VITE_SHEETS_API_KEY is not set.');
  return { apiKey, sheetId };
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
  if (s === 'occupied') return 'occupied';
  return 'available';
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

  const seen = new Set();
  const unique = [];
  for (const row of validRows) {
    const id = String(row[0]).trim();
    if (!seen.has(id)) { seen.add(id); unique.push(row); }
  }

  return unique.map(mapStationRow);
};

export const updateStation = async (rowIndex, data, oauthToken) => {
  if (!oauthToken) throw new Error('No OAuth token found. Please sign out and sign in again.');

  if (import.meta.env.DEV) {
    console.info('[sheets] oauthToken prefix:', oauthToken.slice(0, 12) + '\u2026');
  }

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
    {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${oauthToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ majorDimension: 'ROWS', range, values }),
    }
  );

  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    const message = errBody?.error?.message ?? `HTTP ${res.status}`;
    const status  = errBody?.error?.status  ?? '';
    if (res.status === 403) {
      if (status === 'PERMISSION_DENIED' || message.includes('disabled'))
        throw new Error(`Google Sheets API not enabled. Go to console.cloud.google.com \u2192 APIs & Services \u2192 Enable "Google Sheets API". (${message})`);
      throw new Error(`Insufficient permissions (403). Sign out and sign in again to re-grant Sheets access. (${message})`);
    }
    if (res.status === 401)
      throw new Error(`OAuth token expired (401). Please sign out and sign in again. (${message})`);
    throw new Error(`Google Sheets write failed: ${message}`);
  }

  return res.json();
};

// ─── Users Sheet Helpers ──────────────────────────────────────────────────────

/**
 * Get all rows from the Users sheet as {uid, rowNumber} pairs for lookup.
 * rowNumber is 1-based (actual sheet row).
 */
const getUsersSheetRows = async (oauthToken) => {
  const { sheetId, apiKey } = getSheetsEnv();
  const res = await fetch(
    `${SHEETS_BASE_URL}/${sheetId}/values/${encodeURIComponent(USERS_SHEET_TITLE)}!A:A?key=${apiKey}`,
    oauthToken ? { headers: { 'Authorization': `Bearer ${oauthToken}` } } : undefined
  );
  if (!res.ok) return [];
  const data = await res.json();
  return (data?.values ?? []).map((row, i) => ({ uid: row[0] ?? '', rowNumber: i + 1 }));
};

/**
 * Ensures the Users sheet has a header row (row 1).
 * Only writes if row 1 is blank or missing.
 */
const ensureUsersHeader = async (oauthToken) => {
  const { sheetId } = getSheetsEnv();
  const rows = await getUsersSheetRows(oauthToken);
  if (rows.length > 0 && rows[0].uid === 'UID') return; // header already present

  await fetch(
    `${SHEETS_BASE_URL}/${sheetId}/values/${encodeURIComponent(USERS_SHEET_TITLE)}!A1:F1?valueInputOption=RAW`,
    {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${oauthToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        majorDimension: 'ROWS',
        range: `${USERS_SHEET_TITLE}!A1:F1`,
        values: [['UID', 'Name', 'Email', 'Phone', 'Role', 'Joined At']],
      }),
    }
  );
};

/**
 * appendUserToSheet — called when a new user is created (Google or Email signup).
 * Appends a row: UID | Name | Email | Phone | Role | Joined At
 * Requires an OAuth token with spreadsheets write scope.
 * Silently skips if no token is available (non-admin context).
 */
export const appendUserToSheet = async ({ uid, name, email, phone = '', role = 'member' }, oauthToken) => {
  if (!oauthToken) {
    if (import.meta.env.DEV) console.warn('[sheets] appendUserToSheet: no OAuth token, skipping.');
    return;
  }
  try {
    const { sheetId } = getSheetsEnv();
    await ensureUsersHeader(oauthToken);

    const joinedAt = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
    const range = `${USERS_SHEET_TITLE}!A:F`;

    const res = await fetch(
      `${SHEETS_BASE_URL}/${sheetId}/values/${encodeURIComponent(range)}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`,
      {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${oauthToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          majorDimension: 'ROWS',
          range,
          values: [[uid, name, email, phone, role, joinedAt]],
        }),
      }
    );
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      console.warn('[sheets] appendUserToSheet failed:', err?.error?.message ?? res.status);
    } else {
      if (import.meta.env.DEV) console.info('[sheets] User appended to sheet:', uid);
    }
  } catch (e) {
    console.warn('[sheets] appendUserToSheet error:', e.message);
  }
};

/**
 * updateUserPhoneInSheet — called when user saves their phone number.
 * Finds the user's row by UID and updates column D (Phone).
 * Silently skips if no token or user not found in sheet.
 */
export const updateUserPhoneInSheet = async (uid, phone, oauthToken) => {
  if (!oauthToken) {
    if (import.meta.env.DEV) console.warn('[sheets] updateUserPhoneInSheet: no OAuth token, skipping.');
    return;
  }
  try {
    const { sheetId } = getSheetsEnv();
    const rows = await getUsersSheetRows(oauthToken);
    const match = rows.find(r => r.uid === uid);
    if (!match) {
      if (import.meta.env.DEV) console.warn('[sheets] updateUserPhoneInSheet: UID not found in sheet, skipping.');
      return;
    }
    const range = `${USERS_SHEET_TITLE}!D${match.rowNumber}`;
    const res = await fetch(
      `${SHEETS_BASE_URL}/${sheetId}/values/${encodeURIComponent(range)}?valueInputOption=RAW`,
      {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${oauthToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ majorDimension: 'ROWS', range, values: [[phone]] }),
      }
    );
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      console.warn('[sheets] updateUserPhoneInSheet failed:', err?.error?.message ?? res.status);
    } else {
      if (import.meta.env.DEV) console.info('[sheets] Phone updated in sheet for:', uid);
    }
  } catch (e) {
    console.warn('[sheets] updateUserPhoneInSheet error:', e.message);
  }
};
