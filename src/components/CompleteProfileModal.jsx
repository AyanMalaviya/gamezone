/**
 * CompleteProfileModal
 * Used in two modes:
 *  - "prompt"  (default) — friendly "One more thing" after Google sign-in. Can be dismissed.
 *  - "gate"    — blocking gate before booking. Cannot be fully dismissed without adding phone.
 *               (user can click outside to cancel the booking attempt, but modal closes cleanly)
 * onSaved(phone) — called with the saved phone string so caller can update state.
 */
import { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { Phone, X, Loader2, CheckCircle2, AlertCircle, ShieldAlert } from 'lucide-react';
import { savePhone } from '../hooks/useAuth';
import useAuthStore from '../store/authStore';

const STYLE_ID = 'cpm-keyframes';
function injectKF() {
  if (document.getElementById(STYLE_ID)) return;
  const s = document.createElement('style');
  s.id = STYLE_ID;
  s.textContent = `
    @keyframes cpm-overlay { from{opacity:0} to{opacity:1} }
    @keyframes cpm-modal   { from{opacity:0;transform:translate(-50%,-50%) scale(.94)} to{opacity:1;transform:translate(-50%,-50%) scale(1)} }
    @keyframes cpm-spin    { to{transform:rotate(360deg)} }
  `;
  document.head.appendChild(s);
}
injectKF();

const PH_RE = /^\+91[6-9]\d{9}$/;

const normalizePhone = (raw) => {
  const cleaned = raw.replace(/[\s\-().]/g, '');
  return cleaned.startsWith('+91') ? cleaned : `+91${cleaned}`;
};

export default function CompleteProfileModal({ open, onClose, onSaved, mode = 'prompt' }) {
  const user  = useAuthStore(s => s.user);
  const [phone, setPhone] = useState('');
  const [busy, setBusy]   = useState(false);
  const [error, setError] = useState('');

  const isGate = mode === 'gate';

  const validate = (v) => {
    if (!v.trim()) return 'Phone number is required to book a station.';
    const n = normalizePhone(v.trim());
    if (!PH_RE.test(n)) return 'Enter a valid 10-digit Indian mobile number (e.g. 98765 43210).';
    return '';
  };

  const handleSave = async (e) => {
    e.preventDefault();
    const err = validate(phone);
    if (err) { setError(err); return; }
    if (!user) { setError('Not logged in.'); return; }
    setBusy(true); setError('');
    try {
      const normalized = normalizePhone(phone.trim());
      await savePhone(user.uid, normalized);
      onSaved?.(normalized);
      setPhone('');
    } catch {
      setError('Failed to save. Please try again.');
    } finally { setBusy(false); }
  };

  return (
    <Dialog.Root open={open} onOpenChange={(o) => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay style={{
          position:'fixed', inset:0,
          background:'rgba(0,0,0,0.75)',
          backdropFilter:'blur(6px)', WebkitBackdropFilter:'blur(6px)',
          zIndex:9998, animation:'cpm-overlay .2s ease both',
        }} />

        <Dialog.Content
          aria-describedby={undefined}
          onEscapeKeyDown={onClose}
          onPointerDownOutside={onClose}
          style={{
            position:'fixed', top:'50%', left:'50%',
            transform:'translate(-50%,-50%)',
            zIndex:9999,
            width:'min(420px, calc(100vw - 2rem))',
            background:'#111116',
            border:'1px solid rgba(168,85,247,.3)',
            borderRadius:18,
            boxShadow:'0 0 0 1px rgba(124,58,237,.18), 0 24px 64px rgba(0,0,0,.7), 0 0 50px rgba(124,58,237,.15)',
            animation:'cpm-modal .26s cubic-bezier(.34,1.56,.64,1) both',
            outline:'none', overflow:'hidden',
          }}
        >
          <div style={{ height:3, background:'linear-gradient(90deg,transparent,#a855f7,#7c3aed,transparent)' }} />

          <div style={{ padding:'22px 22px 26px' }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:18 }}>
              <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                <div style={{
                  width:42, height:42, borderRadius:'50%',
                  background: isGate ? 'rgba(239,68,68,.12)' : 'rgba(168,85,247,.12)',
                  border:`1.5px solid ${isGate ? 'rgba(239,68,68,.35)' : 'rgba(168,85,247,.3)'}`,
                  display:'flex', alignItems:'center', justifyContent:'center',
                  boxShadow:`0 0 16px ${isGate ? 'rgba(239,68,68,.2)' : 'rgba(168,85,247,.2)'}`,
                }}>
                  {isGate ? <ShieldAlert size={18} color="#fca5a5" /> : <Phone size={18} color="#c084fc" />}
                </div>
                <div>
                  <Dialog.Title style={{
                    fontFamily:"'Rajdhani','Inter',sans-serif",
                    fontWeight:700, fontSize:'1.08rem', color:'#fff', marginBottom:2,
                  }}>
                    {isGate ? 'Phone Required to Book' : 'One more thing'}
                  </Dialog.Title>
                  <p style={{ fontSize:'0.75rem', color:'rgba(255,255,255,.38)', margin:0 }}>
                    {isGate
                      ? 'Add your number to confirm this booking'
                      : 'Add your number to enable bookings'}
                  </p>
                </div>
              </div>

              {!isGate && (
                <Dialog.Close asChild>
                  <button
                    aria-label="Skip for now"
                    style={{
                      width:30, height:30, borderRadius:7, flexShrink:0,
                      background:'rgba(255,255,255,.05)', border:'1px solid rgba(255,255,255,.09)',
                      color:'rgba(255,255,255,.35)',
                      display:'flex', alignItems:'center', justifyContent:'center',
                      cursor:'pointer', transition:'all .15s',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background='rgba(255,255,255,.1)'; e.currentTarget.style.color='#fff'; }}
                    onMouseLeave={e => { e.currentTarget.style.background='rgba(255,255,255,.05)'; e.currentTarget.style.color='rgba(255,255,255,.35)'; }}
                  >
                    <X size={13} />
                  </button>
                </Dialog.Close>
              )}
            </div>

            {isGate && (
              <div style={{
                display:'flex', gap:8, alignItems:'flex-start',
                background:'rgba(239,68,68,.07)', border:'1px solid rgba(239,68,68,.18)',
                borderRadius:10, padding:'10px 12px', marginBottom:16,
                fontSize:'0.78rem', color:'rgba(255,180,180,.7)', lineHeight:1.55,
              }}>
                <ShieldAlert size={13} style={{ flexShrink:0, marginTop:2 }} />
                <span>A phone number is required so we can confirm your booking and reach you if anything changes.</span>
              </div>
            )}

            <div style={{ height:1, background:'rgba(255,255,255,.06)', marginBottom:18 }} />

            <form onSubmit={handleSave} noValidate>
              <div style={{ marginBottom:14 }}>
                <label htmlFor="cpm-phone" style={{
                  display:'block', marginBottom:6,
                  fontSize:'0.72rem', fontWeight:700,
                  letterSpacing:'0.1em', textTransform:'uppercase',
                  color:'rgba(255,255,255,.45)',
                }}>Phone Number</label>

                <div style={{ position:'relative', display:'flex', alignItems:'center' }}>
                  <Phone size={14} style={{ position:'absolute', left:12, color:'rgba(255,255,255,.3)', pointerEvents:'none' }} />
                  <input
                    id="cpm-phone" type="tel" placeholder="+91 98765 43210"
                    value={phone}
                    onChange={e => { setPhone(e.target.value); setError(''); }}
                    autoComplete="tel"
                    style={{
                      width:'100%',
                      background:'rgba(255,255,255,.05)',
                      border:`1px solid ${error ? 'rgba(239,68,68,.5)' : 'rgba(255,255,255,.1)'}`,
                      borderRadius:10, padding:'.65rem .85rem .65rem 2.3rem',
                      fontSize:'.88rem', color:'#fff', outline:'none',
                      fontFamily:'inherit', transition:'border-color .2s, box-shadow .2s',
                    }}
                    onFocus={e => { e.target.style.borderColor='rgba(168,85,247,.55)'; e.target.style.boxShadow='0 0 0 3px rgba(168,85,247,.12)'; }}
                    onBlur={e => { e.target.style.borderColor=error?'rgba(239,68,68,.5)':'rgba(255,255,255,.1)'; e.target.style.boxShadow='none'; }}
                  />
                </div>
              </div>

              {error && (
                <div style={{
                  display:'flex', alignItems:'center', gap:7,
                  padding:'8px 11px', borderRadius:8, marginBottom:12,
                  background:'rgba(239,68,68,.09)', border:'1px solid rgba(239,68,68,.22)',
                  fontSize:'.78rem', color:'#fca5a5',
                }}>
                  <AlertCircle size={13} /><span>{error}</span>
                </div>
              )}

              <div style={{ display:'flex', gap:9, marginTop:4 }}>
                {!isGate && (
                  <button type="button" onClick={onClose} style={{
                    flex:1, padding:'.65rem', borderRadius:10,
                    background:'rgba(255,255,255,.05)', border:'1px solid rgba(255,255,255,.1)',
                    color:'rgba(255,255,255,.5)', fontSize:'.84rem',
                    fontWeight:600, cursor:'pointer', transition:'all .15s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background='rgba(255,255,255,.09)'; e.currentTarget.style.color='rgba(255,255,255,.8)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background='rgba(255,255,255,.05)'; e.currentTarget.style.color='rgba(255,255,255,.5)'; }}
                  >Skip for now</button>
                )}

                {isGate && (
                  <button type="button" onClick={onClose} style={{
                    flex:1, padding:'.65rem', borderRadius:10,
                    background:'rgba(255,255,255,.04)', border:'1px solid rgba(255,255,255,.08)',
                    color:'rgba(255,255,255,.35)', fontSize:'.84rem',
                    fontWeight:600, cursor:'pointer', transition:'all .15s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.color='rgba(255,255,255,.6)'; }}
                  onMouseLeave={e => { e.currentTarget.style.color='rgba(255,255,255,.35)'; }}
                  >Cancel booking</button>
                )}

                <button type="submit" disabled={busy} style={{
                  flex:1, padding:'.65rem', borderRadius:10,
                  background:'linear-gradient(135deg,#7c3aed,#a855f7)',
                  border:'none', color:'#fff', fontSize:'.84rem',
                  fontWeight:700, cursor:busy?'not-allowed':'pointer',
                  opacity:busy?.6:1,
                  display:'flex', alignItems:'center', justifyContent:'center', gap:6,
                  transition:'opacity .2s',
                  boxShadow:'0 4px 16px rgba(124,58,237,.35)',
                }}>
                  {busy
                    ? <Loader2 size={15} style={{ animation:'cpm-spin .7s linear infinite' }} />
                    : <><CheckCircle2 size={15} /><span>Save &amp; Continue</span></>
                  }
                </button>
              </div>
            </form>

            <p style={{ marginTop:14, textAlign:'center', fontSize:'0.7rem', color:'rgba(255,255,255,.22)', lineHeight:1.5 }}>
              Your number is only used for booking confirmations and is never shared publicly.
            </p>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
