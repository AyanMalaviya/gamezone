import { create } from 'zustand';

const useAuthStore = create((set) => ({
  user:        null,
  role:        null,       // 'admin' | null
  oauthToken:  null,       // Google OAuth access token for Sheets writes
  loading:     true,

  setUser:       (user)       => set({ user }),
  setRole:       (role)       => set({ role }),
  setOauthToken: (oauthToken) => set({ oauthToken }),
  setLoading:    (loading)    => set({ loading }),
  clear: () => set({ user: null, role: null, oauthToken: null, loading: false }),
}));

export default useAuthStore;
