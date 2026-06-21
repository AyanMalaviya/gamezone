/**
 * usePWA — centralised PWA hook
 *
 * Exposes:
 *   isInstallable  — true when the browser has fired beforeinstallprompt
 *   isInstalled    — true when running in standalone (already installed)
 *   installApp()   — triggers the native install prompt
 *   updateReady    — true when a new SW version is waiting
 *   applyUpdate()  — tells the waiting SW to activate immediately, then reloads
 */
import { useState, useEffect, useRef } from 'react';

export default function usePWA() {
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled,   setIsInstalled]   = useState(false);
  const [updateReady,   setUpdateReady]   = useState(false);
  const deferredPrompt = useRef(null);
  const swReg          = useRef(null);

  useEffect(() => {
    // ── Detect standalone mode (already installed) ────────────────────────────
    const mq = window.matchMedia('(display-mode: standalone)');
    setIsInstalled(mq.matches || window.navigator.standalone === true);
    const onChange = e => setIsInstalled(e.matches);
    mq.addEventListener('change', onChange);

    // ── Capture the install prompt ────────────────────────────────────────────
    const onBIP = e => {
      e.preventDefault();
      deferredPrompt.current = e;
      setIsInstallable(true);
    };
    window.addEventListener('beforeinstallprompt', onBIP);

    // ── Hide button after install ─────────────────────────────────────────────
    const onAppInstalled = () => {
      deferredPrompt.current = null;
      setIsInstallable(false);
      setIsInstalled(true);
    };
    window.addEventListener('appinstalled', onAppInstalled);

    // ── Register Service Worker ───────────────────────────────────────────────
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js', { scope: '/' })
        .then(reg => {
          swReg.current = reg;

          // A new SW is already waiting (page was already open)
          if (reg.waiting) setUpdateReady(true);

          // New SW found while page is open
          reg.addEventListener('updatefound', () => {
            const newSW = reg.installing;
            if (!newSW) return;
            newSW.addEventListener('statechange', () => {
              if (newSW.state === 'installed' && navigator.serviceWorker.controller) {
                setUpdateReady(true);
              }
            });
          });
        })
        .catch(err => console.warn('[SW] Registration failed:', err));

      // Listen for message from SW
      navigator.serviceWorker.addEventListener('message', event => {
        if (event.data === 'UPDATE_READY') setUpdateReady(true);
      });

      // Reload all tabs when SW takes control
      let refreshing = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (!refreshing) { refreshing = true; window.location.reload(); }
      });
    }

    return () => {
      mq.removeEventListener('change', onChange);
      window.removeEventListener('beforeinstallprompt', onBIP);
      window.removeEventListener('appinstalled', onAppInstalled);
    };
  }, []);

  const installApp = async () => {
    if (!deferredPrompt.current) return;
    deferredPrompt.current.prompt();
    const { outcome } = await deferredPrompt.current.userChoice;
    if (outcome === 'accepted') {
      deferredPrompt.current = null;
      setIsInstallable(false);
    }
  };

  const applyUpdate = () => {
    const reg = swReg.current;
    if (!reg) return;
    const sw = reg.waiting;
    if (sw) {
      sw.postMessage('SKIP_WAITING');
    }
    // controllerchange listener above will reload
  };

  return { isInstallable, isInstalled, installApp, updateReady, applyUpdate };
}
