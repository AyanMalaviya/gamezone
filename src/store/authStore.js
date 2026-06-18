import { create } from 'zustand';

const useAuthStore = create((set) => ({
  user:        null,
  role:        null,        // 'admin' | null
  phone:       null,
  oauthToken:  null,
  loading:     true,

  // Dynamic admin slug — generated at runtime, NOT from .env
  adminSlug:   null,        // e.g. 'admin-a3f9c2b7e1d6'
  slugExpiry:  null,        // Date timestamp (ms) when slug expires

  setUser:       (user)       => set({ user }),
  setRole:       (role)       => set({ role }),
  setPhone:      (phone)      => set({ phone }),
  setOauthToken: (oauthToken) => set({ oauthToken }),
  setLoading:    (loading)    => set({ loading }),

  setAdminSlug: (adminSlug, slugExpiry) => set({ adminSlug, slugExpiry }),
  clearAdminSlug: () => set({ adminSlug: null, slugExpiry: null }),

  clear: () => set({
    user: null, role: null, phone: null,
    oauthToken: null, loading: false,
    adminSlug: null, slugExpiry: null,
  }),
}));

export default useAuthStore;
