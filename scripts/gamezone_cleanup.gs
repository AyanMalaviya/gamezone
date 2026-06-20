/**
 * gamezone_cleanup.gs — Google Apps Script
 * Paste into: Extensions → Apps Script → Save
 * Set trigger: cleanupExpiredSlots → Time-driven → Every 15 minutes
 *
 * Slot lifecycle managed here:
 *   1. Booking created  → slot added to "Booked Slots" (F), status stays available
 *   2. Slot start time reached → status = occupied, Active Slot (E) = that slot,
 *                                slot REMOVED from Booked Slots
 *   3. Slot end time reached  → status = available, Active Slot cleared,
 *                                picks next upcoming slot automatically if any
 *
 * Column map (1-based):
 *   A=1 Station ID   B=2 Name   C=3 Type   D=4 Status
 *   E=5 Active Slot  F=6 Booked Slots  G=7 Current Game  H=8 Preferred Game
 */

var STATION_SHEET = 'Stations';
var HEADER_ROWS   = 1;

function toMinutes(timeStr) {
  var parts = String(timeStr || '').trim().split(':');
  if (parts.length < 2) return -1;
  return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
}

function nowIST() {
  var now   = new Date();
  var istMs = now.getTime() + (5.5 * 60 * 60 * 1000);
  var ist   = new Date(istMs);
  return ist.getUTCHours() * 60 + ist.getUTCMinutes();
}

/**
 * Parse "HH:MM-HH:MM" -> { start, end } in minutes. Returns null if invalid.
 */
function parseSlot(slotStr) {
  var m = String(slotStr || '').trim().match(/^(\d{1,2}:\d{2})-(\d{1,2}:\d{2})$/);
  if (!m) return null;
  return { start: toMinutes(m[1]), end: toMinutes(m[2]), raw: slotStr.trim() };
}

function cleanupExpiredSlots() {
  var ss    = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(STATION_SHEET);
  if (!sheet) { Logger.log('Sheet "' + STATION_SHEET + '" not found.'); return; }

  var lastRow  = sheet.getLastRow();
  var dataRows = lastRow - HEADER_ROWS;
  if (dataRows < 1) return;

  var startRow = HEADER_ROWS + 1;
  var range    = sheet.getRange(startRow, 1, dataRows, 8); // A:H
  var values   = range.getValues();
  var now      = nowIST();
  var changed  = false;

  for (var i = 0; i < values.length; i++) {
    var row        = values[i];
    var activeSlot = String(row[4] || '').trim(); // E
    var bookedRaw  = String(row[5] || '').trim(); // F
    var bookedSlots = bookedRaw
      ? bookedRaw.split(',').map(function(s) { return s.trim(); }).filter(Boolean)
      : [];

    // -- Step 1: Handle currently active slot (E) --------------------------
    if (activeSlot) {
      var active = parseSlot(activeSlot);
      if (active && now >= active.end) {
        // Slot ended -> free the station
        values[i][3] = 'available'; // D status
        values[i][4] = '';          // E active slot
        values[i][6] = '';          // G current game
        activeSlot   = '';
        changed      = true;
        Logger.log('Row ' + (startRow + i) + ': slot ended -> available (' + active.raw + ')');
      }
    }

    // -- Step 2: Check booked slots -- promote any that have started --------
    // Sort by start time so earliest slot wins
    var parsedBooked = bookedSlots.map(parseSlot).filter(Boolean);
    parsedBooked.sort(function(a, b) { return a.start - b.start; });

    var promoted  = null;
    var remaining = [];

    for (var j = 0; j < parsedBooked.length; j++) {
      var slot = parsedBooked[j];
      if (!promoted && now >= slot.start && now < slot.end) {
        // This slot has started and not ended -> promote to active
        promoted = slot;
        // Intentionally NOT added to remaining -> removed from Booked Slots
      } else if (now >= slot.end) {
        // Fully expired stale slot, discard
        changed = true;
        Logger.log('Row ' + (startRow + i) + ': discarding stale booked slot ' + slot.raw);
      } else {
        // Still upcoming, keep it
        remaining.push(slot.raw);
      }
    }

    if (promoted) {
      values[i][3] = 'occupied';           // D status
      values[i][4] = promoted.raw;         // E active slot
      values[i][5] = remaining.join(', '); // F booked slots (promoted one removed)
      changed      = true;
      Logger.log('Row ' + (startRow + i) + ': slot started -> occupied, active=' + promoted.raw);
    } else if (remaining.length !== bookedSlots.length) {
      // Some expired slots were discarded but none promoted
      values[i][5] = remaining.join(', ');
      changed      = true;
    }
  }

  if (changed) {
    range.setValues(values);
    Logger.log('Cleanup saved at ' + new Date().toISOString());
  } else {
    Logger.log('No changes needed at ' + new Date().toISOString());
  }
}
