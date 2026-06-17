import * as Dialog from '@radix-ui/react-dialog';
import { X, Clock, Gamepad2, Steering, CheckCircle2, XCircle } from 'lucide-react';

const SlotItem = ({ slot }) => (
  <li className="flex items-center gap-3 rounded-lg border border-white/5 bg-white/[0.03] px-4 py-2.5">
    <Clock size={14} className="shrink-0 text-violet-400" />
    <span className="text-sm font-medium text-white/80">{slot}</span>
  </li>
);

const StationModal = ({ station, open, onClose }) => {
  if (!station) return null;

  const { id, status, bookedSlots = [], preferredGame, stationType } = station;
  const isAvailable = status?.toLowerCase() === 'available';
  const isRacing = stationType === 'Racing Simulator';

  const slots = Array.isArray(bookedSlots)
    ? bookedSlots
    : typeof bookedSlots === 'string' && bookedSlots
    ? bookedSlots.split(',').map((s) => s.trim()).filter(Boolean)
    : [];

  return (
    <Dialog.Root open={open} onOpenChange={(o) => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />

        <Dialog.Content
          className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2
            overflow-hidden rounded-2xl border border-white/8 bg-[#131318]
            shadow-[0_32px_80px_rgba(0,0,0,0.7)]
            data-[state=open]:animate-in data-[state=closed]:animate-out
            data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0
            data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95
            data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%]
            data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]"
        >
          {/* Coloured top strip */}
          <div className={`h-1 w-full ${
            isRacing ? 'bg-amber-500' : isAvailable ? 'bg-green-500' : 'bg-red-500'
          }`} />

          <div className="max-h-[80dvh] overflow-y-auto p-6">
            {/* Header */}
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-white/30">
                  {isRacing ? 'Racing Simulator' : 'PS5 Station'}
                </p>
                <Dialog.Title className="text-3xl font-black leading-none tracking-tight text-white">
                  Station {String(id).padStart(2, '0')}
                </Dialog.Title>
              </div>
              <Dialog.Close asChild>
                <button
                  aria-label="Close"
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/8 text-white/40 transition-colors hover:border-white/15 hover:text-white"
                >
                  <X size={16} />
                </button>
              </Dialog.Close>
            </div>

            {/* Status banner */}
            <div className={`mb-6 flex items-center gap-3 rounded-xl px-4 py-3 ${
              isAvailable
                ? 'border border-green-500/20 bg-green-500/8'
                : 'border border-red-500/20 bg-red-500/8'
            }`}>
              {isAvailable
                ? <CheckCircle2 size={18} className="text-green-400" />
                : <XCircle size={18} className="text-red-400" />}
              <span className={`text-sm font-semibold ${
                isAvailable ? 'text-green-400' : 'text-red-400'
              }`}>
                {isAvailable ? 'Available — Ready to play' : 'Currently Occupied'}
              </span>
            </div>

            <div className="space-y-5">
              {/* Preferred game */}
              {preferredGame && (
                <div>
                  <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-white/30">
                    {isRacing ? <Steering size={12} /> : <Gamepad2 size={12} />}
                    Preferred Game
                  </p>
                  <div className="flex items-center gap-3 rounded-xl border border-white/5 bg-white/[0.03] px-4 py-3">
                    <span className="text-sm font-semibold text-white">{preferredGame}</span>
                  </div>
                </div>
              )}

              {/* Booked slots */}
              <div>
                <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-white/30">
                  <Clock size={12} />
                  Booked Slots
                </p>
                {slots.length > 0 ? (
                  <ul className="space-y-2">
                    {slots.map((slot, idx) => (
                      <SlotItem key={idx} slot={slot} />
                    ))}
                  </ul>
                ) : (
                  <div className="rounded-xl border border-white/5 bg-white/[0.02] px-4 py-3 text-sm italic text-white/25">
                    No slots booked yet
                  </div>
                )}
              </div>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};

export default StationModal;
