import { useState, useEffect } from 'react';
import { LogOut, Save, Loader2, ShieldCheck, AlertTriangle } from 'lucide-react';
import useAuthStore from '../store/authStore';
import useStationData from '../hooks/useStationData';
import { updateStation } from '../lib/sheets';
import { auth, googleProvider, signInWithPopup, signOut } from '../lib/firebase';
import Navbar from '../components/Navbar';
import PageLayout, { PageBody } from '../components/PageLayout';

// ── Google logo SVG ──────────────────────────────────────────────────────────
const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
  </svg>
);

// ── Login page ───────────────────────────────────────────────────────────────
const LoginPage = ({ onLogin }) => (
  <PageLayout>
    <Navbar />
    <PageBody>
      <div className="flex min-h-[70dvh] flex-col items-center justify-center">
        <div className="w-full max-w-sm rounded-2xl border border-white/8 bg-white/[0.03] p-8 text-center">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-600/20 ring-1 ring-violet-500/30">
            <ShieldCheck size={26} className="text-violet-400" />
          </div>
          <h1 className="mb-1 text-xl font-black text-white">Admin Access</h1>
          <p className="mb-8 text-sm text-white/40">Sign in with your Google account to manage stations</p>
          <button
            onClick={onLogin}
            className="flex w-full items-center justify-center gap-3 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-slate-800 transition-opacity hover:opacity-90 active:scale-[0.98]"
          >
            <GoogleIcon />
            Sign in with Google
          </button>
        </div>
      </div>
    </PageBody>
  </PageLayout>
);

// ── Editable table row ────────────────────────────────────────────────────────
const AdminTableRow = ({ station, index }) => {
  const [form, setForm] = useState({
    status:        station.status        || 'available',
    currentGame:   station.currentGame   || '',
    bookedSlots:   Array.isArray(station.bookedSlots) ? station.bookedSlots.join(', ') : '',
    preferredGame: station.preferredGame || '',
  });
  const [saving, setSaving] = useState(false);
  const [saved,  setSaved]  = useState(false);

  useEffect(() => {
    setForm({
      status:        station.status        || 'available',
      currentGame:   station.currentGame   || '',
      bookedSlots:   Array.isArray(station.bookedSlots) ? station.bookedSlots.join(', ') : '',
      preferredGame: station.preferredGame || '',
    });
  }, [station]);

  const handleChange = (e) =>
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateStation(index, {
        id:            station.id,
        status:        form.status,
        currentGame:   form.currentGame,
        bookedSlots:   form.bookedSlots.split(',').map((s) => s.trim()).filter(Boolean),
        preferredGame: form.preferredGame,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      alert(`Failed to save Station ${station.id}`);
    } finally {
      setSaving(false);
    }
  };

  const isOccupied = form.status?.toLowerCase() === 'occupied';

  return (
    <tr className="group border-b border-white/5 transition-colors hover:bg-white/[0.02]">
      <td className="px-4 py-3">
        <span className="text-sm font-black text-white">
          {String(station.id).padStart(2, '0')}
        </span>
      </td>
      <td className="px-4 py-3">
        <select
          name="status"
          value={form.status}
          onChange={handleChange}
          className={`rounded-lg border px-2.5 py-1.5 text-xs font-semibold uppercase tracking-wide focus:outline-none focus:ring-1 ${
            isOccupied
              ? 'border-red-500/30 bg-red-500/10 text-red-400 focus:ring-red-500/50'
              : 'border-green-500/30 bg-green-500/10 text-green-400 focus:ring-green-500/50'
          }`}
        >
          <option value="available">Available</option>
          <option value="occupied">Occupied</option>
        </select>
      </td>
      <td className="px-4 py-3">
        <input
          type="text" name="currentGame" value={form.currentGame}
          onChange={handleChange} placeholder="e.g. FIFA 25"
          className="w-full min-w-[140px] rounded-lg border border-white/8 bg-white/[0.04] px-3 py-1.5 text-sm text-white placeholder-white/20 focus:border-violet-500/50 focus:outline-none focus:ring-1 focus:ring-violet-500/30"
        />
      </td>
      <td className="px-4 py-3">
        <input
          type="text" name="bookedSlots" value={form.bookedSlots}
          onChange={handleChange} placeholder="10:00-11:00, 13:00-14:00"
          className="w-full min-w-[200px] rounded-lg border border-white/8 bg-white/[0.04] px-3 py-1.5 text-sm text-white placeholder-white/20 focus:border-violet-500/50 focus:outline-none focus:ring-1 focus:ring-violet-500/30"
        />
      </td>
      <td className="px-4 py-3">
        <input
          type="text" name="preferredGame" value={form.preferredGame}
          onChange={handleChange} placeholder="e.g. Call of Duty"
          className="w-full min-w-[140px] rounded-lg border border-white/8 bg-white/[0.04] px-3 py-1.5 text-sm text-white placeholder-white/20 focus:border-violet-500/50 focus:outline-none focus:ring-1 focus:ring-violet-500/30"
        />
      </td>
      <td className="px-4 py-3">
        <button
          onClick={handleSave} disabled={saving}
          className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
            saved
              ? 'bg-green-500/20 text-green-400'
              : 'bg-violet-600/20 text-violet-400 hover:bg-violet-600/30'
          } disabled:opacity-50`}
        >
          {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
          {saving ? 'Saving…' : saved ? 'Saved ✓' : 'Save'}
        </button>
      </td>
    </tr>
  );
};

// ── Stats cards ───────────────────────────────────────────────────────────────
const StatCard = ({ label, value, color }) => (
  <div className="rounded-xl border border-white/5 bg-white/[0.03] px-5 py-4">
    <p className="text-xs font-semibold uppercase tracking-widest text-white/30">{label}</p>
    <p className={`mt-1 text-2xl font-black ${color}`}>{value}</p>
  </div>
);

// ── Main dashboard ────────────────────────────────────────────────────────────
const AdminDashboard = () => {
  const user    = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const { stations, isLoading, isError } = useStationData();

  // Use the pre-instantiated googleProvider from firebase.js
  const handleLogin = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      setUser(result.user);
    } catch {
      alert('Sign-in failed. Please try again.');
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    setUser(null);
  };

  if (!user) return <LoginPage onLogin={handleLogin} />;

  const available = stations?.filter((s) => s.status?.toLowerCase() === 'available').length ?? 0;
  const occupied  = stations?.filter((s) => s.status?.toLowerCase() === 'occupied').length  ?? 0;
  const total     = stations?.length ?? 0;

  const navRight = (
    <>
      <span className="hidden text-sm text-white/40 sm:block">{user.email}</span>
      <button
        onClick={handleLogout}
        className="flex items-center gap-1.5 rounded-lg border border-red-500/25 bg-red-500/8 px-3 py-1.5 text-sm font-medium text-red-400 transition-colors hover:bg-red-500/15"
      >
        <LogOut size={14} />
        Logout
      </button>
    </>
  );

  return (
    <PageLayout>
      <Navbar rightSlot={navRight} />
      <PageBody>
        <div className="mb-6">
          <h1 className="text-2xl font-black tracking-tight text-white">Admin Dashboard</h1>
          <p className="mt-1 text-sm text-white/40">Edit station data — changes sync to Google Sheets</p>
        </div>

        {!isLoading && !isError && (
          <div className="mb-6 grid grid-cols-3 gap-4">
            <StatCard label="Total Stations" value={total}     color="text-white" />
            <StatCard label="Available"      value={available} color="text-green-400" />
            <StatCard label="Occupied"       value={occupied}  color="text-red-400" />
          </div>
        )}

        {isLoading && (
          <div className="space-y-2">
            <div className="h-10 w-full animate-pulse rounded-lg bg-white/5" />
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-14 w-full animate-pulse rounded-lg bg-white/[0.03]" />
            ))}
          </div>
        )}

        {isError && (
          <div className="flex flex-col items-center gap-3 rounded-xl border border-red-500/20 bg-red-500/5 px-6 py-12 text-center">
            <AlertTriangle size={28} className="text-red-400" />
            <p className="font-semibold text-red-400">Failed to load station data</p>
            <p className="text-sm text-white/40">Check your VITE_SHEETS_ID and VITE_SHEETS_API_KEY</p>
          </div>
        )}

        {!isLoading && !isError && (
          <div className="overflow-x-auto rounded-2xl border border-white/5 bg-white/[0.02]">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-white/5">
                  {['#', 'Status', 'Current Game', 'Booked Slots', 'Preferred Game', ''].map((h) => (
                    <th key={h} className="px-4 py-3 text-xs font-semibold uppercase tracking-widest text-white/30">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {stations.map((station, index) => (
                  <AdminTableRow key={station.id} station={station} index={index} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </PageBody>
    </PageLayout>
  );
};

export default AdminDashboard;
