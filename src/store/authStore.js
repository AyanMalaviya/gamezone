import { create } from 'zustand';
import { signOut } from 'firebase/auth';
import { auth } from '../lib/firebase';

const useAuthStore = create((set) => ({
  user:        null,
  role:        null,   // 'admin' | null
  phone:       null,
  oauthToken:  null,   // Google OAuth2 access_token with Sheets scope
  loading:     true,

  setUser:       (user)       => set({ user }),
  setRole:       (role)       => set({ role }),
  setPhone:      (phone)      => set({ phone }),
  setOauthToken: (token)      => set({ oauthToken: token }),
  setLoading:    (loading)    => set({ loading }),

  logout: async () => {
    await signOut(auth);
    set({ user: null, role: null, phone: null, oauthToken: null, loading: false });
  },

  clear: () =>
    set({ user: null, role: null, phone: null, oauthToken: null, loading: false }),
}));

export default useAuthStore;
