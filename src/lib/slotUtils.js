/**
 * slotUtils.js
 * Pure helpers for slot parsing, AM/PM ⇔ 24-hour conversion,
 * and determining which slot is active right now.
 */

export function to24h(timeStr) {
  if (!timeStr) return timeStr;
  const s = timeStr.trim().toUpperCase();
  const ampm = s.endsWith('AM') || s.endsWith('PM') ? s.slice(-2) : null;
  if (!ampm) return s;
  const core = s.slice(0, -2).trim();
  let [h, m = '00'] = core.split(':');
  h = parseInt(h, 10);
  if (ampm === 'AM') { if (h === 12) h = 0; }
  else { if (h !== 12) h += 12; }
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function toAmPm(timeStr) {
  if (!timeStr) return timeStr;
  const s = timeStr.trim().toUpperCase();
  if (s.endsWith('AM') || s.endsWith('PM')) return timeStr;
  let [h, m = '00'] = s.split(':').map(Number);
  const suffix = h < 12 ? 'AM' : 'PM';
  const h12 = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, '0')} ${suffix}`;
}

export function parseMinutes(timeStr) {
  const t24 = to24h(timeStr);
  const [h, m] = t24.split(':').map(Number);
  if (isNaN(h) || isNaN(m)) return null;
  return h * 60 + m;
}

export function parseSlot(slotStr) {
  if (!slotStr) return null;
  const str = slotStr.trim();
  const match = str.match(
    /^([\d]{1,2}:[\d]{2}(?:\s*[APap][Mm])?)[\s\-–]+([\d]{1,2}:[\d]{2}(?:\s*[APap][Mm])?)$/
  );
  if (!match) return null;
  const [, rawStart, rawEnd] = match;
  const start24  = to24h(rawStart.trim());
  const end24    = to24h(rawEnd.trim());
  const startMin = parseMinutes(rawStart);
  const endMin   = parseMinutes(rawEnd);
  if (startMin === null || endMin === null) return null;
  return { raw: str, start24, end24, startMin, endMin };
}

export function getActiveSlot(slots, nowMin) {
  for (const s of slots) {
    const parsed = parseSlot(s);
    if (!parsed) continue;
    if (nowMin >= parsed.startMin && nowMin < parsed.endMin) return parsed;
  }
  return null;
}

export function getNextSlot(slots, nowMin) {
  const upcoming = slots
    .map(s => parseSlot(s))
    .filter(p => p && p.startMin > nowMin)
    .sort((a, b) => a.startMin - b.startMin);
  return upcoming[0] ?? null;
}

export function getExpiredSlots(slots, nowMin) {
  return slots.map(s => parseSlot(s)).filter(p => p && p.endMin <= nowMin);
}

export function stripExpiredSlots(slots, nowMin) {
  return slots.filter(s => { const p = parseSlot(s); return p && p.endMin > nowMin; });
}

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

export function nowHourIST() {
  return Math.floor(nowMinutes() / 60);
}

export function minutesToHHMM(min) {
  const h = Math.floor(min / 60) % 24;
  const m = min % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/**
 * nextStartMinute — returns the next bookable start minute from now.
 *
 * Rule:
 *   - Start from the current IST minute.
 *   - Round UP to the next multiple of STEP (10 min).
 *   - But the very first option must have MM in {10,20,30,40,50,00}.
 *     i.e. if now = 14:03 -> first option = 14:10
 *        if now = 14:12 -> first option = 14:20
 *        if now = 14:55 -> first option = 15:00
 *
 * This is the first entry in the start-time list. Subsequent entries
 * increment by STEP until closeHour.
 */
const STEP = 10; // minutes

function ceilToStep(min, step) {
  return Math.ceil(min / step) * step;
}

/**
 * generateStartTimes — produces start-time options in 10-minute increments.
 *
 * First option  = ceil(nowMinutes, 10)  -- so always at a :10/:20/:30/etc boundary
 * Subsequent    = +10 min each
 * Skipped if    = the 60-min window starting there overlaps an existing booking
 * Stops at      = closeHour (default 24:00)
 *
 * Each entry:
 *   { startMin, start24, label, blockedOffsets }
 *   blockedOffsets = Set of 10-min offsets from startMin that are blocked
 *                    (used by DurationPicker to cap selectable hours)
 */
export function generateStartTimes(bookedSlots = [], openHour = 9, closeHour = 24) {
  const currentMin  = nowMinutes();
  const closingMin  = closeHour * 60;

  // First candidate: round current minute up to next STEP boundary
  // but never earlier than openHour
  const openMin     = openHour * 60;
  const firstMin    = Math.max(openMin, ceilToStep(currentMin, STEP));

  const results = [];

  for (let startMin = firstMin; startMin + 60 <= closingMin; startMin += STEP) {
    const h      = Math.floor(startMin / 60);
    const m      = startMin % 60;
    const start24 = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;

    // For each 10-min offset up to close, record if it's blocked
    const maxOffsets = Math.floor((closingMin - startMin) / STEP);
    const blockedOffsets = new Set();

    for (let offset = 0; offset < maxOffsets; offset++) {
      const chunkStart = startMin + offset * STEP;
      const chunkEnd   = chunkStart + STEP;
      const blocked = bookedSlots.some(bs => {
        const p = parseSlot(bs);
        if (!p) return false;
        // overlap check
        return !(chunkEnd <= p.startMin || chunkStart >= p.endMin);
      });
      if (blocked) blockedOffsets.add(offset);
    }

    // Skip this start time if the very first 10-min chunk (offset 0) is already blocked
    if (blockedOffsets.has(0)) continue;

    results.push({ startMin, start24, label: toAmPm(start24), blockedOffsets });
  }

  return results;
}

/**
 * generateBookableSlots (legacy, still used for the upcoming-slots display list).
 */
export function generateBookableSlots(bookedSlots = [], openHour = 9, closeHour = 24) {
  const currentMin = nowMinutes();
  const slots = [];

  for (let h = openHour; h < closeHour; h++) {
    const startMin = h * 60;
    const endMin   = startMin + 60;
    const start24  = `${String(h % 24).padStart(2, '0')}:00`;
    const end24    = `${String((h + 1) % 24).padStart(2, '0')}:00`;
    const value    = `${String(h % 24).padStart(2, '0')}:00-${String((h + 1) % 24).padStart(2, '0')}:00`;

    if (endMin <= currentMin) continue;

    const inProgress = startMin <= currentMin && currentMin < endMin;
    const alreadyBooked = bookedSlots.some(bs => {
      const p = parseSlot(bs);
      if (!p) return false;
      return !(endMin <= p.startMin || startMin >= p.endMin);
    });

    slots.push({
      label: `${toAmPm(start24)} – ${toAmPm(end24 === '00:00' ? '24:00' : end24)}`,
      value, startMin, endMin,
      blocked: inProgress || alreadyBooked,
    });
  }

  return slots;
}
