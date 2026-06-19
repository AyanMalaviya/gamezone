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
  const forceFail = upiId.toLowerCase().includes('fail');
  const randomFail = Math.random() < 0.1;
  if (forceFail || randomFail) throw new Error('Payment declined by bank. Please try again or use a different UPI ID.');
  return {
    txnId: 'GZ' + Date.now() + Math.floor(Math.random() * 1000),
    orderId,
    upiId,
    amount,
    status: 'SUCCESS',
    timestamp: new Date().toISOString(),
    bank: upiId.split('@')[1].toUpperCase(),
  };
}

/* ─── Persist booking to Firestore ─── */
async function saveBookingToFirestore(uid, context, receipt) {
  if (!uid) return; // not logged in — skip silently
  try {
    await addDoc(collection(db, 'bookings'), {
      uid,
      stationId:   context.meta?.stationId   ?? null,
      stationName: context.meta?.stationName ?? context.label ?? '',
      slot:        context.meta?.slot        ?? '',
      game:        context.meta?.game        ?? '',
      amount:      receipt.amount,
      txnId:       receipt.txnId,
      upiId:       receipt.upiId,
      bank:        receipt.bank,
      status:      'confirmed',
      bookedAt:    serverTimestamp(),
      receiptTimestamp: receipt.timestamp,
    });
  } catch (err) {
    console.warn('[paymentStore] Firestore booking save failed:', err.message);
  }
}

/* ─── Update Google Sheets after payment ─── */
async function updateSheetsAfterPayment(context, oauthToken) {
  if (!oauthToken || !context.meta?.stationIndex == null) return;
  try {
    const { stationIndex, stationId, slot, currentGame, preferredGame, bookedSlots = [] } = context.meta ?? {};
    if (stationIndex == null) return;
    const updatedSlots = slot ? [...new Set([...bookedSlots, slot])] : bookedSlots;
    await updateStation(stationIndex, {
      id:            stationId,
      status:        'occupied',
      currentGame:   currentGame   ?? '',
      bookedSlots:   updatedSlots,
      preferredGame: preferredGame ?? '',
      stationType:   context.meta?.stationType ?? '',
    }, oauthToken);
  } catch (err) {
    console.warn('[paymentStore] Sheets update after payment failed:', err.message);
  }
}

const usePaymentStore = create((set, get) => ({
  isOpen:   false,
  context:  null,  // { type, label, amount, meta: { uid, stationId, stationIndex, slot, ... }, oauthToken }
  step:     'form',
  receipt:  null,
  error:    null,
  history:  [],

  openPayment: (context) => set({ isOpen: true, context, step: 'form', receipt: null, error: null }),

  closePayment: () => set({ isOpen: false, context: null, step: 'form', receipt: null, error: null }),

  pay: async ({ upiId }) => {
    const { context } = get();
    if (!context) return;

    const orderId = 'ORD-' + Date.now();
    set({ step: 'processing', error: null });

    try {
      const receipt = await simulateUpiPayment({ upiId, amount: context.amount, orderId });

      // 1. Save booking to Firestore (non-blocking)
      saveBookingToFirestore(context.meta?.uid ?? null, context, receipt);

      // 2. Update Google Sheets station row (non-blocking)
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
