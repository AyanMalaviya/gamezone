/**
 * usePWA — centralised PWA hook
 *
 * SW registration is handled entirely by vite-plugin-pwa (registerType: autoUpdate).
 * This hook ONLY manages:
 *   - beforeinstallprompt  → install banner
 *   - appinstalled         → hide banner
 *   - display-mode media   → detect standalone
 *   - updateReady          → “Update available” toast (only when a previous
 *                            SW controller already exists, i.e. returning user)
 *
 * We do NOT manually call navigator.serviceWorker.register() here.
 * Doing so alongside vite-plugin-pwa causes dual-SW conflicts → reload loops.
 */
import { useState, useEffect, useRef } from 'react';

export default function usePWA() {
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled,   setIsInstalled]   = useState(false);
  const [updateReady,   setUpdateReady]   = useState(false);
  const deferredPrompt = useRef(null);

  useEffect(() => {
    // ── Detect standalone (already installed as PWA) ──────────────────────────
    const mq = window.matchMedia('(display-mode: standalone)');
    setIsInstalled(mq.matches || !!window.navigator.standalone);
    const onMQChange = e => setIsInstalled(e.matches);
    mq.addEventListener('change', onMQChange);

    // ── Capture install prompt ────────────────────────────────────────────────
    const onBIP = e => {
      e.preventDefault();
      deferredPrompt.current = e;
      setIsInstallable(true);
    };
    window.addEventListener('beforeinstallprompt', onBIP);

    // ── Hide banner after user installs ──────────────────────────────────────
    const onAppInstalled = () => {
      deferredPrompt.current = null;
      setIsInstallable(false);
      setIsInstalled(true);
    };
    window.addEventListener('appinstalled', onAppInstalled);

    // ── Detect SW updates via vite-plugin-pwa’s already-registered SW ────────
    // navigator.serviceWorker.ready resolves with the SW that vite-plugin-pwa
    // registered — no double registration.
    // Only show “Update available” when controller exists (= returning visitor).
    // First-time visitors have controller === null, so we skip the toast.
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then(reg => {
        // Already waiting on page load (tab was open during a deploy)
        if (reg.waiting && navigator.serviceWorker.controller) {
          setUpdateReady(true);
        }

        reg.addEventListener('updatefound', () => {
          const newSW = reg.installing;
          if (!newSW) return;
          newSW.addEventListener('statechange', () => {
            if (
              newSW.state === 'installed' &&
              navigator.serviceWorker.controller  // null on first install → skip
            ) {
              setUpdateReady(true);
            }
          });
        });
      }).catch(() => {}); // SW not ready yet in non-PWA browsers — silently ignore
    }

    return () => {
      mq.removeEventListener('change', onMQChange);
      window.removeEventListener('beforeinstallprompt', onBIP);
      window.removeEventListener('appinstalled', onAppInstalled);
    };
  }, []);

  // ── Install ───────────────────────────────────────────────────────────────
  const installApp = async () => {
    if (!deferredPrompt.current) return;
    deferredPrompt.current.prompt();
    const { outcome } = await deferredPrompt.current.userChoice;
    if (outcome === 'accepted') {
      deferredPrompt.current = null;
      setIsInstallable(false);
    }
  };

  // ── Apply update ──────────────────────────────────────────────────────────
  // The controllerchange → reload listener lives HERE (not globally) so it
  // only fires when the user explicitly clicks “Reload” — not on every SW swap.
  const applyUpdate = async () => {
    if (!('serviceWorker' in navigator)) return;
    const reg = await navigator.serviceWorker.ready;
    if (reg.waiting) {
      let reloading = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (!reloading) { reloading = true; window.location.reload(); }
      });
      reg.waiting.postMessage({ type: 'SKIP_WAITING' });
    } else {
      window.location.reload();
    }
  };

  return { isInstallable, isInstalled, installApp, updateReady, applyUpdate };
}
