import { useState, useEffect } from 'react';
import { LogOut, Save } from 'lucide-react';
import useAuthStore from '../store/authStore';
import useStationData from '../hooks/useStationData';
import { updateStation } from '../lib/sheets';
import { auth, GoogleAuthProvider, signInWithPopup, signOut } from '../lib/firebase';

const AdminTableRow = ({ station, index }) => {
  const [formData, setFormData] = useState({
    status: station.status || 'Available',
    currentGame: station.currentGame || '',
    bookedSlots: Array.isArray(station.bookedSlots) ? station.bookedSlots.join(', ') : '',
    preferredGame: station.preferredGame || '',
  });
  const [isSaving, setIsSaving] = useState(false);

  // Sync state if remote station data changes
  useEffect(() => {
    setFormData({
      status: station.status || 'Available',
      currentGame: station.currentGame || '',
      bookedSlots: Array.isArray(station.bookedSlots) ? station.bookedSlots.join(', ') : '',
      preferredGame: station.preferredGame || '',
    });
  }, [station]);

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateStation(index, {
        id: station.id,
        status: formData.status,
        currentGame: formData.currentGame,
        bookedSlots: formData.bookedSlots.split(',').map((s) => s.trim()).filter(Boolean),
        preferredGame: formData.preferredGame,
      });
      alert(`Station ${station.id} updated successfully`);
    } catch (error) {
      console.error(error);
      alert(`Failed to update station ${station.id}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <tr className="border-b border-slate-800 transition-colors hover:bg-slate-900/50">
      <td className="p-3 font-medium text-white">{station.id}</td>
      <td className="p-3">
        <select
          name="status"
          value={formData.status}
          onChange={handleChange}
          className="w-full rounded border border-slate-700 bg-slate-950 p-1.5 text-sm text-white focus:border-blue-500 focus:outline-none"
        >
          <option value="Available">Available</option>
          <option value="Occupied">Occupied</option>
        </select>
      </td>
      <td className="p-3">
        <input
          type="text"
          name="currentGame"
          value={formData.currentGame}
          onChange={handleChange}
          placeholder="Game name"
          className="w-full rounded border border-slate-700 bg-slate-950 p-1.5 text-sm text-white focus:border-blue-500 focus:outline-none"
        />
      </td>
      <td className="p-3">
        <input
          type="text"
          name="bookedSlots"
          value={formData.bookedSlots}
          onChange={handleChange}
          placeholder="10:00 - 11:00, 14:00 - 15:00"
          className="w-full rounded border border-slate-700 bg-slate-950 p-1.5 text-sm text-white focus:border-blue-500 focus:outline-none"
        />
      </td>
      <td className="p-3">
        <input
          type="text"
          name="preferredGame"
          value={formData.preferredGame}
          onChange={handleChange}
          placeholder="Preferred game"
          className="w-full rounded border border-slate-700 bg-slate-950 p-1.5 text-sm text-white focus:border-blue-500 focus:outline-none"
        />
      </td>
      <td className="p-3">
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center gap-2 rounded bg-blue-600 px-3 py-1.5 text-sm text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
        >
          <Save size={16} />
          {isSaving ? 'Saving...' : 'Save'}
        </button>
      </td>
    </tr>
  );
};

const AdminTable = ({ stations }) => (
  <div className="overflow-x-auto rounded-lg border border-slate-800 bg-slate-950 shadow-xl">
    <table className="w-full text-left text-sm">
      <thead className="bg-slate-900 text-slate-300">
        <tr>
          <th className="p-4 font-semibold">ID</th>
          <th className="min-w-[120px] p-4 font-semibold">Status</th>
          <th className="min-w-[150px] p-4 font-semibold">Current Game</th>
          <th className="min-w-[200px] p-4 font-semibold">Booked Slots (comma-separated)</th>
          <th className="min-w-[150px] p-4 font-semibold">Preferred Game</th>
          <th className="p-4 font-semibold">Action</th>
        </tr>
      </thead>
      <tbody>
        {stations.map((station, index) => (
          <AdminTableRow key={station.id} station={station} index={index} />
        ))}
      </tbody>
    </table>
  </div>
);

const AdminDashboard = () => {
  const user = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);
  const { stations, isLoading, isError } = useStationData();

  const handleLogin = async () => {
    try {
      const result = await signInWithPopup(auth, GoogleAuthProvider);
      setUser(result.user);
    } catch (error) {
      console.error('Login failed', error);
      alert('Failed to sign in. Please try again.');
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setUser(null);
    } catch (error) {
      console.error('Logout failed', error);
    }
  };

  if (!user) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center p-6 text-center">
        <h1 className="mb-6 text-3xl font-bold text-white">Admin Login</h1>
        <button
          onClick={handleLogin}
          className="flex items-center gap-3 rounded-lg bg-white px-6 py-3 font-semibold text-slate-900 transition-opacity hover:opacity-90"
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
          </svg>
          Sign in with Google
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Admin Dashboard</h1>
          <p className="mt-1 text-slate-400">Manage GameZone stations and bookings</p>
        </div>

        <div className="flex items-center gap-4">
          <span className="hidden text-sm text-slate-400 md:inline-block">
            {user.email || user.displayName}
          </span>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 rounded-lg border border-red-500/50 bg-red-500/10 px-4 py-2 text-sm font-medium text-red-400 transition-colors hover:bg-red-500/20"
          >
            <LogOut size={16} />
            Logout
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <div className="h-12 w-full animate-pulse rounded bg-slate-800" />
          <div className="h-16 w-full animate-pulse rounded bg-slate-800" />
          <div className="h-16 w-full animate-pulse rounded bg-slate-800" />
          <div className="h-16 w-full animate-pulse rounded bg-slate-800" />
        </div>
      ) : isError ? (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-6 text-center text-red-400">
          Failed to load station data. Ensure your environment variables are configured.
        </div>
      ) : (
        <AdminTable stations={stations} />
      )}
    </div>
  );
};

export default AdminDashboard;
