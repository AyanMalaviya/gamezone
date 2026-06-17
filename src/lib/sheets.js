const SHEETS_BASE_URL = 'https://sheets.googleapis.com/v4/spreadsheets';
const STATION_COLUMNS = 'A:E';

let sheetTitlePromise;

const getSheetsEnv = () => {
  const sheetId = import.meta.env.VITE_SHEETS_ID;
  const apiKey = import.meta.env.VITE_SHEETS_API_KEY;

  if (!sheetId) {
    throw new Error('VITE_SHEETS_ID is not set.');
  }

  if (!apiKey) {
    throw new Error('VITE_SHEETS_API_KEY is not set.');
  }

  return { apiKey, sheetId };
};

const getSheetTitle = async () => {
  if (!sheetTitlePromise) {
    sheetTitlePromise = (async () => {
      const { apiKey, sheetId } = getSheetsEnv();
      const response = await fetch(
        `${SHEETS_BASE_URL}/${sheetId}?key=${apiKey}&fields=sheets(properties(title))`,
      );

      if (!response.ok) {
        throw new Error('Failed to load Google Sheets metadata.');
      }

      const data = await response.json();
      const title = data?.sheets?.[0]?.properties?.title;

      if (!title) {
        throw new Error('Google Sheets spreadsheet does not contain any tabs.');
      }

      return title;
    })();
  }

  return sheetTitlePromise;
};

const parseBookedSlots = (value) => {
  if (!value) {
    return [];
  }

  return String(value)
    .split(',')
    .map((slot) => slot.trim())
    .filter(Boolean);
};

const mapStationRow = (row = []) => ({
  bookedSlots: parseBookedSlots(row[3]),
  currentGame: row[2] ?? '',
  id: row[0] ?? '',
  preferredGame: row[4] ?? '',
  status: row[1] ?? '',
});

const serializeBookedSlots = (value) => {
  if (Array.isArray(value)) {
    return value.join(', ');
  }

  return value ?? '';
};

export const getStations = async () => {
  const { apiKey, sheetId } = getSheetsEnv();
  const sheetTitle = await getSheetTitle();

  const response = await fetch(
    `${SHEETS_BASE_URL}/${sheetId}/values/${encodeURIComponent(sheetTitle)}!${STATION_COLUMNS}?key=${apiKey}`,
  );

  if (!response.ok) {
    throw new Error('Failed to load stations from Google Sheets.');
  }

  const data = await response.json();
  const rows = data?.values ?? [];

  return rows.map(mapStationRow);
};

export const updateStation = async (rowIndex, data) => {
  const { apiKey, sheetId } = getSheetsEnv();
  const sheetTitle = await getSheetTitle();
  const sheetRowNumber = Number(rowIndex) + 2;

  if (!Number.isInteger(sheetRowNumber) || sheetRowNumber < 2) {
    throw new Error('rowIndex must be a valid zero-based data row index.');
  }

  const values = [[
    data?.id ?? '',
    data?.status ?? '',
    data?.currentGame ?? '',
    serializeBookedSlots(data?.bookedSlots),
    data?.preferredGame ?? '',
  ]];

  const response = await fetch(
    `${SHEETS_BASE_URL}/${sheetId}/values/${encodeURIComponent(sheetTitle)}!A${sheetRowNumber}:E${sheetRowNumber}?valueInputOption=RAW&key=${apiKey}`,
    {
      body: JSON.stringify({ majorDimension: 'ROWS', range: `${sheetTitle}!A${sheetRowNumber}:E${sheetRowNumber}`, values }),
      headers: {
        'Content-Type': 'application/json',
      },
      method: 'PUT',
    },
  );

  if (!response.ok) {
    throw new Error('Failed to update station in Google Sheets.');
  }

  return response.json();
};