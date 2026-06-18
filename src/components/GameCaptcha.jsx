/**
 * GameCaptcha — custom gamer-themed image CAPTCHA
 * Shows a 3×3 grid of SVG icons. User must select all GAMING items.
 * On correct selection → calls onVerified(). Wrong → shuffles & shows error.
 */
import { useState, useCallback } from 'react';
import './GameCaptcha.css';

// ─── Icon definitions ────────────────────────────────────────────────────────
const ITEMS = [
  {
    id: 'controller', label: 'Controller', isGaming: true,
    svg: (
      <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="6" y="16" width="36" height="20" rx="10" fill="currentColor" opacity=".15" stroke="currentColor" strokeWidth="2"/>
        <circle cx="30" cy="22" r="2" fill="currentColor"/>
        <circle cx="36" cy="26" r="2" fill="currentColor"/>
        <circle cx="30" cy="30" r="2" fill="currentColor"/>
        <circle cx="24" cy="26" r="2" fill="currentColor"/>
        <rect x="13" y="22" width="2" height="6" rx="1" fill="currentColor"/>
        <rect x="11" y="24" width="6" height="2" rx="1" fill="currentColor"/>
      </svg>
    ),
  },
  {
    id: 'joystick', label: 'Joystick', isGaming: true,
    svg: (
      <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="14" y="34" width="20" height="6" rx="3" fill="currentColor" opacity=".15" stroke="currentColor" strokeWidth="2"/>
        <rect x="22" y="14" width="4" height="22" rx="2" fill="currentColor"/>
        <circle cx="24" cy="12" r="6" fill="currentColor" opacity=".15" stroke="currentColor" strokeWidth="2"/>
        <circle cx="24" cy="12" r="2" fill="currentColor"/>
      </svg>
    ),
  },
  {
    id: 'headset', label: 'Gaming Headset', isGaming: true,
    svg: (
      <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M10 26v-4a14 14 0 0 1 28 0v4" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" fill="none"/>
        <rect x="7" y="26" width="6" height="10" rx="3" fill="currentColor" opacity=".2" stroke="currentColor" strokeWidth="2"/>
        <rect x="35" y="26" width="6" height="10" rx="3" fill="currentColor" opacity=".2" stroke="currentColor" strokeWidth="2"/>
        <path d="M38 36v2a4 4 0 0 1-4 4h-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none"/>
      </svg>
    ),
  },
  {
    id: 'trophy', label: 'Trophy', isGaming: true,
    svg: (
      <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M16 8h16v16a8 8 0 0 1-16 0V8Z" fill="currentColor" opacity=".15" stroke="currentColor" strokeWidth="2"/>
        <path d="M16 12H8a6 6 0 0 0 8 6M32 12h8a6 6 0 0 1-8 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none"/>
        <rect x="20" y="32" width="8" height="4" fill="currentColor" opacity=".3"/>
        <rect x="14" y="36" width="20" height="4" rx="2" fill="currentColor" opacity=".2" stroke="currentColor" strokeWidth="2"/>
        <line x1="24" y1="24" x2="24" y2="32" stroke="currentColor" strokeWidth="2"/>
      </svg>
    ),
  },
  {
    id: 'dice', label: 'Dice', isGaming: true,
    svg: (
      <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="8" y="8" width="32" height="32" rx="6" fill="currentColor" opacity=".12" stroke="currentColor" strokeWidth="2"/>
        <circle cx="17" cy="17" r="2.5" fill="currentColor"/>
        <circle cx="31" cy="17" r="2.5" fill="currentColor"/>
        <circle cx="24" cy="24" r="2.5" fill="currentColor"/>
        <circle cx="17" cy="31" r="2.5" fill="currentColor"/>
        <circle cx="31" cy="31" r="2.5" fill="currentColor"/>
      </svg>
    ),
  },
  // ─── Distractors (non-gaming) ─────────────────────────────────────────────
  {
    id: 'pizza', label: 'Pizza', isGaming: false,
    svg: (
      <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M24 8 L40 38 L8 38 Z" fill="currentColor" opacity=".12" stroke="currentColor" strokeWidth="2"/>
        <circle cx="24" cy="24" r="3" fill="currentColor" opacity=".5"/>
        <circle cx="18" cy="30" r="2" fill="currentColor" opacity=".5"/>
        <circle cx="30" cy="30" r="2" fill="currentColor" opacity=".5"/>
      </svg>
    ),
  },
  {
    id: 'umbrella', label: 'Umbrella', isGaming: false,
    svg: (
      <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M8 24a16 16 0 0 1 32 0H8Z" fill="currentColor" opacity=".15" stroke="currentColor" strokeWidth="2"/>
        <line x1="24" y1="24" x2="24" y2="38" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
        <path d="M24 38 Q28 42 28 40" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none"/>
      </svg>
    ),
  },
  {
    id: 'bicycle', label: 'Bicycle', isGaming: false,
    svg: (
      <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="14" cy="32" r="8" stroke="currentColor" strokeWidth="2" fill="none"/>
        <circle cx="34" cy="32" r="8" stroke="currentColor" strokeWidth="2" fill="none"/>
        <polyline points="14,32 20,18 28,18 34,32" stroke="currentColor" strokeWidth="2" fill="none" strokeLinejoin="round"/>
        <circle cx="28" cy="18" r="2" fill="currentColor"/>
        <line x1="20" y1="18" x2="24" y2="32" stroke="currentColor" strokeWidth="2"/>
      </svg>
    ),
  },
  {
    id: 'cloud', label: 'Cloud', isGaming: false,
    svg: (
      <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M36 34H14a10 10 0 1 1 2.7-19.6A10 10 0 1 1 36 34Z" fill="currentColor" opacity=".15" stroke="currentColor" strokeWidth="2"/>
      </svg>
    ),
  },
];

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function pickGrid() {
  const gaming    = ITEMS.filter(i => i.isGaming);
  const nonGaming = ITEMS.filter(i => !i.isGaming);
  // Always 4 gaming + 5 non-gaming in the 3×3 grid
  const picked = [
    ...shuffle(gaming).slice(0, 4),
    ...shuffle(nonGaming).slice(0, 5),
  ];
  return shuffle(picked);
}

export default function GameCaptcha({ onVerified }) {
  const [grid, setGrid]         = useState(() => pickGrid());
  const [selected, setSelected] = useState(new Set());
  const [error, setError]       = useState('');
  const [success, setSuccess]   = useState(false);
  const [shake, setShake]       = useState(false);

  const toggle = (id) => {
    if (success) return;
    setError('');
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const verify = useCallback(() => {
    const gamingIds  = new Set(grid.filter(i => i.isGaming).map(i => i.id));
    const correct    = [...gamingIds].every(id => selected.has(id));
    const noExtra    = [...selected].every(id => gamingIds.has(id));

    if (correct && noExtra && selected.size === gamingIds.size) {
      setSuccess(true);
      setTimeout(() => onVerified(), 600);
    } else {
      setShake(true);
      setError('Incorrect — try again');
      setTimeout(() => {
        setGrid(pickGrid());
        setSelected(new Set());
        setShake(false);
        setError('');
      }, 900);
    }
  }, [grid, selected, onVerified]);

  return (
    <div className={`gcap-wrap${shake ? ' gcap-shake' : ''}`}>
      <div className="gcap-header">
        <span className="gcap-icon">🎮</span>
        <div>
          <p className="gcap-title">Select all <strong>gaming</strong> items</p>
          <p className="gcap-sub">Click every controller, headset, joystick, trophy or dice</p>
        </div>
      </div>

      <div className="gcap-grid">
        {grid.map((item) => {
          const sel = selected.has(item.id);
          return (
            <button
              key={item.id}
              type="button"
              aria-label={`Select ${item.label}`}
              aria-pressed={sel}
              className={`gcap-cell${sel ? ' gcap-cell-sel' : ''}${success ? ' gcap-cell-done' : ''}`}
              onClick={() => toggle(item.id)}
            >
              <span className="gcap-cell-icon">{item.svg}</span>
              {sel && (
                <span className="gcap-check" aria-hidden="true">
                  <svg viewBox="0 0 16 16" width="12" height="12" fill="none">
                    <path d="M3 8l3.5 3.5L13 5" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </span>
              )}
            </button>
          );
        })}
      </div>

      {error && <p className="gcap-error">{error}</p>}
      {success && <p className="gcap-ok">✓ Verified!</p>}

      {!success && (
        <button
          type="button"
          className="gcap-verify"
          onClick={verify}
          disabled={selected.size === 0}
        >
          Verify
        </button>
      )}
    </div>
  );
}
