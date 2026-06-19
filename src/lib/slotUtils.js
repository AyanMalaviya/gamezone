/**
 * slotUtils.js
 * Pure helpers for slot parsing, AM/PM ↔ 24-hour conversion,
 * and determining which slot is active right now.
 *
 * Slot format stored in Google Sheets (admin enters in either format):
 *   24h  : "9:00-10:00", "13:30-14:30"
 *   AM/PM: "9:00AM-10:00AM", "1:30PM-2:30PM"
 *
 * Internally we always work in minutes-since-midnight (24h IST).
 */

// ── AM/PM → 24-hour string ──────────────────────────────────────────────
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

// ── 24-hour string → display AM/PM ───────────────────────────────────────────
export function toAmPm(timeStr) {
  if (!timeStr) return timeStr;
  const s = timeStr.trim().toUpperCase();
  if (s.endsWith('AM') || s.endsWith('PM')) return timeStr;
  let [h, m = '00'] = s.split(':').map(Number);
  const suffix = h < 12 ? 'AM' : 'PM';
  const h12 = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, '0')} ${suffix}`;
}

// ── Parse a single time string → minutes since midnight ──────────────────────
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
  const str = slotStr.trim();
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
export function getActiveSlot(slots, nowMin) {
  for (const s of slots) {
    const parsed = parseSlot(s);
    if (!parsed) continue;
    if (nowMin >= parsed.startMin && nowMin < parsed.endMin) {
      return parsed;
    }
  }
  return null;
}

/**
 * Returns the next upcoming slot (soonest start > nowMin), or null.
 */
export function getNextSlot(slots, nowMin) {
  const upcoming = slots
    .map(s => parseSlot(s))
    .filter(p => p && p.startMin > nowMin)
    .sort((a, b) => a.startMin - b.startMin);
  return upcoming[0] ?? null;
}

/**
 * Returns all slots that have already ended (endMin <= nowMin).
 */
export function getExpiredSlots(slots, nowMin) {
  return slots
    .map(s => parseSlot(s))
    .filter(p => p && p.endMin <= nowMin);
}

/**
 * Returns the slots list with expired slots removed.
 */
export function stripExpiredSlots(slots, nowMin) {
  return slots.filter(s => {
    const p = parseSlot(s);
    if (!p) return false;
    return p.endMin > nowMin;
  });
}

/**
 * Current time in minutes since midnight, computed in IST (UTC+5:30).
 * Using Intl.DateTimeFormat ensures correctness regardless of the
 * browser/server locale.
 */
export function nowMinutes() {
  const now = new Date();
  const ist = new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    hour: 'numeric', minute: 'numeric', hour12: false,
  }).formatToParts(now);
  const h = Number(ist.find(p => p.type === 'hour')?.value ?? 0);
  const m = Number(ist.find(p => p.type === 'minute')?.value ?? 0);
  return h * 60 + m;
}

/**
 * Current IST hour (0-23).
 */
export function nowHourIST() {
  const now = new Date();
  return Number(
    new Intl.DateTimeFormat('en-IN', {
      timeZone: 'Asia/Kolkata',
      hour: 'numeric', hour12: false,
    }).format(now)
  );
}

/** Format minutes since midnight → "HH:MM" */
export function minutesToHHMM(min) {
  const h = Math.floor(min / 60) % 24;
  const m = min % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/**
 * Generate all 1-hour bookable slots for today in IST.
 * Default window: 09:00 – 23:00 (last slot 22:00-23:00).
 * Slots whose start hour <= current IST hour are excluded (can't book in the past).
 *
 * Returns array of { label, value, startMin, endMin, blocked }
 *   value   = "HH:MM-HH:MM" (sheet format)
 *   blocked = true if slot overlaps with an already-booked slot
 */
export function generateBookableSlots(bookedSlots = [], openHour = 9, closeHour = 23) {
  const currentMin = nowMinutes();
  const slots = [];

  for (let h = openHour; h < closeHour; h++) {
    const startMin = h * 60;
    const endMin   = startMin + 60;
    const start24  = `${String(h).padStart(2, '0')}:00`;
    const end24    = `${String(h + 1).padStart(2, '0')}:00`;
    const value    = `${start24}-${end24}`;

    // Skip past slots (already started or ended)
    if (endMin <= currentMin) continue;

    // Check if this slot overlaps with any already-booked slot
    const blocked = bookedSlots.some(bs => {
      const p = parseSlot(bs);
      if (!p) return false;
      // Overlap: not (endMin <= p.startMin || startMin >= p.endMin)
      return !(endMin <= p.startMin || startMin >= p.endMin);
    });

    slots.push({
      label:    `${toAmPm(start24)} – ${toAmPm(end24)}`,
      value,
      startMin,
      endMin,
      blocked,
    });
  }

  return slots;
}
