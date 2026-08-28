import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface AuthUser {
  id: string;
  fullName: string;
  phone: string;
  email?: string | null;
  role: string;
  permissions: string[];
}

interface AuthState {
  token: string | null;
  refreshToken: string | null;
  user: AuthUser | null;
  setAuth: (token: string, user: AuthUser, refreshToken?: string | null) => void;
  setToken: (token: string) => void;
  logout: () => void;
  can: (permission: string) => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      refreshToken: null,
      user: null,
      setAuth: (token, user, refreshToken) =>
        set(refreshToken !== undefined ? { token, user, refreshToken } : { token, user }),
      setToken: (token) => set({ token }),
      logout: () => set({ token: null, refreshToken: null, user: null }),
      can: (permission) => {
        const user = get().user;
        if (!user) return false;
        if (user.role === 'superadmin') return true;
        return user.permissions.includes(permission);
      },
    }),
    { name: 'sulton-auth' },
  ),
);
