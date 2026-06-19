/**
 * slotUtils.js
 * Pure helpers for slot parsing, AM/PM ↔ 24-hour conversion,
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
 * Generate available START times for today (1-hour grid).
 * A start hour is included if:
 *   - it hasn’t fully passed (startMin >= currentMin)
 *   - at least 1 hour of consecutive unbloced time exists from it
 *     (i.e. the 1-hour slot starting here is not booked)
 *
 * maxHours = maximum consecutive hours bookable (ps5=4, racing=2)
 * openHour / closeHour = operating window
 *
 * Returns array of:
 *   { startMin, start24, label, bookedHours }
 *   bookedHours = Set of hour offsets (0,1,2…) from startMin that are already taken
 */
export function generateStartTimes(bookedSlots = [], openHour = 9, closeHour = 24) {
  const currentMin = nowMinutes();
  const results = [];

  for (let h = openHour; h < closeHour; h++) {
    const startMin = h * 60;
    // Skip if this hour has already started
    if (startMin < currentMin) continue;
    // Skip if no room for even 1 hour before close
    if (startMin + 60 > closeHour * 60) continue;

    const start24 = `${String(h % 24).padStart(2, '0')}:00`;

    // Work out which hour-offsets from this start are blocked by existing bookings
    const blockedOffsets = new Set();
    for (let offset = 0; offset < (closeHour - h); offset++) {
      const slotStart = startMin + offset * 60;
      const slotEnd   = slotStart + 60;
      const blocked = bookedSlots.some(bs => {
        const p = parseSlot(bs);
        if (!p) return false;
        return !(slotEnd <= p.startMin || slotStart >= p.endMin);
      });
      if (blocked) blockedOffsets.add(offset);
    }

    // Only show this start time if the first hour itself is free
    if (blockedOffsets.has(0)) continue;

    results.push({ startMin, start24, label: toAmPm(start24), blockedOffsets });
  }

  return results;
}

/**
 * Generate bookable slot objects (legacy, used by getActiveSlot display).
 * Still used in StationModal for the "upcoming slots" list.
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
