/*
 * GameZone Service Worker
 *
 * Strategy:
 *   - App shell (index.html + JS/CSS bundles) → Network-first with cache fallback.
 *     This means every navigation checks the network first so a new Vercel deploy
 *     is picked up immediately. Cache is only used when offline.
 *
 *   - Static assets (icons, fonts, images) → Cache-first (long-lived).
 *
 * Auto-update flow:
 *   1. Browser detects a new SW file on every page load (byte-diff check).
 *   2. New SW installs and waits.
 *   3. SW posts 'UPDATE_READY' to all clients.
 *   4. React <UpdatePrompt> shows a "New version available" toast.
 *   5. User clicks Reload → SW calls skipWaiting() → clients reload.
 *   OR: if user ignores, the update applies on the next browser restart.
 */

const CACHE_NAME    = 'gz-shell-v1';
const ASSET_CACHE   = 'gz-assets-v1';

const SHELL_URLS = [
  '/',
  '/index.html',
];

const ASSET_ORIGINS = [
  'fonts.googleapis.com',
  'fonts.gstatic.com',
];

// ─── Install: pre-cache the shell ─────────────────────────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(SHELL_URLS))
      .then(() => {
        // Don't skipWaiting here — let the React app prompt the user
      })
  );
});

// ─── Activate: clean old caches ───────────────────────────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(k => k !== CACHE_NAME && k !== ASSET_CACHE)
          .map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// ─── Message: skip waiting on demand ──────────────────────────────────────────
self.addEventListener('message', event => {
  if (event.data === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// ─── Fetch ────────────────────────────────────────────────────────────────────
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Never intercept API calls, Firebase, or non-GET
  if (request.method !== 'GET') return;
  if (url.pathname.startsWith('/api/')) return;
  if (url.hostname.includes('firestore.googleapis.com')) return;
  if (url.hostname.includes('firebase')) return;
  if (url.hostname.includes('googleapis.com') && !url.hostname.includes('fonts')) return;

  // Static assets (fonts, icons) → cache-first
  if (ASSET_ORIGINS.some(o => url.hostname.includes(o)) || url.pathname.startsWith('/icons/')) {
    event.respondWith(
      caches.open(ASSET_CACHE).then(cache =>
        cache.match(request).then(cached => {
          if (cached) return cached;
          return fetch(request).then(resp => {
            if (resp.ok) cache.put(request, resp.clone());
            return resp;
          });
        })
      )
    );
    return;
  }

  // App shell + everything else → network-first (picks up new deploys instantly)
  event.respondWith(
    fetch(request)
      .then(resp => {
        // Update the cache with the fresh response
        if (resp.ok && url.origin === self.location.origin) {
          caches.open(CACHE_NAME).then(c => c.put(request, resp.clone()));
        }
        return resp;
      })
      .catch(() =>
        // Offline fallback: serve from cache
        caches.match(request).then(cached => cached || caches.match('/'))
      )
  );
});

// ─── Notify clients when a new SW is waiting ──────────────────────────────────
self.addEventListener('install', () => {
  self.clients.matchAll({ includeUncontrolled: true }).then(clients => {
    clients.forEach(client => client.postMessage('UPDATE_READY'));
  });
});
