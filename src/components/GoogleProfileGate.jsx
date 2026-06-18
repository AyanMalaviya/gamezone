/**
 * GoogleProfileGate
 * Mounts at app root. After a Google sign-in redirect lands and the user
 * has no phone number stored, this automatically opens CompleteProfileModal.
 */
import { useEffect, useState } from 'react';
import useAuthStore from '../store/authStore';
import CompleteProfileModal from './CompleteProfileModal';

export default function GoogleProfileGate() {
  const user  = useAuthStore(s => s.user);
  const phone = useAuthStore(s => s.phone);
  const loading = useAuthStore(s => s.loading);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    // Only prompt Google users (no password provider) who are missing a phone
    if (loading || !user || phone) { setOpen(false); return; }
    const isGoogleUser = user.providerData?.some(p => p.providerId === 'google.com');
    if (isGoogleUser) setOpen(true);
  }, [user, phone, loading]);

  return (
    <CompleteProfileModal
      open={open}
      onClose={() => setOpen(false)}
      onSaved={() => setOpen(false)}
    />
  );
}
