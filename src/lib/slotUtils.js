/**
 * slotUtils.js
 * Pure helpers for slot parsing, AM/PM ↔ 24-hour conversion,
 * and determining which slot is active right now.
 *
 * Slot format stored in Google Sheets (admin enters in either format):
 *   24h  : "9:00-10:00", "13:30-14:30"
 *   AM/PM: "9:00AM-10:00AM", "1:30PM-2:30PM"
 *
 * Internally we always work in minutes-since-midnight (24h).
 */

// ── AM/PM → 24-hour string ────────────────────────────────────────────────
export function to24h(timeStr) {
  if (!timeStr) return timeStr;
  const s = timeStr.trim().toUpperCase();
  const ampm = s.endsWith('AM') || s.endsWith('PM') ? s.slice(-2) : null;
  if (!ampm) return s; // already 24h
  const core = s.slice(0, -2).trim();
  let [h, m = '00'] = core.split(':');
  h = parseInt(h, 10);
  if (ampm === 'AM') {
    if (h === 12) h = 0;
  } else {
    if (h !== 12) h += 12;
  }
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

// ── 24-hour string → display AM/PM ───────────────────────────────────────
export function toAmPm(timeStr) {
  if (!timeStr) return timeStr;
  const s = timeStr.trim().toUpperCase();
  // If already has AM/PM, return as-is
  if (s.endsWith('AM') || s.endsWith('PM')) return timeStr;
  let [h, m = '00'] = s.split(':').map(Number);
  const suffix = h < 12 ? 'AM' : 'PM';
  const h12 = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, '0')} ${suffix}`;
}

// ── Parse a single time string → minutes since midnight ──────────────────
export function parseMinutes(timeStr) {
  const t24 = to24h(timeStr);
  const [h, m] = t24.split(':').map(Number);
  if (isNaN(h) || isNaN(m)) return null;
  return h * 60 + m;
}

/**
 * Parse a slot string like "9:00-10:00" or "9:00AM-10:00PM"
 * Returns { raw, start24, end24, startMin, endMin } or null on failure.
 */
export function parseSlot(slotStr) {
  if (!slotStr) return null;
  // Split on hyphen — careful: "9:00AM-10:00AM" has one hyphen between times
  // Strategy: find the hyphen that separates two time-like tokens
  const str = slotStr.trim();
  // Allow formats: HH:MM-HH:MM  or  H:MMAM-H:MMPM  etc.
  const match = str.match(
    /^([\d]{1,2}:[\d]{2}(?:\s*[APap][Mm])?)[\s\-–]+([\d]{1,2}:[\d]{2}(?:\s*[APap][Mm])?)$/
  );
  if (!match) return null;
  const [, rawStart, rawEnd] = match;
  const start24 = to24h(rawStart.trim());
  const end24   = to24h(rawEnd.trim());
  const startMin = parseMinutes(rawStart);
  const endMin   = parseMinutes(rawEnd);
  if (startMin === null || endMin === null) return null;
  return { raw: str, start24, end24, startMin, endMin };
}

/**
 * Given a list of slot strings and the current time-in-minutes,
 * returns the slot that is currently active, or null.
 */
export function getActiveSlot(slots, nowMinutes) {
  for (const s of slots) {
    const parsed = parseSlot(s);
    if (!parsed) continue;
    if (nowMinutes >= parsed.startMin && nowMinutes < parsed.endMin) {
      return parsed;
    }
  }
  return null;
}

/**
 * Returns the next upcoming slot (soonest start > nowMinutes), or null.
 */
export function getNextSlot(slots, nowMinutes) {
  const upcoming = slots
    .map(s => parseSlot(s))
    .filter(p => p && p.startMin > nowMinutes)
    .sort((a, b) => a.startMin - b.startMin);
  return upcoming[0] ?? null;
}

/**
 * Returns all slots that have already ended (endMin <= nowMinutes).
 */
export function getExpiredSlots(slots, nowMinutes) {
  return slots
    .map(s => parseSlot(s))
    .filter(p => p && p.endMin <= nowMinutes);
}

/**
 * Returns the slots list with expired slots removed.
 */
export function stripExpiredSlots(slots, nowMinutes) {
  return slots.filter(s => {
    const p = parseSlot(s);
    if (!p) return false; // remove unparseable junk
    return p.endMin > nowMinutes;
  });
}

/** Current time in minutes since midnight */
export function nowMinutes() {
  const d = new Date();
  return d.getHours() * 60 + d.getMinutes();
}

/** Format minutes since midnight → "HH:MM" */
export function minutesToHHMM(min) {
  const h = Math.floor(min / 60) % 24;
  const m = min % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}
