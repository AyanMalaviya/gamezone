import { create } from 'zustand';
import { signOut } from 'firebase/auth';
import { auth } from '../lib/firebase';

const useAuthStore = create((set) => ({
  user:        null,
  role:        null,        // 'admin' | null
  phone:       null,
  oauthToken:  null,
  loading:     true,

  // Dynamic admin slug — generated at runtime, NOT from .env
  adminSlug:   null,
  slugExpiry:  null,

  setUser:       (user)       => set({ user }),
  setRole:       (role)       => set({ role }),
  setPhone:      (phone)      => set({ phone }),
  setOauthToken: (oauthToken) => set({ oauthToken }),
  setLoading:    (loading)    => set({ loading }),

  setAdminSlug:   (adminSlug, slugExpiry) => set({ adminSlug, slugExpiry }),
  clearAdminSlug: () => set({ adminSlug: null, slugExpiry: null }),

  // Clears local state + signs out from Firebase
  logout: async () => {
    await signOut(auth);
    set({
      user: null, role: null, phone: null,
      oauthToken: null, loading: false,
      adminSlug: null, slugExpiry: null,
    });
  },

  clear: () => set({
    user: null, role: null, phone: null,
    oauthToken: null, loading: false,
    adminSlug: null, slugExpiry: null,
  }),
}));

export default useAuthStore;
