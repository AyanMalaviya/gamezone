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
 *
 * Row 1  = header  (skipped on read)
 * Row 18 = guide   (skipped — id will be non-numeric)
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
 * mapStationRow — maps a raw Sheets row array to a station object.
 * Columns A–H (indices 0–7).
 * Rows where column A is not a valid number (e.g. header, guide row) are filtered out
 * by getStations() before reaching this function.
 */
const mapStationRow = (row = []) => ({
  id:            String(row[0] ?? '').trim(),
  stationName:   String(row[1] ?? '').trim(),
  stationType:   String(row[2] ?? '').trim().toLowerCase() || 'ps5',
  status:        String(row[3] ?? '').trim().toLowerCase() || 'available',
  activeSlot:    (() => {
    const raw = String(row[4] ?? '').trim();
    if (!raw) return null;
    // parse "HH:MM-HH:MM" → { start24, end24 }
    const m = raw.match(/^(\d{1,2}:\d{2})-(\d{1,2}:\d{2})$/);
    return m ? { start24: m[1], end24: m[2] } : null;
  })(),
  bookedSlots:   parseBookedSlots(row[5]),
  currentGame:   String(row[6] ?? '').trim(),
  preferredGame: String(row[7] ?? '').trim(),
  activeGame:    String(row[6] ?? '').trim(), // alias used by StationModal
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

  // Skip row 0 (header). Also skip any row where column A is not a valid number
  // (catches the guide row and any blank rows at the bottom).
  return rows
    .slice(1)
    .filter(row => row && row[0] && !isNaN(Number(String(row[0]).trim())))
    .map(mapStationRow);
};

/**
 * updateStation — writes one row back to the sheet via OAuth2.
 *
 * @param {number} rowIndex   0-based index into the DATA rows (after header).
 *                            Station ID 1 → rowIndex 0 → sheet row 2.
 * @param {object} data       Station fields to write.
 * @param {string} oauthToken Google OAuth2 access token (requires spreadsheets scope).
 *
 * Common errors:
 *  403 PERMISSION_DENIED        → Sheets API not enabled, or wrong OAuth scope.
 *  403 insufficientPermissions  → token missing spreadsheets scope; re-sign-in.
 *  401 Invalid Credentials      → token expired; sign out and sign in again.
 */
export const updateStation = async (rowIndex, data, oauthToken) => {
  if (!oauthToken) {
    throw new Error(
      'No OAuth token found. Please sign out and sign in again to grant Sheets write access.'
    );
  }

  if (import.meta.env.DEV) {
    console.info('[sheets] oauthToken prefix:', oauthToken.slice(0, 12) + '\u2026');
  }

  const { sheetId } = getSheetsEnv();
  const sheetTitle  = await getSheetTitle();
  // +2: row 1 is the header; Sheets rows are 1-indexed
  const sheetRow    = Number(rowIndex) + 2;

  if (!Number.isInteger(sheetRow) || sheetRow < 2) {
    throw new Error('rowIndex must be a valid zero-based data row index.');
  }

  const range  = `${sheetTitle}!A${sheetRow}:H${sheetRow}`;
  const values = [[
    data?.id            ?? '',          // A — Station ID
    data?.stationName   ?? '',          // B — Station Name
    data?.stationType   ?? 'ps5',       // C — Type
    data?.status        ?? 'available', // D — Status
    serializeActiveSlot(data?.activeSlot),  // E — Active Slot
    serializeBookedSlots(data?.bookedSlots), // F — Booked Slots
    data?.currentGame   ?? '',          // G — Current Game
    data?.preferredGame ?? '',          // H — Preferred Game
  ]];

  const res = await fetch(
    `${SHEETS_BASE_URL}/${sheetId}/values/${encodeURIComponent(range)}?valueInputOption=RAW`,
    {
      method:  'PUT',
      headers: {
        'Authorization': `Bearer ${oauthToken}`,
        'Content-Type':  'application/json',
      },
      body: JSON.stringify({ majorDimension: 'ROWS', range, values }),
    }
  );

  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    const message = errBody?.error?.message ?? `HTTP ${res.status}`;
    const status  = errBody?.error?.status  ?? '';

    if (res.status === 403) {
      if (status === 'PERMISSION_DENIED' || message.includes('disabled')) {
        throw new Error(
          `Google Sheets API is not enabled for this project. ` +
          `Go to console.cloud.google.com \u2192 APIs & Services \u2192 Enable \u201cGoogle Sheets API\u201d. ` +
          `(${message})`
        );
      }
      throw new Error(
        `Insufficient permissions (403). The OAuth token may be missing the spreadsheets scope. ` +
        `Sign out and sign in again to re-grant access. (${message})`
      );
    }

    if (res.status === 401) {
      throw new Error(
        `OAuth token expired or invalid (401). Please sign out and sign in again. (${message})`
      );
    }

    throw new Error(`Google Sheets write failed: ${message}`);
  }

  return res.json();
};
