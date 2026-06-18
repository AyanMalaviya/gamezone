import { useState } from "react";
import { savePhoneNumber } from "../hooks/useUserProfile";

export default function PhoneModal({ uid, onClose, onSuccess }) {
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const cleaned = phone.replace(/\s|-/g, "");
    // Accepts +91XXXXXXXXXX or 10-digit Indian mobile
    const normalized = cleaned.startsWith("+91") ? cleaned : `+91${cleaned}`;
    if (!/^\+91[6-9]\d{9}$/.test(normalized)) {
      setError("Enter a valid 10-digit Indian mobile number");
      return;
    }
    setLoading(true);
    try {
      await savePhoneNumber(uid, normalized);
      onSuccess(normalized);
      onClose();
    } catch (err) {
      setError("Failed to save. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-sm">
        <h2 className="text-xl font-bold text-gray-800 mb-1">📱 Phone Number Required</h2>
        <p className="text-sm text-gray-500 mb-6">
          We need your phone number to confirm bookings.
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Mobile Number
            </label>
            <input
              type="tel"
              placeholder="98765 43210"
              value={phone}
              onChange={(e) => {
                setPhone(e.target.value);
                setError("");
              }}
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
            {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-lg text-sm transition disabled:opacity-60"
          >
            {loading ? "Saving..." : "Save & Continue"}
          </button>
        </form>
        <button
          onClick={onClose}
          className="mt-4 w-full text-sm text-gray-400 hover:text-gray-600 transition"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
