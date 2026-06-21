/**
 * gamezone_webapp.gs — Google Apps Script Web App
 *
 * Deploy as Web App:
 *   Deploy → New deployment → Type: Web App
 *   Execute as: Me (your Google account)
 *   Who has access: Anyone
 *   → Deploy → copy the /exec URL → put in VITE_GAS_ENDPOINT
 *
 * The React app sends ALL writes as GET requests with query-string params.
 * (POST is not used — GAS redirects POST requests which drops the body.)
 *
 * Actions supported (via ?action=...&field=...):
 *   addBooking       — append a booking row
 *   addBookedSlot    — add a slot to a station (uses stationId, col A lookup)
 *   removeBookedSlot — remove a slot from a station (admin delete flow)
 *   addUser          — append a user row (deduped by UID)
 *   updateStation    — update mutable cols D/E/F/G only (stationId lookup)
 *   updateUserPhone  — update phone for existing user row
 *
 * LOCKED cols (updateStation NEVER touches these):
 *   A = Station ID   B = Station Name   C = Type   H = Preferred Game
 *
 * The cleanup trigger (cleanupExpiredSlots) runs every 15 min via Apps Script trigger.
 */


var STATION_SHEET  = 'Stations';
var BOOKINGS_SHEET = 'Bookings';
var USERS_SHEET    = 'Users';


var BOOKINGS_HEADER = ['TXN ID','UID','Station','Slot','Hours','Amount (INR)','UPI ID','Bank','Status','Booked At'];
var USERS_HEADER    = ['UID','Name','Email','Phone','Role','Joined At'];


// ─── IST timestamp ─────────────────────────────────────────────────────────────
function istNow() {
  return Utilities.formatDate(new Date(), 'Asia/Kolkata', 'dd/MM/yyyy HH:mm:ss');
}


// ─── Find a station row by stationId (column A). Returns 1-based sheet row or -1. ──
function findStationRow(sheet, stationId) {
  var lastRow = sheet.getLastRow();
  if (lastRow < 3) return -1;                        // rows 1-2 are headers
  var ids = sheet.getRange(3, 1, lastRow - 2, 1).getValues();
  for (var i = 0; i < ids.length; i++) {
    if (String(ids[i][0]).trim() === String(stationId).trim()) {
      return i + 3;                                  // 1-based sheet row
    }
  }
  return -1;
}


// ─── HTTP entry point (GET) ────────────────────────────────────────────────────
function doGet(e) {
  // Health-check: no action param
  if (!e || !e.parameter || !e.parameter.action) {
    return ContentService
      .createTextOutput(JSON.stringify({ status: 'ok', service: 'GameZone Sheets API' }))
      .setMimeType(ContentService.MimeType.JSON);
  }


  try {
    var p      = e.parameter;   // all query params are strings
    var action = p.action;
    var result;


    if      (action === 'addBooking')       result = addBooking(p);
    else if (action === 'addBookedSlot')    result = addBookedSlot(p);
    else if (action === 'removeBookedSlot') result = removeBookedSlot(p);
    else if (action === 'addUser')          result = addUser(p);
    else if (action === 'updateStation')    result = updateStation(p);
    else if (action === 'updateUserPhone')  result = updateUserPhone(p);
    else throw new Error('Unknown action: ' + action);


    return ok(result);
  } catch (err) {
    return error(err.message);
  }
}


// Keep doPost as a no-op redirect to doGet for safety
function doPost(e) {
  return doGet(e);
}


// ─── Response helpers ──────────────────────────────────────────────────────────
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


// ─── Ensure header row exists ──────────────────────────────────────────────────
function ensureHeader(sheet, header) {
  var first = sheet.getRange(1, 1).getValue();
  if (String(first).trim() !== header[0]) {
    sheet.getRange(1, 1, 1, header.length).setValues([header]);
  }
}


// ─── Action: append booking row ────────────────────────────────────────────────
function addBooking(p) {
  var ss    = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(BOOKINGS_SHEET);
  if (!sheet) sheet = ss.insertSheet(BOOKINGS_SHEET);
  ensureHeader(sheet, BOOKINGS_HEADER);
  sheet.appendRow([
    p.txnId, p.uid, p.stationName, p.slot,
    p.hours, p.amount, p.upiId, p.bank, p.status, istNow()
  ]);
  return { txnId: p.txnId };
}


// ─── Action: add a booked slot to a station (col A lookup, only writes col F) ─
function addBookedSlot(p) {
  var ss    = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(STATION_SHEET) || ss.getSheets()[0];


  var row = findStationRow(sheet, p.stationId);
  if (row === -1) throw new Error('Station not found: ' + p.stationId);


  // Read existing booked slots (col F = column 6)
  var bookedRaw = String(sheet.getRange(row, 6).getValue() || '').trim();
  var existing  = bookedRaw
    ? bookedRaw.split(',').map(function(s) { return s.trim(); }).filter(Boolean)
    : [];


  var newSlot = String(p.slot || '').trim();
  if (newSlot && existing.indexOf(newSlot) === -1) {
    existing.push(newSlot);
  }


  // Only write col F — leave A, B, C, D, E, G, H untouched
  sheet.getRange(row, 6).setValue(existing.join(', '));
  return { stationId: p.stationId, bookedSlots: existing };
}


// ─── Action: remove a single booked slot from a station (admin booking delete) ─
//
// Called when an admin deletes a booking from the dashboard.
// Splices the exact slot string out of col F (Booked Slots).
// Also clears Active Slot (col E) and resets Status (col D) to 'available'
// if the deleted slot is the one currently active.
//
function removeBookedSlot(p) {
  var ss    = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(STATION_SHEET) || ss.getSheets()[0];

  var sid  = String(p.stationId || '').trim();
  var slot = String(p.slot      || '').trim();
  if (!sid || !slot) throw new Error('removeBookedSlot requires stationId and slot');

  var row = findStationRow(sheet, sid);
  if (row === -1) throw new Error('Station not found: ' + sid);

  // Read cols D(4), E(5), F(6)
  var rowData    = sheet.getRange(row, 4, 1, 3).getValues()[0];
  var status     = String(rowData[0] || '').trim();
  var activeSlot = String(rowData[1] || '').trim();
  var bookedRaw  = String(rowData[2] || '').trim();

  // Remove the slot from Booked Slots (col F)
  var remaining = bookedRaw
    .split(',')
    .map(function(s) { return s.trim(); })
    .filter(function(s) { return s && s !== slot; });
  sheet.getRange(row, 6).setValue(remaining.join(', '));

  // If the deleted slot is the currently active one, clear it and reset status
  if (activeSlot === slot) {
    sheet.getRange(row, 4).setValue('available');  // D = Status
    sheet.getRange(row, 5).setValue('');           // E = Active Slot
    sheet.getRange(row, 7).setValue('');           // G = Current Game
    Logger.log('removeBookedSlot: cleared active slot ' + slot + ' on station ' + sid);
  }

  return { stationId: sid, removed: slot, remaining: remaining };
}


// ─── Action: append user row (deduped by UID) ──────────────────────────────────
function addUser(u) {
  var ss    = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(USERS_SHEET);
  if (!sheet) sheet = ss.insertSheet(USERS_SHEET);
  ensureHeader(sheet, USERS_HEADER);


  // Check for duplicate UID
  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]).trim() === String(u.uid).trim()) {
      return { uid: u.uid, skipped: true };
    }
  }


  sheet.appendRow([u.uid, u.name, u.email, u.phone || '', u.role || 'member', istNow()]);
  return { uid: u.uid };
}


// ─── Action: update mutable station columns only (D, E, F, G) ─────────────────
//
// LOCKED — this function NEVER writes:
//   col A = Station ID      col B = Station Name
//   col C = Type            col H = Preferred Game
//
// Only written:
//   col D = Status          col E = Active Slot
//   col F = Booked Slots    col G = Current Game
//
function updateStation(p) {
  var ss    = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(STATION_SHEET) || ss.getSheets()[0];


  var row = findStationRow(sheet, p.stationId);
  if (row === -1) throw new Error('Station not found: ' + p.stationId);


  // Normalise bookedSlots — client sends comma-joined string (from URLSearchParams)
  var bookedSlots = String(p.bookedSlots || '')
    .split(',')
    .map(function(s) { return s.trim(); })
    .filter(Boolean)
    .join(', ');


  var activeSlot = String(p.activeSlot || '').trim();


  // Write ONLY cols D(4), E(5), F(6), G(7) — A, B, C, H are untouched
  sheet.getRange(row, 4).setValue(p.status        || 'available');  // D
  sheet.getRange(row, 5).setValue(activeSlot);                       // E
  sheet.getRange(row, 6).setValue(bookedSlots);                      // F
  sheet.getRange(row, 7).setValue(p.currentGame   || '');           // G


  return { stationId: p.stationId, row: row };
}


// ─── Action: update user phone number ─────────────────────────────────────────
function updateUserPhone(p) {
  var ss    = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(USERS_SHEET);
  if (!sheet) throw new Error('Users sheet not found');


  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]).trim() === String(p.uid).trim()) {
      sheet.getRange(i + 1, 4).setValue(p.phone || '');  // col D = Phone
      return { uid: p.uid, updated: true };
    }
  }
  throw new Error('User not found: ' + p.uid);
}



// =============================================================================
// CLEANUP TRIGGER
// Set: cleanupExpiredSlots → Time-driven → Every 15 minutes
// =============================================================================


function toMinutes(timeStr) {
  var parts = String(timeStr || '').trim().split(':');
  if (parts.length < 2) return -1;
  return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
}


function nowIST() {
  var istMs = new Date().getTime() + (5.5 * 60 * 60 * 1000);
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
  if (lastRow < 3) return;   // nothing beyond headers


  // Data starts at row 3 (rows 1-2 are headers)
  var startRow = 3;
  var dataRows = lastRow - 2;
  // Read cols D(4)–G(7) only — never read/write A, B, C, H
  var range  = sheet.getRange(startRow, 4, dataRows, 4);  // D:G
  var values = range.getValues();
  var now     = nowIST();
  var changed = false;


  for (var i = 0; i < values.length; i++) {
    // values[i]: [0]=Status, [1]=Active Slot, [2]=Booked Slots, [3]=Current Game
    var activeSlot  = String(values[i][1] || '').trim();
    var bookedRaw   = String(values[i][2] || '').trim();
    var bookedSlots = bookedRaw
      ? bookedRaw.split(',').map(function(s) { return s.trim(); }).filter(Boolean)
      : [];


    // Step 1: if active slot has ended, clear it
    if (activeSlot) {
      var active = parseSlot(activeSlot);
      if (active && now >= active.end) {
        values[i][0] = 'available';  // Status
        values[i][1] = '';           // Active Slot
        values[i][3] = '';           // Current Game
        activeSlot   = '';
        changed      = true;
        Logger.log('Row ' + (startRow + i) + ': ended → available (' + active.raw + ')');
      }
    }


    // Step 2: promote earliest booked slot that has started; discard expired ones
    var parsed = bookedSlots.map(parseSlot).filter(Boolean);
    parsed.sort(function(a, b) { return a.start - b.start; });


    var promoted  = null;
    var remaining = [];
    for (var j = 0; j < parsed.length; j++) {
      var sl = parsed[j];
      if (!promoted && now >= sl.start && now < sl.end) {
        promoted = sl;
      } else if (now < sl.end) {
        remaining.push(sl.raw);   // future slot — keep
      } else {
        changed = true;           // expired slot — discard
      }
    }


    if (promoted) {
      values[i][0] = 'occupied';          // Status
      values[i][1] = promoted.raw;        // Active Slot
      values[i][2] = remaining.join(', ');// Booked Slots (remaining)
      changed = true;
      Logger.log('Row ' + (startRow + i) + ': started → occupied (' + promoted.raw + ')');
    } else if (remaining.length !== bookedSlots.length) {
      values[i][2] = remaining.join(', ');
      changed = true;
    }
  }


  if (changed) {
    range.setValues(values);
    Logger.log('cleanupExpiredSlots saved at ' + new Date().toISOString());
  }
}
