import { create } from 'zustand';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { updateStation } from '../lib/sheets';

/* ─── Test UPI IDs that always succeed in sandbox ─── */
export const TEST_UPI_IDS = [
  'success@upi',
  'test@paytm',
  'demo@gpay',
  'sandbox@phonepe',
];

/* ─── Simulate UPI payment (no real money moves) ─── */
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
  if (!uid) return; // not logged in — skip silently
  try {
    const meta = context.meta ?? {};
    await addDoc(collection(db, 'bookings'), {
      uid,
      stationId:        meta.stationId   ?? null,
      stationName:      meta.stationName ?? context.label ?? '',
      stationType:      meta.stationType ?? 'ps5',
      slot:             meta.slot        ?? '',
      game:             meta.game        ?? '',
      amount:           receipt.amount,
      txnId:            receipt.txnId,
      upiId:            receipt.upiId,
      bank:             receipt.bank,
      status:           'confirmed',
      bookedAt:         serverTimestamp(),
      receiptTimestamp: receipt.timestamp,
    });
  } catch (err) {
    console.warn('[paymentStore] Firestore booking save failed:', err.message);
  }
}

/* ─── Update Google Sheets after payment ───
 *
 * Writes the full 8-column row back to Sheets:
 *   A  id            B  stationName   C  stationType
 *   D  status        E  activeSlot    F  bookedSlots
 *   G  currentGame   H  preferredGame
 */
async function updateSheetsAfterPayment(context, oauthToken) {
  if (!oauthToken) return;
  const meta = context.meta ?? {};
  const { stationIndex } = meta;
  if (stationIndex == null) return;

  try {
    // Add the newly booked slot to the existing bookedSlots list
    const existingSlots = Array.isArray(meta.bookedSlots) ? meta.bookedSlots : [];
    const updatedSlots  = meta.slot
      ? [...new Set([...existingSlots, meta.slot])]
      : existingSlots;

    await updateStation(stationIndex, {
      id:            meta.stationId    ?? '',
      stationName:   meta.stationName  ?? '',
      stationType:   meta.stationType  ?? 'ps5',
      status:        'occupied',
      activeSlot:    meta.slot         ?? null,
      bookedSlots:   updatedSlots,
      currentGame:   meta.game         ?? '',
      preferredGame: meta.preferredGame ?? '',
    }, oauthToken);
  } catch (err) {
    console.warn('[paymentStore] Sheets update after payment failed:', err.message);
  }
}

const usePaymentStore = create((set, get) => ({
  isOpen:  false,
  context: null,   // { type, label, amount, meta: { uid, stationId, stationIndex, stationName, stationType, slot, game, bookedSlots, preferredGame, oauthToken } }
  step:    'form',
  receipt: null,
  error:   null,
  history: [],

  openPayment:  (context) => set({ isOpen: true, context, step: 'form', receipt: null, error: null }),
  closePayment: ()        => set({ isOpen: false, context: null, step: 'form', receipt: null, error: null }),

  pay: async ({ upiId }) => {
    const { context } = get();
    if (!context) return;

    const orderId = 'ORD-' + Date.now();
    set({ step: 'processing', error: null });

    try {
      const receipt = await simulateUpiPayment({ upiId, amount: context.amount, orderId });

      // 1. Save booking to Firestore (non-blocking)
      saveBookingToFirestore(context.meta?.uid ?? null, context, receipt);

      // 2. Update Google Sheets (non-blocking)
      if (context.meta?.oauthToken) {
        updateSheetsAfterPayment(context, context.meta.oauthToken);
      }

      set(s => ({ step: 'success', receipt, history: [receipt, ...s.history] }));
    } catch (err) {
      set({ step: 'failed', error: err.message });
    }
  },

  retry: () => set({ step: 'form', error: null, receipt: null }),
}));

export default usePaymentStore;
