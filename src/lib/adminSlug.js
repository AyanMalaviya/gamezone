/**
 * Dynamic admin slug utilities.
 * The slug is generated fresh each time the admin dashboard mounts,
 * has a 10-minute TTL, and is destroyed on explicit logout.
 */

const TTL_MS = 10 * 60 * 1000; // 10 minutes

/** Generate a cryptographically random slug: "admin-<16 hex chars>" */
export function generateSlug() {
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  const hex   = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
  return `admin-${hex}`;
}

/** Returns a new slug + expiry timestamp */
export function createSlugSession() {
  return {
    slug:    generateSlug(),
    expiry:  Date.now() + TTL_MS,
  };
}

export const TTL_MINUTES = TTL_MS / 60000;
