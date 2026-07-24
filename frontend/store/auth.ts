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
  user: AuthUser | null;
  setAuth: (token: string, user: AuthUser) => void;
  logout: () => void;
  can: (permission: string) => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      user: null,
      setAuth: (token, user) => set({ token, user }),
      logout: () => set({ token: null, user: null }),
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
