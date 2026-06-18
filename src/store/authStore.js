import { create } from 'zustand';

const useAuthStore = create((set) => ({
  user:        null,
  role:        null,       // 'admin' | null
  phone:       null,       // stored in Firestore users/{uid}.phone
  oauthToken:  null,
  loading:     true,

  setUser:       (user)       => set({ user }),
  setRole:       (role)       => set({ role }),
  setPhone:      (phone)      => set({ phone }),
  setOauthToken: (oauthToken) => set({ oauthToken }),
  setLoading:    (loading)    => set({ loading }),
  clear: () => set({ user: null, role: null, phone: null, oauthToken: null, loading: false }),
}));

export default useAuthStore;
