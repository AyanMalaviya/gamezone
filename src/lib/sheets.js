const SHEETS_BASE_URL = 'https://sheets.googleapis.com/v4/spreadsheets';
const STATION_COLUMNS = 'A:F';

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

const mapStationRow = (row = []) => ({
  id:            row[0] ?? '',
  status:        row[1] ?? '',
  currentGame:   row[2] ?? '',
  bookedSlots:   parseBookedSlots(row[3]),
  preferredGame: row[4] ?? '',
  stationType:   row[5] ?? '',
});

const serializeBookedSlots = (value) =>
  Array.isArray(value) ? value.join(', ') : (value ?? '');

export const getStations = async () => {
  const { apiKey, sheetId } = getSheetsEnv();
  const sheetTitle = await getSheetTitle();
  const res = await fetch(
    `${SHEETS_BASE_URL}/${sheetId}/values/${encodeURIComponent(sheetTitle)}!${STATION_COLUMNS}?key=${apiKey}`
  );
  if (!res.ok) throw new Error('Failed to load stations from Google Sheets.');
  const data = await res.json();
  const rows = data?.values ?? [];
  // skip header row
  return rows.slice(1).map(mapStationRow);
};

/**
 * updateStation — writes a row back to Google Sheets.
 *
 * Requires an OAuth2 access token (from Google Sign-In).
 * The API key alone cannot authorise write operations.
 *
 * @param {number} rowIndex   0-based index into the DATA rows (after header)
 * @param {object} data       Station fields to write
 * @param {string} oauthToken Google OAuth2 access token from Firebase SignIn result
 */
export const updateStation = async (rowIndex, data, oauthToken) => {
  if (!oauthToken) {
    throw new Error(
      'An OAuth access token is required to write to Google Sheets. ' +
      'Please sign out and sign in again.'
    );
  }

  const { sheetId } = getSheetsEnv();
  const sheetTitle  = await getSheetTitle();
  // +2 because row 1 is the header and Sheets is 1-indexed
  const sheetRow    = Number(rowIndex) + 2;

  if (!Number.isInteger(sheetRow) || sheetRow < 2) {
    throw new Error('rowIndex must be a valid zero-based data row index.');
  }

  const range  = `${sheetTitle}!A${sheetRow}:F${sheetRow}`;
  const values = [[
    data?.id            ?? '',
    data?.status        ?? '',
    data?.currentGame   ?? '',
    serializeBookedSlots(data?.bookedSlots),
    data?.preferredGame ?? '',
    data?.stationType   ?? '',
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
    const err = await res.json().catch(() => ({}));
    throw new Error(
      err?.error?.message ??
      `Google Sheets write failed (HTTP ${res.status})`
    );
  }

  return res.json();
};
