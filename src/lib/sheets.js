/**
 * sheets.js — Google Sheets API integration
 *
 * READ ONLY. All writes go through gasClient.js -> GAS Web App.
 *
 * Slot lifecycle (managed by Apps Script gamezone_webapp.gs):
 *   - On booking:    slot added to Booked Slots (F), status stays "available"
 *   - At slot start: Apps Script -> Active Slot (E), status = occupied
 *   - At slot end:   Apps Script clears E, status = available
 *
 * "Stations" tab layout (row 1 = header, row 2 = subtitle/info, row 3+ = data):
 *   A  Station ID   B  Station Name   C  Type   D  Status
 *   E  Active Slot  F  Booked Slots   G  Current Game  H  Preferred Game
 *
 * "Users" tab column layout (A–F):
 *   A  UID   B  Name   C  Email   D  Phone   E  Role   F  Joined At
 *
 * "Bookings" tab column layout (A–J):
 *   A  TXN ID  B  UID  C  Station  D  Slot  E  Hours
 *   F  Amount (₹)  G  UPI ID  H  Bank  I  Status  J  Booked At
 */

const SHEETS_BASE_URL = 'https://sheets.googleapis.com/v4/spreadsheets';
const STATION_COLUMNS = 'A:H';

// Number of non-data rows at the top of the Stations tab:
//   row 1 = column headers
//   row 2 = subtitle / info row  (no numeric Station ID)
// Data rows start at row 3, so we slice off the first 2 rows.
const HEADER_ROWS = 2;

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

// ─── Row parsers ────────────────────────────────────────────────────────────────
const parseBookedSlots = (value) =>
  value ? String(value).split(',').map(s => s.trim()).filter(Boolean) : [];

const normaliseStatus = (raw) => {
  const s = String(raw ?? '').trim().toLowerCase();
  return s === 'occupied' ? 'occupied' : 'available';
};

/**
 * mapStationRow — maps a raw Sheets row array (0-indexed) to a station object.
 *
 * Column layout (0-indexed inside the row array):
 *   0  Station ID      (A)
 *   1  Station Name    (B)
 *   2  Type            (C)  e.g. "ps5" | "racing"
 *   3  Status          (D)  "available" | "occupied"
 *   4  Active Slot     (E)  "HH:MM-HH:MM" or empty
 *   5  Booked Slots    (F)  comma-separated "HH:MM-HH:MM" values
 *   6  Current Game    (G)
 *   7  Preferred Game  (H)
 */
const mapStationRow = (row = []) => {
  const activeSlotRaw = String(row[4] ?? '').trim();
  let activeSlot = null;
  if (activeSlotRaw) {
    const m = activeSlotRaw.match(/^(\d{1,2}:\d{2})-(\d{1,2}:\d{2})$/);
    if (m) activeSlot = { start24: m[1], end24: m[2] };
  }

  return {
    id:            String(row[0] ?? '').trim(),                          // A
    stationName:   String(row[1] ?? '').trim(),                          // B
    stationType:   String(row[2] ?? '').trim().toLowerCase() || 'ps5',  // C
    status:        normaliseStatus(row[3]),                              // D
    activeSlot,                                                          // E (parsed)
    bookedSlots:   parseBookedSlots(row[5]),                             // F
    currentGame:   String(row[6] ?? '').trim(),                          // G
    preferredGame: String(row[7] ?? '').trim(),                          // H
    activeGame:    String(row[6] ?? '').trim(),                          // alias for G
  };
};

// ─── Public: read stations ───────────────────────────────────────────────────────

export const getStations = async () => {
  const { apiKey, sheetId } = getSheetsEnv();
  const sheetTitle = await getSheetTitle();
  const res = await fetch(
    `${SHEETS_BASE_URL}/${sheetId}/values/${encodeURIComponent(sheetTitle)}!${STATION_COLUMNS}?key=${apiKey}`
  );
  if (!res.ok) throw new Error('Failed to load stations from Google Sheets.');
  const data = await res.json();
  const rows = data?.values ?? [];

  // Skip the first HEADER_ROWS rows (row 1 = header, row 2 = subtitle).
  // Also guard with a numeric check on column A so any stray non-data
  // rows (empty rows, notes, etc.) are safely ignored.
  const validRows = rows
    .slice(HEADER_ROWS)
    .filter(row => row && row[0] && !isNaN(Number(String(row[0]).trim())));

  // Deduplicate by station ID (keep first occurrence)
  const seen   = new Set();
  const unique = [];
  for (const row of validRows) {
    const id = String(row[0]).trim();
    if (!seen.has(id)) { seen.add(id); unique.push(row); }
  }

  return unique.map(mapStationRow);
};
