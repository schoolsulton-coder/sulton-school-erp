import axios from 'axios';
import { useAuthStore } from '@/store/auth';

const baseURL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api';

export const api = axios.create({ baseURL });

// Har bir so'rovga JWT access token qo'shadi
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

function forceLogout() {
  useAuthStore.getState().logout();
  if (typeof window !== 'undefined') window.location.href = '/login';
}

// Bir vaqtda ko'p 401 bo'lsa — bitta refresh so'rovi ishlaydi (dedup)
let refreshing: Promise<string | null> | null = null;
async function refreshAccessToken(): Promise<string | null> {
  const rt = useAuthStore.getState().refreshToken;
  if (!rt) return null;
  try {
    // Interceptorlarsiz toza so'rov (aylanma logout bo'lmasin)
    const res = await axios.post(`${baseURL}/auth/refresh`, { refreshToken: rt });
    const { accessToken, user } = res.data;
    if (!accessToken) return null;
    if (user) useAuthStore.getState().setAuth(accessToken, user, rt);
    else useAuthStore.getState().setToken(accessToken);
    return accessToken;
  } catch {
    return null;
  }
}

// 401 → access token'ni yangilab, so'rovni qayta yuboradi; bo'lmasa login'ga
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    const status = error.response?.status;
    const url: string = original?.url ?? '';

    if (status !== 401 || !original || original._retry) return Promise.reject(error);
    // Login/refresh so'rovining o'zi 401 bersa — refresh urinmaymiz
    if (url.includes('/auth/login') || url.includes('/auth/refresh')) {
      if (url.includes('/auth/refresh')) forceLogout();
      return Promise.reject(error);
    }

    original._retry = true;
    if (!refreshing) refreshing = refreshAccessToken().finally(() => { refreshing = null; });
    const newToken = await refreshing;
    if (newToken) {
      original.headers = original.headers ?? {};
      original.headers.Authorization = `Bearer ${newToken}`;
      return api(original);
    }
    forceLogout();
    return Promise.reject(error);
  },
);
