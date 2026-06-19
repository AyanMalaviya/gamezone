import { create } from 'zustand';

/* ─── Test UPI IDs that always succeed in sandbox ─── */
export const TEST_UPI_IDS = [
  'success@upi',
  'test@paytm',
  'demo@gpay',
  'sandbox@phonepe',
];

/* ─── Simulate UPI payment (no real money moves) ─── */
async function simulateUpiPayment({ upiId, amount, orderId }) {
  // Validate UPI ID format
  if (!upiId || !upiId.includes('@')) {
    throw new Error('Invalid UPI ID format. Must contain @');
  }

  // Simulate network delay (800ms – 2.2s)
  await new Promise(r => setTimeout(r, 800 + Math.random() * 1400));

  // Simulate ~10% random failure for realism
  const forceFail = upiId.toLowerCase().includes('fail');
  const randomFail = Math.random() < 0.1;

  if (forceFail || randomFail) {
    throw new Error('Payment declined by bank. Please try again or use a different UPI ID.');
  }

  // Return a mock transaction receipt
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

const usePaymentStore = create((set, get) => ({
  // Modal visibility
  isOpen: false,
  // Payment context passed by caller
  context: null,  // { type: 'booking' | 'membership', label, amount, meta }
  // Flow state
  step: 'form',   // 'form' | 'processing' | 'success' | 'failed'
  receipt: null,
  error: null,
  // Transaction history (in-memory for test session)
  history: [],

  openPayment: (context) => set({
    isOpen: true,
    context,
    step: 'form',
    receipt: null,
    error: null,
  }),

  closePayment: () => set({
    isOpen: false,
    context: null,
    step: 'form',
    receipt: null,
    error: null,
  }),

  pay: async ({ upiId }) => {
    const { context } = get();
    if (!context) return;

    const orderId = 'ORD-' + Date.now();
    set({ step: 'processing', error: null });

    try {
      const receipt = await simulateUpiPayment({
        upiId,
        amount: context.amount,
        orderId,
      });
      set(s => ({
        step: 'success',
        receipt,
        history: [receipt, ...s.history],
      }));
    } catch (err) {
      set({ step: 'failed', error: err.message });
    }
  },

  retry: () => set({ step: 'form', error: null, receipt: null }),
}));

export default usePaymentStore;
