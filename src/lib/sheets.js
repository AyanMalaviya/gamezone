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
 * Common errors:
 *  - 403 PERMISSION_DENIED        → Sheets API not enabled in Google Cloud Console, OR
 *                                    the OAuth client does not have the Sheets scope approved
 *  - 403 insufficientPermissions  → oauthToken was issued without spreadsheets scope
 *  - 401 Invalid Credentials      → token expired; sign out and sign in again
 *
 * @param {number} rowIndex   0-based index into the DATA rows (after header)
 * @param {object} data       Station fields to write
 * @param {string} oauthToken Google OAuth2 access token from Firebase SignIn result
 */
export const updateStation = async (rowIndex, data, oauthToken) => {
  if (!oauthToken) {
    throw new Error(
      'No OAuth token found. Please sign out and sign in again to grant Sheets write access.'
    );
  }

  // Dev-only: log token prefix to confirm it exists and looks valid
  if (import.meta.env.DEV) {
    console.info('[sheets] oauthToken prefix:', oauthToken.slice(0, 12) + '…');
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
    const errBody = await res.json().catch(() => ({}));
    const message = errBody?.error?.message ?? `HTTP ${res.status}`;
    const status  = errBody?.error?.status  ?? '';

    // Surface actionable guidance for the most common failures
    if (res.status === 403) {
      if (status === 'PERMISSION_DENIED' || message.includes('disabled')) {
        throw new Error(
          `Google Sheets API is not enabled for this project. ` +
          `Go to console.cloud.google.com → APIs & Services → Enable "Google Sheets API". ` +
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
