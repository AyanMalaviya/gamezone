/**
 * InstallPrompt — bottom-of-screen install banner + update toast
 *
 * Install banner: only shown when:
 *   1. Browser fired beforeinstallprompt (app is installable)
 *   2. App is NOT already running in standalone mode
 *
 * Update toast: shown when a new SW version is waiting.
 *   Clicking Reload triggers skipWaiting → controllerchange → page reloads.
 *
 * When the installed PWA is opened via its icon, display-mode is "standalone",
 * so this banner never appears for installed users.
 */
import { useState } from 'react';
import { Download, RefreshCw, X } from 'lucide-react';
import usePWA from '../hooks/usePWA';

export default function InstallPrompt() {
  const { isInstallable, isInstalled, installApp, updateReady, applyUpdate } = usePWA();
  const [dismissed, setDismissed] = useState(false);

  const showInstall = isInstallable && !isInstalled && !dismissed;

  if (!showInstall && !updateReady) return null;

  return (
    <div style={{
      position: 'fixed',
      bottom: '1rem',
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 9998,
      display: 'flex',
      flexDirection: 'column',
      gap: 10,
      width: 'min(420px, calc(100vw - 2rem))',
      pointerEvents: 'none',
    }}>

      {/* ── Update toast ─────────────────────────────────────────────────── */}
      {updateReady && (
        <div style={{
          pointerEvents: 'all',
          background: '#1a1a2e',
          border: '1px solid rgba(124,58,237,0.5)',
          borderRadius: 14,
          padding: '12px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          boxShadow: '0 8px 40px rgba(0,0,0,0.7), 0 0 0 1px rgba(124,58,237,0.15)',
          animation: 'pwa-slide-up 0.35s cubic-bezier(0.34,1.56,0.64,1) both',
        }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(124,58,237,0.2)', border: '1px solid rgba(124,58,237,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <RefreshCw size={16} color="#a78bfa" />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#fff' }}>Update available</div>
            <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.45)', marginTop: 1 }}>A new version of GameZone is ready</div>
          </div>
          <button
            onClick={applyUpdate}
            style={{
              padding: '7px 14px', borderRadius: 8, border: 'none', flexShrink: 0,
              background: 'linear-gradient(135deg,#7c3aed,#a855f7)',
              color: '#fff', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer',
              boxShadow: '0 2px 12px rgba(124,58,237,0.4)',
            }}
          >Reload</button>
        </div>
      )}

      {/* ── Install banner ───────────────────────────────────────────────── */}
      {showInstall && (
        <div style={{
          pointerEvents: 'all',
          background: 'linear-gradient(135deg, #0f0f1a 0%, #1a0f2e 100%)',
          border: '1px solid rgba(124,58,237,0.4)',
          borderRadius: 14,
          padding: '14px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          boxShadow: '0 8px 40px rgba(0,0,0,0.7), 0 0 0 1px rgba(124,58,237,0.1)',
          animation: 'pwa-slide-up 0.35s cubic-bezier(0.34,1.56,0.64,1) both',
        }}>
          <img
            src="/icons/icon-128.png"
            alt="GameZone"
            style={{ width: 42, height: 42, flexShrink: 0 }}
          />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: '0.88rem', color: '#fff' }}>Install GameZone</div>
            <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', marginTop: 1 }}>Add to home screen for quick access</div>
          </div>
          <button
            onClick={installApp}
            style={{
              padding: '8px 14px', borderRadius: 8, border: 'none', flexShrink: 0,
              background: 'linear-gradient(135deg,#7c3aed,#a855f7)',
              color: '#fff', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 6,
              boxShadow: '0 2px 12px rgba(124,58,237,0.4)',
            }}
          >
            <Download size={13} /> Install
          </button>
          <button
            onClick={() => setDismissed(true)}
            style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', cursor: 'pointer', padding: 4, flexShrink: 0 }}
          >
            <X size={16} />
          </button>
        </div>
      )}

      <style>{`
        @keyframes pwa-slide-up {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
