/**
 * usePhoneGate
 *
 * Returns a `requirePhone(callback)` wrapper.
 * - If the logged-in user already has a phone in the store → runs callback immediately.
 * - If phone is missing → opens the CompleteProfileModal by setting `phoneGateOpen: true`
 *   in the store, and queues the callback to run after the user saves their number.
 *
 * Usage (future Book button):
 *   const { requirePhone, PhoneGateModal } = usePhoneGate();
 *   <button onClick={() => requirePhone(() => openBookingFlow(station))}>Book</button>
 *   <PhoneGateModal />
 */
import { useState } from 'react';
import useAuthStore from '../store/authStore';
import CompleteProfileModal from '../components/CompleteProfileModal';

export default function usePhoneGate() {
  const phone = useAuthStore(s => s.phone);
  const [open, setOpen]       = useState(false);
  const [pending, setPending] = useState(null);

  const requirePhone = (callback) => {
    if (phone) {
      callback();
    } else {
      setPending(() => callback);
      setOpen(true);
    }
  };

  const handleSaved = () => {
    setOpen(false);
    if (pending) { pending(); setPending(null); }
  };

  const PhoneGateModal = () => (
    <CompleteProfileModal
      open={open}
      onClose={() => setOpen(false)}
      onSaved={handleSaved}
    />
  );

  return { requirePhone, PhoneGateModal };
}
