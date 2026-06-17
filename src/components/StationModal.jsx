import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';

const StationModal = ({ station, open, onClose }) => {
  if (!station) return null;

  const { id, status, bookedSlots = [], preferredGame } = station;
  const isAvailable = status.toLowerCase() === 'available';

  return (
    <Dialog.Root open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content className="fixed left-[50%] top-[50%] z-50 max-h-[85vh] w-full max-w-md translate-x-[-50%] translate-y-[-50%] overflow-y-auto rounded-xl border border-slate-800 bg-slate-950 p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]">
          <div className="mb-6 flex items-center justify-between">
            <Dialog.Title className="text-2xl font-bold text-white">
              Station {id}
            </Dialog.Title>
            <Dialog.Close asChild>
              <button
                aria-label="Close"
                className="inline-flex h-8 w-8 items-center justify-center rounded-full text-slate-400 hover:bg-slate-800 hover:text-white focus:outline-none"
              >
                <X className="h-5 w-5" />
              </button>
            </Dialog.Close>
          </div>

          <div className="space-y-6">
            {isAvailable ? (
              <div className="rounded-lg border border-green-500/20 bg-green-500/10 p-4">
                <p className="text-center font-medium text-green-400">Available</p>
              </div>
            ) : (
              <div className="mb-4 rounded-lg border border-red-500/20 bg-red-500/10 p-4">
                <p className="text-center font-medium text-red-400">Occupied</p>
              </div>
            )}

            {preferredGame && (
              <div>
                <h3 className="mb-2 text-sm font-medium text-slate-400">Preferred Game</h3>
                <p className="rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-white">
                  {preferredGame}
                </p>
              </div>
            )}

            <div>
              <h3 className="mb-2 text-sm font-medium text-slate-400">Booked Slots</h3>
              {bookedSlots.length > 0 ? (
                <ul className="space-y-2">
                  {bookedSlots.map((slot, idx) => (
                    <li
                      key={idx}
                      className="rounded-lg border border-slate-800 bg-slate-900 px-4 py-3 text-sm text-slate-300"
                    >
                      {slot}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm italic text-slate-500">No booked slots.</p>
              )}
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};

export default StationModal;
