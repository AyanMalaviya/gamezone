/**
 * sheets.js — Google Sheets API integration
 *
 * Sheet column layout (A–H):
 *   A  Station ID
 *   B  Station Name        (e.g. "PS5 Station 01", "Racing Simulator")
 *   C  Type               ("ps5" | "racing")
 *   D  Status             ("available" | "occupied")
 *   E  Active Slot        ("HH:MM-HH:MM" or blank)
 *   F  Booked Slots       (comma-separated "HH:MM-HH:MM, HH:MM-HH:MM")
 *   G  Current Game       (blank if none)
 *   H  Preferred Game     (blank if none)
 */

const SHEETS_BASE_URL = 'https://sheets.googleapis.com/v4/spreadsheets';
const STATION_COLUMNS = 'A:H';

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

/**
 * Normalise status string — treat "free", blank, or unknown values as "available".
 */
const normaliseStatus = (raw) => {
  const s = String(raw ?? '').trim().toLowerCase();
  if (s === 'occupied') return 'occupied';
  return 'available'; // covers "free", "", "available", anything else
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

  // Deduplicate by station ID — keep first occurrence
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
    console.info('[sheets] oauthToken prefix:', oauthToken.slice(0, 12) + '…');
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
        throw new Error(`Google Sheets API not enabled. Go to console.cloud.google.com → APIs & Services → Enable "Google Sheets API". (${message})`);
      throw new Error(`Insufficient permissions (403). Sign out and sign in again to re-grant Sheets access. (${message})`);
    }
    if (res.status === 401)
      throw new Error(`OAuth token expired (401). Please sign out and sign in again. (${message})`);
    throw new Error(`Google Sheets write failed: ${message}`);
  }

  return res.json();
};
