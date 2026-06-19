import { useState, useEffect, useRef } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X, Smartphone, CheckCircle2, XCircle, Loader2, Copy, Check, Shield, Zap, RefreshCw } from 'lucide-react';
import usePaymentStore, { TEST_UPI_IDS } from '../store/paymentStore';
import { toAmPm, parseSlot } from '../lib/slotUtils';

const KF_ID = 'upi-kf';
function injectKF() {
  if (document.getElementById(KF_ID)) return;
  const s = document.createElement('style');
  s.id = KF_ID;
  s.textContent = `
    @keyframes upi-in    { from{opacity:0;transform:translate(-50%,-50%) scale(.93) translateY(14px)} to{opacity:1;transform:translate(-50%,-50%) scale(1) translateY(0)} }
    @keyframes upi-out   { from{opacity:1} to{opacity:0} }
    @keyframes upi-spin  { to{transform:rotate(360deg)} }
    @keyframes upi-pulse { 0%,100%{transform:scale(1);opacity:1} 50%{transform:scale(1.12);opacity:.7} }
    @keyframes upi-pop   { 0%{transform:scale(.6);opacity:0} 70%{transform:scale(1.15)} 100%{transform:scale(1);opacity:1} }
    @keyframes upi-shake { 0%,100%{transform:translateX(0)} 20%,60%{transform:translateX(-6px)} 40%,80%{transform:translateX(6px)} }
    @keyframes upi-slide { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
    @keyframes upi-edge  { 0%{background-position:0% 50%} 100%{background-position:200% 50%} }
    @keyframes upi-bar   { from{width:0} to{width:100%} }
  `;
  document.head.appendChild(s);
}

const UpiLogo = () => (
  <svg width="38" height="16" viewBox="0 0 38 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <text x="0" y="13" fontFamily="'Rajdhani',sans-serif" fontWeight="800" fontSize="15" fill="#7c3aed">UPI</text>
  </svg>
);

const BankChip = ({ id, onClick, active }) => {
  const bank = id.split('@')[1]?.toUpperCase() || id;
  return (
    <button onClick={() => onClick(id)} style={{
      padding: '5px 12px', borderRadius: 99,
      border: `1px solid ${active ? 'rgba(124,58,237,0.6)' : 'rgba(255,255,255,0.1)'}`,
      background: active ? 'rgba(124,58,237,0.15)' : 'rgba(255,255,255,0.04)',
      color: active ? '#a78bfa' : 'rgba(255,255,255,0.5)',
      fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer',
      transition: 'all 0.15s', letterSpacing: '0.04em',
    }}>{bank}</button>
  );
};

/** Format a slot value string "HH:MM-HH:MM" to AM/PM display */
function fmtSlotLabel(slotValue) {
  if (!slotValue) return null;
  const p = parseSlot(slotValue);
  if (!p) return slotValue;
  return `${toAmPm(p.start24)} \u2013 ${toAmPm(p.end24)}`;
}

export default function UpiPaymentModal() {
  const { isOpen, context, step, receipt, error, closePayment, pay, retry } = usePaymentStore();
  const [upiId, setUpiId] = useState('');
  const [copied, setCopied] = useState(false);
  const [shake, setShake]   = useState(false);
  const inputRef = useRef(null);

  useEffect(() => { injectKF(); }, []);
  useEffect(() => {
    if (isOpen && step === 'form') {
      setUpiId('');
      setTimeout(() => inputRef.current?.focus(), 80);
    }
  }, [isOpen, step]);

  const handlePay = () => {
    if (!upiId.trim() || !upiId.includes('@')) {
      setShake(true); setTimeout(() => setShake(false), 600); return;
    }
    pay({ upiId: upiId.trim() });
  };

  const copyTxnId = () => {
    if (!receipt?.txnId) return;
    navigator.clipboard.writeText(receipt.txnId).catch(() => {});
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  };

  if (!isOpen) return null;

  const amt       = context?.amount ?? 0;
  const label     = context?.label  ?? 'GameZone Payment';
  const slotLabel = fmtSlotLabel(context?.meta?.slot);

  const borderColor = step === 'success' ? 'rgba(34,197,94,0.35)' : step === 'failed' ? 'rgba(239,68,68,0.35)' : 'rgba(124,58,237,0.3)';
  const glowColor   = step === 'success' ? 'rgba(34,197,94,0.15)'  : step === 'failed' ? 'rgba(239,68,68,0.15)'  : 'rgba(124,58,237,0.12)';
  const edgeGrad    = step === 'success'
    ? 'linear-gradient(90deg,transparent,#22c55e,#4ade80,#22c55e,transparent)'
    : step === 'failed'
    ? 'linear-gradient(90deg,transparent,#ef4444,#f87171,#ef4444,transparent)'
    : 'linear-gradient(90deg,transparent,#7c3aed,#a855f7,#c084fc,#7c3aed,transparent)';

  return (
    <Dialog.Root open={isOpen} onOpenChange={open => !open && closePayment()}>
      <Dialog.Portal>
        <Dialog.Overlay style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.82)',
          backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
          zIndex: 10000, animation: 'upi-out 0s',
        }} />

        <Dialog.Content
          aria-describedby={undefined}
          onEscapeKeyDown={() => step !== 'processing' && closePayment()}
          onPointerDownOutside={() => step !== 'processing' && closePayment()}
          style={{
            position: 'fixed', top: '50%', left: '50%',
            transform: 'translate(-50%, -50%)',
            zIndex: 10001, width: 'min(440px, calc(100vw - 2rem))',
            background: '#0e0d12',
            border: `1px solid ${borderColor}`, borderRadius: 20,
            boxShadow: `0 0 0 1px ${borderColor}, 0 28px 80px rgba(0,0,0,.85), 0 0 70px ${glowColor}`,
            animation: 'upi-in 0.3s cubic-bezier(0.34,1.56,0.64,1) both',
            outline: 'none', overflow: 'hidden',
          }}
        >
          <div style={{
            height: 3, background: edgeGrad, backgroundSize: '200% 100%',
            animation: step === 'processing' ? 'upi-edge 1.2s linear infinite' : 'upi-edge 2.8s linear infinite',
          }} />

          <div style={{ padding: '22px 24px 26px' }}>
            {/* Header */}
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
              <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                <div style={{
                  width:40, height:40, borderRadius:12,
                  background:'rgba(124,58,237,0.15)', border:'1px solid rgba(124,58,237,0.3)',
                  display:'flex', alignItems:'center', justifyContent:'center',
                }}><Smartphone size={18} color="#a78bfa" /></div>
                <div>
                  <Dialog.Title style={{
                    fontFamily:"'Rajdhani','Inter',sans-serif",
                    fontWeight:700, fontSize:'1.05rem', color:'#fff', lineHeight:1.2,
                  }}>UPI Payment</Dialog.Title>
                  <div style={{ fontSize:'0.68rem', color:'rgba(255,255,255,0.35)', letterSpacing:'0.1em', marginTop:1 }}>SANDBOX \u00b7 TEST MODE</div>
                </div>
              </div>
              {step !== 'processing' && (
                <Dialog.Close asChild>
                  <button aria-label="Close" style={{
                    width:30, height:30, borderRadius:8,
                    background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.08)',
                    color:'rgba(255,255,255,0.35)',
                    display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer',
                  }}
                    onMouseEnter={e => { e.currentTarget.style.background='rgba(255,255,255,.12)'; e.currentTarget.style.color='#fff'; }}
                    onMouseLeave={e => { e.currentTarget.style.background='rgba(255,255,255,.05)'; e.currentTarget.style.color='rgba(255,255,255,.35)'; }}
                  ><X size={14} /></button>
                </Dialog.Close>
              )}
            </div>

            {/* Amount + slot card */}
            <div style={{
              padding:'14px 16px', borderRadius:12, marginBottom:20,
              background:'linear-gradient(135deg, rgba(124,58,237,0.12) 0%, rgba(168,85,247,0.06) 100%)',
              border:'1px solid rgba(124,58,237,0.2)',
            }}>
              <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:12 }}>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:'0.65rem', color:'rgba(255,255,255,0.4)', letterSpacing:'0.1em', marginBottom:4 }}>PAYING FOR</div>
                  <div style={{ fontSize:'0.92rem', color:'#e2d9f3', fontWeight:600 }}>{label}</div>
                  {/* Show selected slot */}
                  {slotLabel && (
                    <div style={{
                      marginTop:6, display:'inline-flex', alignItems:'center', gap:5,
                      fontSize:'0.75rem', color:'#c4b5fd',
                      background:'rgba(124,58,237,0.1)', border:'1px solid rgba(124,58,237,0.2)',
                      borderRadius:6, padding:'2px 8px',
                    }}>
                      \uD83D\uDD50 {slotLabel}
                    </div>
                  )}
                </div>
                <div style={{ textAlign:'right', flexShrink:0 }}>
                  <div style={{ fontSize:'0.65rem', color:'rgba(255,255,255,0.4)', letterSpacing:'0.1em', marginBottom:2 }}>AMOUNT</div>
                  <div style={{
                    fontFamily:"'Rajdhani','Inter',sans-serif",
                    fontSize:'1.6rem', fontWeight:800, color:'#a78bfa', lineHeight:1,
                  }}>\u20b9{amt.toLocaleString('en-IN')}</div>
                </div>
              </div>
            </div>

            {/* FORM */}
            {step === 'form' && (
              <div style={{ animation:'upi-slide 0.2s ease both' }}>
                <div style={{ marginBottom:14 }}>
                  <div style={{ fontSize:'0.62rem', color:'rgba(255,255,255,0.3)', letterSpacing:'0.1em', marginBottom:8 }}>QUICK TEST IDs</div>
                  <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                    {TEST_UPI_IDS.map(id => <BankChip key={id} id={id} active={upiId===id} onClick={setUpiId} />)}
                  </div>
                </div>
                <div style={{ marginBottom:16 }}>
                  <label style={{ display:'block', fontSize:'0.68rem', color:'rgba(255,255,255,0.4)', letterSpacing:'0.1em', marginBottom:8 }}>UPI ID</label>
                  <div style={{ position:'relative' }}>
                    <input
                      ref={inputRef} value={upiId}
                      onChange={e => setUpiId(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handlePay()}
                      placeholder="yourname@upi"
                      style={{
                        width:'100%', padding:'11px 14px', borderRadius:10, outline:'none',
                        background:'rgba(255,255,255,0.05)',
                        border:`1px solid ${shake ? 'rgba(239,68,68,0.6)' : 'rgba(255,255,255,0.12)'}`,
                        color:'#fff', fontSize:'0.95rem', boxSizing:'border-box',
                        animation: shake ? 'upi-shake 0.5s ease' : 'none',
                        transition:'border-color 0.2s',
                        fontFamily:"'Rajdhani','Inter',monospace",
                      }}
                    />
                    <div style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)' }}><UpiLogo /></div>
                  </div>
                  <div style={{ fontSize:'0.65rem', color:'rgba(255,255,255,0.25)', marginTop:6 }}>
                    Tip: Use <span style={{ color:'#a78bfa' }}>fail@upi</span> to simulate a payment failure.
                  </div>
                </div>
                <div style={{
                  display:'flex', alignItems:'center', gap:7,
                  padding:'9px 12px', borderRadius:9, marginBottom:18,
                  background:'rgba(245,158,11,0.07)', border:'1px solid rgba(245,158,11,0.2)',
                }}>
                  <Shield size={13} color="#fbbf24" style={{ flexShrink:0 }} />
                  <span style={{ fontSize:'0.72rem', color:'rgba(245,158,11,0.85)', lineHeight:1.4 }}>
                    <strong>Test mode</strong> \u2014 No real money moves. This simulates the UPI payment flow.
                  </span>
                </div>
                <button onClick={handlePay} style={{
                  width:'100%', padding:'13px', borderRadius:11, border:'none',
                  background:'linear-gradient(135deg, #7c3aed, #a855f7)',
                  color:'#fff', fontSize:'0.95rem', fontWeight:700,
                  cursor:'pointer', letterSpacing:'0.04em',
                  fontFamily:"'Rajdhani','Inter',sans-serif",
                  display:'flex', alignItems:'center', justifyContent:'center', gap:8,
                  boxShadow:'0 4px 20px rgba(124,58,237,0.35)',
                  transition:'opacity 0.15s, transform 0.15s',
                }}
                  onMouseEnter={e => { e.currentTarget.style.opacity='0.88'; e.currentTarget.style.transform='translateY(-1px)'; }}
                  onMouseLeave={e => { e.currentTarget.style.opacity='1'; e.currentTarget.style.transform='translateY(0)'; }}
                ><Zap size={16} /> PAY ₹{amt.toLocaleString('en-IN')}</button>
              </div>
            )}

            {/* PROCESSING */}
            {step === 'processing' && (
              <div style={{ textAlign:'center', padding:'20px 0', animation:'upi-slide 0.2s ease both' }}>
                <div style={{
                  width:64, height:64, borderRadius:'50%', margin:'0 auto 18px',
                  background:'rgba(124,58,237,0.12)', border:'2px solid rgba(124,58,237,0.3)',
                  display:'flex', alignItems:'center', justifyContent:'center',
                  animation:'upi-pulse 1.4s ease-in-out infinite',
                }}><Loader2 size={28} color="#a78bfa" style={{ animation:'upi-spin 0.8s linear infinite' }} /></div>
                <div style={{ fontFamily:"'Rajdhani','Inter',sans-serif", fontSize:'1.1rem', fontWeight:700, color:'#fff', marginBottom:6 }}>Processing Payment</div>
                <div style={{ fontSize:'0.8rem', color:'rgba(255,255,255,0.4)' }}>Contacting {upiId} \u00b7 Please wait\u2026</div>
                <div style={{ marginTop:20, height:3, borderRadius:99, background:'rgba(255,255,255,0.07)', overflow:'hidden' }}>
                  <div style={{ height:'100%', background:'linear-gradient(90deg, #7c3aed, #a855f7)', borderRadius:99, animation:'upi-bar 2s ease-in-out forwards' }} />
                </div>
              </div>
            )}

            {/* SUCCESS */}
            {step === 'success' && receipt && (
              <div style={{ animation:'upi-slide 0.25s ease both' }}>
                <div style={{ textAlign:'center', marginBottom:20 }}>
                  <div style={{
                    width:64, height:64, borderRadius:'50%', margin:'0 auto 14px',
                    background:'rgba(34,197,94,0.12)', border:'2px solid rgba(34,197,94,0.35)',
                    display:'flex', alignItems:'center', justifyContent:'center',
                    animation:'upi-pop 0.5s cubic-bezier(0.34,1.56,0.64,1) both',
                  }}><CheckCircle2 size={30} color="#22c55e" /></div>
                  <div style={{ fontFamily:"'Rajdhani','Inter',sans-serif", fontSize:'1.2rem', fontWeight:800, color:'#4ade80', marginBottom:4 }}>Payment Successful!</div>
                  <div style={{ fontSize:'0.8rem', color:'rgba(255,255,255,0.4)' }}>Your booking is confirmed</div>
                </div>
                <div style={{ background:'rgba(34,197,94,0.06)', border:'1px solid rgba(34,197,94,0.18)', borderRadius:12, padding:'14px 16px', marginBottom:18 }}>
                  {[
                    ['Station',        label],
                    slotLabel ? ['Slot', slotLabel] : null,
                    ['Transaction ID', receipt.txnId],
                    ['UPI ID',         receipt.upiId],
                    ['Bank',           receipt.bank],
                    ['Amount',         `\u20b9${receipt.amount.toLocaleString('en-IN')}`],
                    ['Status',         'SUCCESS \u2713'],
                    ['Time',           new Date(receipt.timestamp).toLocaleTimeString('en-IN', { timeZone:'Asia/Kolkata' })],
                  ].filter(Boolean).map(([k, v]) => (
                    <div key={k} style={{
                      display:'flex', justifyContent:'space-between', alignItems:'center',
                      padding:'5px 0', borderBottom:'1px solid rgba(255,255,255,0.05)',
                    }}>
                      <span style={{ fontSize:'0.72rem', color:'rgba(255,255,255,0.4)', letterSpacing:'0.05em' }}>{k}</span>
                      <span style={{ fontSize:'0.8rem', color: k==='Status' ? '#4ade80' : '#e2e8f0', fontWeight:600, fontFamily: k==='Transaction ID' ? 'monospace' : 'inherit' }}>{v}</span>
                    </div>
                  ))}
                </div>
                <div style={{ display:'flex', gap:8 }}>
                  <button onClick={copyTxnId} style={{
                    flex:1, padding:'10px', borderRadius:10,
                    background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)',
                    color:'rgba(255,255,255,0.6)', fontSize:'0.8rem',
                    cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:6,
                  }}>{copied ? <><Check size={13} /> Copied!</> : <><Copy size={13} /> Copy TXN ID</>}</button>
                  <button onClick={closePayment} style={{
                    flex:1, padding:'10px', borderRadius:10,
                    background:'rgba(34,197,94,0.15)', border:'1px solid rgba(34,197,94,0.3)',
                    color:'#4ade80', fontSize:'0.8rem', fontWeight:700, cursor:'pointer',
                  }}>Done</button>
                </div>
              </div>
            )}

            {/* FAILED */}
            {step === 'failed' && (
              <div style={{ animation:'upi-slide 0.25s ease both' }}>
                <div style={{ textAlign:'center', marginBottom:20 }}>
                  <div style={{
                    width:64, height:64, borderRadius:'50%', margin:'0 auto 14px',
                    background:'rgba(239,68,68,0.12)', border:'2px solid rgba(239,68,68,0.35)',
                    display:'flex', alignItems:'center', justifyContent:'center',
                    animation:'upi-pop 0.4s cubic-bezier(0.34,1.56,0.64,1) both',
                  }}><XCircle size={30} color="#ef4444" /></div>
                  <div style={{ fontFamily:"'Rajdhani','Inter',sans-serif", fontSize:'1.1rem', fontWeight:800, color:'#f87171', marginBottom:6 }}>Payment Failed</div>
                  <div style={{ fontSize:'0.8rem', color:'rgba(255,255,255,0.45)', maxWidth:300, margin:'0 auto' }}>{error}</div>
                </div>
                <div style={{ display:'flex', gap:8 }}>
                  <button onClick={retry} style={{
                    flex:1, padding:'11px', borderRadius:10,
                    background:'linear-gradient(135deg, #7c3aed, #a855f7)',
                    border:'none', color:'#fff', fontSize:'0.88rem', fontWeight:700,
                    cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:6,
                  }}><RefreshCw size={14} /> Try Again</button>
                  <button onClick={closePayment} style={{
                    flex:1, padding:'11px', borderRadius:10,
                    background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)',
                    color:'rgba(255,255,255,0.5)', fontSize:'0.88rem', cursor:'pointer',
                  }}>Cancel</button>
                </div>
              </div>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
