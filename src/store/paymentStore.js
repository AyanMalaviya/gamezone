import { create } from 'zustand';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { updateStation, appendBookingToSheet } from '../lib/sheets';
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

/* ─── Update station row in Sheets after payment ───
 * Reads oauthToken directly from Zustand — no longer relies on context.meta.oauthToken.
 */
async function updateSheetsAfterPayment(context, oauthToken) {
  if (!oauthToken) {
    if (import.meta.env.DEV) console.warn('[paymentStore] updateSheetsAfterPayment: no OAuth token, skipping.');
    return;
  }
  const meta = context.meta ?? {};
  const { stationIndex } = meta;
  if (stationIndex == null) return;

  try {
    const existingSlots = Array.isArray(meta.bookedSlots) ? meta.bookedSlots : [];
    const updatedSlots  = meta.slot
      ? [...new Set([...existingSlots, meta.slot])]
      : existingSlots;

    await updateStation(stationIndex, {
      id:            meta.stationId     ?? '',
      stationName:   meta.stationName   ?? '',
      stationType:   meta.stationType   ?? 'ps5',
      status:        'occupied',
      activeSlot:    meta.slot          ?? null,
      bookedSlots:   updatedSlots,
      currentGame:   meta.game          ?? '',
      preferredGame: meta.preferredGame ?? '',
    }, oauthToken);
  } catch (err) {
    console.warn('[paymentStore] Sheets station update failed:', err.message);
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

    // ✔ Read oauthToken from Zustand store — works for both Google and email users
    const oauthToken = useAuthStore.getState().oauthToken;
    const uid        = useAuthStore.getState().user?.uid ?? context.meta?.uid ?? null;

    const orderId = 'ORD-' + Date.now();
    set({ step: 'processing', error: null });

    try {
      const receipt = await simulateUpiPayment({ upiId, amount: context.amount, orderId });

      // 1. Save booking to Firestore (non-blocking)
      saveBookingToFirestore(uid, context, receipt);

      // 2. Update station row in Google Sheets (non-blocking)
      updateSheetsAfterPayment(context, oauthToken);

      // 3. Append booking log row to Sheets Bookings tab (non-blocking)
      appendBookingToSheet({
        txnId:       receipt.txnId,
        uid:         uid ?? '',
        stationName: context.meta?.stationName ?? context.label ?? '',
        slot:        context.meta?.slot        ?? '',
        hours:       context.meta?.hours       ?? 1,
        amount:      receipt.amount,
        upiId:       receipt.upiId,
        bank:        receipt.bank,
        status:      'SUCCESS',
      }, oauthToken);

      set(s => ({ step: 'success', receipt, history: [receipt, ...s.history] }));
    } catch (err) {
      set({ step: 'failed', error: err.message });
    }
  },

  retry: () => set({ step: 'form', error: null, receipt: null }),
}));

export default usePaymentStore;
