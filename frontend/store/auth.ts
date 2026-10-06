import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { FULL_ACCESS_ROLES, PORTAL_ROLES, SHOW_ALL_MENUS, STRICT_ROLES } from '@/lib/rbac';

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
        // Owner/Superadmin — hamma oyna
        if (FULL_ACCESS_ROLES.includes(user.role)) return true;
        // Administrator, koordinator, ustoz, kurator — faqat o'z ruxsatlari
        if (STRICT_ROLES.includes(user.role)) return user.permissions.includes(permission);
        // Qolgan xodim rollari — hozircha ochiq rejimda (lib/rbac.ts)
        if (SHOW_ALL_MENUS && !PORTAL_ROLES.includes(user.role)) return true;
        return user.permissions.includes(permission);
      },
    }),
    { name: 'sulton-auth' },
  ),
);
