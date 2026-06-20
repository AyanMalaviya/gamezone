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
  if (!uid) return;
  try {
    const meta = context.meta ?? {};
    await addDoc(collection(db, 'bookings'), {
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
  } catch (err) {
    console.warn('[paymentStore] Firestore booking save failed:', err.message);
  }
}

const usePaymentStore = create((set, get) => ({
  isOpen:  false,
  context: null,
  step:    'form',
  receipt: null,
  error:   null,
  history: [],

  openPayment:  (context) => set({ isOpen: true, context, step: 'form', receipt: null, error: null }),
  closePayment: ()        => set({ isOpen: false, context: null, step: 'form', receipt: null, error: null }),

  pay: async ({ upiId }) => {
    const { context } = get();
    if (!context) return;

    const uid     = useAuthStore.getState().user?.uid ?? context.meta?.uid ?? null;
    const orderId = 'ORD-' + Date.now();

    set({ step: 'processing', error: null });

    try {
      const receipt = await simulateUpiPayment({ upiId, amount: context.amount, orderId });

      // 1. Save to Firestore — source of truth, always first
      saveBookingToFirestore(uid, context, receipt);

      // 2. Add booked slot to Stations sheet (fire-and-forget via GAS Web App)
      //    Uses stationId (col A lookup) — NOT stationIndex offset
      //    Status stays available — Apps Script promotes to occupied at start time
      gasAddBookedSlot({
        stationId:   context.meta?.stationId   ?? '',   // ✔ col A lookup in GAS
        stationName: context.meta?.stationName ?? context.label ?? '',
        slot:        context.meta?.slot        ?? '',
      });

      // 3. Append row to Bookings sheet (fire-and-forget via GAS Web App)
      gasAddBooking({
        txnId:       receipt.txnId,
        uid:         uid ?? '',
        stationName: context.meta?.stationName ?? context.label ?? '',
        slot:        context.meta?.slot        ?? '',
        hours:       context.meta?.hours       ?? 1,
        amount:      receipt.amount,
        upiId:       receipt.upiId,
        bank:        receipt.bank,
        status:      'SUCCESS',
      });

      set(s => ({ step: 'success', receipt, history: [receipt, ...s.history] }));
    } catch (err) {
      set({ step: 'failed', error: err.message });
    }
  },

  retry: () => set({ step: 'form', error: null, receipt: null }),
}));

export default usePaymentStore;
