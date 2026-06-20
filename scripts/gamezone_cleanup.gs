/**
 * gamezone_cleanup.gs — Google Apps Script
 * Paste this entire file into your Google Sheet's Apps Script editor:
 *   Extensions → Apps Script → paste → Save → set a time trigger
 *
 * What it does every 15 minutes:
 *   1. Reads all rows in the "Stations" sheet
 *   2. For each station, removes any Booked Slots whose end time has passed (IST)
 *   3. If the station's Active Slot has expired, clears it and sets status = "available"
 *   4. Saves all changes back in a single batch write
 *
 * How to set the trigger:
 *   Apps Script editor → Triggers (clock icon) → Add Trigger
 *   → Function: cleanupExpiredSlots
 *   → Event source: Time-driven
 *   → Type: Minutes timer → Every 15 minutes
 *   → Save
 */

const STATION_SHEET = 'Stations';
const HEADER_ROWS   = 1;           // row 1 is header in your sheet
const COL = {
  STATUS:       4,  // D
  ACTIVE_SLOT:  5,  // E
  BOOKED_SLOTS: 6,  // F
  CURRENT_GAME: 7,  // G
};

/**
 * Parse "HH:MM" time string into total minutes since midnight.
 */
function toMinutes(timeStr) {
  const parts = String(timeStr || '').trim().split(':');
  if (parts.length < 2) return -1;
  return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
}

/**
 * Returns current IST time as total minutes since midnight.
 */
function nowIST() {
  const now = new Date();
  // IST = UTC + 5:30
  const istMs = now.getTime() + (5.5 * 60 * 60 * 1000);
  const ist   = new Date(istMs);
  return ist.getUTCHours() * 60 + ist.getUTCMinutes();
}

/**
 * Given a slot string "HH:MM-HH:MM", return true if its end time is in the past.
 */
function isExpired(slotStr) {
  const m = String(slotStr || '').trim().match(/^(\d{1,2}:\d{2})-(\d{1,2}:\d{2})$/);
  if (!m) return false;
  const endMinutes = toMinutes(m[2]);
  return endMinutes > 0 && nowIST() >= endMinutes;
}

function cleanupExpiredSlots() {
  const ss    = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(STATION_SHEET);
  if (!sheet) { Logger.log('Sheet "' + STATION_SHEET + '" not found.'); return; }

  const lastRow  = sheet.getLastRow();
  const dataRows = lastRow - HEADER_ROWS;
  if (dataRows < 1) return;

  // Read only the relevant columns: D (status), E (activeSlot), F (bookedSlots), G (currentGame)
  const startRow = HEADER_ROWS + 1;
  const range    = sheet.getRange(startRow, 1, dataRows, 8); // A to H
  const values   = range.getValues();

  let changed = false;

  for (let i = 0; i < values.length; i++) {
    const row         = values[i];
    const activeSlot  = String(row[COL.ACTIVE_SLOT  - 1] || '').trim();
    const bookedRaw   = String(row[COL.BOOKED_SLOTS - 1] || '').trim();
    const bookedSlots = bookedRaw ? bookedRaw.split(',').map(s => s.trim()).filter(Boolean) : [];

    // Remove expired booked slots
    const remaining = bookedSlots.filter(s => !isExpired(s));
    if (remaining.length !== bookedSlots.length) {
      values[i][COL.BOOKED_SLOTS - 1] = remaining.join(', ');
      changed = true;
    }

    // Clear active slot + set available if active slot has expired
    if (activeSlot && isExpired(activeSlot)) {
      values[i][COL.STATUS      - 1] = 'available';
      values[i][COL.ACTIVE_SLOT - 1] = '';
      values[i][COL.CURRENT_GAME- 1] = ''; // clear current game too
      changed = true;
      Logger.log('Cleared expired active slot for row ' + (startRow + i) + ': ' + activeSlot);
    }
  }

  if (changed) {
    range.setValues(values);
    Logger.log('Cleanup complete at ' + new Date().toISOString());
  } else {
    Logger.log('No expired slots found at ' + new Date().toISOString());
  }
}
