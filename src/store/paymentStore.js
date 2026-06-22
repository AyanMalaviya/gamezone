import { create } from 'zustand';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { gasAddBooking, gasAddBookedSlot } from '../lib/gasClient';
import useAuthStore from './authStore';

/* ─── Test UPI IDs ─── */
export const TEST_UPI_IDS = [
  'success@upi',
  'test@paytm',
  'demo@gpay',
  'sandbox@phonepe',
];

/* ─── Simulate UPI payment ─── */
async function simulateUpiPayment({ upiId, amount, orderId }) {
  if (!upiId || !upiId.includes('@')) throw new Error('Invalid UPI ID format. Must contain @');
  await new Promise(r => setTimeout(r, 800 + Math.random() * 1400));
  const forceFail  = upiId.toLowerCase().includes('fail');
  const randomFail = Math.random() < 0.1;
  if (forceFail || randomFail) throw new Error('Payment declined by bank. Please try again or use a different UPI ID.');
  return {
    txnId:     'GZ' + Date.now() + Math.floor(Math.random() * 1000),
    orderId,
    upiId,
    amount,
    status:    'SUCCESS',
    timestamp: new Date().toISOString(),
    bank:      upiId.split('@')[1].toUpperCase(),
  };
}

/* ─── Persist booking to Firestore ─── */
async function saveBookingToFirestore(uid, context, receipt) {
  if (!uid) return null;
  try {
    const meta = context.meta ?? {};
    const ref = await addDoc(collection(db, 'bookings'), {
      uid,
      stationId:        meta.stationId   ?? null,
      stationName:      meta.stationName ?? context.label ?? '',
      stationType:      meta.stationType ?? 'ps5',
      slot:             meta.slot        ?? '',
      hours:            meta.hours       ?? 1,
      game:             meta.game        ?? '',
      amount:           receipt.amount,
      txnId:            receipt.txnId,
      upiId:            receipt.upiId,
      bank:             receipt.bank,
      status:           'confirmed',
      bookedAt:         serverTimestamp(),
      receiptTimestamp: receipt.timestamp,
    });
    return ref;
  } catch (err) {
    console.warn('[paymentStore] Firestore booking save failed:', err.message);
    return null;
  }
}

/**
 * parseSlotToIST — parse "HH:MM-HH:MM" into { startMin, endMin } in IST minutes-since-midnight.
 * Returns null if the slot string is malformed.
 */
function parseSlotMinutes(slot) {
  if (!slot) return null;
  const m = String(slot).match(/^(\d{1,2}):(\d{2})-(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  return {
    startMin: parseInt(m[1], 10) * 60 + parseInt(m[2], 10),
    endMin:   parseInt(m[3], 10) * 60 + parseInt(m[4], 10),
  };
}

/**
 * nowIST — current time in IST as minutes-since-midnight.
 */
function nowIST() {
  const ist = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
  return ist.getHours() * 60 + ist.getMinutes();
}

const usePaymentStore = create((set, get) => ({
  isOpen:  false,
  context: null,
  step:    'form',
  receipt: null,
  error:   null,
  history: [],

  // refetchStations is injected by StationLayout so paymentStore can
  // trigger an immediate re-poll after a successful booking.
  _refetch: null,
  setRefetch: (fn) => set({ _refetch: fn }),

  openPayment:  (context) => set({ isOpen: true, context, step: 'form', receipt: null, error: null }),
  closePayment: ()        => set({ isOpen: false, context: null, step: 'form', receipt: null, error: null }),

  pay: async ({ upiId }) => {
    const { context, _refetch } = get();
    if (!context) return;

    const uid     = useAuthStore.getState().user?.uid ?? context.meta?.uid ?? null;
    const orderId = 'ORD-' + Date.now();

    set({ step: 'processing', error: null });

    try {
      const receipt = await simulateUpiPayment({ upiId, amount: context.amount, orderId });

      // 1. Save to Firestore — source of truth, always first
      await saveBookingToFirestore(uid, context, receipt);

      const slot      = context.meta?.slot ?? '';
      const stationId = context.meta?.stationId ?? '';

      // 2. Add booked slot to Stations sheet (fire-and-forget)
      gasAddBookedSlot({
        stationId,
        stationName: context.meta?.stationName ?? context.label ?? '',
        slot,
      });

      // 3. Append booking row to Bookings sheet (fire-and-forget)
      gasAddBooking({
        txnId:       receipt.txnId,
        uid:         uid ?? '',
        stationName: context.meta?.stationName ?? context.label ?? '',
        slot,
        hours:       context.meta?.hours ?? 1,
        amount:      receipt.amount,
        upiId:       receipt.upiId,
        bank:        receipt.bank,
        status:      'SUCCESS',
      });

      // 4. Force-refetch stations so the booked slot appears immediately
      //    without waiting for the 30s poll cycle.
      if (typeof _refetch === 'function') {
        // Small delay to let GAS Web App process the slot write first
        setTimeout(() => _refetch(), 1500);
      }

      // 5. If the booked slot is active RIGHT NOW, also kick the slot scheduler
      //    immediately so status flips to occupied without waiting 60s.
      const parsed = parseSlotMinutes(slot);
      const now    = nowIST();
      if (parsed && now >= parsed.startMin && now < parsed.endMin) {
        // Dispatch a custom event that useSlotScheduler listens to,
        // triggering an immediate tick instead of waiting for the 60s interval.
        window.dispatchEvent(new CustomEvent('gz:slot-booked-active'));
      }

      set(s => ({ step: 'success', receipt, history: [receipt, ...s.history] }));
    } catch (err) {
      set({ step: 'failed', error: err.message });
    }
  },

  retry: () => set({ step: 'form', error: null, receipt: null }),
}));

export default usePaymentStore;
