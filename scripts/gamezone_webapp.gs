/**
 * gamezone_webapp.gs — Google Apps Script Web App
 *
 * Deploy as Web App:
 *   Deploy → New deployment → Type: Web App
 *   Execute as: Me (your Google account)
 *   Who has access: Anyone
 *   → Deploy → copy the /exec URL → put in VITE_GAS_ENDPOINT
 *
 * This script handles ALL Sheets writes from the React app.
 * No OAuth tokens needed — it runs as YOU (the sheet owner) server-side.
 *
 * Actions supported (POST body JSON):
 *   { action: 'addBooking',        ...bookingFields }
 *   { action: 'addBookedSlot',     ...stationFields }
 *   { action: 'addUser',           ...userFields    }
 *   { action: 'updateStation',     rowIndex, ...stationData }
 *
 * The cleanup trigger (cleanupExpiredSlots) stays in gamezone_cleanup.gs
 * OR you can merge both into one file — both are shown below.
 */

var STATION_SHEET  = 'Stations';
var BOOKINGS_SHEET = 'Bookings';
var USERS_SHEET    = 'Users';

var BOOKINGS_HEADER = ['TXN ID','UID','Station','Slot','Hours','Amount (INR)','UPI ID','Bank','Status','Booked At'];
var USERS_HEADER    = ['UID','Name','Email','Phone','Role','Joined At'];

// ─── IST timestamp ────────────────────────────────────────────────────────────
function istNow() {
  return Utilities.formatDate(
    new Date(), 'Asia/Kolkata', 'dd/MM/yyyy HH:mm:ss'
  );
}

// ─── HTTP entry point ─────────────────────────────────────────────────────────
function doPost(e) {
  try {
    var body   = JSON.parse(e.postData.contents);
    var action = body.action;
    var result;

    if      (action === 'addBooking')    result = addBooking(body);
    else if (action === 'addBookedSlot') result = addBookedSlot(body);
    else if (action === 'addUser')       result = addUser(body);
    else if (action === 'updateStation') result = updateStation(body);
    else throw new Error('Unknown action: ' + action);

    return ok(result);
  } catch (err) {
    return error(err.message);
  }
}

// GET for health-check / CORS preflight
function doGet() {
  return ContentService
    .createTextOutput(JSON.stringify({ status: 'ok', service: 'GameZone Sheets API' }))
    .setMimeType(ContentService.MimeType.JSON);
}

// ─── Response helpers ─────────────────────────────────────────────────────────
function ok(data) {
  return ContentService
    .createTextOutput(JSON.stringify({ ok: true, data: data || null }))
    .setMimeType(ContentService.MimeType.JSON);
}
function error(msg) {
  return ContentService
    .createTextOutput(JSON.stringify({ ok: false, error: msg }))
    .setMimeType(ContentService.MimeType.JSON);
}

// ─── Ensure header row exists ─────────────────────────────────────────────────
function ensureHeader(sheet, header) {
  var first = sheet.getRange(1, 1).getValue();
  if (String(first).trim() !== header[0]) {
    sheet.getRange(1, 1, 1, header.length).setValues([header]);
  }
}

// ─── Action: append booking row ───────────────────────────────────────────────
function addBooking(b) {
  var ss    = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(BOOKINGS_SHEET);
  if (!sheet) sheet = ss.insertSheet(BOOKINGS_SHEET);
  ensureHeader(sheet, BOOKINGS_HEADER);
  sheet.appendRow([
    b.txnId, b.uid, b.stationName, b.slot, b.hours,
    b.amount, b.upiId, b.bank, b.status, istNow()
  ]);
  return { txnId: b.txnId };
}

// ─── Action: add booked slot to station row (on booking, keeps status available) ──
function addBookedSlot(b) {
  var ss    = SpreadsheetApp.getActiveSpreadsheet();
  // Find Stations sheet (first sheet or by name)
  var sheet = ss.getSheetByName(STATION_SHEET) || ss.getSheets()[0];

  var rowIndex = Number(b.stationIndex); // 0-based data index
  if (isNaN(rowIndex) || rowIndex < 0) throw new Error('Invalid stationIndex');

  var sheetRow = rowIndex + 2; // +1 header +1 for 1-based
  var range    = sheet.getRange(sheetRow, 1, 1, 8); // A:H
  var values   = range.getValues()[0];

  // Column F (index 5) = Booked Slots
  var bookedRaw  = String(values[5] || '').trim();
  var existing   = bookedRaw ? bookedRaw.split(',').map(function(s){return s.trim();}).filter(Boolean) : [];
  var newSlot    = String(b.slot || '').trim();

  // Add new slot if not duplicate
  if (newSlot && existing.indexOf(newSlot) === -1) {
    existing.push(newSlot);
  }

  // Write back: only update Booked Slots (F=col6), leave everything else as-is
  sheet.getRange(sheetRow, 6).setValue(existing.join(', '));
  return { stationName: b.stationName, bookedSlots: existing };
}

// ─── Action: append user row ──────────────────────────────────────────────────
function addUser(u) {
  var ss    = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(USERS_SHEET);
  if (!sheet) sheet = ss.insertSheet(USERS_SHEET);
  ensureHeader(sheet, USERS_HEADER);

  // Avoid duplicate UIDs
  var data  = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]).trim() === String(u.uid).trim()) {
      return { uid: u.uid, skipped: true };
    }
  }
  sheet.appendRow([u.uid, u.name, u.email, u.phone || '', u.role || 'member', istNow()]);
  return { uid: u.uid };
}

// ─── Action: admin explicit station save (from AdminDashboard) ────────────────
function updateStation(b) {
  var ss       = SpreadsheetApp.getActiveSpreadsheet();
  var sheet    = ss.getSheetByName(STATION_SHEET) || ss.getSheets()[0];
  var rowIndex = Number(b.rowIndex);
  if (isNaN(rowIndex) || rowIndex < 0) throw new Error('Invalid rowIndex');

  var sheetRow = rowIndex + 2;
  var bookedSlots = Array.isArray(b.bookedSlots) ? b.bookedSlots.join(', ') : (b.bookedSlots || '');
  var activeSlot  = b.activeSlot || '';
  if (activeSlot && typeof activeSlot === 'object') {
    activeSlot = (activeSlot.start24 || '') + '-' + (activeSlot.end24 || '');
  }

  sheet.getRange(sheetRow, 1, 1, 8).setValues([[
    b.id            || '',
    b.stationName   || '',
    b.stationType   || 'ps5',
    b.status        || 'available',
    activeSlot,
    bookedSlots,
    b.currentGame   || '',
    b.preferredGame || '',
  ]]);
  return { rowIndex: rowIndex };
}


// =============================================================================
// CLEANUP TRIGGER (can keep this here OR in gamezone_cleanup.gs — not both)
// Set trigger: cleanupExpiredSlots -> Time-driven -> Every 15 minutes
// =============================================================================

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

function parseSlot(slotStr) {
  var m = String(slotStr || '').trim().match(/^(\d{1,2}:\d{2})-(\d{1,2}:\d{2})$/);
  if (!m) return null;
  return { start: toMinutes(m[1]), end: toMinutes(m[2]), raw: slotStr.trim() };
}

function cleanupExpiredSlots() {
  var ss      = SpreadsheetApp.getActiveSpreadsheet();
  var sheet   = ss.getSheetByName(STATION_SHEET) || ss.getSheets()[0];
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return;

  var startRow = 2;
  var dataRows = lastRow - 1;
  var range    = sheet.getRange(startRow, 1, dataRows, 8);
  var values   = range.getValues();
  var now      = nowIST();
  var changed  = false;

  for (var i = 0; i < values.length; i++) {
    var activeSlot  = String(values[i][4] || '').trim();
    var bookedRaw   = String(values[i][5] || '').trim();
    var bookedSlots = bookedRaw
      ? bookedRaw.split(',').map(function(s){return s.trim();}).filter(Boolean)
      : [];

    // Step 1: if active slot has ended, clear it
    if (activeSlot) {
      var active = parseSlot(activeSlot);
      if (active && now >= active.end) {
        values[i][3] = 'available';
        values[i][4] = '';
        values[i][6] = '';
        activeSlot   = '';
        changed      = true;
        Logger.log('Row '+(startRow+i)+': ended -> available ('+active.raw+')');
      }
    }

    // Step 2: promote earliest booked slot that has started
    var parsed = bookedSlots.map(parseSlot).filter(Boolean);
    parsed.sort(function(a,b){return a.start-b.start;});

    var promoted  = null;
    var remaining = [];
    for (var j = 0; j < parsed.length; j++) {
      var sl = parsed[j];
      if (!promoted && now >= sl.start && now < sl.end) {
        promoted = sl;
      } else if (now >= sl.end) {
        changed = true; // discard expired
      } else {
        remaining.push(sl.raw);
      }
    }

    if (promoted) {
      values[i][3] = 'occupied';
      values[i][4] = promoted.raw;
      values[i][5] = remaining.join(', ');
      changed      = true;
      Logger.log('Row '+(startRow+i)+': started -> occupied ('+promoted.raw+')');
    } else if (remaining.length !== bookedSlots.length) {
      values[i][5] = remaining.join(', ');
      changed      = true;
    }
  }

  if (changed) {
    range.setValues(values);
    Logger.log('Saved at ' + new Date().toISOString());
  }
}
