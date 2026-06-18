/**
 * usePhoneGate
 * Returns { gated, PhoneGateModal } where:
 *  - gated(fn) — calls fn() if user has a phone, otherwise opens the modal first.
 *    Once the user saves their phone, fn() is called automatically.
 *  - PhoneGateModal — JSX element to render anywhere in the tree.
 *
 * Usage:
 *   const { gated, PhoneGateModal } = usePhoneGate();
 *   <button onClick={() => gated(() => openBookingModal())}>Book</button>
 *   {PhoneGateModal}
 */
import { useState, useCallback } from 'react';
import useAuthStore from '../store/authStore';
import CompleteProfileModal from '../components/CompleteProfileModal';

export function usePhoneGate() {
  const phone    = useAuthStore(s => s.phone);
  const setPhone = useAuthStore(s => s.setPhone);
  const [open, setOpen]         = useState(false);
  const [pending, setPending]   = useState(null);

  const gated = useCallback((fn) => {
    if (phone) {
      fn();
    } else {
      setPending(() => fn);
      setOpen(true);
    }
  }, [phone]);

  const handleSaved = useCallback((savedPhone) => {
    if (savedPhone) setPhone(savedPhone);
    setOpen(false);
    // Run the originally-intended action now that phone is set
    if (pending) {
      pending();
      setPending(null);
    }
  }, [pending, setPhone]);

  const PhoneGateModal = (
    <CompleteProfileModal
      open={open}
      onClose={() => { setOpen(false); setPending(null); }}
      onSaved={handleSaved}
      mode="gate"
    />
  );

  return { gated, PhoneGateModal };
}
